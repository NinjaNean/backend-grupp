import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import type { CartItem, ErrorResponse } from "../data/types.js";
/*import { CartItemCreateZ, CartItemUpdateZ } from "../data/validation.js";*/


/*export const CartItemCreateZ = z.object({
  productId: z.string().min(1),
  amount: z.number().int().min(1),
});

export const CartItemUpdateZ = z.object({
  amount: z.number().int().min(1),
});*/

const router: Router = express.Router();

//dubbla längre ner
type UserParam = { 
  userId: string };

type CartParam = { 
  userId: string; 
  cartId: string };

// generiska??
type SuccessResponse<T> = {
  success: true;
  count: number;
  items: T[];
};

type OperationResult<T> = {
  success: true;
  message: string;
  item: T | null;
};

// GET Hämta användarens cart 
router.get(
  "/:userId",
  async (req: Request<UserParam>, res: Response<SuccessResponse<CartItem> | ErrorResponse>) => {
    try {
      const { userId } = req.params;

      // Hämta användrens information
      const userResult = await db.send(
        new QueryCommand({
          TableName: myTable,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :metaPrefix)",
          ExpressionAttributeValues: {
            ":pk": userId,
            ":metaPrefix": "meta",
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

      // Hämta cart items
      const cartResult = await db.send(
        new QueryCommand({
          TableName: myTable,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :cartPrefix)",
          ExpressionAttributeValues: {
            ":pk": userId,
            ":cartPrefix": "cart",
          },
        })
      );

      const cartItems: CartItem[] = (cartResult.Items ?? []).map((item) => ({
        id: item.sk,
        userId,
        productId: item.productId,
        amount: item.amount,
      }));

      res.status(200).json({
        success: true,
        count: cartItems.length,
        items: cartItems,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Could not fetch cart",
        error: (error as Error).message,
      });
    }
  }
);

// POST Lägg till produkt i cart
router.post(
  "/:userId",
  async (req: Request<UserParam>, res: Response<OperationResult<CartItem> | ErrorResponse>) => {
    const { userId } = req.params;
    const parsed = CartItemCreateZ.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        error: parsed.error.message,
      });
    }

    const { productId, amount } = parsed.data;
    const cartId = `cart#${uuidv4()}`;
    const newCartItem: CartItem = { id: cartId, userId, productId, amount };

    try {
      await db.send(
        new PutCommand({
          TableName: myTable,
          Item: { pk: userId, sk: cartId, productId, amount },
        })
      );

      res.status(201).json({
        success: true,
        message: "Item added to cart.",
        item: newCartItem,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Could not add product to cart",
        error: (error as Error).message,
      });
    }
  }
);

// PUT Uppdatera antal
router.put(
  "/:userId/:cartId",
  async (req: Request<CartParam>, res: Response<OperationResult<CartItem> | ErrorResponse>) => {
    const { userId, cartId } = req.params;
    const parsed = CartItemUpdateZ.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        error: parsed.error.message,
      });
    }

    try {
      const result = await db.send(
        new UpdateCommand({
          TableName: myTable,
          Key: { pk: userId, sk: cartId },
          UpdateExpression: "SET amount = :amount",
          ExpressionAttributeValues: { ":amount": parsed.data.amount },
          ReturnValues: "ALL_NEW",
        })
      );

      if (!result.Attributes) {
        return res.status(404).json({
          success: false,
          message: "Cart item not found",
          error: "No item with that ID",
        });
      }

      const updatedItem: CartItem = {
        id: result.Attributes.sk,
        userId,
        productId: result.Attributes.productId,
        amount: result.Attributes.amount,
      };

      res.status(200).json({
        success: true,
        message: "Cart item updated.",
        item: updatedItem,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Could not update cart item",
        error: (error as Error).message,
      });
    }
  }
);


type CartParams = { userId: string; cartId: string };
type UserParams = { userId: string };

type DbCartItem = {
  pk: string;      
  sk: string;       
  productId: string;
  amount: number;
};

// DELETE: ta bort en specifik produkt
router.delete(
  "/:userId/:cartId",
  async (req: Request<CartParams>, res: Response) => {
    const { userId, cartId } = req.params;

    try {
      const result = await db.send(
        new DeleteCommand({
          TableName: myTable,
          Key: { pk: userId, sk: cartId },
          ReturnValues: "ALL_OLD",
        })
      );

      const deleted = result.Attributes as DbCartItem | undefined;

      if (!deleted) {
        return res.status(404).send({
          success: false,
          error: "Produkten finns inte i kundvagnen",
        });
      }

      return res.send({
        success: true,
        message: "Produkten raderades från kundvagnen",
        item: deleted,
      });
    } catch {
      return res.status(500).send({
        success: false,
        error: "Kunde inte radera produkt från cart",
      });
    }
  }
);

// DELETE: töm hela kundvagnen
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
