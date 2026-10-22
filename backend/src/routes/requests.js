import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pool, query } from "../db.js";
import { expireStale } from "../expire.js";
import { CLOSE, MAX_DAYS, MULTI_END, MULTI_START, OPEN, hasClash } from "../schedule.js";
import { kindOf } from "../categories.js";

const router = Router();
const TZ = "Asia/Jakarta";

const fail = (status, error) => Object.assign(new Error(error), { status });
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isTime = (s) => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

// Pembatas permintaan per IP. Hanya aktif di production supaya tes lokal tidak terhalang.
const limiter = (menit, maks) =>
  rateLimit({
    windowMs: menit * 60 * 1000, limit: maks, standardHeaders: true, legacyHeaders: false,
    skip: () => process.env.NODE_ENV !== "production",
    message: { error: "Terlalu banyak permintaan, coba lagi nanti" },
  });

// 0812... dan +62812... dianggap nomor yang sama.
const normPhone = (p) => {
  const d = String(p || "").replace(/\D/g, "");
  return d.startsWith("62") ? "0" + d.slice(2) : d;
};
const creds = (b) => ({ email: text(b?.email, 150).toLowerCase(), phone: text(b?.phone, 30) });
const owns = (row, email, phone) =>
  row.requester_email.toLowerCase() === email && normPhone(row.requester_phone) === normPhone(phone);

const nowJakarta = () => {
  const [date, time] = new Date().toLocaleString("sv-SE", { timeZone: TZ }).split(" ");
  return { date, time: time.slice(0, 5) };
};

// POST /api/requests -> tamu mengajukan peminjaman (tanpa login)
router.post("/", limiter(60, 20), async (req, res) => {
  const b = req.body || {};
  let client;
  try {
    const assetId = Number(b.assetId);
    const name = text(b.name, 100);
    const nip = text(b.nip, 40).replace(/\s/g, "");
    const instansi = text(b.instansi, 150);
    const phone = text(b.phone, 30);
    const email = text(b.email, 150).toLowerCase();
    const agenda = text(b.agenda, 500);
    const { startDate, endDate } = b;
    const endTime = b.endTime;

    if (!Number.isInteger(assetId)) throw fail(400, "Aset tidak valid");
    if (!name || !instansi || !phone || !email || !agenda) throw fail(400, "Nama, satker, No. HP, email, dan keperluan wajib diisi");
    if (!/^\d{8,25}$/.test(nip)) throw fail(400, "NIP wajib diisi (hanya angka, 8-25 digit)");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, "Format email tidak valid");
    if (!/^[0-9+\-\s()]{8,20}$/.test(phone)) throw fail(400, "Format No. Handphone tidak valid");
    if (!isDate(startDate) || !isDate(endDate)) throw fail(400, "Tanggal tidak valid");
    if (endDate < startDate) throw fail(400, "Tanggal selesai tidak boleh sebelum tanggal mulai");
    if ((Date.parse(endDate) - Date.parse(startDate)) / 86400000 >= MAX_DAYS) throw fail(400, `Maksimal peminjaman ${MAX_DAYS} hari`);
    if (!isTime(endTime)) throw fail(400, "Jam selesai wajib diisi");

    // Satu hari: jam mulai dipilih peminjam. Berhari-hari: jam mulai selalu 07:30.
    const multi = endDate > startDate;
    const startTime = multi ? MULTI_START : b.startTime;
    if (!isTime(startTime)) throw fail(400, "Jam mulai tidak valid");
    if (multi) {
      if (endTime <= MULTI_START || endTime > MULTI_END) throw fail(400, `Jam selesai hari terakhir harus antara ${MULTI_START} dan ${MULTI_END}`);
    } else {
      if (startTime < OPEN || startTime >= CLOSE) throw fail(400, `Jam mulai harus di jam operasional ${OPEN}-${CLOSE}`);
      if (endTime > CLOSE) throw fail(400, `Jam selesai maksimal ${CLOSE}`);
      if (endTime <= startTime) throw fail(400, "Jam selesai harus setelah jam mulai");
    }
    const now = nowJakarta();
    if (startDate < now.date || (startDate === now.date && startTime < now.time)) {
      throw fail(400, "Tidak bisa meminjam waktu yang sudah lewat");
    }

    client = await pool.connect();
    await client.query("BEGIN");
    // Kunci per aset: dua pengajuan bersamaan untuk aset yang sama diproses bergantian.
    await client.query("SELECT pg_advisory_xact_lock($1)", [assetId]);
    await expireStale(client); // pengajuan kedaluwarsa tidak boleh menghalangi jadwal

    const asset = (await client.query("SELECT * FROM assets WHERE id = $1", [assetId])).rows[0];
    if (!asset) throw fail(404, "Aset tidak ditemukan");

       const isItem = (await kindOf(asset.category, client)) === "barang";
    const capacity = isItem ? asset.stock || 1 : 1;
    const qty = isItem ? Number(b.qty) : 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > capacity) throw fail(400, `Jumlah unit harus 1 sampai ${capacity}`);

    const { rows } = await client.query(
      `SELECT start_date, start_time, end_date, end_time, qty FROM requests
       WHERE asset_id = $1 AND status IN ('Menunggu','Disetujui') AND end_date >= $2 AND start_date <= $3`,
      [assetId, startDate, endDate]
    );
    const nw = { start_date: startDate, end_date: endDate, start_time: startTime, end_time: endTime, qty };
    if (hasClash(rows, nw, capacity)) throw fail(409, "Jadwal bentrok dengan peminjaman lain. Pilih tanggal atau jam yang berbeda.");

    const ins = await client.query(
      `INSERT INTO requests (asset_id, asset_name, requester_name, requester_nip, requester_instansi, requester_phone,
                             requester_email, agenda, start_date, end_date, start_time, end_time, qty)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [assetId, asset.name, name, nip, instansi, phone, email, agenda, startDate, endDate, startTime, endTime, qty]
    );
    const row = ins.rows[0];

    await client.query(
      "INSERT INTO notifications (user_id, request_id, text) SELECT id, $1, $2 FROM users",
      [row.id, `📩 ${name} (${instansi}) mengajukan peminjaman ${asset.name} • ${startDate} s/d ${endDate} • ${startTime}-${endTime}`]
    );

    await client.query("COMMIT");
    res.status(201).json(row);
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  } finally {
    client?.release();
  }
});

// GET /api/requests/availability/:assetId?from=2026-10-01&to=2026-10-31
// Jadwal terpakai untuk kalender peminjam (tanpa data pribadi).
router.get("/availability/:assetId", async (req, res) => {
  const id = Number(req.params.assetId);
  const { from, to } = req.query;
  if (!Number.isInteger(id) || !isDate(from) || !isDate(to)) {
    return res.status(400).json({ error: "Parameter assetId, from, dan to (YYYY-MM-DD) wajib diisi" });
  }
  try {
    await expireStale();
    const r = await query(
      `SELECT start_date, start_time, end_date, end_time, qty FROM requests
       WHERE asset_id = $1 AND status IN ('Menunggu','Disetujui') AND end_date >= $2 AND start_date <= $3
       ORDER BY start_date, start_time`,
      [id, from, to]
    );
    res.json(r.rows.map((x) => ({
      startDate: x.start_date, endDate: x.end_date,
      startTime: x.start_time.slice(0, 5), endTime: x.end_time.slice(0, 5), qty: x.qty,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil ketersediaan" });
  }
});

// ---------- Sisi peminjam (tanpa login: dibuktikan dengan email + No. HP) ----------

// POST /api/requests/lookup  { email, phone } -> daftar pesanan milik peminjam
router.post("/lookup", limiter(15, 20), async (req, res) => {
  const { email, phone } = creds(req.body);
  if (!email || !phone) return res.status(400).json({ error: "Email dan No. Handphone wajib diisi" });
  try {
    await expireStale();
    const r = await query(
      `SELECT id, asset_id, asset_name, requester_name, requester_nip, requester_instansi, requester_phone, agenda,
              start_date, end_date, start_time, end_time, qty, status, reject_reason, cancel_reason,
              decided_at, created_at
       FROM requests WHERE lower(requester_email) = $1 ORDER BY id DESC LIMIT 200`,
      [email]
    );
    const mine = r.rows
      .filter((x) => normPhone(x.requester_phone) === normPhone(phone))
      .map(({ requester_phone, ...rest }) => rest);
    if (!mine.length) return res.status(404).json({ error: "Pesanan tidak ditemukan. Periksa email dan No. Handphone." });
    res.json(mine);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
});

// Mengubah status pesanan milik peminjam secara atomik, lalu memberi tahu helpdesk.
const guestAction = (from, to, notifText) => async (req, res) => {
  const id = Number(req.params.id);
  const { email, phone } = creds(req.body);
  if (!Number.isInteger(id) || !email || !phone) return res.status(400).json({ error: "Data tidak lengkap" });
  const reason = text(req.body?.reason, 300) || "Dibatalkan oleh peminjam";
  try {
    await expireStale();
    const cur = (await query("SELECT * FROM requests WHERE id = $1", [id])).rows[0];
    if (!cur || !owns(cur, email, phone)) return res.status(404).json({ error: "Pesanan tidak ditemukan" });

    const r = to === "Dibatalkan"
      ? await query(
          "UPDATE requests SET status = 'Dibatalkan', cancel_reason = $2 WHERE id = $1 AND status = $3 RETURNING id, status, cancel_reason",
          [id, reason, from])
      : await query(
          "UPDATE requests SET status = 'Selesai' WHERE id = $1 AND status = $2 RETURNING id, status",
          [id, from]);
    if (!r.rows[0]) return res.status(409).json({ error: `Pesanan tidak bisa diubah karena statusnya bukan ${from}` });

    await query("INSERT INTO notifications (user_id, request_id, text) SELECT id, $1, $2 FROM users",
      [id, notifText(cur)]);
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
};

router.post("/:id/cancel", limiter(15, 20), guestAction("Menunggu", "Dibatalkan",
  (c) => `❌ ${c.requester_name} membatalkan pengajuan ${c.asset_name} (${c.start_date} s/d ${c.end_date})`));
router.post("/:id/finish", limiter(15, 20), guestAction("Disetujui", "Selesai",
  (c) => `✅ ${c.requester_name} selesai memakai / mengembalikan ${c.asset_name}`));

export default router;
