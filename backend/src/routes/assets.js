import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/assets            -> semua aset
// GET /api/assets?category=mobil -> filter per kategori
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const r = category
      ? await query("SELECT * FROM assets WHERE category = $1 ORDER BY id", [category])
      : await query("SELECT * FROM assets ORDER BY id");
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data aset" });
  }
});

// GET /api/assets/:id -> satu aset
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "ID tidak valid" });
  try {
    const r = await query("SELECT * FROM assets WHERE id = $1", [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: "Aset tidak ditemukan" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data aset" });
  }
});

export default router;