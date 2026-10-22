import { pool } from "./db.js";

const BASE = "http://localhost:4000/api";
const tanggal = (plusHari) =>
  new Date(Date.now() + plusHari * 86400000).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

const post = async (body) => {
  const r = await fetch(`${BASE}/requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
};
const cek = (label, got, want) => console.log(got === want ? "OK   " : "GAGAL", label, `(dapat ${got}, harapan ${want})`);

const assets = await (await fetch(`${BASE}/assets`)).json();
const innova = assets.find((a) => a.name === "Toyota Innova Reborn");
const proyektor = assets.find((a) => a.name === "Proyektor Portable");

const orang = { name: "Tes Otomatis", instansi: "KPTIK", phone: "081234567890", email: "tes@example.com", agenda: "Tes sistem" };
const besok = tanggal(2);

try {
  cek("Mobil: pengajuan pertama", (await post({ ...orang, assetId: innova.id, startDate: besok, endDate: besok, startTime: "09:00" })).status, 201);
  cek("Mobil: jadwal sama -> bentrok", (await post({ ...orang, assetId: innova.id, startDate: besok, endDate: besok, startTime: "13:00" })).status, 409);
  cek("Mobil: tanggal lain -> boleh", (await post({ ...orang, assetId: innova.id, startDate: tanggal(5), endDate: tanggal(5), startTime: "09:00" })).status, 201);
  cek("Barang stok 5: pinjam 3", (await post({ ...orang, assetId: proyektor.id, startDate: besok, endDate: besok, startTime: "09:00", qty: 3 })).status, 201);
  cek("Barang stok 5: pinjam 3 lagi -> bentrok", (await post({ ...orang, assetId: proyektor.id, startDate: besok, endDate: besok, startTime: "10:00", qty: 3 })).status, 409);
  cek("Barang stok 5: pinjam 2 -> boleh", (await post({ ...orang, assetId: proyektor.id, startDate: besok, endDate: besok, startTime: "10:00", qty: 2 })).status, 201);
  cek("Tanggal sudah lewat -> ditolak", (await post({ ...orang, assetId: innova.id, startDate: "2020-01-01", endDate: "2020-01-01", startTime: "09:00" })).status, 400);
  cek("Email salah -> ditolak", (await post({ ...orang, email: "bukan-email", assetId: innova.id, startDate: tanggal(9), endDate: tanggal(9), startTime: "09:00" })).status, 400);
  cek("Aset tidak ada -> 404", (await post({ ...orang, assetId: 99999, startDate: tanggal(9), endDate: tanggal(9), startTime: "09:00" })).status, 404);

  const av = await (await fetch(`${BASE}/requests/availability/${innova.id}?from=${tanggal(0)}&to=${tanggal(30)}`)).json();
  cek("Ketersediaan mobil: 2 jadwal terpakai", av.length, 2);
} finally {
  const d = await pool.query("DELETE FROM requests WHERE requester_email = 'tes@example.com'");
  console.log(`Data tes dihapus (${d.rowCount} baris).`);
  await pool.end();
}