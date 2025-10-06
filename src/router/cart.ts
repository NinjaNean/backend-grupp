import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { QueryCommand, UpdateCommand, DeleteCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { UpdateCommandOutput, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import type { SuccessResponse, ErrorResponse, OperationResult, GetResult } from "../data/types.js";
import { CartItemCreate, CartItemUpdate, IdSchema } from "../data/validation.js";

const router: Router = express.Router();

type DbCartItem = {
  pk: string; // userId
  sk: `CART#p${string}`;
  productId: string;
  amount: number;
};

type CartParams = {
  userId: string;
  cartId: string;
};

interface UserId {
  userId: number;
}

// Get specifik users cart
router.get("/:userId", async (req: Request<UserId>, res: Response<SuccessResponse<DbCartItem> | ErrorResponse>) => {
  try {
    const { userId } = req.params;

    const cartResult: GetResult = await db.send(
      new QueryCommand({
        TableName: myTable,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :cart)",
        ExpressionAttributeValues: {
          ":pk": `USER#u${userId}`,
          ":cart": "CART#p",
        },
      })
    );

    if (cartResult.Count === 0) {
      return res.status(404).send({
        success: false,
        message: "The user dose not exist.",
        error: `No item found in DynamoDB for key: USER#u${userId}`,
      });
    }

    return res.status(200).send({
      success: true,
      count: cartResult.Count ?? 0,
      items: cartResult.Items ?? [],
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Could not fetch cart",
      error: (error as Error).message,
    });
  }
});

// Add product to users cart
router.post("/:userId", async (req: Request<UserId>, res: Response<OperationResult<DbCartItem> | ErrorResponse>) => {
  const parsedId = IdSchema.safeParse(Number(req.params.userId));
  const parsed = CartItemCreate.safeParse(req.body);

  if (!parsedId.success) {
    const errors = parsedId.error.issues.map((err) => ({
      message: err.message,
    }));

    return res.status(400).send({
      success: false,
      message: "Invalid input",
      error: errors,
    });
  } else if (!parsed.success) {
    const errors = parsed.error.issues.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return res.status(400).send({
      success: false,
      message: "Invalid input",
      error: errors,
    });
  }

  try {
    const result = await db.send(
      new UpdateCommand({
        TableName: myTable,
        Key: { pk: `USER#u${parsedId.data}`, sk: `CART#p${parsed.data.productId}` },
        UpdateExpression: "SET amount = if_not_exists(amount, :zero) + :inc",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":inc": parsed.data.amount,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return res.status(200).send({
      success: true,
      message: "Product amount updated in cart.",
      item: result.Attributes as DbCartItem,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Could not update cart.",
      error: (error as Error).message,
    });
  }
});

// Update one product amount in cart
router.put(
  "/:userId/:cartId",
  async (req: Request<CartParams>, res: Response<OperationResult<DbCartItem> | ErrorResponse>) => {
    const { userId, cartId } = req.params;
    const parsed = CartItemUpdate.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((err) => ({
        message: err.message,
      }));

      return res.status(400).send({
        success: false,
        message: "Invalid input",
        error: errors,
      });
    }

    try {
      // Hämta först item för att få productId
      const existing: GetCommandOutput = await db.send(
        new GetCommand({
          TableName: myTable,
          Key: { pk: `USER#u${userId}`, sk: `CART#p${cartId}` },
        })
      );

      if (!existing.Item) {
        return res.status(404).send({
          success: false,
          message: "Cart item not found",
          error: `The user or the product dose not exist.`,
        });
      }

      // Uppdatera antal
      const updatedAmount = parsed.data.amount;

      const result: UpdateCommandOutput = await db.send(
        new UpdateCommand({
          TableName: myTable,
          Key: { pk: `USER#u${userId}`, sk: `CART#p${cartId}` },
          UpdateExpression: "SET amount = :amount",
          ExpressionAttributeValues: { ":amount": updatedAmount },
          ReturnValues: "ALL_NEW",
        })
      );

      return res.status(200).send({
        success: true,
        message: "Cart item updated.",
        item: result.Attributes,
      });
    } catch (error) {
      return res.status(500).send({
        success: false,
        message: "Could not update cart item",
        error: (error as Error).message,
      });
    }
  }
);

// Delete one product from cart
router.delete(
  "/:userId/:cartId",
  async (
    req: Request<{ userId: string; cartId: string }>,
    res: Response<OperationResult<DbCartItem> | ErrorResponse>
  ) => {
    const { userId, cartId } = req.params;

    try {
      const result = await db.send(
        new DeleteCommand({
          TableName: myTable,
          Key: { pk: `USER#u${userId}`, sk: `CART#p${cartId}` },
          ConditionExpression: "attribute_exists(sk)",
          ReturnValues: "ALL_OLD",
        })
      );

      const deleted = result.Attributes as DbCartItem | undefined;

      if (!deleted) {
        return res.status(404).send({
          success: false,
          message: "Cart item not found",
          error: "No item with that ID",
        });
      }

      return res.status(200).send({
        success: true,
        message: "Product removed",
        item: result.Attributes as DbCartItem,
      });
    } catch (error) {
      return res.status(500).send({
        success: false,
        message: "Could not remove product",
        error: (error as Error).message,
      });
    }
  }
);

// Delete cart
router.delete("/:userId", async (req: Request<UserId>, res: Response) => {
  const { userId } = req.params;

  try {
    const q = await db.send(
      new QueryCommand({
        TableName: myTable,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :c)",
        ExpressionAttributeValues: { ":pk": `USER#u${userId}`, ":c": "CART#p" },
      })
    );

    const items = (q.Items ?? []) as DbCartItem[];

    if (items.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Cart not found",
        error: `No cart found for user with id ${userId}`,
      });
    }

    await Promise.all(
      items.map((it) => db.send(new DeleteCommand({ TableName: myTable, Key: { pk: it.pk, sk: it.sk } })))
    );

    return res.send({
      success: true,
      message: "Total cart removed",
      removed: items.length,
    });
  } catch {
    return res.status(500).send({
      success: false,
      error: "Could not remove cart",
    });
  }
});

export default router;
