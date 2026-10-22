import bcrypt from "bcryptjs";
import { pool } from "./db.js";

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
const put = (p, body, token) => api(p, { method: "PUT", body, token });
const del = (p, token) => api(p, { method: "DELETE", token });
const EMAIL = "tes-admin9g@example.com", PASS = "PasswordTes123";
const NAMA_KAT = "Kategori Tes Otomatis9g";

let lokasiAsli, kontakAsli;
try {
  await pool.query("DELETE FROM users WHERE email = $1", [EMAIL]);
  await pool.query("INSERT INTO users (name, email, password_hash) VALUES ('Tes Admin9g', $1, $2)", [EMAIL, await bcrypt.hash(PASS, 10)]);
  const token = (await post("/auth/login", { email: EMAIL, password: PASS })).data.token;
  const s0 = (await api("/settings")).data;
  lokasiAsli = s0.footerLocation; kontakAsli = s0.contact;
  cek("Pengaturan publik punya lokasi", typeof s0.footerLocation.address, "string");

  // lokasi footer
  cek("Ubah lokasi tanpa login -> 401", (await put("/settings/footer-location", { address: "x" })).status, 401);
  cek("Lokasi kosong -> 400", (await put("/settings/footer-location", { address: " " }, token)).status, 400);
  cek("Ubah lokasi -> 200", (await put("/settings/footer-location", { address: "Jl. Tes No. 1, Semarang" }, token)).status, 200);
  cek("Lokasi terbaca publik", (await api("/settings")).data.footerLocation.address, "Jl. Tes No. 1, Semarang");

  // kontak
  cek("Nomor tidak valid -> 400", (await put("/settings/contact", { name: "A", phone: "abc" }, token)).status, 400);
  cek("Ubah kontak -> 200", (await put("/settings/contact", { name: "Helpdesk Tes", phone: "081234567890" }, token)).status, 200);
  cek("Kontak terbaca publik", (await api("/settings")).data.contact.phone, "081234567890");

  // kategori
  cek("Tambah kategori tanpa login -> 401", (await post("/settings/categories", { name: NAMA_KAT, kind: "ruang" })).status, 401);
  cek("Jenis salah -> 400", (await post("/settings/categories", { name: NAMA_KAT, kind: "lain" }, token)).status, 400);
  cek("Nama kembar dengan bawaan -> 409", (await post("/settings/categories", { name: "aula", kind: "ruang" }, token)).status, 409);
  const kat = await post("/settings/categories", { name: NAMA_KAT, kind: "ruang", icon: "🛏️", color: "#112233" }, token);
  cek("Tambah kategori -> 201", kat.status, 201);
  cek("Nama kembar kategori kustom -> 409", (await post("/settings/categories", { name: NAMA_KAT.toUpperCase(), kind: "ruang" }, token)).status, 409);
  cek("Kategori terbaca publik", (await api("/settings")).data.categories.some((c) => c.id === kat.data.id), true);

  // aset di kategori kustom
  const aset = await post("/admin/assets", { name: "Aset Tes Otomatis9g", building: "Mess Tes", category: kat.data.id, capacity: 4, length: 5, width: 3, facilities: [], images: [] }, token);
  cek("Aset di kategori kustom -> 201", aset.status, 201);
  cek("Ukuran tersimpan (kategori ruang kustom)", aset.data.length, 5);
  cek("Kategori tidak dikenal -> 400", (await post("/admin/assets", { name: "X", building: "Y", category: "tidak-ada", capacity: 4, facilities: [], images: [] }, token)).status, 400);
  cek("Hapus kategori yang dipakai -> 409", (await del(`/settings/categories/${kat.data.id}`, token)).status, 409);

  // peminjaman aset kategori kustom
  const P = tanggal(90);
  const rq = await post("/requests", { name: "Tes Otomatis9g", nip: "198001012005011001", instansi: "KPTIK", phone: "081234567890", email: "tes9g@example.com", agenda: "Tes", assetId: aset.data.id, startDate: P, endDate: P, startTime: "09:00", endTime: "10:00" });
  cek("Pinjam aset kategori kustom -> 201", rq.status, 201);
  await post(`/requests/${rq.data.id}/cancel`, { email: "tes9g@example.com", phone: "081234567890" });
  cek("Hapus aset kustom -> 200", (await del(`/admin/assets/${aset.data.id}`, token)).status, 200);

  cek("Hapus kategori bawaan -> 404", (await del("/settings/categories/aula", token)).status, 404);
  cek("Hapus kategori kustom -> 200", (await del(`/settings/categories/${kat.data.id}`, token)).status, 200);
  cek("Kategori hilang dari publik", (await api("/settings")).data.categories.some((c) => c.id === kat.data.id), false);
} finally {
  // kembalikan pengaturan asli
  if (lokasiAsli) await pool.query("INSERT INTO settings (key,value) VALUES ('footerLocation',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [JSON.stringify(lokasiAsli)]);
  if (kontakAsli) await pool.query("INSERT INTO settings (key,value) VALUES ('contact',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [JSON.stringify(kontakAsli)]);
  await pool.query("UPDATE settings SET value = (SELECT COALESCE(jsonb_agg(c),'[]'::jsonb) FROM jsonb_array_elements(value) c WHERE c->>'name' <> $1) WHERE key='categories'", [NAMA_KAT]);
  await pool.query("DELETE FROM notifications WHERE text LIKE '%Tes Otomatis9g%'");
  await pool.query("DELETE FROM requests WHERE requester_name = 'Tes Otomatis9g'");
  await pool.query("DELETE FROM assets WHERE name = 'Aset Tes Otomatis9g'");
  await pool.query("DELETE FROM users WHERE email = 'tes-admin9g@example.com'");
  console.log(gagal ? `\n${gagal} tes GAGAL.` : "\nSemua tes OK.", "Data tes dihapus.");
  await pool.end();
}
