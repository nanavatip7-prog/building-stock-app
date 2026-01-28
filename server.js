app.post("/api/purchase", async (req, res) => {
  const { product_id, quantity, dealer_name } = req.body;

  if (!product_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Insert transaction
    await conn.query(
      `INSERT INTO transactions (product_id, type, quantity, dealer_name)
       VALUES (?, 'purchase', ?, ?)`,
      [product_id, quantity, dealer_name || null]
    );

    // 2️⃣ Update stock
    await conn.query(
      `UPDATE stock SET quantity = quantity + ?
       WHERE product_id = ?`,
      [quantity, product_id]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error("Purchase error:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
});
