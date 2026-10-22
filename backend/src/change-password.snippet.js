// TEMPEL di src/routes/auth.js, di atas "export default router;"
// Pastikan di bagian import ada:  import bcrypt from "bcryptjs";  import { pool } from "../db.js";  import { requireAuth } from "../middleware/auth.js";

router.post("/change-password", requireAuth, async (req, res) => {
  const { current, next } = req.body || {};
  if (typeof current !== "string" || typeof next !== "string") return res.status(400).json({ error: "Data tidak lengkap" });
  if (next.length < 8 || next.length > 100) return res.status(400).json({ error: "Password baru minimal 8 karakter" });
  try {
    const r = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!r.rows[0] || !(await bcrypt.compare(current, r.rows[0].password_hash)))
      return res.status(400).json({ error: "Password saat ini salah" }); // 400, bukan 401, supaya tidak dianggap sesi habis
    await pool.query("UPDATE users SET password_hash = $2 WHERE id = $1", [req.user.id, await bcrypt.hash(next, 10)]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
});
