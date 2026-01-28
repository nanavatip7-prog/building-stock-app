const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ MySQL connection using Railway URL
const db = mysql.createPool(process.env.MYSQL_URL);

// Test DB connection
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
  } else {
    console.log("✅ MySQL connected");
    conn.release();
  }
});

// =======================
// API ROUTES
// =======================

// Get stock
app.get("/api/stock", (req, res) => {
  const sql = "SELECT * FROM products ORDER BY display_name";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// Purchase (increase stock)
app.post("/api/purchase", (req, res) => {
  const { product_id, quantity, dealer_name } = req.body;

  db.query(
    "INSERT INTO purchases (product_id, quantity, dealer_name) VALUES (?, ?, ?)",
    [product_id, quantity, dealer_name],
    () => {
      db.query(
        "UPDATE products SET stock = stock + ? WHERE id = ?",
        [quantity, product_id],
        () => res.json({ success: true })
      );
    }
  );
});

// Sale (decrease stock)
app.post("/api/sale", (req, res) => {
  const { product_id, quantity, customer_name } = req.body;

  db.query(
    "INSERT INTO sales (product_id, quantity, customer_name) VALUES (?, ?, ?)",
    [product_id, quantity, customer_name],
    () => {
      db.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [quantity, product_id],
        () => res.json({ success: true })
      );
    }
  );
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
