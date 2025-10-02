// success response for DELETE, PUT and POST.
export type OperationResult<T> = {
  success: true;
  message: string;
  item: T | null;
};

export type CartItem = {
  id: string;
  userId: string;
  productId: string;
  amount: number;
};

// success response for GET
export type SuccessResponse<T> = {
  success: boolean;
  count: number;
  items: T[] | T;
};

type Error = {
  field: string;
  message: string;
};

// Error response for all endpoints
export type ErrorResponse = {
  success: boolean;
  message: string;
  error: string | Error[];
};

export type GetResult = Record<string, any> | undefined;

// for url-params
export interface IdParam {
  id: string;
}

// request body types
export interface CreateUserBody {
  pk: string;
  sk: string;
  name: string;
}

export interface UpdateUserBody {
  pk: string;
  sk: string;
  name: string;
}
