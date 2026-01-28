const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let pool;

// create pool once
async function initDB() {
  if (!process.env.MYSQL_URL) {
    throw new Error("MYSQL_URL not set");
  }

  pool = mysql.createPool({
    uri: process.env.MYSQL_URL,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  // test connection
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();

  console.log("✅ MySQL connected");
}

initDB().catch(err => {
  console.error("❌ DB init failed:", err.message);
  process.exit(1); // crash ONCE, not loop silently
});

app.get("/", (req, res) => {
  res.send("Server is alive");
});

app.get("/api/stock", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.brand, p.size, p.unit, s.quantity AS stock
      FROM stock s
      JOIN products p ON p.id = s.product_id
    `);
    res.json(rows);
  } catch (err) {
    console.error("Stock API error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});

app.post("/api/purchase", async (req, res) => {
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    // 1. Update stock
    await db.query(
      "UPDATE stock SET quantity = quantity + ? WHERE product_id = ?",
      [quantity, product_id]
    );

    // 2. Insert transaction WITH created_at
    await db.query(
      `INSERT INTO transactions (product_id, type, quantity, created_at)
       VALUES (?, 'purchase', ?, NOW())`,
      [product_id, quantity]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("PURCHASE ERROR:", err);
    res.status(500).json({ error: "Database error" });
  }
});
