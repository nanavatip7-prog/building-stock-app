require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();
app.use(express.json());

// ✅ CONNECT USING MYSQL_URL (Railway way)
const db = mysql.createPool(process.env.MYSQL_URL);

db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
  } else {
    console.log("✅ MySQL connected");
    conn.release();
  }
});

// ---------- API ROUTES ----------

// Health check
app.get("/", (req, res) => {
  res.send("Server is alive");
});

// STOCK
app.get("/api/stock", (req, res) => {
  const sql = `
    SELECT 
      p.id,
      COALESCE(p.name_mr, p.display_name) AS product,
      p.unit,
      IFNULL(s.quantity, 0) AS stock
    FROM products p
    LEFT JOIN stock s ON s.product_id = p.id
    ORDER BY p.id
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// PURCHASE (increase stock)
app.post("/api/purchase", (req, res) => {
  const { product_id, quantity, dealer_name } = req.body;

  const insertPurchase = `
    INSERT INTO purchases (product_id, quantity, dealer_name)
    VALUES (?, ?, ?)
  `;

  const updateStock = `
    INSERT INTO stock (product_id, quantity)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
  `;

  db.query(insertPurchase, [product_id, quantity, dealer_name], err => {
    if (err) return res.status(500).json({ error: "Database error" });

    db.query(updateStock, [product_id, quantity], err2 => {
      if (err2) return res.status(500).json({ error: "Database error" });
      res.json({ success: true });
    });
  });
});

// SALE (decrease stock)
app.post("/api/sale", (req, res) => {
  const { product_id, quantity, customer_name } = req.body;

  const insertSale = `
    INSERT INTO sales (product_id, quantity, customer_name)
    VALUES (?, ?, ?)
  `;

  const updateStock = `
    UPDATE stock SET quantity = quantity - ?
    WHERE product_id = ?
  `;

  db.query(insertSale, [product_id, quantity, customer_name], err => {
    if (err) return res.status(500).json({ error: "Database error" });

    db.query(updateStock, [quantity, product_id], err2 => {
      if (err2) return res.status(500).json({ error: "Database error" });
      res.json({ success: true });
    });
  });
});

// REPORTS
app.get("/api/report/:type", (req, res) => {
  const { type } = req.params;
  const { month } = req.query;

  let table = type === "purchase" ? "purchases" : "sales";

  let sql = `
    SELECT 
      t.created_at,
      COALESCE(p.name_mr, p.display_name) AS product,
      t.quantity,
      ${type === "purchase" ? "t.dealer_name" : "t.customer_name"} AS person
    FROM ${table} t
    JOIN products p ON p.id = t.product_id
  `;

  if (month) {
    sql += ` WHERE DATE_FORMAT(t.created_at, '%Y-%m') = ?`;
  }

  db.query(sql, month ? [month] : [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// ---------- FRONTEND ----------
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
