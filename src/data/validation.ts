import * as z from "zod";

const UserSchema = z.object({
  pk: z
    .string({
      message: "The primary key (pk) must be a string.",
    })
    .min(1, {
      message: "The primary key (pk) is required.",
    })
    .regex(/^USER#u\d+$/, {
      message: "The primary key (pk) must start with 'USER#u' followed by a number (e.g., 'USER#u123').",
    }),
  sk: z.literal("META", {
    message: "The Sort key (sk) must be exactly 'META'.",
  }),
  name: z
    .string({
      message: "Name must be a string.",
    })
    .min(1, {
      message: "Name is required.",
    }),
});

const IdSchema = z
  .number({
    message: "Id must be a number.",
  })
  .int({
    message: "Id must be an integer.",
  });

const ProductSchema = z.object({
  pk: z.literal("PRODUCTS", {
    message: "The primary key (pk) must be exactly 'PRODUCTS'.",
  }),
  sk: z
    .string({
      message: "Sort key (sk) must be a string.",
    })
    .regex(/^PRODUCT#p\d+$/, {
      message: "The sort key (sk) must start with 'PRODUCT#p' followed by a number (e.g., 'PRODUCT#p123').",
    }),
  amountStock: z
    .number({
      message: "Stock must be a number.",
    })
    .gte(0, {
      message: "Stock cannot be less than 0.",
    }),
  price: z
    .number({
      message: "Price must be a number.",
    })
    .gte(0, {
      message: "Price cannot be less than 0.",
    }),
  name: z
    .string({
      message: "Name must be a string.",
    })
    .min(1, {
      message: "Product name is required.",
    }),
});

const UpdateProductSchema = z.object({
  amountStock: z
    .number({
      message: "Stock must be a number.",
    })
    .gte(0, {
      message: "Stock cannot be less than 0.",
    }),
  price: z
    .number({
      message: "Price must be a number.",
    })
    .gte(0, {
      message: "Price cannot be less than 0.",
    }),
  name: z
    .string({
      message: "Name must be a string.",
    })
    .min(1, {
      message: "Product name is required.",
    }),
});

const CartItemCreate = z.object({
  productId: z
    .number({
      message: "productId must be a number.",
    })
    .int({
      message: "productId must be an integer.",
    })
    .min(1, {
      message: "productId is required.",
    }),
  amount: z
    .number({
      message: "amount must be a number.",
    })
    .int({
      message: "amount must be an integer.",
    })
    .min(1, {
      message: "amount is required.",
    }),
});

const CartItemUpdate = z.object({
  amount: z
    .number({
      message: "amount must be a number.",
    })
    .int({
      message: "amount must be an integer.",
    })
    .min(1, {
      message: "amount is required.",
    }),
});

export { UserSchema, IdSchema, ProductSchema, UpdateProductSchema, CartItemCreate, CartItemUpdate };
