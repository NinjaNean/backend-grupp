import express from "express";
import type { Request, Response, Router } from "express";
import { db, myTable } from "../data/db.js";
import { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { CartItem } from "../data/types.js";

const router: Router = express.Router();

//DELETE för att radera en specifik produkt i en användares kundvagn.
//DELETE för att radera hela användares kundvagn.

//lägga till request/response?

// GET Hämta användarinfo och produkter i användarens cart
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId; // useru1 eller useru2

    const result = await db.send(
      new QueryCommand({
        TableName: myTable,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": userId,
        },
      })
    );

    const items = result.Items || [];

    // Separera meta och produkter i cart
    const meta = items.find((item: any) => item.sk === "meta") || {};
    const cartItems = items
      .filter((item: any) => item.sk.startsWith("cart"))
      .map((item: any) => ({
        id: item.sk,
        userId: userId,
        productId: item.productId ?? "",
        amount: Number(item.amount ?? 1),
      }));

    const response = {
      userId,
      name: meta.name ?? "", //inte null eller undefined, annars tom
      cart: cartItems,
    };

    console.log(`GET /cart/${userId}`, response);
    res.send({ success: true, ...response });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, error: "Could not fetch the user's cart" });
  }
});

// POST Lägg till en produkt i användarens cart
router.post("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId!;
    const { productId, amount, price, name } = req.body;

    if (!productId || !amount) {
      return res.status(400).send({ error: "productId and amount are required" });
    }

    const cartId = `cart${Date.now()}`;
    const newCartItem: CartItem = { id: cartId, userId, productId, amount };

    const dbItem = { pk: userId, sk: cartId, productId, amount };

    await db.send(new PutCommand({ TableName: myTable, Item: dbItem }));

    console.log("POST /cart/:userId", newCartItem);
    res.status(201).send({ success: true, item: newCartItem });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, error: "Could not add product to cart" });
  }
});

// PUT Uppdatera antal av en produkt i användarens cart
router.put("/:userId/:cartId", async (req: Request, res: Response) => {
  try {
    const { userId, cartId } = req.params;
    const { amount } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).send({ error: "Amount must be at least 1" });
    }

    const result = await db.send(
      new UpdateCommand({
        TableName: myTable,
        Key: { pk: userId, sk: cartId },
        UpdateExpression: "SET amount = :amount",
        ExpressionAttributeValues: { ":amount": amount },
        ReturnValues: "ALL_NEW",
      })
    );

    const updatedItem: CartItem = {
      id: result.Attributes?.sk ?? "",
      userId: result.Attributes?.pk ?? "",
      productId: result.Attributes?.productId ?? "",
      amount: result.Attributes?.amount ?? 1,
    };

    console.log("PUT /cart/:userId/:cartId ->", updatedItem);
    res.send({ success: true, item: updatedItem });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, error: "Could not update cart item" });
  }
});

type CartParams = { userId: string; cartId: string };
type UserParams = { userId: string };

type DbCartItem = {
  pk: string;      
  sk: string;       
  productId: string;
  amount: number;
};

// DELETE: ta bort en specifik produkt
router.delete(
  "/:userId/:cartId",
  async (req: Request<CartParams>, res: Response) => {
    const { userId, cartId } = req.params;

    try {
      const result = await db.send(
        new DeleteCommand({
          TableName: myTable,
          Key: { pk: userId, sk: cartId },
          ReturnValues: "ALL_OLD",
        })
      );

      const deleted = result.Attributes as DbCartItem | undefined;

      if (!deleted) {
        return res.status(404).send({
          success: false,
          error: "Produkten finns inte i kundvagnen",
        });
      }

      return res.send({
        success: true,
        message: "Produkten raderades från kundvagnen",
        item: deleted,
      });
    } catch {
      return res.status(500).send({
        success: false,
        error: "Kunde inte radera produkt från cart",
      });
    }
  }
);

// DELETE: töm hela kundvagnen
router.delete("/:userId", async (req: Request<UserParams>, res: Response) => {
  const { userId } = req.params;

  try {
    const q = await db.send(
      new QueryCommand({
        TableName: myTable,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :c)",
        ExpressionAttributeValues: { ":pk": userId, ":c": "cart" },
      })
    );

    const items = (q.Items ?? []) as DbCartItem[];

    await Promise.all(
      items.map((it) =>
        db.send(
          new DeleteCommand({ TableName: myTable, Key: { pk: it.pk, sk: it.sk } })
        )
      )
    );

    return res.send({
      success: true,
      message: "Hela kundvagnen raderades",
      removed: items.length,
    });
  } catch {
    return res.status(500).send({
      success: false,
      error: "Kunde inte radera hela carten",
    });
  }
});




export default router;
