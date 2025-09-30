import * as z from "zod";

const userSchema = z.object({
  pk: z
    .string()
    .min(1)
    .regex(/^user\w+/), // pk must start with "user" followed by one or more word characters
  sk: z
    .string()
    .min(1)
    .regex(/^meta$/), // sk must be exactly "meta"
  name: z.string().min(1), // name must be a non-empty string
});

const ProductSchema = z.object({
  pk: z.literal("products"),
  sk: z.string().regex(/^productId#\d+$/),
  image: z.string(),
  amountStock: z.number(),
  price: z.number(),
  name: z.string().min(1),
});

const UpdateProductSchema = z.object({
  image: z.string(),
  amountStock: z.number(),
  price: z.number(),
  name: z.string().min(1),
});

export { userSchema, ProductSchema, UpdateProductSchema };
