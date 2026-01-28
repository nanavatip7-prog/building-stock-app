const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ===== MYSQL CONNECTION =====
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ===== DEBUG ROUTE =====
app.get("/api/debug-db", (req, res) => {
  res.json({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT,
    hasPassword: !!process.env.MYSQLPASSWORD
  });
});

// ===== STOCK API =====
app.get("/api/stock", (req, res) => {
  const sql = `
    SELECT 
      p.id,
      p.brand,
      p.size,
      p.unit,
      s.quantity
    FROM products p
    JOIN stock s ON p.id = s.product_id
    ORDER BY p.id;
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("DB ERROR:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// ===== FRONTEND =====
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
