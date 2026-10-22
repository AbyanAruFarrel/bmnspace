import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { BUILTIN, getCustom } from "../categories.js";

const router = Router();

const DEFAULT_LOCATION = { address: "Gedung Business Semarang, Semarang" };
const DEFAULT_CONTACT = { name: "", phone: "" };
const KINDS = ["ruang", "barang", "mobil"];

const fail = (status, error) => Object.assign(new Error(error), { status });
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const serverError = (res, err) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan di server" });
};
const getSetting = async (db, key, fallback) => {
  const r = await db.query("SELECT value FROM settings WHERE key = $1", [key]);
  return r.rows[0]?.value ?? fallback;
};
const putSetting = (db, key, value) =>
  db.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );

// GET /api/settings  (publik) -> semua pengaturan yang tampil di situs
router.get("/", async (req, res) => {
  try {
    res.json({
      footerLocation: await getSetting(pool, "footerLocation", DEFAULT_LOCATION),
      contact: await getSetting(pool, "contact", DEFAULT_CONTACT),
      categories: await getCustom(),
    });
  } catch (err) { serverError(res, err); }
});

// Semua perubahan di bawah ini khusus helpdesk
router.put("/footer-location", requireAuth, async (req, res) => {
  try {
    const address = text(req.body?.address, 300);
    if (!address) throw fail(400, "Lokasi wajib diisi");
    await putSetting(pool, "footerLocation", { address });
    res.json({ address });
  } catch (err) { serverError(res, err); }
});

router.put("/contact", requireAuth, async (req, res) => {
  try {
    const name = text(req.body?.name, 100);
    const phone = text(req.body?.phone, 30);
    if (phone && !/^[0-9+\-\s()]{8,20}$/.test(phone)) throw fail(400, "Format nomor telepon tidak valid");
    await putSetting(pool, "contact", { name, phone });
    res.json({ name, phone });
  } catch (err) { serverError(res, err); }
});

// Menambah kategori; daftar kategori diubah dalam transaksi dengan kunci agar tidak saling timpa.
router.post("/categories", requireAuth, async (req, res) => {
  let client;
  try {
    const name = text(req.body?.name, 40).replace(/\s+/g, " ");
    const kind = req.body?.kind;
    const icon = text(req.body?.icon, 8) || "📌";
    const color = /^#[0-9a-fA-F]{6}$/.test(req.body?.color || "") ? req.body.color : "#0f766e";
    if (!name) throw fail(400, "Nama kategori wajib diisi");
    if (!KINDS.includes(kind)) throw fail(400, "Jenis kategori tidak valid");

    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(424242)");
    const custom = await getCustom(client);
    if ([...BUILTIN, ...custom].some((c) => c.name.toLowerCase() === name.toLowerCase())) throw fail(409, "Nama kategori sudah ada");
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kategori";
    const cat = { id: `${slug}-${Date.now().toString(36)}`, name, badge: name.toUpperCase(), icon, color, kind };
    await putSetting(client, "categories", [...custom, cat]);
    await client.query("COMMIT");
    res.status(201).json(cat);
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    serverError(res, err);
  } finally {
    client?.release();
  }
});

router.delete("/categories/:id", requireAuth, async (req, res) => {
  let client;
  try {
    const id = String(req.params.id);
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(424242)");
    const custom = await getCustom(client);
    if (!custom.some((c) => c.id === id)) throw fail(404, "Kategori tidak ditemukan (kategori bawaan tidak bisa dihapus)");
    const used = (await client.query("SELECT COUNT(*)::int AS n FROM assets WHERE category = $1", [id])).rows[0].n;
    if (used > 0) throw fail(409, `Kategori masih dipakai ${used} aset. Pindahkan atau hapus asetnya dulu.`);
    await putSetting(client, "categories", custom.filter((c) => c.id !== id));
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
