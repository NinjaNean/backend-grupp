import * as z from "zod";

const UserSchema = z.object({
  pk: z
    .string()
    .min(1)
    .regex(/^USER#u\d+$/), // pk must start with "USER#u" followed by a number.
  sk: z.literal("META"), // sk must be exactly "META"
  name: z.string().min(1), // name must be a non-empty string.
});

const UserIdSchema = z
  .string()
  .min(1)
  .regex(/^\d+/); // id must start with a number.

const ProductSchema = z.object({
  pk: z.literal("PRODUCTS", {
    message: "The primary key (pk) must be exactly 'PRODUCTS'.",
  }),
  sk: z
    .string({
      message: "Sort key (sk) must be a string.",
    })
    .regex(/^PRODUCT#p\d+$/, {
      message: "The sort key (sk) must start with 'PRODUCT#' followed by a number (e.g., 'PRODUCT#p123').",
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
  image: z.string({
    message: "Image must be a string (URL).",
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

const CartItemCreate = z.object({
  productId: z.string().min(1).regex(/^\d+$/),
  amount: z.number().int().min(1),
});

const CartItemUpdate = z.object({
  amount: z.number().int().min(1),
});

export { UserSchema, UserIdSchema, ProductSchema, UpdateProductSchema, CartItemCreate, CartItemUpdate };
