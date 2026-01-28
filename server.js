const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(express.json());

// ====== DATABASE CONNECTION ======
let db;

async function connectDB() {
  try {
    db = await mysql.createPool({
      uri: process.env.MYSQL_URL,
      waitForConnections: true,
      connectionLimit: 5,
    });
    console.log("✅ MySQL connected");
  } catch (err) {
    console.error("❌ DB connection failed:", err);
    process.exit(1);
  }
}

connectDB();

// ====== API ======
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
    console.error("❌ Stock API error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ====== STATIC FILES ======
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ====== START SERVER (CRITICAL) ======
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
