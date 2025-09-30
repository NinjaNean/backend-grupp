import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import type { CartItem, ErrorResponse } from "../data/types.js";
import * as z from "zod";

const router: Router = express.Router();

//Zod-scheman
const CartItemCreateZ = z.object({
  productId: z.string().min(1),
  amount: z.number().int().min(1),
});

const CartItemUpdateZ = z.object({
  amount: z.number().int().min(1),
});

//
type SuccessResponse<T> = {
  success: true;
  count: number;
  items: T[];
};

// GET Hämta användarens cart 
router.get(
  "/:userId",
  async (req: Request<{ userId: string }>, res: Response<SuccessResponse<CartItem> | ErrorResponse>) => {
    try {
      const userId = req.params.userId;

      // Hämta användarens meta
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

      if (!userResult.Items || userResult.Items.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          error: "No user with that ID",
        });
      }

      // Hämta cart-items
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

      if (!cartResult.Items) {
        return res.status(404).json({
          success: false,
          message: "No cart items found",
          error: "Cart empty",
        });
      }

      // Validera varje item med safeParse
      const cartItems: CartItem[] = [];
      for (const item of cartResult.Items) {
        const parseResult = z.object({
          sk: z.string(),
          productId: z.string(),
          amount: z.number().int().min(1),
        }).safeParse(item);

        if (parseResult.success) {
          cartItems.push({
            id: parseResult.data.sk,
            userId,
            productId: parseResult.data.productId,
            amount: parseResult.data.amount,
          });
        }
      }

      const response: SuccessResponse<CartItem> = {
        success: true,
        count: cartItems.length,
        items: cartItems,
      };

      res.status(200).json(response);
    } catch (error) {
      const errResponse: ErrorResponse = {
        success: false,
        message: "Could not fetch cart",
        error: (error as Error).message,
      };
      res.status(500).json(errResponse);
    }
  }
);

// POST Lägg till produkt i cart
router.post(
  "/:userId",
  async (req: Request<{ userId: string }>, res: Response<SuccessResponse<CartItem> | ErrorResponse>) => {
    try {
      const userId = req.params.userId;

      const parseResult = CartItemCreateZ.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input",
          error: JSON.stringify(parseResult.error.format()),
        });
      }

      const { productId, amount } = parseResult.data;
      const cartId = `cart#${uuidv4()}`;

      const newCartItem: CartItem = { id: cartId, userId, productId, amount };

      await db.send(
        new PutCommand({
          TableName: myTable,
          Item: { pk: userId, sk: cartId, productId, amount },
        })
      );

      const response: SuccessResponse<CartItem> = {
        success: true,
        count: 1,
        items: [newCartItem],
      };

      res.status(201).json(response);
    } catch (error) {
      const errResponse: ErrorResponse = {
        success: false,
        message: "Could not add product to cart",
        error: (error as Error).message,
      };
      res.status(500).json(errResponse);
    }
  }
);

// PUT Uppdatera antal 
router.put(
  "/:userId/:cartId",
  async (req: Request<{ userId: string; cartId: string }>, res: Response<SuccessResponse<CartItem> | ErrorResponse>) => {
    try {
      const { userId, cartId } = req.params;

      const parseResult = CartItemUpdateZ.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input",
          error: JSON.stringify(parseResult.error.format()),
        });
      }

      const { amount } = parseResult.data;

      const result = await db.send(
        new UpdateCommand({
          TableName: myTable,
          Key: { pk: userId, sk: cartId },
          UpdateExpression: "SET amount = :amount",
          ExpressionAttributeValues: { ":amount": amount },
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

      const response: SuccessResponse<CartItem> = {
        success: true,
        count: 1,
        items: [updatedItem],
      };

      res.status(200).json(response);
    } catch (error) {
      const errResponse: ErrorResponse = {
        success: false,
        message: "Could not update cart item",
        error: (error as Error).message,
      };
      res.status(500).json(errResponse);
    }
  }
);

export default router;
