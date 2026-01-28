const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json());

// ---------- SAFE DB CONFIG ----------
const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
};

// ---------- HEALTH CHECK ----------
app.get("/", (req, res) => {
  res.send("Server is alive");
});

// ---------- DEBUG DB (SAFE) ----------
app.get("/api/debug-db", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.query("SELECT 1");
    await conn.end();
    res.json({ ok: true, db: "connected" });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ---------- STOCK API ----------
app.get("/api/stock", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);

    const [rows] = await conn.query(`
      SELECT p.brand, p.size, p.unit, s.quantity AS stock
      FROM products p
      JOIN stock s ON p.id = s.product_id
    `);

    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error("DB ERROR:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
