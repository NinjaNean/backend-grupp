import { ScanCommand } from "@aws-sdk/client-dynamodb";
import express from "express";
import type { Router } from "express";
import { db, myTable } from "../data/db.js";

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

export default router;
