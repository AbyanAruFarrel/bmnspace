import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const MAX_DAYS = 366;

// GET /api/admin/report?from=2026-10-01&to=2026-10-31&assetId=4&category=barang
// Laporan pemakaian BMN: peminjaman yang Disetujui/Selesai dan beririsan dengan periode.
// assetId dan category opsional (pilih salah satu).
router.get("/", async (req, res) => {
  const { from, to } = req.query;
  if (!isDate(from) || !isDate(to)) return res.status(400).json({ error: "Periode (from dan to, format YYYY-MM-DD) wajib diisi" });
  if (to < from) return res.status(400).json({ error: "Tanggal akhir tidak boleh sebelum tanggal awal" });
  if ((Date.parse(to) - Date.parse(from)) / 86400000 >= MAX_DAYS) return res.status(400).json({ error: `Periode maksimal ${MAX_DAYS} hari` });
  const assetId = req.query.assetId ? Number(req.query.assetId) : null;
  if (req.query.assetId && !Number.isInteger(assetId)) return res.status(400).json({ error: "assetId tidak valid" });
  const category = typeof req.query.category === "string" && req.query.category ? req.query.category.slice(0, 80) : null;

  try {
    const params = [from, to];
    let extra = "";
    if (assetId) { params.push(assetId); extra += ` AND r.asset_id = $${params.length}`; }
    if (category) { params.push(category); extra += ` AND a.category = $${params.length}`; }
    const r = await query(
      `SELECT r.id, r.asset_id, r.asset_name, a.category, r.requester_name, r.requester_nip, r.requester_instansi,
              r.agenda, r.start_date, r.end_date, r.start_time, r.end_time, r.qty, r.status
       FROM requests r LEFT JOIN assets a ON a.id = r.asset_id
       WHERE r.status IN ('Disetujui','Selesai') AND r.end_date >= $1 AND r.start_date <= $2 ${extra}
       ORDER BY r.asset_name, r.start_date, r.start_time
       LIMIT 5000`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
});

export default router;
