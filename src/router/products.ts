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
router.get("/:productId", async (req: Request<IdParam>, res: Response<object | ErrorResponse>) => {
  const productId: string = req.params.id;

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

router.delete(
  "/:productId",
  async (req: Request<IdParam>, res: Response<OperationResult<Product> | ErrorResponse>) => {
    const productId: string = req.params.id;

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
        item: deletedProduct,
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
  }
);

router.post("/", async (req, res: Response<OperationResult<Product> | ErrorResponse>) => {
  const parsed = ProductSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).send({
      success: parsed.success,
      message: "The product information is invalid.",
      error: parsed.error.message,
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
    success: true,
    message: "The product has been added.",
    item: newProduct,
  });
});

type UpdatedProduct = {
  image: string;
  amountStock: number;
  price: number;
  name: string;
};

router.put(
  "/:productId",
  async (req: Request<IdParam>, res: Response<OperationResult<UpdatedProduct> | ErrorResponse>) => {
    const productId: string = req.params.id;

    const parsed = UpdateProductSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).send({
        success: parsed.success,
        message: "The product information is invalid.",
        error: parsed.error.message,
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

      const newProduct: UpdatedProduct | null = result.Attributes ? (result.Attributes as UpdatedProduct) : null;

      res.status(200).send({
        success: true,
        message: "Product updated.",
        item: newProduct,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Could not edit product.",
        error: (error as Error).message,
      });
    }
  }
);

export default router;
