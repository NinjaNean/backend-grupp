import express from "express";
import type { Express, RequestHandler } from "express";
import productsRouter from "./router/products.js";
import usersRouter from "./router/users.js";
import cartRouter from "./router/cart.js";
import path from "path";                
import { fileURLToPath } from "url";    

const port = process.env.PORT || 3000;
const app: Express = express();

// Logger
const logger: RequestHandler = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

app.use("/", logger);
app.use(express.json());

app.use("/products", productsRouter);
app.use("/users", usersRouter);
app.use("/cart", cartRouter);

// front
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "..", "frontend"); 

app.use(express.static(frontendPath));
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}...`);
});
