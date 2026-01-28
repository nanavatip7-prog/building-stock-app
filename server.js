const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------
// MySQL Connection
// ----------------------
let db;

(async () => {
  try {
    db = await mysql.createPool(process.env.MYSQL_URL);
    console.log("✅ MySQL connected");
  } catch (err) {
    console.error("❌ MySQL connection failed:", err);
  }
})();

// ----------------------
// Serve frontend
// ----------------------
app.use(express.static(path.join(__dirname, "public")));

// ----------------------
// DEBUG DB
// ----------------------
app.get("/api/debug-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS ok");
    res.json({ status: "DB OK", rows });
  } catch (err) {
    console.error("DEBUG DB ERROR:", err);
    res.status(500).json({
      error: err.message,
      code: err.code
    });
  }
});

// ----------------------
// STOCK API
// ----------------------
app.get("/api/stock", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.brand,
        p.size,
        p.unit,
        s.quantity AS stock
      FROM products p
      INNER JOIN stock s
        ON p.id = s.product_id
    `);

    res.json(rows);
  } catch (err) {
    console.error("STOCK QUERY ERROR:", err);
    res.status(500).json({
      error: err.message,
      code: err.code
    });
  }
});

// ----------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
