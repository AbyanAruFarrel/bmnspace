import bcrypt from "bcryptjs";
import { pool } from "./db.js";
import { purgeOld } from "./purge.js";
import { hasClash } from "./schedule.js";

const BASE = "http://localhost:4000/api";
let gagal = 0;
const cek = (label, got, want) => { if (got !== want) gagal++; console.log(got === want ? "OK   " : "GAGAL", label, `(dapat ${got}, harapan ${want})`); };
const tanggal = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
const api = async (path, { method = "GET", token, body } = {}) => {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (r.status >= 400) console.log(`      -> ${method} ${path} = ${r.status}: ${data.error}`);
  return { status: r.status, data };
};
const post = (p, body, token) => api(p, { method: "POST", body, token });

const EMAIL = "tes-admin9h@example.com", PASS = "PasswordTes123";
const NAMA = "Tes Otomatis9h";
const NIP = "12345"; // pendek: tidak ada batas minimal
const HP = "081234567890";
const orang = { name: NAMA, nip: NIP, instansi: "KPTIK", phone: HP, email: "tes9h@example.com", agenda: "Tes sistem" };

// --- aturan jadwal 24 jam (tanpa server) ---
const mk = (s, e, st, et, qty = 1) => ({ start_date: s, end_date: e, start_time: st, end_time: et, qty });
const brg = mk("2030-01-01", "2030-01-03", "16:00", "09:00", 5);
cek("Unit: barang hari tengah jam 12 bentrok", hasClash([brg], mk("2030-01-02", "2030-01-02", "12:00", "13:00"), 5, true), true);
cek("Unit: barang hari pertama sebelum 16:00 aman", hasClash([brg], mk("2030-01-01", "2030-01-01", "10:00", "15:00"), 5, true), false);
cek("Unit: barang hari terakhir mulai 09:00 aman", hasClash([brg], mk("2030-01-03", "2030-01-03", "09:00", "10:00"), 5, true), false);

try {
  await pool.query("DELETE FROM users WHERE email = $1", [EMAIL]);
  await pool.query("INSERT INTO users (name, email, password_hash) VALUES ('Tes Admin9h', $1, $2)", [EMAIL, await bcrypt.hash(PASS, 10)]);
  const token = (await post("/auth/login", { email: EMAIL, password: PASS })).data.token;

  const assets = (await api("/assets")).data;
  const innova = assets.find((a) => a.name === "Toyota Innova Reborn");
  const proyektor = assets.find((a) => a.name === "Proyektor Portable");
  const kendaraan = (x) => post("/requests", { ...orang, assetId: innova.id, ...x });
  const barang = (x) => post("/requests", { ...orang, assetId: proyektor.id, ...x });

  // --- NIP tanpa batas minimal ---
  const D1 = tanggal(100);
  const s1 = await kendaraan({ startDate: D1, endDate: D1, startTime: "09:00", endTime: "10:00" });
  cek("NIP pendek (5 digit) diterima -> 201", s1.status, 201);
  cek("NIP kosong -> 400", (await kendaraan({ nip: "", startDate: tanggal(101), endDate: tanggal(101), startTime: "09:00", endTime: "10:00" })).status, 400);
  cek("NIP berisi huruf -> 400", (await kendaraan({ nip: "12ab", startDate: tanggal(101), endDate: tanggal(101), startTime: "09:00", endTime: "10:00" })).status, 400);
  cek("NIP terlalu panjang (>100) -> 400", (await kendaraan({ nip: "1".repeat(101), startDate: tanggal(101), endDate: tanggal(101), startTime: "09:00", endTime: "10:00" })).status, 400);

  // --- Cek Pesanan pakai NIP + No. HP ---
  const lk = await post("/requests/lookup", { nip: NIP, phone: HP });
  cek("Lookup NIP + HP -> 200", lk.status, 200);
  cek("Lookup memuat pesanan", lk.data.some?.((r) => r.id === s1.data.id), true);
  cek("Lookup NIP + HP format +62 -> 200", (await post("/requests/lookup", { nip: NIP, phone: "+6281234567890" })).status, 200);
  cek("Lookup tanpa NIP (cara lama, email) -> 400", (await post("/requests/lookup", { email: orang.email, phone: HP })).status, 400);
  cek("Lookup HP salah -> 404", (await post("/requests/lookup", { nip: NIP, phone: "089999999999" })).status, 404);
  cek("Batal dengan NIP salah -> 404", (await post(`/requests/${s1.data.id}/cancel`, { nip: "999", phone: HP })).status, 404);
  cek("Batal dengan NIP + HP benar -> 200", (await post(`/requests/${s1.data.id}/cancel`, { nip: NIP, phone: HP })).status, 200);

  // --- semua kategori 24 jam ---
  cek("Mobil jam 18:00-19:00 sekarang boleh -> 201", (await kendaraan({ startDate: D1, endDate: D1, startTime: "18:00", endTime: "19:00" })).status, 201);

  // --- barang 24 jam ---
  const D2 = tanggal(105), D3 = tanggal(106), D4 = tanggal(107);
  cek("Barang malam 20:00-23:30 -> 201", (await barang({ startDate: D2, endDate: D2, startTime: "20:00", endTime: "23:30" })).status, 201);
  cek("Barang dini hari 00:00-02:00 -> 201", (await barang({ startDate: D2, endDate: D2, startTime: "00:00", endTime: "02:00" })).status, 201);
  cek("Barang sampai 23:59 -> 201", (await barang({ startDate: tanggal(108), endDate: tanggal(108), startTime: "10:00", endTime: "23:59" })).status, 201);
  cek("Barang jam selesai 00:00 (hari sama) -> 400", (await barang({ startDate: tanggal(109), endDate: tanggal(109), startTime: "10:00", endTime: "09:00" })).status, 400);
  const m = await barang({ startDate: D3, endDate: D4, startTime: "16:00", endTime: "09:00", qty: 5 });
  cek("Barang berhari-hari 16:00 -> 09:00 (qty 5) -> 201", m.status, 201);
  cek("Jam mulai barang berhari-hari tetap pilihan (16:00)", String(m.data.start_time).slice(0, 5), "16:00");
  cek("Barang hari pertama sebelum 16:00 -> 201", (await barang({ startDate: D3, endDate: D3, startTime: "10:00", endTime: "15:00" })).status, 201);
  cek("Barang hari terakhir mulai 09:00 -> 201", (await barang({ startDate: D4, endDate: D4, startTime: "09:00", endTime: "10:00" })).status, 201);
  cek("Barang hari terakhir 08:00-09:30 -> 409", (await barang({ startDate: D4, endDate: D4, startTime: "08:00", endTime: "09:30" })).status, 409);

  // --- laporan ---
  const D5 = tanggal(110);
  const r1 = await kendaraan({ startDate: D5, endDate: D5, startTime: "09:00", endTime: "11:00", agenda: "Laporan tes disetujui" });
  const r2 = await kendaraan({ startDate: tanggal(111), endDate: tanggal(111), startTime: "09:00", endTime: "11:00", agenda: "Laporan tes menunggu" });
  await post(`/admin/requests/${r1.data.id}/approve`, null, token);
  const rep = await api(`/admin/report?from=${D5}&to=${tanggal(112)}&assetId=${innova.id}`, { token });
  cek("Laporan -> 200", rep.status, 200);
  cek("Laporan memuat yang disetujui", rep.data.some?.((r) => r.id === r1.data.id), true);
  cek("Laporan tidak memuat yang masih menunggu", rep.data.some?.((r) => r.id === r2.data.id), false);
  cek("Laporan memuat NIP & satker", rep.data.find?.((r) => r.id === r1.data.id)?.requester_instansi, "KPTIK");
  cek("Laporan filter kategori -> 200", (await api(`/admin/report?from=${D5}&to=${tanggal(112)}&category=mobil`, { token })).status, 200);
  cek("Laporan tanpa login -> 401", (await api(`/admin/report?from=${D5}&to=${D5}`)).status, 401);
  cek("Laporan periode terbalik -> 400", (await api(`/admin/report?from=${tanggal(112)}&to=${D5}`, { token })).status, 400);
  cek("Laporan periode > 366 hari -> 400", (await api(`/admin/report?from=${D5}&to=${tanggal(600)}`, { token })).status, 400);

  // --- hapus otomatis > 1 tahun ---
  const old = tanggal(-400), recent = tanggal(-30);
  const ins = (end, status) => pool.query(
    `INSERT INTO requests (asset_id, asset_name, requester_name, requester_nip, requester_instansi, requester_phone, requester_email,
       agenda, start_date, end_date, start_time, end_time, qty, status)
     VALUES ($1,$2,$3,$4,'KPTIK',$5,'tes9h@example.com','Tes lama',$6,$6,'09:00','10:00',1,$7) RETURNING id`,
    [innova.id, innova.name, NAMA, NIP, HP, end, status]);
  const oldRow = (await ins(old, "Selesai")).rows[0].id;
  const oldApproved = (await ins(old, "Disetujui")).rows[0].id;
  const recentRow = (await ins(recent, "Selesai")).rows[0].id;
  const hasil = await purgeOld();
  cek("Purge menghapus >= 2 baris lama", hasil.requests >= 2, true);
  const sisa = (await pool.query("SELECT id FROM requests WHERE id = ANY($1)", [[oldRow, oldApproved, recentRow]])).rows.map((r) => r.id);
  cek("Baris lama (Selesai) terhapus", sisa.includes(oldRow), false);
  cek("Baris lama (Disetujui) terhapus", sisa.includes(oldApproved), false);
  cek("Baris 30 hari lalu tetap ada", sisa.includes(recentRow), true);
  const cr = await api("/cron/cleanup");
  cek("Cron tanpa rahasia -> ditolak (401/503)", [401, 503].includes(cr.status), true);
} finally {
  await pool.query("DELETE FROM notifications WHERE text LIKE '%Tes Otomatis9h%'");
  await pool.query("DELETE FROM requests WHERE requester_name = 'Tes Otomatis9h'");
  await pool.query("DELETE FROM users WHERE email = 'tes-admin9h@example.com'");
  console.log(gagal ? `\n${gagal} tes GAGAL.` : "\nSemua tes OK.", "Data tes dihapus.");
  await pool.end();
}
