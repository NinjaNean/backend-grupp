
// user types
export interface User {
    pk: string
    sk: string
    name: string
}

export type ErrorResponse = {
    success: false
    message: string
    error: string
}

// user response types
export type GetUsersResponse = {
    success: true
    counter: number
    items: User[]
}
 // post and put share response type
export type CreateUserSuccessResponse = {
    success: true
    message: string
    user: User
}


export type DeleteUserSuccessResponse = {
    success: true
    message: string
}

// user request types
export interface UserIdParams {
    id: string
}

// request body types
export interface CreateUserBody {
    pk: string
    sk: string
    name: string
}

export interface UpdateUserBody {
    pk: string
    sk: string
    name: string
}

