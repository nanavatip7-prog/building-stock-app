console.log("🔥 ACTIVE server.js loaded");

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ================== SERVE FRONTEND ==================
app.use(express.static("public"));

// ================== DATABASE CONFIG ==================
// ⚠️ For now this still points to local DB (OK for testing)
// Later we will move this to Railway MySQL

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Parth9850@#",
  database: "stockdb"
});

// ⚠️ DO NOT crash server if DB fails
db.connect(err => {
  if (err) {
    console.error("❌ MySQL connection failed (app still running)");
  } else {
    console.log("✅ MySQL Connected");
  }
});

// ================== BASIC TEST ==================
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ================== PRODUCTS ==================
app.get("/products", (req, res) => {
  db.query(
    "SELECT id, display_name, unit, stock FROM products ORDER BY display_name",
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// ================== PURCHASE ==================
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

// ================== SALE ==================
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

// ================== REPORT HELPERS ==================
function productFilter(product_id) {
  return product_id ? " AND pr.id = ?" : "";
}

// ================== DAILY REPORT ==================
app.get("/report/daily", (req, res) => {
  const { product_id, type = "both" } = req.query;
  const params = product_id ? [product_id] : [];

  const purchasesQuery = `
    SELECT pr.display_name, p.quantity, p.dealer_name, p.created_at
    FROM purchases p
    JOIN products pr ON p.product_id = pr.id
    WHERE DATE(p.created_at) = CURDATE()
    ${productFilter(product_id)}
    ORDER BY p.created_at DESC
  `;

  const salesQuery = `
    SELECT pr.display_name, s.quantity, s.customer_name, s.created_at
    FROM sales s
    JOIN products pr ON s.product_id = pr.id
    WHERE DATE(s.created_at) = CURDATE()
    ${productFilter(product_id)}
    ORDER BY s.created_at DESC
  `;

  const result = {};

  const loadSales = () => {
    if (type === "purchase") return res.json(result);
    db.query(salesQuery, params, (err, rows) => {
      if (err) return res.status(500).json(err);
      result.sales = rows;
      res.json(result);
    });
  };

  if (type !== "sale") {
    db.query(purchasesQuery, params, (err, rows) => {
      if (err) return res.status(500).json(err);
      result.purchases = rows;
      loadSales();
    });
  } else {
    result.purchases = [];
    loadSales();
  }
});

// ================== MONTHLY REPORT ==================
app.get("/report/monthly", (req, res) => {
  const { month, product_id, type = "both" } = req.query;

  if (!month) {
    return res.status(400).json({ message: "Month required (YYYY-MM)" });
  }

  const params = product_id ? [month, product_id] : [month];

  const purchasesQuery = `
    SELECT pr.display_name, p.quantity, p.dealer_name, p.created_at
    FROM purchases p
    JOIN products pr ON p.product_id = pr.id
    WHERE DATE_FORMAT(p.created_at, '%Y-%m') = ?
    ${productFilter(product_id)}
    ORDER BY p.created_at DESC
  `;

  const salesQuery = `
    SELECT pr.display_name, s.quantity, s.customer_name, s.created_at
    FROM sales s
    JOIN products pr ON s.product_id = pr.id
    WHERE DATE_FORMAT(s.created_at, '%Y-%m') = ?
    ${productFilter(product_id)}
    ORDER BY s.created_at DESC
  `;

  const result = {};

  const loadSales = () => {
    if (type === "purchase") return res.json(result);
    db.query(salesQuery, params, (err, rows) => {
      if (err) return res.status(500).json(err);
      result.sales = rows;
      res.json(result);
    });
  };

  if (type !== "sale") {
    db.query(purchasesQuery, params, (err, rows) => {
      if (err) return res.status(500).json(err);
      result.purchases = rows;
      loadSales();
    });
  } else {
    result.purchases = [];
    loadSales();
  }
});

// ================== START SERVER (RAILWAY SAFE) ==================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
