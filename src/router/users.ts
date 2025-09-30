import { GetCommand, QueryCommand, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
import express from "express"
import type { Request, Response, Router } from "express"
import { db, myTable } from "../data/db.js"
import  { userIdSchema, userSchema } from "../data/validation.js"



const router: Router = express.Router()

export type GetResult = Record<string, any> | undefined

interface User {
    pk: string
    sk: string
    name: string
}

type ErrorResponse = {
    success: false
    message: string
    error: string
}

type GetUsersResponse = {
    success: true
    counter: number
    items: User[]
}
 // post and put share response type
type CreateUserSuccessResponse = {
    success: true
    message: string
    user: User
}


type DeleteUserSuccessResponse = {
    success: true
    message: string
}

// get all users

router.get("/", async (req, res: Response<GetUsersResponse | ErrorResponse>) => {
  try {
    const result: GetResult = await db.send(
      new ScanCommand({  // ScanCommand to get entire table
        TableName: myTable,
        FilterExpression: "begins_with(pk, :userPrefix) AND begins_with(sk, :meta)",  // filter for users only
        ExpressionAttributeValues: {
          ":userPrefix": "user",   // all users have pk starting with "user"
          ":meta": "meta",         // all user meta have sk "meta"
        },
      })
    )

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
})

// get user by id 

router.get("/:id", async (req: Request, res: Response<GetUsersResponse | ErrorResponse>) => {
    try {
        const userId = req.params.id // get id from params
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
    )

    const items = result.Items as User[]  // old before successResponse type
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

router.post("/", async (req: Request, res: Response<CreateUserSuccessResponse | ErrorResponse>) => {
    try {
        let newUser: User = userSchema.parse(req.body) // validate input data

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

router.delete("/:id", async (req: Request, res: Response<DeleteUserSuccessResponse | ErrorResponse>) => {
    try {
        const userId = req.params.id

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
router.put("/:id", async (req: Request, res: Response<CreateUserSuccessResponse | ErrorResponse>) => {
    try {
        const userId = req.params.id
        let updatedUser: User = userSchema.parse(req.body) // validate input data

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


export default router
