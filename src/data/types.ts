// success response for DELETE, PUT and POST.
export type OperationResult<T> = {
  success: true;
  message: string;
  item: T | GetResult;
};

// success response for GET
export type SuccessResponse<T> = {
  success: boolean;
  count: number;
  items: T[] | T;
};

// Error response for all endpoints
export type ErrorResponse = {
  success: boolean;
  message: string;
  error: string;
};

export type GetResult = Record<string, any> | undefined;

// for url-params
export interface IdParam {
    id: string
}

// request body types
