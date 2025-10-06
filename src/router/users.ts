import { GetCommand, QueryCommand, ScanCommand, PutCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { UserIdSchema, UserSchema } from "../data/validation.js";
import type { ErrorResponse, OperationResult, SuccessResponse, IdParam, GetResult } from "../data/types.js";

const router: Router = express.Router();

interface CreateUserBody {
  pk: string;
  sk: string;
  name: string;
}

interface UpdateUserBody {
  name: string;
}

interface User {
  pk: string;
  sk: string;
  name: string;
}
interface UserName {
  name: string;
}

// get all users

router.get("/", async (req, res: Response<SuccessResponse<User> | ErrorResponse>) => {
  try {
    const result: GetResult = await db.send(
      new ScanCommand({
        // ScanCommand to get entire table
        TableName: myTable,
        FilterExpression: "begins_with(pk, :userPrefix) AND begins_with(sk, :meta)", // filter for users only
        ExpressionAttributeValues: {
          ":userPrefix": "USER", // all users have pk starting with "user"
          ":meta": "META", // all user meta have sk "meta"
        },
      })
    );

    // const items = result.Items as user[]  // old before successResponse type
    res.status(200).send({
      // respond with 200 ok and count of user and the useres
      success: true, // added success true to match successResponse type
      count: result.Count ?? 0, // ?? = nullish coalescing operator if null or undefined then 0
      items: result.Items ?? [],
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      error: (error as Error).message,
      message: "Could not fetch users",
      //   message: "Could not fetch users" // might need if count is zero sense you cant only get "Cannot GET"
    });
  }
});

// get user by id

router.get("/:id", async (req: Request<IdParam>, res: Response<SuccessResponse<User> | ErrorResponse>) => {
  try {
    const validationResult = UserIdSchema.safeParse(req.params.id); // validate user id from params
    if (!validationResult.success) {
      // if validation fails
      return res.status(400).send({
        success: false,
        error: validationResult.error.message,
        message: "Invalid user ID",
      });
    }
    const userId = validationResult.data; // get validated user id

    const result: GetResult = await db.send(
      new QueryCommand({
        TableName: myTable,
        KeyConditionExpression: "pk = :user AND begins_with(sk, :meta)", // query for specific user by id
        ExpressionAttributeValues: {
          ":user": `USER#u${userId}`,
          ":meta": "META",
        },
      })
    );
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).send({
        success: false,
        error: "Empty item",
        message: "User not found",
      });
    }

    res.status(200).send({
      // respond with 200 ok and count of user and the useres
      //    count: result.Count,
      //     items

      success: true,
      count: result.count ?? 0,
      items: result.Items ?? [],
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      error: (error as Error).message,
      message: "Could not fetch by Id", //
    });
  }
});

// POST create new user

router.post("/", async (req: Request<CreateUserBody>, res: Response<OperationResult<User> | ErrorResponse>) => {
  try {
    let validationResult = UserSchema.safeParse(req.body); // validate input data

    if (!validationResult.success) {
      // if validation fails
      return res.status(400).send({
        success: false,
        error: validationResult.error.message,
        message: "Invalid user data",
      });
    }

    const newUser = validationResult.data; // get validated data

    await db.send(
      new PutCommand({
        TableName: myTable,
        Item: newUser,
        ConditionExpression: "attribute_not_exists(pk)", // prevent overwriting existing user
      })
    );
    res.status(201).send({
      success: true,
      message: "User created successfully",
      item: newUser,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      error: (error as Error).message,
      message: "failed to create user",
    });
  }
});

// DELETE user by id

router.delete("/:id", async (req: Request<IdParam>, res: Response<OperationResult<User> | ErrorResponse>) => {
  try {
    const userId = req.params.id;

    const result = await db.send(
      new DeleteCommand({
        TableName: myTable,
        Key: {
          pk: `USER#u${userId}`,
          sk: "META",
        },
        ConditionExpression: "attribute_exists(pk)", // ensure user exists
        ReturnValues: "ALL_OLD",
      })
    );

    const deletedUser = result.Attributes as User;

    res.status(200).send({
      success: true,
      message: "User deleted successfully",
      item: deletedUser,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      error: (error as Error).message,
      message: "Failed to delete user",
    });
  }
});

// PUT update user by Id
router.put(
  "/:id",
  async (req: Request<IdParam, {}, UpdateUserBody>, res: Response<OperationResult<UserName> | ErrorResponse>) => {
    try {
      const userId = req.params.id;

      let validationResult = UserSchema.pick({ name: true }).safeParse(req.body); // you can select fields with pick

      if (!validationResult.success) {
        // if validation fails
        return res.status(400).send({
          success: false,
          error: validationResult.error.message,
          message: "Invalid user data",
        });
      }

      const name = validationResult.data.name;

      await db.send(
        new UpdateCommand({
          TableName: myTable,
          Key: {
            pk: `USER#u${userId}`,
            sk: "META",
          },
          UpdateExpression: "SET #name = :name",
          ExpressionAttributeNames: {
            "#name": "name",
          },
          ExpressionAttributeValues: {
            ":name": name,
          },
          ConditionExpression: "attribute_exists(pk)", // ensure user exists
        })
      );

      res.status(200).send({
        success: true,
        message: "User name updated successfully",
        item: { name },
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        error: (error as Error).message,
        message: "Failed to update user",
      });
    }
  }
);

export default router;
