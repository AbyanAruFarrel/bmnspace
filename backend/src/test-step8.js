import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const BASE = "http://localhost:4000/api";
const cek = (label, got, want) => console.log(got === want ? "OK   " : "GAGAL", label, `(dapat ${got}, harapan ${want})`);
const tanggal = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
const api = async (path, { method = "GET", token, body } = {}) => {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
};
const post = (path, body, token) => api(path, { method: "POST", body, token });

const EMAIL = "tes-admin8@example.com", PASS = "PasswordTes123", NAMA = "Tes Otomatis8";
const cred = { email: "tes8@example.com", phone: "081234567890" };
const orang = { name: NAMA, instansi: "KPTIK", agenda: "Tes sistem", ...cred };

try {
  await pool.query("DELETE FROM users WHERE email = $1", [EMAIL]);
  await pool.query("INSERT INTO users (name, email, password_hash) VALUES ('Tes Admin8', $1, $2)", [EMAIL, await bcrypt.hash(PASS, 10)]);
  const token = (await post("/auth/login", { email: EMAIL, password: PASS })).data.token;

  const aula = (await api("/assets")).data.find((a) => a.name === "Aula Kota Lama");
  const slot = { ...orang, assetId: aula.id, startDate: tanggal(45), endDate: tanggal(45), startTime: "09:00" };
  const id = (await post("/requests", slot)).data.id;

  // --- Cek Pesanan ---
  const l1 = await post("/requests/lookup", cred);
  cek("Cek Pesanan: data benar -> ditemukan", l1.data.some((r) => r.id === id), true);
  cek("Cek Pesanan: nomor HP tidak ikut dikirim", "requester_phone" in l1.data[0], false);
  cek("Cek Pesanan: format +62 tetap cocok", (await post("/requests/lookup", { ...cred, phone: "+6281234567890" })).status, 200);
  cek("Cek Pesanan: HP salah -> 404", (await post("/requests/lookup", { ...cred, phone: "089999999999" })).status, 404);
  cek("Cek Pesanan: email salah -> 404", (await post("/requests/lookup", { ...cred, email: "lain@example.com" })).status, 404);
  cek("Cek Pesanan: kosong -> 400", (await post("/requests/lookup", {})).status, 400);

  // --- Batalkan ---
  cek("Batal dengan HP salah -> 404", (await post(`/requests/${id}/cancel`, { ...cred, phone: "089999999999" })).status, 404);
  const c = await post(`/requests/${id}/cancel`, { ...cred, reason: "Acara dibatalkan" });
  cek("Batal -> 200", c.status, 200);
  cek("Status jadi Dibatalkan", c.data.status, "Dibatalkan");
  cek("Alasan tersimpan", c.data.cancel_reason, "Acara dibatalkan");
  cek("Batal lagi -> 409", (await post(`/requests/${id}/cancel`, cred)).status, 409);
  const n1 = (await api("/notifications", { token })).data.items;
  cek("Helpdesk menerima notifikasi pembatalan", n1.some((n) => n.text.includes("membatalkan") && n.text.includes(NAMA)), true);

  // --- Selesai memakai ---
  const id2 = (await post("/requests", slot)).data.id; // jadwal bebas lagi setelah dibatalkan
  cek("Selesai sebelum disetujui -> 409", (await post(`/requests/${id2}/finish`, cred)).status, 409);
  await post(`/admin/requests/${id2}/approve`, undefined, token);
  cek("Batal setelah disetujui -> 409", (await post(`/requests/${id2}/cancel`, cred)).status, 409);
  cek("Selesai memakai -> Selesai", (await post(`/requests/${id2}/finish`, cred)).data.status, "Selesai");
  const n2 = (await api("/notifications", { token })).data.items;
  cek("Helpdesk menerima notifikasi selesai", n2.some((n) => n.text.includes("selesai memakai") && n.text.includes(NAMA)), true);

  // --- Pembatalan otomatis ---
  await pool.query(
    `INSERT INTO requests (asset_id, asset_name, requester_name, requester_instansi, requester_phone, requester_email,
                           agenda, start_date, end_date, start_time, end_time)
     VALUES ($1, 'Aula Kota Lama', $2, 'KPTIK', $3, $4, 'Tes kedaluwarsa', $5, $5, '09:00', '22:00')`,
    [aula.id, NAMA, cred.phone, cred.email, tanggal(-1)]
  );
  const lama = (await post("/requests/lookup", cred)).data.find((r) => r.start_date === tanggal(-1));
  cek("Pengajuan yang waktunya lewat -> Dibatalkan", lama?.status, "Dibatalkan");
  cek("Alasan otomatis tercatat", lama?.cancel_reason?.includes("Otomatis"), true);
} finally {
  await pool.query("DELETE FROM notifications WHERE text LIKE '%Tes Otomatis8%'");
  await pool.query("DELETE FROM requests WHERE requester_name = 'Tes Otomatis8'");
  await pool.query("DELETE FROM users WHERE email = 'tes-admin8@example.com'");
  console.log("Data tes dihapus.");
  await pool.end();
}