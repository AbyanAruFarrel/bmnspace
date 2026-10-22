import bcrypt from "bcryptjs";
import { pool } from "./db.js";
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

const EMAIL = "tes-admin9e@example.com", PASS = "PasswordTes123";
const orang = { name: "Tes Otomatis9e", nip: "198001012005011001", instansi: "KPTIK", phone: "081234567890", email: "tes9e@example.com", agenda: "Tes sistem" };

// --- uji aturan jadwal langsung (tanpa server) ---
const r1 = { start_date: "2030-01-01", end_date: "2030-01-03", start_time: "07:30", end_time: "15:00", qty: 1 };
const single = (d, s, e, qty = 1) => ({ start_date: d, end_date: d, start_time: s, end_time: e, qty });
cek("Unit: hari tengah jam 12 bentrok", hasClash([r1], single("2030-01-02", "12:00", "13:00"), 1), true);
cek("Unit: hari tengah jam 18 aman", hasClash([r1], single("2030-01-02", "18:00", "20:00"), 1), false);
cek("Unit: hari terakhir 14-16 bentrok", hasClash([r1], single("2030-01-03", "14:00", "16:00"), 1), true);
cek("Unit: hari terakhir 15-16 aman", hasClash([r1], single("2030-01-03", "15:00", "16:00"), 1), false);

try {
  await pool.query("DELETE FROM users WHERE email = $1", [EMAIL]);
  await pool.query("INSERT INTO users (name, email, password_hash) VALUES ('Tes Admin9e', $1, $2)", [EMAIL, await bcrypt.hash(PASS, 10)]);
  const token = (await post("/auth/login", { email: EMAIL, password: PASS })).data.token;

  const assets = (await api("/assets")).data;
  const innova = assets.find((a) => a.name === "Toyota Innova Reborn");
  const proyektor = assets.find((a) => a.name === "Proyektor Portable");
  const buat = (extra) => post("/requests", { ...orang, assetId: innova.id, ...extra });
  const A = tanggal(70);

  // --- validasi ---
  cek("NIP kosong -> 400", (await buat({ nip: "", startDate: A, endDate: A, startTime: "09:00", endTime: "11:00" })).status, 400);
  cek("NIP berisi huruf -> 400", (await buat({ nip: "abc12345678", startDate: A, endDate: A, startTime: "09:00", endTime: "11:00" })).status, 400);
  cek("Jam selesai kosong -> 400", (await buat({ startDate: A, endDate: A, startTime: "09:00" })).status, 400);
  cek("Jam selesai sebelum mulai -> 400", (await buat({ startDate: A, endDate: A, startTime: "10:00", endTime: "09:00" })).status, 400);
  cek("Jam mulai sebelum 08:00 -> 400", (await buat({ startDate: A, endDate: A, startTime: "07:00", endTime: "09:00" })).status, 400);
  cek("Jam selesai lewat 22:00 -> 400", (await buat({ startDate: A, endDate: A, startTime: "20:00", endTime: "23:00" })).status, 400);

  // --- satu hari: jam selesai pilihan disimpan ---
  const s1 = await buat({ startDate: A, endDate: A, startTime: "09:00", endTime: "11:00" });
  cek("Satu hari 09-11 -> 201", s1.status, 201);
  cek("Jam selesai tersimpan 11:00", String(s1.data.end_time).slice(0, 5), "11:00");
  cek("NIP tersimpan", s1.data.requester_nip, orang.nip);
  cek("Tumpang tindih 10-12 -> 409", (await buat({ startDate: A, endDate: A, startTime: "10:00", endTime: "12:00" })).status, 409);
  cek("Bersambung 11-13 -> 201", (await buat({ startDate: A, endDate: A, startTime: "11:00", endTime: "13:00" })).status, 201);
  cek("Sore 18-20 tetap bebas -> 201", (await buat({ startDate: A, endDate: A, startTime: "18:00", endTime: "20:00" })).status, 201);

  // --- berhari-hari ---
  const M = tanggal(75), M2 = tanggal(76), M3 = tanggal(77);
  cek("Berhari-hari jam selesai 17:30 -> 400", (await buat({ startDate: M, endDate: M3, startTime: "10:00", endTime: "17:30" })).status, 400);
  const m1 = await buat({ startDate: M, endDate: M3, startTime: "10:00", endTime: "15:00" });
  cek("Berhari-hari -> 201", m1.status, 201);
  cek("Jam mulai dipaksa 07:30", String(m1.data.start_time).slice(0, 5), "07:30");
  cek("Hari tengah 12-13 -> 409", (await buat({ startDate: M2, endDate: M2, startTime: "12:00", endTime: "13:00" })).status, 409);
  cek("Hari tengah 18-20 -> 201", (await buat({ startDate: M2, endDate: M2, startTime: "18:00", endTime: "20:00" })).status, 201);
  cek("Hari terakhir 14-16 -> 409", (await buat({ startDate: M3, endDate: M3, startTime: "14:00", endTime: "16:00" })).status, 409);
  cek("Hari terakhir 15-16 -> 201", (await buat({ startDate: M3, endDate: M3, startTime: "15:00", endTime: "16:00" })).status, 201);

  // --- barang berstok ---
  const P = tanggal(80);
  const brg = (qty, s, e) => post("/requests", { ...orang, assetId: proyektor.id, startDate: P, endDate: P, startTime: s, endTime: e, qty });
  cek("Proyektor 3 unit 09-12 -> 201", (await brg(3, "09:00", "12:00")).status, 201);
  cek("Proyektor 3 unit 10-11 -> 409", (await brg(3, "10:00", "11:00")).status, 409);
  cek("Proyektor 2 unit 10-11 -> 201", (await brg(2, "10:00", "11:00")).status, 201);

  // --- ketersediaan menampilkan jam selesai asli ---
  const av = (await api(`/requests/availability/${innova.id}?from=${A}&to=${A}`)).data;
  cek("Ketersediaan memuat jam selesai 11:00", av.some((x) => x.endTime === "11:00"), true);

  // --- cek pesanan memuat NIP ---
  const lk = await post("/requests/lookup", { email: orang.email, phone: orang.phone });
  cek("Cek Pesanan memuat NIP", lk.data[0]?.requester_nip, orang.nip);

  // --- helpdesk: setujui lalu /finish ---
  await post(`/admin/requests/${s1.data.id}/approve`, null, token);
  const fin = await post(`/admin/requests/${s1.data.id}/finish`, null, token);
  cek("Admin /finish -> Selesai", fin.data.status, "Selesai");
  cek("Admin /complete lama masih ada", (await post(`/admin/requests/${m1.data.id}/complete`, null, token)).status, 409);

  // --- aset: placement dan ukuran ---
  const aset = await post("/admin/assets", { name: "Aset Tes Otomatis9e", building: "Gedung Tes", placement: "Lantai 2, Ruang 3", category: "rapat", capacity: 20, length: 8, width: 6.5, facilities: [], images: [] }, token);
  cek("Aset dengan ukuran -> 201", aset.status, 201);
  cek("placement tersimpan", aset.data.placement, "Lantai 2, Ruang 3");
  cek("panjang tersimpan sebagai angka", aset.data.length, 8);
  cek("lebar tersimpan sebagai angka", aset.data.width, 6.5);
  cek("Ukuran negatif -> 400", (await post("/admin/assets", { name: "X", building: "Y", category: "rapat", capacity: 5, length: -1, facilities: [], images: [] }, token)).status, 400);
} finally {
  await pool.query("DELETE FROM notifications WHERE text LIKE '%Tes Otomatis9e%'");
  await pool.query("DELETE FROM requests WHERE requester_name = 'Tes Otomatis9e'");
  await pool.query("DELETE FROM assets WHERE name = 'Aset Tes Otomatis9e'");
  await pool.query("DELETE FROM users WHERE email = 'tes-admin9e@example.com'");
  console.log(gagal ? `\n${gagal} tes GAGAL.` : "\nSemua tes OK.", "Data tes dihapus.");
  await pool.end();
}
