import * as z from "zod";


const userSchema = z.object({
    pk: z.string().min(1).regex(/^user\w+/), // pk must start with "user" followed by one or more word characters
    sk: z.string().min(1).regex(/^meta$/),   // sk must be exactly "meta"
    name: z.string().min(1)                  // name must be a non-empty string
    })

const userIdSchema = z.string().min(1).regex(/^user/) // id must start with "user"


export  { userSchema, userIdSchema }