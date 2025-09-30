import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { DeleteCommandOutput, PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import type { ErrorResponse, GetResult, SuccessResponse } from "../data/types.js";
import { ProductSchema, UpdateProductSchema } from "../data/validation.js";

const router: Router = express.Router();

type ProductParam = {
  productId: string;
};

router.get("/", async (req, res: Response<SuccessResponse | ErrorResponse>) => {
  try {
    const result: GetResult = await db.send(
      new QueryCommand({
        TableName: myTable,
        KeyConditionExpression: "pk = :p AND begins_with(sk, :pId)",
        ExpressionAttributeValues: {
          ":p": "products",
          ":pId": "productId#",
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

// TODO: lägg till felmeddelanden osv
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

// TODO: byt ut object mot något annat
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

    res.status(200).send({
      message: "The product has been removed.",
      Item: result.Attributes,
    });
  } catch (error) {
    if ((error as Error).name === "ConditionalCheckFailedException") {
      res.status(404).send({
        success: false,
        message: `${productId} does not exist`,
        error: (error as Error).message,
      });
    } else {
      res.status(500).send({
        success: false,
        message: "Could not delete product.",
        error: (error as Error).message,
      });
    }
  }
});

// TODO: lägg till felmeddelanden osv
router.post("/", async (req, res) => {
  const parsed = ProductSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).send({
      success: parsed.success,
      message: "The product information is invalid.",
      error: parsed.error,
    });

    return;
  }

  const newProduct = parsed.data;

  let result: PutCommandOutput = await db.send(
    new PutCommand({
      TableName: myTable,
      Item: newProduct,
    })
  );

  res.status(201).send({
    message: "The product has been added.",
  });
});

// TODO: byt ut object mot något annat
router.put("/:productId", async (req: Request<ProductParam>, res: Response<object | ErrorResponse>) => {
  const productId: string = req.params.productId;

  try {
    const parsed = UpdateProductSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).send({
        success: parsed.success,
        message: "The product information is invalid.",
        error: parsed.error,
      });

      return;
    }

    const updatedProduct = parsed.data;

    let result = await db.send(
      new UpdateCommand({
        TableName: myTable,
        Key: {
          pk: "products",
          sk: productId,
        },
        UpdateExpression: "SET image = :i, amountStock = :a, price = :p, name = :n",
        ExpressionAttributeValues: {
          ":i": updatedProduct.image,
          ":a": updatedProduct.amountStock,
          ":p": updatedProduct.price,
          ":n": updatedProduct.name,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    res.status(200).send({
      message: "Product updated.",
      Item: result.Attributes,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Could not edit product.",
      error: (error as Error).message,
    });
  }
});

export default router;
