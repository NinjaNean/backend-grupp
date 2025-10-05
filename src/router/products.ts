import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { DeleteCommandOutput, PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import type { ErrorResponse, GetResult, IdParam, OperationResult, SuccessResponse } from "../data/types.js";
import { ProductSchema, UpdateProductSchema } from "../data/validation.js";

const router: Router = express.Router();

type Product = {
  image: string;
  amountStock: number;
  sk: string;
  pk: string;
  price: number;
  name: string;
};

router.get("/", async (req, res: Response<SuccessResponse<Product> | ErrorResponse>) => {
  try {
    const result: GetResult = await db.send(
      new QueryCommand({
        TableName: myTable,
        KeyConditionExpression: "pk = :p AND begins_with(sk, :product)",
        ExpressionAttributeValues: {
          ":p": "PRODUCTS",
          ":product": "PRODUCT#p",
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

// TODO: byt ut object
router.get("/:id", async (req: Request<IdParam>, res: Response<object | ErrorResponse>) => {
  const productId: string = req.params.id;

  try {
    const result = await db.send(
      new GetCommand({
        TableName: myTable,
        Key: {
          pk: "PRODUCTS",
          sk: `PRODUCT#p${productId}`,
        },
      })
    );

    res.status(200).send({
      success: true,
      Item: result.Item,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Could not fetch product.",
      error: (error as Error).message,
    });
  }
});

router.delete("/:id", async (req: Request<IdParam>, res: Response<OperationResult<Product> | ErrorResponse>) => {
  const productId = req.params.id;

  console.log(req.params);

  try {
    let result: DeleteCommandOutput = await db.send(
      new DeleteCommand({
        TableName: myTable,
        Key: {
          pk: "PRODUCTS",
          sk: `PRODUCT#p${productId}`,
        },
        ConditionExpression: "attribute_exists(sk)",
        ReturnValues: "ALL_OLD",
      })
    );

    res.status(200).send({
      success: true,
      message: "The product has been removed.",
      item: result.Attributes,
    });
  } catch (error) {
    if ((error as Error).name === "ConditionalCheckFailedException") {
      res.status(404).send({
        success: false,
        message: `p${productId} does not exist`,
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

router.post("/", async (req: Request<Product>, res: Response<OperationResult<Product> | ErrorResponse>) => {
  const parsed = ProductSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    res.status(400).send({
      success: parsed.success,
      message: "The product information is invalid.",
      error: errors,
    });

    return;
  }

  const newProduct = parsed.data;

  try {
    let result: PutCommandOutput = await db.send(
      new PutCommand({
        TableName: myTable,
        Item: newProduct,
        ConditionExpression: "attribute_not_exists(sk)",
      })
    );

    res.status(201).send({
      success: true,
      message: "The product has been added.",
      item: newProduct,
    });
  } catch (error) {
    if ((error as Error).name === "ConditionalCheckFailedException") {
      res.status(409).send({
        success: false,
        message: "Product already exists.",
        error: (error as Error).message,
      });
    } else {
      res.status(500).send({
        success: false,
        message: "Could not add new product.",
        error: (error as Error).message,
      });
    }
  }
});

type UpdatedProduct = {
  image: string;
  amountStock: number;
  price: number;
  name: string;
};

router.put("/:id", async (req: Request<IdParam>, res: Response<OperationResult<UpdatedProduct> | ErrorResponse>) => {
  const productId: string = req.params.id;

  const parsed = UpdateProductSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    res.status(400).send({
      success: parsed.success,
      message: "The product information is invalid.",
      error: errors,
    });

    return;
  }

  const updatedProduct = parsed.data;

  try {
    let result = await db.send(
      new UpdateCommand({
        TableName: myTable,
        Key: {
          pk: "PRODUCTS",
          sk: `PRODUCT#p${productId}`,
        },
        UpdateExpression: "SET #stock = :a, #price = :p, #nm = :n",
        ExpressionAttributeNames: {
          "#stock": "amountStock",
          "#price": "price",
          "#nm": "name",
        },
        ExpressionAttributeValues: {
          ":a": updatedProduct.amountStock,
          ":p": updatedProduct.price,
          ":n": updatedProduct.name,
        },
        ConditionExpression: "attribute_exists(sk)",
        ReturnValues: "ALL_NEW",
      })
    );

    res.status(200).send({
      success: true,
      message: "Product updated.",
      item: result.Attributes,
    });
  } catch (error) {
    if ((error as Error).name === "ConditionalCheckFailedException") {
      res.status(404).send({
        success: false,
        message: `p${productId} does not exist`,
        error: (error as Error).message,
      });
    } else {
      res.status(500).send({
        success: false,
        message: "Could not edit product.",
        error: (error as Error).message,
      });
    }
  }
});

export default router;
