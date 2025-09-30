import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { DeleteCommandOutput, PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import type { ErrorResponse, GetResult, Product, SuccessResponse } from "../data/types.js";
import { ProductSchema, UpdateProductSchema } from "../data/validation.js";
import { success } from "zod";

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
          ":pId": "productId",
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
router.get("/:productId", async (req: Request<ProductParam>, res: Response<object | ErrorResponse>) => {
  const productId: string = req.params.productId;

  try {
    const result = await db.send(
      new GetCommand({
        TableName: myTable,
        Key: {
          pk: "products",
          sk: productId,
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

type DeleteResponse = {
  success: boolean;
  message: string;
  deleted: Product | null;
};

router.delete("/:productId", async (req: Request<ProductParam>, res: Response<DeleteResponse | ErrorResponse>) => {
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

    const deletedProduct: Product | null = result.Attributes ? (result.Attributes as Product) : null;

    res.status(200).send({
      success: true,
      message: "The product has been removed.",
      deleted: deletedProduct,
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

type AddedResponse = {
  success: boolean;
  message: string;
  added: Product | null;
};

router.post("/", async (req, res: Response<AddedResponse | ErrorResponse>) => {
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

  const addedProduct = result.Attributes ? (result.Attributes as Product) : null;

  res.status(201).send({
    success: true,
    message: "The product has been added.",
    added: addedProduct,
  });
});

type UpdatedResponse = {
  success: boolean;
  message: string;
  updated: UpdatedProduct | null;
};

type UpdatedProduct = {
  image: string;
  amountStock: number;
  price: number;
  name: string;
};

router.put("/:productId", async (req: Request<ProductParam>, res: Response<UpdatedResponse | ErrorResponse>) => {
  const productId: string = req.params.productId;

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

  try {
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

    const newProduct: UpdatedProduct | null = result.Attributes ? (result.Attributes as Product) : null;

    res.status(200).send({
      success: true,
      message: "Product updated.",
      updated: newProduct,
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
