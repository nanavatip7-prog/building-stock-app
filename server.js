// ================== SERVER.JS (RAILWAY SAFE) ==================

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serves index.html

// ---------- DATABASE (ENV BASED) ----------
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test DB connection (SAFE – won’t crash app)
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
  } else {
    console.log("✅ MySQL connected");
    connection.release();
  }
});

// ---------- BASIC ROUTE ----------
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Backend running" });
});

// ---------- PRODUCTS ----------
app.get("/products", (req, res) => {
  db.query(
    "SELECT id, display_name, unit, stock FROM products ORDER BY display_name",
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json(rows);
    }
  );
});

// ---------- PURCHASE ----------
app.post("/purchase", (req, res) => {
  const { product_id, quantity, dealer_name } = req.body;

  if (!product_id || !quantity || !dealer_name) {
    return res.status(400).json({ message: "सर्व माहिती आवश्यक आहे" });
  }

  db.query(
    "UPDATE products SET stock = stock + ? WHERE id = ?",
    [quantity, product_id],
    err => {
      if (err) return res.status(500).json(err);

      db.query(
        "INSERT INTO purchases (product_id, quantity, dealer_name) VALUES (?, ?, ?)",
        [product_id, quantity, dealer_name],
        err2 => {
          if (err2) return res.status(500).json(err2);
          res.json({ message: "खरेदी यशस्वी" });
        }
      );
    }
  );
});

// ---------- SALE ----------
app.post("/sale", (req, res) => {
  const { product_id, quantity, customer_name } = req.body;

  if (!product_id || !quantity || !customer_name) {
    return res.status(400).json({ message: "सर्व माहिती आवश्यक आहे" });
  }

  db.query(
    "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
    [quantity, product_id, quantity],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.affectedRows === 0) {
        return res.status(400).json({ message: "पुरेसा साठा उपलब्ध नाही" });
      }

      db.query(
        "INSERT INTO sales (product_id, quantity, customer_name) VALUES (?, ?, ?)",
        [product_id, quantity, customer_name],
        err2 => {
          if (err2) return res.status(500).json(err2);
          res.json({ message: "विक्री यशस्वी" });
        }
      );
    }
  );
});

// ---------- REPORT: DAILY ----------
app.get("/report/daily", (req, res) => {
  const result = {};

  db.query(
    `SELECT pr.display_name, p.quantity, p.dealer_name, p.created_at
     FROM purchases p JOIN products pr ON p.product_id = pr.id
     WHERE DATE(p.created_at) = CURDATE()
     ORDER BY p.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json(err);
      result.purchases = rows;

      db.query(
        `SELECT pr.display_name, s.quantity, s.customer_name, s.created_at
         FROM sales s JOIN products pr ON s.product_id = pr.id
         WHERE DATE(s.created_at) = CURDATE()
         ORDER BY s.created_at DESC`,
        (err2, rows2) => {
          if (err2) return res.status(500).json(err2);
          result.sales = rows2;
          res.json(result);
        }
      );
    }
  );
});

// ---------- REPORT: MONTHLY ----------
app.get("/report/monthly", (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ message: "Month required" });

  const result = {};

  db.query(
    `SELECT pr.display_name, p.quantity, p.dealer_name, p.created_at
     FROM purchases p JOIN products pr ON p.product_id = pr.id
     WHERE DATE_FORMAT(p.created_at,'%Y-%m') = ?
     ORDER BY p.created_at DESC`,
    [month],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      result.purchases = rows;

      db.query(
        `SELECT pr.display_name, s.quantity, s.customer_name, s.created_at
         FROM sales s JOIN products pr ON s.product_id = pr.id
         WHERE DATE_FORMAT(s.created_at,'%Y-%m') = ?
         ORDER BY s.created_at DESC`,
        [month],
        (err2, rows2) => {
          if (err2) return res.status(500).json(err2);
          result.sales = rows2;
          res.json(result);
        }
      );
    }
  );
});

// ---------- START SERVER (RAILWAY SAFE) ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
