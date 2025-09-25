import express from "express";
import type { Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

const router: Router = express.Router();

type Product = {
  image: string;
  amountStock: number;
  sk: string;
  pk: string;
  price: number;
  name: string;
};

type SuccessResponse = {
  success: boolean;
  count: number;
  items: Product[];
};

type ErrorResponse = {
  success: boolean;
  message: string;
  error: string;
};

type GetResult = Record<string, any> | undefined;
router.get("/", async (req, res: Response<SuccessResponse | ErrorResponse>) => {
  try {
    const result: GetResult = await db.send(
      new QueryCommand({
        TableName: myTable,
        KeyConditionExpression: "pk = :products AND begins_with(sk, :productId)",
        ExpressionAttributeValues: {
          ":products": "products",
          ":productId": "productId#",
        },
      })
    );

    res.status(200).json({
      success: true,
      count: result.Count ?? 0,
      items: result.Items ?? [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not fetch products",
      error: (error as Error).message,
    });
  }
});

export default router;
