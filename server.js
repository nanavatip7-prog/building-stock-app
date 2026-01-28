app.get("/api/debug-db", (req, res) => {
  res.json({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT,
    hasPassword: !!process.env.MYSQLPASSWORD
  });
});

const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();

// =============================
// Middleware
// =============================
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =============================
// MySQL Connection (Railway)
// =============================
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

// Test DB connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL Connection Failed:", err);
  } else {
    console.log("✅ MySQL Connected Successfully");
    connection.release();
  }
});

// =============================
// API: Get Stock (IMPORTANT)
// =============================
app.get("/api/stock", (req, res) => {
  const query = `
    SELECT 
      p.id,
      p.brand,
      p.size,
      p.unit,
      s.quantity AS stock
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    ORDER BY p.id;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Database Query Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// =============================
// Serve Frontend
// =============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =============================
// Start Server (Railway)
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
