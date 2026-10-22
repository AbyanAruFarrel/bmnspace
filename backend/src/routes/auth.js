import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool, query } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";


const router = Router();
   // Maks. 10 percobaan login per 15 menit per IP (hanya aktif di production)
   const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
     skip: () => process.env.NODE_ENV !== "production",
     message: { error: "Terlalu banyak percobaan login, coba lagi nanti" },
   });
// Hash palsu: dipakai agar waktu respons sama baik email ada maupun tidak.
const DUMMY_HASH = bcrypt.hashSync("password-palsu", 10);

// POST /api/auth/login  { email, password } -> { token, user }
router.post("/login", loginLimiter, async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) return res.status(400).json({ error: "Email dan password wajib diisi" });
  if (password.length > 200) return res.status(400).json({ error: "Password terlalu panjang" });
  try {
    const u = (await query("SELECT id, name, email, password_hash, role FROM users WHERE email = $1", [email])).rows[0];
    const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY_HASH);
    // Pesan sengaja sama, supaya orang tidak bisa menebak email mana yang terdaftar.
    if (!u || !ok) return res.status(401).json({ error: "Email atau password salah" });
    res.json({ token: signToken(u), user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
});

// GET /api/auth/me -> data helpdesk yang sedang login (butuh token)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const r = await query("SELECT id, name, email, role FROM users WHERE id = $1", [req.user.sub]);
    if (!r.rows[0]) return res.status(401).json({ error: "Akun tidak ditemukan" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
});

// TEMPEL di src/routes/auth.js, di atas "export default router;"
// Pastikan di bagian import ada:  import bcrypt from "bcryptjs";  import { pool } from "../db.js";  import { requireAuth } from "../middleware/auth.js";

router.post("/change-password", requireAuth, async (req, res) => {
  const { current, next } = req.body || {};
  if (typeof current !== "string" || typeof next !== "string") return res.status(400).json({ error: "Data tidak lengkap" });
  if (next.length < 8 || next.length > 100) return res.status(400).json({ error: "Password baru minimal 8 karakter" });
  try {
    const r = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.sub]);
    if (!r.rows[0] || !(await bcrypt.compare(current, r.rows[0].password_hash)))
      return res.status(400).json({ error: "Password saat ini salah" }); // 400, bukan 401, supaya tidak dianggap sesi habis
    await pool.query("UPDATE users SET password_hash = $2 WHERE id = $1", [req.user.sub, await bcrypt.hash(next, 10)]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
});


export default router;