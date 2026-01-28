const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

// ---------- BASIC MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// ---------- HEALTH CHECK ----------
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ---------- MYSQL CONNECTION ----------
let db;

async function connectDB() {
  try {
    db = await mysql.createPool({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });

    console.log("✅ MySQL connected");
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
  }
}

connectDB();

// ---------- DEBUG ROUTE ----------
app.get("/api/debug-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1");
    res.json({ status: "DB OK" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- STOCK API ----------
app.get("/api/stock", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.brand,
        p.size,
        p.unit,
        s.quantity AS stock
      FROM products p
      JOIN stock s ON p.id = s.product_id
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ Stock API error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
