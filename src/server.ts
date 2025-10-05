import express from "express";
import type { Express, RequestHandler } from "express";
import productsRouter from "./router/products.js";
import usersRouter from "./router/users.js";
import cartRouter from "./router/cart.js";

const port = process.env.PORT;
const app: Express = express();

const logger: RequestHandler = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

app.use("/", logger);
app.use(express.json());

app.use("/products", productsRouter);
app.use("/users", usersRouter);
app.use("/cart", cartRouter);

app.listen(port, () => {
  console.log(`Server listening on port ${port}...`);
});
