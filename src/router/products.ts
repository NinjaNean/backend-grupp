import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { DeleteCommandOutput, PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { success } from "zod";

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
          ":productId": "productId",
        },
      })
    );

    res.status(200).send({
      success: true,
      count: result.Count ?? 0,
      items: result.Items ?? [],
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Could not fetch products.",
      error: (error as Error).message,
    });
  }
});

type ProductParam = {
  productId: string;
};

router.get("/:productId", async (req: Request<ProductParam>, res) => {
  const productId: string = req.params.productId;

  const result = await db.send(
    new GetCommand({
      TableName: myTable,
      Key: {
        pk: "products",
        sk: productId,
      },
    })
  );

  res.status(200).send(result.Item);
});

router.delete("/:productId", async (req: Request<ProductParam>, res: Response<object | ErrorResponse>) => {
  const productId: string = req.params.productId;

  try {
    let result: DeleteCommandOutput = await db.send(
      new DeleteCommand({
        TableName: myTable,
        Key: {
          pk: "products",
          sk: productId,
        },
        ConditionExpression: "attribute_exists(sk)",
        ReturnValues: "ALL_OLD",
      })
    );
    console.log(result);

    res.status(200).send({
      message: `Produkten har tagits bort.`,
      // TODO: ändra till engelska
      // TODO: skicka tillbaka objectet som tagits bort
    });
  } catch (error) {
    if ((error as Error).name === "ConditionalCheckFailedException") {
      res.status(404).json({
        success: false,
        message: `${productId} dose not exist.`,
        error: (error as Error).message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Could not delete product.",
        error: (error as Error).message,
      });
    }
  }
});

router.post("/", async (req, res) => {
  const newProduct = req.body;

  let result: PutCommandOutput = await db.send(
    new PutCommand({
      TableName: myTable,
      Item: newProduct,
    })
  );

  res.status(202).json({
    message: "Produkten är tillagd.",
  });
});

export default router;
