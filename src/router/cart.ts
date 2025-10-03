import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { QueryCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { DeleteCommandOutput, UpdateCommandOutput, PutCommandOutput, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import type { SuccessResponse, CartItem, ErrorResponse, OperationResult } from "../data/types.js";
import { CartItemCreate, CartItemUpdate } from "../data/validation.js";

const router: Router = express.Router();

type DbCartItem = {
  pk: string;      // userId
  sk: string;      // cart-<productId> 
  productId: string;
  amount: number;
};

type CartParams = {
  userId: string;
  cartId: string;
};

type UserParams = {
  userId: string;
};

//hämta carten
router.get(
  "/:userId",
  async (req: Request<UserParams>, res: Response<SuccessResponse<CartItem> | ErrorResponse>) => {
    try {
      const { userId } = req.params;

      const userResult = await db.send(
        new QueryCommand({
          TableName: myTable,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :meta)",
          ExpressionAttributeValues: {
            ":pk": userId,
            ":meta": "meta",
          },
        })
      );

      if (!userResult.Items?.length) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          error: "No user with that ID",
        });
      }

      const cartResult = await db.send(
        new QueryCommand({
          TableName: myTable,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :cart)",
          ExpressionAttributeValues: {
            ":pk": userId,
            ":cart": "cart",
          },
        })
      );

      const cartItems: CartItem[] = (cartResult.Items ?? []).map((item) => ({
        id: item.sk,
        userId,
        productId: item.productId,
        amount: item.amount,
      }));

      return res.status(200).json({
        success: true,
        count: cartItems.length,
        items: cartItems,
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
  async (req: Request<UserParams>, res: Response<OperationResult<CartItem> | ErrorResponse>) => {
    const { userId } = req.params;
    const parsed = CartItemCreate.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        error: parsed.error.message,
      });
    }

    const { productId, amount } = parsed.data;
    const cartSk = `cart-${productId}`;
    const newCartItem: CartItem = { id: cartSk, userId, productId, amount };

    try {
      const existing: GetCommandOutput = await db.send(
        new GetCommand({
          TableName: myTable,
          Key: { pk: userId, sk: cartSk },
        })
      );

      if (existing.Item) {
        const prevAmount =
          typeof (existing.Item as DbCartItem).amount === "number"
            ? (existing.Item as DbCartItem).amount
            : 0;
        const updatedAmount = prevAmount + amount;

        await db.send(
          new UpdateCommand({
            TableName: myTable,
            Key: { pk: userId, sk: cartSk },
            UpdateExpression: "SET amount = :amount",
            ExpressionAttributeValues: { ":amount": updatedAmount },
            ConditionExpression: "attribute_exists(sk)",
            ReturnValues: "ALL_NEW",
          })
        );

        return res.status(200).json({
          success: true,
          message: "Product amount updated in cart.",
          item: { ...newCartItem, amount: updatedAmount },
        });
      } else {
        const putResult: PutCommandOutput = await db.send(
          new PutCommand({
            TableName: myTable,
            Item: { pk: userId, sk: cartSk, productId, amount },
            ConditionExpression: "attribute_not_exists(sk)",
          })
        );

        return res.status(201).json({
          success: true,
          message: "Item added to cart.",
          item: newCartItem,
        });
      }
    } catch (error) {
      if ((error as Error).name === "ConditionalCheckFailedException") {

        return res.status(409).json({
          success: false,
          message: "Item already exists in cart",
          error: (error as Error).message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Could not add product to cart",
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