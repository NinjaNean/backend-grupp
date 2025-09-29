type Product = {
  image: string;
  amountStock: number;
  sk: string;
  pk: string;
  price: number;
  name: string;
};

export interface user {
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
  items: Product[] | user[] | CartItem[];
};

export type ErrorResponse = {
  success: boolean;
  message: string;
  error: string;
};

export type GetResult = Record<string, any> | undefined;
