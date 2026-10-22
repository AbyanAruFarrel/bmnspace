import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/notifications -> { unread, items } milik helpdesk yang login
router.get("/", async (req, res) => {
  try {
    const items = (await query(
      "SELECT id, request_id, text, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 100",
      [req.user.sub]
    )).rows;
    const unread = (await query(
      "SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND NOT is_read", [req.user.sub]
    )).rows[0].n;
    res.json({ unread, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
});

// POST /api/notifications/read-all -> tandai semua sudah dibaca
router.post("/read-all", async (req, res) => {
  try {
    await query("UPDATE notifications SET is_read = true WHERE user_id = $1 AND NOT is_read", [req.user.sub]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
});

export default router;