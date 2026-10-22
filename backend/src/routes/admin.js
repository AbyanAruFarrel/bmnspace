import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { expireStale } from "../expire.js";

const router = Router();
router.use(requireAuth); // semua route di file ini butuh login

const STATUSES = ["Menunggu", "Disetujui", "Ditolak", "Dibatalkan", "Selesai"];
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const serverError = (res, err) => { console.error(err); res.status(500).json({ error: "Terjadi kesalahan di server" }); };

// GET /api/admin/requests?status=Menunggu  (tanpa status = semua)
router.get("/requests", async (req, res) => {
  const { status } = req.query;
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: "Status tidak valid" });
  try {
    const r = await query(
      `SELECT r.*, u.name AS decided_by_name
       FROM requests r LEFT JOIN users u ON u.id = r.decided_by
       ${status ? "WHERE r.status = $1" : ""}
       ORDER BY r.id DESC LIMIT 500`,
      status ? [status] : []
    );
    res.json(r.rows);
  } catch (err) { serverError(res, err); }
});

// GET /api/admin/requests/counts -> jumlah per status (untuk lencana tab)
router.get("/requests/counts", async (req, res) => {
  try {
    const r = await query("SELECT status, COUNT(*)::int AS n FROM requests GROUP BY status");
    const out = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    r.rows.forEach((x) => { out[x.status] = x.n; });
    res.json(out);
  } catch (err) { serverError(res, err); }
});

// Mengubah status secara atomik: hanya berhasil jika status saat ini sesuai.
const decide = (from, to, extra = "") => async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "ID tidak valid" });
  try {
    const params = [id, req.user.sub];
    let reasonSql = "";
    if (to === "Ditolak") {
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
      if (!reason) return res.status(400).json({ error: "Alasan penolakan wajib diisi" });
      params.push(reason);
      reasonSql = ", reject_reason = $3";
    }
    const r = await query(
      `UPDATE requests SET status = '${to}', decided_by = $2, decided_at = now()${reasonSql}
       WHERE id = $1 AND status = '${from}' RETURNING *`,
      params
    );
    if (!r.rows[0]) return res.status(409).json({ error: `Pengajuan tidak ditemukan atau statusnya bukan ${from}` });
    res.json(r.rows[0]);
  } catch (err) { serverError(res, err); }
};

// TEMPEL di src/routes/admin.js, tepat di bawah baris router.post("/requests/:id/complete", ...)
// (jangan hapus baris "complete" yang lama)

router.post("/requests/:id/approve", decide("Menunggu", "Disetujui"));
router.post("/requests/:id/reject", decide("Menunggu", "Ditolak"));
router.post("/requests/:id/finish", decide("Disetujui", "Selesai"));
router.post("/requests/:id/complete", decide("Disetujui", "Selesai"));

// GET /api/admin/calendar?from=2026-10-01&to=2026-10-31&assetId=4 (assetId opsional)
router.get("/calendar", async (req, res) => {
  const { from, to } = req.query;
  const assetId = req.query.assetId ? Number(req.query.assetId) : null;
  if (!isDate(from) || !isDate(to)) return res.status(400).json({ error: "Parameter from dan to (YYYY-MM-DD) wajib diisi" });
  if (req.query.assetId && !Number.isInteger(assetId)) return res.status(400).json({ error: "assetId tidak valid" });
  try {
    const params = [from, to];
    if (assetId) params.push(assetId);
    const r = await query(
      `SELECT id, asset_id, asset_name, requester_name, requester_instansi, agenda,
              start_date, end_date, start_time, end_time, qty, status
       FROM requests
       WHERE status IN ('Menunggu','Disetujui','Selesai') AND end_date >= $1 AND start_date <= $2
       ${assetId ? "AND asset_id = $3" : ""}
       ORDER BY start_date, start_time`,
      params
    );
    res.json(r.rows);
  } catch (err) { serverError(res, err); }
});

export default router;