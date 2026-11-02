import { Router } from "express";
import crypto from "node:crypto";
import { purgeOld } from "../purge.js";

const router = Router();

// Dipanggil otomatis oleh Vercel Cron (lihat vercel.json). Vercel mengirim header
// "Authorization: Bearer <CRON_SECRET>" jika variabel CRON_SECRET diisi di proyek backend.
const authorized = (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.authorization || "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
};

router.get("/cleanup", async (req, res) => {
  if (!process.env.CRON_SECRET) return res.status(503).json({ error: "CRON_SECRET belum diisi" });
  if (!authorized(req)) return res.status(401).json({ error: "Tidak diizinkan" });
  try {
    res.json({ ok: true, deleted: await purgeOld() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal membersihkan riwayat" });
  }
});

export default router;
