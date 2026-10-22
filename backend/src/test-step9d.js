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
const post = (p, body, token) => api(p, { method: "POST", body, token });
const put = (p, body, token) => api(p, { method: "PUT", body, token });
const del = (p, token) => api(p, { method: "DELETE", token });

const EMAIL = "tes-admin9@example.com", PASS = "PasswordTes123", PASS2 = "PasswordBaru456";
const NAMA = "Tes Otomatis9", ASET = "Aset Tes Otomatis9";
const cred = { email: "tes9@example.com", phone: "081234567890" };

try {
  await pool.query("DELETE FROM users WHERE email = $1", [EMAIL]);
  await pool.query("INSERT INTO users (name, email, password_hash) VALUES ('Tes Admin9', $1, $2)", [EMAIL, await bcrypt.hash(PASS, 10)]);
  const token = (await post("/auth/login", { email: EMAIL, password: PASS })).data.token;

  // --- kelola aset ---
  const body = { name: ASET, building: "Gedung Tes", category: "rapat", capacity: 12, facilities: ["AC", "TV"], images: ["data:image/jpeg;base64,AAAA"] };
  cek("Tambah aset tanpa login -> 401", (await post("/admin/assets", body)).status, 401);
  const c = await post("/admin/assets", body, token);
  cek("Tambah aset -> 201", c.status, 201);
  cek("Lokasi otomatis Semarang", c.data.location, "Semarang");
  const id = c.data.id;
  cek("Kategori salah -> 400", (await post("/admin/assets", { ...body, category: "lain" }, token)).status, 400);
  cek("Foto bukan JPG -> 400", (await post("/admin/assets", { ...body, images: ["data:image/png;base64,AAAA"] }, token)).status, 400);
  cek("Barang tanpa stok -> 400", (await post("/admin/assets", { ...body, category: "barang", stock: 0 }, token)).status, 400);
  cek("Muncul di katalog publik", (await api("/assets")).data.some((a) => a.id === id), true);

  const u = await put(`/admin/assets/${id}`, { ...body, name: ASET + " Baru", category: "barang", stock: 3 }, token);
  cek("Ubah aset -> 200", u.status, 200);
  cek("Stok berubah", u.data.stock, 3);
  cek("Kapasitas dikosongkan untuk barang", u.data.capacity, null);
  cek("Ubah aset yang tidak ada -> 404", (await put("/admin/assets/999999", body, token)).status, 404);

  // --- hapus aset ---
  const slot = { ...cred, name: NAMA, instansi: "KPTIK", agenda: "Tes", assetId: id, startDate: tanggal(50), endDate: tanggal(50), startTime: "09:00", qty: 1 };
  const rq = await post("/requests", slot);
  cek("Pengajuan pada aset baru -> 201", rq.status, 201);
  cek("Hapus aset yang punya pengajuan aktif -> 409", (await del(`/admin/assets/${id}`, token)).status, 409);
  await post(`/requests/${rq.data.id}/cancel`, cred);
  cek("Hapus aset setelah pengajuan dibatalkan -> 200", (await del(`/admin/assets/${id}`, token)).status, 200);
  cek("Hapus lagi -> 404", (await del(`/admin/assets/${id}`, token)).status, 404);
  const hist = (await api("/admin/requests?status=Dibatalkan", { token })).data.find((r) => r.id === rq.data.id);
  cek("Riwayat tetap ada, nama aset tercatat", hist?.asset_name, ASET + " Baru");
  cek("asset_id riwayat menjadi kosong", hist?.asset_id, null);

  // --- ubah password ---
  cek("Password lama salah -> 400 (bukan 401)", (await post("/auth/change-password", { current: "salah", next: PASS2 }, token)).status, 400);
  cek("Password baru terlalu pendek -> 400", (await post("/auth/change-password", { current: PASS, next: "abc" }, token)).status, 400);
  cek("Ubah password -> 200", (await post("/auth/change-password", { current: PASS, next: PASS2 }, token)).status, 200);
  cek("Login dengan password lama -> 401", (await post("/auth/login", { email: EMAIL, password: PASS })).status, 401);
  cek("Login dengan password baru -> 200", (await post("/auth/login", { email: EMAIL, password: PASS2 })).status, 200);
  cek("Ubah password tanpa login -> 401", (await post("/auth/change-password", { current: PASS2, next: PASS })).status, 401);
} finally {
  await pool.query("DELETE FROM notifications WHERE text LIKE '%Tes Otomatis9%'");
  await pool.query("DELETE FROM requests WHERE requester_name = 'Tes Otomatis9'");
  await pool.query("DELETE FROM assets WHERE name LIKE 'Aset Tes Otomatis9%'");
  await pool.query("DELETE FROM users WHERE email = 'tes-admin9@example.com'");
  console.log("Data tes dihapus.");
  await pool.end();
}
