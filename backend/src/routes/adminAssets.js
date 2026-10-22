import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isSized, kindOf } from "../categories.js";

const router = Router();
router.use(requireAuth); // semua route di file ini khusus helpdesk

const MAX_PHOTOS = 5;
const MAX_PHOTO_CHARS = 400_000; // ±300 KB per foto (teks base64)

const fail = (status, error) => Object.assign(new Error(error), { status });
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Memeriksa dan membersihkan data aset dari frontend
async function clean(b = {}) {
  const name = text(b.name, 100);
  const building = text(b.building, 100);
  const category = b.category;
  if (!name || !building) throw fail(400, "Nama aset dan nama gedung/gudang/garasi wajib diisi");
  const kind = await kindOf(category);
  if (!kind) throw fail(400, "Kategori tidak valid");

  const isItem = kind === "barang";
  const num = Number(isItem ? b.stock : b.capacity);
  if (!Number.isInteger(num) || num < 1 || num > 10000) {
    throw fail(400, isItem ? "Stok harus bilangan bulat 1 sampai 10000" : "Kapasitas harus bilangan bulat 1 sampai 10000");
  }

  const placement = text(b.placement, 150) || null;
  const location = text(b.location, 100) || "Semarang";
  const dim = (v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 1000) throw fail(400, "Ukuran ruangan harus berupa angka lebih dari 0");
    return n;
  };
  const sized = await isSized(category);
  const length = sized ? dim(b.length) : null;
  const width = sized ? dim(b.width) : null;

  const facilities = Array.isArray(b.facilities) ? b.facilities.map((x) => text(x, 60)).filter(Boolean).slice(0, 20) : [];

  const images = Array.isArray(b.images) ? b.images : [];
  if (images.length > MAX_PHOTOS) throw fail(400, `Maksimal ${MAX_PHOTOS} foto`);
  for (const img of images) {
    if (typeof img !== "string" || !img.startsWith("data:image/jpeg;base64,")) throw fail(400, "Foto harus berformat JPG");
    if (img.length > MAX_PHOTO_CHARS) throw fail(400, "Ukuran foto terlalu besar");
  }

  return { name, building, placement, location, length, width, category, capacity: isItem ? null : num, stock: isItem ? num : null, facilities, images };
}

const serverError = (res, err) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan di server" });
};

// POST /api/admin/assets -> tambah aset
router.post("/", async (req, res) => {
  try {
    const a = await clean(req.body);
    const r = await pool.query(
      `INSERT INTO assets (name, building, placement, location, length, width, category, capacity, stock, facilities, images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [a.name, a.building, a.placement, a.location, a.length, a.width, a.category, a.capacity, a.stock, a.facilities, a.images]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { serverError(res, err); }
});

// PUT /api/admin/assets/:id -> ubah aset
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "ID tidak valid" });
  try {
    const a = await clean(req.body);
    const r = await pool.query(
      `UPDATE assets SET name=$2, building=$3, placement=$4, location=$5, length=$6, width=$7,
              category=$8, capacity=$9, stock=$10, facilities=$11, images=$12
       WHERE id=$1 RETURNING *`,
      [id, a.name, a.building, a.placement, a.location, a.length, a.width, a.category, a.capacity, a.stock, a.facilities, a.images]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Aset tidak ditemukan" });
    res.json(r.rows[0]);
  } catch (err) { serverError(res, err); }
});

// DELETE /api/admin/assets/:id -> hapus aset (ditolak jika masih ada pengajuan aktif)
// Riwayat pengajuan tetap tersimpan (asset_id menjadi kosong, nama aset tetap tercatat).
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "ID tidak valid" });
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [id]); // sama dengan kunci saat pengajuan dibuat
    const active = await client.query(
      "SELECT 1 FROM requests WHERE asset_id = $1 AND status IN ('Menunggu','Disetujui') LIMIT 1", [id]
    );
    if (active.rows.length) throw fail(409, "Aset masih punya permohonan aktif (Menunggu/Disetujui). Selesaikan atau tolak dulu.");
    const del = await client.query("DELETE FROM assets WHERE id = $1", [id]);
    if (!del.rowCount) throw fail(404, "Aset tidak ditemukan");
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    serverError(res, err);
  } finally {
    client?.release();
  }
});

export default router;
