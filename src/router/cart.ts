import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { QueryCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { DeleteCommandOutput, UpdateCommandOutput, PutCommandOutput, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import type { SuccessResponse, ErrorResponse, OperationResult, GetResult } from "../data/types.js";
import { CartItemCreate, CartItemUpdate } from "../data/validation.js";

const router: Router = express.Router();

type DbCartItem = {
  pk: string;      // userId
  sk: `CART#${string}`;
  productId: string;
  amount: number;
};

type CartParams = {
  userId: string;
  cartId: string;
};

//ta bort
type UserParams = {
  userId: string;
};

type CartItem = {
  id: string;
  userId: string;
  productId: string;
  amount: number;
};

//hämta carten
router.get(
  "/:userId",
  async (req: Request<UserParams>, res: Response<SuccessResponse<DbCartItem> | ErrorResponse>) => {
    try {
      const { userId } = req.params;

      //fånga om inte userid finns

      const cartResult: GetResult = await db.send(
        new QueryCommand({
          TableName: myTable,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :cart)",
          ExpressionAttributeValues: {
            ":pk": `USER#${userId}`,
            ":cart": "CART#",
          },
        })
      );

      return res.status(200).json({
        success: true,
        count: cartResult.Count ?? 0,
        items: cartResult.Items ?? [],
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Could not fetch cart",
        error: (error as Error).message,
      });
    }
  }
);

//lägga till en ny produkt
router.post(
  "/:userId",
  async (req: Request<UserParams>, res: Response<OperationResult<DbCartItem> | ErrorResponse>) => {
    const { userId } = req.params;
    const parsed = CartItemCreate.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        error: parsed.error.message,
      });
    }

    try {
      const result = await db.send(new UpdateCommand({
        TableName: myTable,
        Key: { pk: `USER#${userId}`, sk: `CART#${parsed.data.productId}` },
        UpdateExpression: "SET amount = if_not_exists(amount, :zero) + :inc, productId = :pid",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":inc": parsed.data.amount,
          ":pid": parsed.data.productId,
        },
        ReturnValues: "ALL_NEW",
      }));

      return res.status(200).json({
        success: true,
        message: "Product amount updated in cart.",
        item: result.Attributes as DbCartItem,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Could not update cart.",
        error: (error as Error).message,
      });
    }
  }
);


//ändra antal av en produkt i korgen
router.put(
  "/:userId/:cartId",
  async (req: Request<CartParams>, res: Response<OperationResult<CartItem> | ErrorResponse>) => {
    const { userId, cartId } = req.params;
    const parsed = CartItemUpdate.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        error: parsed.error.message,
      });
    }

    try {
      // Hämta först item för att få productId
      const existing: GetCommandOutput = await db.send(
        new GetCommand({
          TableName: myTable,
          Key: { pk: userId, sk: cartId },
        })
      );

      if (!existing.Item) {
        return res.status(404).json({
          success: false,
          message: "Cart item not found",
          error: `No item with ID ${cartId}`,
        });
      }

      const existingItem = existing.Item as DbCartItem;

      // Uppdatera antal
      const updatedAmount = parsed.data.amount;

      const result: UpdateCommandOutput = await db.send(
        new UpdateCommand({
          TableName: myTable,
          Key: { pk: userId, sk: cartId },
          UpdateExpression: "SET amount = :amount",
          ExpressionAttributeValues: { ":amount": updatedAmount },
          ReturnValues: "ALL_NEW",
        })
      );

      const updatedItem: CartItem = {
        id: result.Attributes!.sk,
        userId,
        productId: result.Attributes!.productId,
        amount: result.Attributes!.amount,
      };

      return res.status(200).json({
        success: true,
        message: "Cart item updated.",
        item: updatedItem,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Could not update cart item",
        error: (error as Error).message,
      });
    }
  }
);

//radera en produkt 
router.delete(
  "/:userId/:cartId",
  async (req: Request<{ userId: string; cartId: string }>, res: Response<OperationResult<CartItem> | ErrorResponse>) => {
    const { userId, cartId } = req.params;

    try {
      const result = await db.send(
        new DeleteCommand({
          TableName: myTable,
          Key: { pk: userId, sk: cartId },
          ConditionExpression: "attribute_exists(sk)",
          ReturnValues: "ALL_OLD",
        })
      );

      const deleted = result.Attributes as DbCartItem | undefined;

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Cart item not found",
          error: "No item with that ID",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Product removed from cart",
        item: {
          id: deleted.sk,
          userId: deleted.pk,
          productId: deleted.productId,
          amount: deleted.amount,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Could not remove product",
        error: (error as Error).message,
      });
    }
  }
);

//radera hela korgen
router.delete("/:userId", async (req: Request<UserParams>, res: Response) => {
  const { userId } = req.params;

  try {
    const q = await db.send(
      new QueryCommand({
        TableName: myTable,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :c)",
        ExpressionAttributeValues: { ":pk": userId, ":c": "cart" },
      })
    );

    const items = (q.Items ?? []) as DbCartItem[];

    await Promise.all(
      items.map((it) =>
        db.send(
          new DeleteCommand({ TableName: myTable, Key: { pk: it.pk, sk: it.sk } })
        )
      )
    );

    return res.send({
      success: true,
      message: "Hela kundvagnen raderades",
      removed: items.length,
    });
  } catch {
    return res.status(500).send({
      success: false,
      error: "Kunde inte radera hela carten",
    });
  }
});

export default router;