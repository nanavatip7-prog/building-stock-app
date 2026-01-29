import express from "express";
import mysql from "mysql2/promise";

const app = express();
app.use(express.json());

let db;

// CONNECT USING RAILWAY MYSQL_URL
(async () => {
  try {
    db = await mysql.createPool(process.env.MYSQL_URL);
    console.log("✅ MySQL connected (Railway)");
  } catch (err) {
    console.error("❌ MySQL connection failed:", err);
  }
})();

// HEALTH CHECK
app.get("/", (req, res) => {
  res.send("Server is alive");
});

// STOCK API
app.get("/api/stock", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COALESCE(p.name_mr, p.display_name) AS product,
        p.unit,
        IFNULL(s.quantity, 0) AS stock
      FROM products p
      LEFT JOIN stock s ON s.product_id = p.id
      ORDER BY p.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// PURCHASE API
app.post("/api/purchase", async (req, res) => {
  const { product_id, quantity, dealer_name } = req.body;

  try {
    await db.query(
      "INSERT INTO purchases (product_id, quantity, dealer_name) VALUES (?, ?, ?)",
      [product_id, quantity, dealer_name]
    );

    await db.query(
      "INSERT INTO stock (product_id, quantity) VALUES (?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)",
      [product_id, quantity]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// SALE API
app.post("/api/sale", async (req, res) => {
  const { product_id, quantity, customer_name } = req.body;

  try {
    await db.query(
      "INSERT INTO sales (product_id, quantity, customer_name) VALUES (?, ?, ?)",
      [product_id, quantity, customer_name]
    );

    await db.query(
      "UPDATE stock SET quantity = quantity - ? WHERE product_id = ?",
      [quantity, product_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
