export type Product = {
  image: string;
  amountStock: number;
  sk: string;
  pk: string;
  price: number;
  name: string;
};

export type OperationResult<T> = {
  success: true;
  message: string;
  item: T | null;
};

export interface User {
  pk: string;
  sk: string;
  name: string;
}

export type CartItem = {
  id: string;
  userId: string;
  productId: string;
  amount: number;
};

export type SuccessResponse = {
  success: boolean;
  count: number;
  items: Product[] | User[] | CartItem[];
};

export type ErrorResponse = {
  success: boolean;
  message: string;
  error: string;
};

export type GetResult = Record<string, any> | undefined;

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