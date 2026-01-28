console.log("🚀 Server starting...");

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// SERVE FRONTEND
// ===============================
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// MYSQL CONNECTION (RAILWAY)
// ===============================
if (!process.env.MYSQL_URL) {
  console.error("❌ MYSQL_URL not found in environment variables");
  process.exit(1);
}

const db = mysql.createPool(process.env.MYSQL_URL);

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL Connection Failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to Railway MySQL");
  connection.release();
});

// ===============================
// API ROUTES
// ===============================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// Fetch stock
app.get("/api/stock", (req, res) => {
  const query = `
    SELECT 
      p.id,
      p.name AS product,
      p.unit,
      s.quantity AS stock
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    ORDER BY p.name
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// Purchase (increase stock)
app.post("/api/purchase", (req, res) => {
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity) {
    return res.status(400).json({ message: "Invalid input" });
  }

  db.query(
    `INSERT INTO stock (product_id, quantity)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
    [product_id, quantity, quantity],
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ message: "Purchase recorded" });
    }
  );
});

// Sale (decrease stock)
app.post("/api/sale", (req, res) => {
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity) {
    return res.status(400).json({ message: "Invalid input" });
  }

  db.query(
    `UPDATE stock SET quantity = quantity - ?
     WHERE product_id = ? AND quantity >= ?`,
    [quantity, product_id, quantity],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      res.json({ message: "Sale recorded" });
    }
  );
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
