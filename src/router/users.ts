import { GetCommand, QueryCommand, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
import express from "express"
import type { Request, Response, Router } from "express"
import { db, myTable } from "../data/db.js"
import  { UserIdSchema, UserSchema } from "../data/validation.js"
import type { CreateUserBody, CreateUserSuccessResponse, DeleteUserSuccessResponse, ErrorResponse, GetUsersResponse, UpdateUserBody, User, UserIdParams } from "../data/types.js"



const router: Router = express.Router()

export type GetResult = Record<string, any> | undefined


// get all users

router.get("/", async (req, res: Response<GetUsersResponse | ErrorResponse>) => {
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

    // const items = result.Items as user[]  // old before successResponse type
    res.status(200).send({   // respond with 200 ok and count of user and the useres
        success: true ,  // added success true to match successResponse type
        counter: result.Count ?? 0, // ?? = nullish coalescing operator if null or undefined then 0
        items: result.Items ?? [] 
    }) 
    

  } catch (error) {
    res.status(500).send({
        success: false,
        error: (error as Error).message,
        message: "Could not fetch users"
    //   message: "Could not fetch users" // might need if count is zero sense you cant only get "Cannot GET"
    })
  }
});

// get user by id

router.get("/:id", async (req: Request<UserIdParams>, res: Response<GetUsersResponse | ErrorResponse>) => {
    try {
        const validationResult = UserIdSchema.safeParse(req.params.id ) // validate user id from params
        if (!validationResult.success) {  // if validation fails
            return res.status(400).send({
                success: false,
                error: validationResult.error.message,
                message: "Invalid user ID"
            })
        }
        const userId = validationResult.data // get validated user id

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


    res.send({   // respond with 200 ok and count of user and the useres
    //    count: result.Count,
    //     items
       
        success: true,
        counter: result.count ?? 0,
        items: result.Items ?? []
    }) 
    } catch (error) {
        res.send({
            success: false,
            error: (error as Error).message,
            message: "Could not fetch by Id" // 
        })
        
    }
})

// POST create new user

router.post("/", async (req: Request<CreateUserBody>, res: Response<CreateUserSuccessResponse | ErrorResponse>) => {
    try {
        let validationResult = UserSchema.safeParse(req.body) // validate input data

        if (!validationResult.success) {   // if validation fails
            return res.status(400).send({
                success: false,
                error: validationResult.error.message,
                message: "Invalid user data"
            })
        }

        const newUser = validationResult.data  // get validated data

        await db.send(new PutCommand({
            TableName: myTable,
            Item: newUser,
            ConditionExpression: "attribute_not_exists(pk)" // prevent overwriting existing user
        }))
        res.status(201).send({
            success: true,
            message: "User created successfully",
            user: newUser
        })
    }
    catch (error) {

        res.status(500).send({
            success: false,
            error: (error as Error).message,
            message: "failed to create user"
        })
    }
})

// DELETE user by id

router.delete("/:id", async (req: Request<UserIdParams>, res: Response<DeleteUserSuccessResponse | ErrorResponse>) => {
    try {
        const validationResult = UserIdSchema.safeParse( req.params.id ) // validate user id from params
         if (!validationResult.success) {
            return res.status(400).send({
                success: false,
                error: validationResult.error.message,
                message: "Invalid user ID format"
            })
        }

        const userId = validationResult.data

        await db.send(new DeleteCommand({
            TableName: myTable,
            Key: {
                pk: userId,
                sk: "meta"
            },
            ConditionExpression: "attribute_exists(pk)" // ensure user exists
        }))
        res.status(204).send({
            success: true,
            message: "User deleted successfully"
        }) // no content
    } catch (error) {
        res.status(500).send({
            success: false,
            error: (error as Error).message,
            message: "Failed to delete user"
        })
    }
})

// PUT update user by Id 
router.put("/:id", async (req: Request<UserIdParams, {}, UpdateUserBody>, res: Response<CreateUserSuccessResponse | ErrorResponse>) => {
    try {
        const userId = req.params.id
        let validationResult = UserSchema.safeParse(req.body) // validate input data

        if (!validationResult.success) {  // if validation fails
            return res.status(400).send({
                success: false,
                error: validationResult.error.message,
                message: "Invalid user data"
            })
        }
        const updatedUser = validationResult.data  // get validated data

        if (userId !== updatedUser.pk) {  // ensure id in url matches id in body, so we dont get diffrent ids 
            return res.status(400).send({
                success: false,
                error: "ID mismatch",
                message: "User ID in URL and body do not match"
            })
        }

        await db.send(new PutCommand({
            TableName: myTable,
            Item: updatedUser,
            ConditionExpression: "attribute_exists(pk)" // ensure user exists
        }))

        res.status(200).send({
            success: true,
            message: "User updated successfully",
            user: updatedUser
        })
    }
    catch (error) {
        res.status(500).send({
            success: false,
            error: (error as Error).message,
            message: "Failed to update user"
        })
    }
})


export default router;
