require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();

/* ===============================
   CONFIG
================================ */
const PORT = process.env.PORT || 4000;

/* ===============================
   MIDDLEWARE
================================ */
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   MYSQL CONNECTION
================================ */
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
    return;
  }
  console.log("✅ MySQL connected");
});

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   GET PRODUCTS (for dropdowns)
================================ */
app.get("/api/products", (req, res) => {
  const sql = `
    SELECT 
      id,
      COALESCE(name_mr, display_name) AS name
    FROM products
    ORDER BY id
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* ===============================
   STOCK (with brand filter)
================================ */
app.get("/api/stock", (req, res) => {
  const { product_id } = req.query;

  let sql = `
    SELECT
      p.id,
      COALESCE(p.name_mr, p.display_name) AS product,
      p.unit,
      IFNULL(s.quantity, 0) AS stock
    FROM products p
    LEFT JOIN stock s ON s.product_id = p.id
  `;

  const params = [];

  if (product_id) {
    sql += " WHERE p.id = ?";
    params.push(product_id);
  }

  sql += " ORDER BY p.id";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* ===============================
   PURCHASE (stock IN)
================================ */
app.post("/api/purchase", (req, res) => {
  const { product_id, quantity, dealer_name } = req.body;

  if (!product_id || !quantity || !dealer_name) {
    return res.status(400).json({ error: "Missing fields" });
  }

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
    if (err) return res.status(500).json({ error: err.message });

    db.query(updateStock, [product_id, quantity], err2 => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

/* ===============================
   SALE (stock OUT)
================================ */
app.post("/api/sale", (req, res) => {
  const { product_id, quantity, customer_name } = req.body;

  if (!product_id || !quantity || !customer_name) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const insertSale = `
    INSERT INTO sales (product_id, quantity, customer_name)
    VALUES (?, ?, ?)
  `;

  const reduceStock = `
    UPDATE stock
    SET quantity = quantity - ?
    WHERE product_id = ? AND quantity >= ?
  `;

  db.query(insertSale, [product_id, quantity, customer_name], err => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(reduceStock, [quantity, product_id, quantity], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });

      if (result.affectedRows === 0) {
        return res.status(400).json({ error: "Insufficient stock" });
      }

      res.json({ success: true });
    });
  });
});

/* ===============================
   REPORTS (daily / monthly + brand filter)
================================ */
app.get("/api/report/:type", (req, res) => {
  const { type } = req.params;
  const { month, product_id } = req.query;

  const table = type === "sale" ? "sales" : "purchases";

  let sql = `
    SELECT
      COALESCE(p.name_mr, p.display_name) AS product,
      t.quantity,
      t.created_at
    FROM ${table} t
    JOIN products p ON p.id = t.product_id
    WHERE 1=1
  `;

  const params = [];

  if (month) {
    sql += " AND DATE_FORMAT(t.created_at, '%Y-%m') = ?";
    params.push(month);
  }

  if (product_id) {
    sql += " AND p.id = ?";
    params.push(product_id);
  }

  sql += " ORDER BY t.created_at DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/* ===============================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
