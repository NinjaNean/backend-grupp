import { GetCommand, QueryCommand, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { userSchema } from "../data/validation.js";
import type { GetResult, user } from "../data/types.js";

const router: Router = express.Router();

// get all users

// router.get('/', async (req: Request, res: Response) => {
//     try {
//         const scanCommand = new ScanCommand({
//             TableName: myTable,
//             FilterExpression: "PK = :pk AND SK = :sk",
//             ExpressionAttributeValues: {
//                 ":pk": "user",
//                 ":sk": "meta"
//             }
//         })
//         const result = await db.send(scanCommand)
//         res.send(result.Items as user[])
//     } catch (error) {
//         res.status(500).send({ error: "Failed to fetch users" })
//     }
// })

router.get("/", async (req, res: Response) => {
  try {
    const result: GetResult = await db.send(
      new ScanCommand({
        // ScanCommand to get entire table
        TableName: myTable,
        FilterExpression: "begins_with(pk, :userPrefix) AND begins_with(sk, :meta)", // filter for users only
        ExpressionAttributeValues: {
          ":userPrefix": "user", // all users have pk starting with "user"
          ":meta": "meta", // all user meta have sk "meta"
        },
      })
    );

    const items = result.Items as user[]; //
    res.status(200).send({
      // respond with 200 ok and count of user and the useres
      count: result.Count ?? 0, // ?? = nullish coalescing operator if null or undefined then 0
      items,
    });
  } catch (error) {
    res.status(500).send({
      message: "Could not fetch users", // might need if count is zero sense you cant only get "Cannot GET"
    });
  }
});

// get user by id

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id; // get id from params
    // const pkValue = `user${userId.substring(1)} // if you want to use u1 instead of useru1 for id search

    const result: GetResult = await db.send(
      new QueryCommand({
        TableName: myTable,
        KeyConditionExpression: "pk = :user AND begins_with(sk, :meta)", // query for specific user by id
        ExpressionAttributeValues: {
          ":user": userId,
          ":meta": "meta",
        },
      })
    );

    const items = result.Items as user[]; //
    res.status(200).send({
      // respond with 200 ok and count of user and the useres
      count: result.Count,
      items,
    });
  } catch (error) {
    res.status(500).send({
      message: "Could not fetch user by id", //
    });
  }
});

// POST create new user

router.post("/", async (req: Request, res: Response) => {
  try {
    let newUser: user = userSchema.parse(req.body); // validate input data

    await db.send(
      new PutCommand({
        TableName: myTable,
        Item: newUser,
        ConditionExpression: "attribute_not_exists(pk)", // prevent overwriting existing user
      })
    );
    res.status(201).send(newUser);
  } catch (error) {
    res.status(500).send({ error: "Failed to add user", details: error });
  }
});

// DELETE user by id

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    await db.send(
      new DeleteCommand({
        TableName: myTable,
        Key: {
          pk: userId,
          sk: "meta",
        },
        ConditionExpression: "attribute_exists(pk)", // ensure user exists
      })
    );
    res.status(204).send(); // no content
  } catch (error) {
    res.status(500).send({ error: "Failed to delete user", details: error });
  }
});

// PUT update user by Id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    let updatedUser: user = userSchema.parse(req.body); // validate input data
    if (userId !== updatedUser.pk) {
      // ensure id in url matches id in body, so we dont get diffrent ids
      return res.status(400).send({ error: "User ID in URL and body do not match" });
    }
    await db.send(
      new PutCommand({
        TableName: myTable,
        Item: updatedUser,
        ConditionExpression: "attribute_exists(pk)", // ensure user exists
      })
    );
    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(500).send({ error: "Failed to update user", details: error });
  }
});

export default router;
