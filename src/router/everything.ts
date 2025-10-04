import { ScanCommand } from "@aws-sdk/client-dynamodb";
import express from "express";
import type { Router } from "express";
import { db, myTable } from "../data/db.js";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

const router: Router = express.Router();

router.get("/", async (req, res) => {
  let scanCommand = await db.send(
    new ScanCommand({
      TableName: myTable,
    })
  );

  console.log(scanCommand.Items);

  res.status(200).send(scanCommand.Items);
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  const result = await db.send(
    new DeleteCommand({
      TableName: myTable,
      Key: { pk: `producs`, sk: id },
      ConditionExpression: "attribute_exists(sk)",
      ReturnValues: "ALL_OLD",
    })
  );

  res.status(200).send(result.Attributes);
});

export default router;
