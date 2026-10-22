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

const EMAIL = "tes-admin7@example.com", PASS = "PasswordTes123", NAMA = "Tes Otomatis7";
const orang = { name: NAMA, instansi: "KPTIK", phone: "081234567890", email: "tes7@example.com", agenda: "Tes sistem" };

try {
  await pool.query("DELETE FROM users WHERE email = $1", [EMAIL]);
  const u = (await pool.query(
    "INSERT INTO users (name, email, password_hash) VALUES ('Tes Admin', $1, $2) RETURNING id",
    [EMAIL, await bcrypt.hash(PASS, 10)]
  )).rows[0];

  cek("Tanpa token -> 401", (await api("/admin/requests")).status, 401);
  const token = (await api("/auth/login", { method: "POST", body: { email: EMAIL, password: PASS } })).data.token;

  const aula = (await api("/assets")).data.find((a) => a.name === "Aula Kota Lama");
  const slot = { ...orang, assetId: aula.id, startDate: tanggal(40), endDate: tanggal(40), startTime: "09:00" };
  const req1 = await api("/requests", { method: "POST", body: slot });
  cek("Pengajuan dibuat", req1.status, 201);
  const id = req1.data.id;

  const list = await api("/admin/requests?status=Menunggu", { token });
  cek("Muncul di daftar Menunggu", list.data.some((r) => r.id === id), true);
  cek("Jumlah Menunggu >= 1", (await api("/admin/requests/counts", { token })).data.Menunggu >= 1, true);

  const notif = await api("/notifications", { token });
  cek("Notifikasi pengajuan baru masuk", notif.data.items.some((n) => n.text.includes(NAMA)), true);

  cek("Tolak tanpa alasan -> 400", (await api(`/admin/requests/${id}/reject`, { method: "POST", token, body: {} })).status, 400);
  const ap = await api(`/admin/requests/${id}/approve`, { method: "POST", token });
  cek("Setujui -> 200", ap.status, 200);
  cek("Status jadi Disetujui", ap.data.status, "Disetujui");
  cek("Tercatat siapa yang menyetujui", ap.data.decided_by, u.id);
  cek("Setujui lagi -> 409", (await api(`/admin/requests/${id}/approve`, { method: "POST", token })).status, 409);
  cek("Tolak setelah disetujui -> 409", (await api(`/admin/requests/${id}/reject`, { method: "POST", token, body: { reason: "x" } })).status, 409);

  const cal = await api(`/admin/calendar?from=${tanggal(0)}&to=${tanggal(60)}`, { token });
  cek("Muncul di kalender", cal.data.some((r) => r.id === id), true);

  cek("Selesai -> 200", (await api(`/admin/requests/${id}/complete`, { method: "POST", token })).data.status, "Selesai");

  await api("/notifications/read-all", { method: "POST", token });
  cek("Semua notifikasi terbaca", (await api("/notifications", { token })).data.unread, 0);

  // Pengajuan kedua pada jadwal yang sama: ditolak -> jadwal harus bebas lagi
  const slot2 = { ...slot, startDate: tanggal(41), endDate: tanggal(41) };
  const id2 = (await api("/requests", { method: "POST", body: slot2 })).data.id;
  const rj = await api(`/admin/requests/${id2}/reject`, { method: "POST", token, body: { reason: "Jadwal dipakai kegiatan lain" } });
  cek("Tolak dengan alasan -> Ditolak", rj.data.status, "Ditolak");
  cek("Alasan tersimpan", rj.data.reject_reason, "Jadwal dipakai kegiatan lain");
  cek("Jadwal bebas lagi setelah ditolak", (await api("/requests", { method: "POST", body: slot2 })).status, 201);
} finally {
  await pool.query("DELETE FROM notifications WHERE text LIKE '%Tes Otomatis7%'");
  await pool.query("DELETE FROM requests WHERE requester_name = 'Tes Otomatis7'");
  await pool.query("DELETE FROM users WHERE email = 'tes-admin7@example.com'");
  console.log("Data tes dihapus.");
  await pool.end();
}