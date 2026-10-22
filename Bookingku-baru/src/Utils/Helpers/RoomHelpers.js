import { ROOMS } from "../../Data/Dummy";
import { getRequests, updateRequest } from "./AuthHelpers";
import { kindOf } from "./CategoryHelpers";

// Data aset (ruangan, barang, mobil) disimpan di localStorage supaya bisa diubah admin.
// Pertama kali dimuat, diisi dari Data/Dummy.js.
const KEY = "bk_rooms";
const save = (list) => localStorage.setItem(KEY, JSON.stringify(list));

export const getRooms = () => {
  const s = localStorage.getItem(KEY);
  if (s) return JSON.parse(s);
  save(ROOMS);
  return ROOMS;
};
export const addRoom = (r) => save([...getRooms(), { ...r, id: Date.now() }]);
export const updateRoom = (id, patch) => save(getRooms().map((r) => (r.id === id ? { ...r, ...patch } : r)));
export const deleteRoom = (id) => save(getRooms().filter((r) => r.id !== id));

// Jenis aset & jumlah unit yang bisa dipinjam bersamaan (ruangan/mobil = 1, barang = stok)
// Berdasarkan jenis kategori, sehingga kategori kustom (mis. Mess) ikut benar
export const isItem = (r) => !!r?.category && kindOf(r.category) === "barang";
export const isCar = (r) => !!r?.category && kindOf(r.category) === "mobil";
// Teks lokasi lengkap: gedung + posisi detail, mis. "Gedung Business — Lantai 2, Ruang Arsip"
export const locationText = (r) => [r?.building, r?.placement].map((x) => (x || "").trim()).filter(Boolean).join(" — ");
// Ukuran ruangan rapat/aula, mis. "6 × 4 m (24 m²)"; kosong jika belum diisi
export const sizeText = (r) => {
  const l = Number(r?.length), w = Number(r?.width);
  return l > 0 && w > 0 ? `${l} × ${w} m (${Math.round(l * w * 100) / 100} m²)` : "";
};
export const stockOf = (r) => (isItem(r) ? Math.max(1, Number(r.stock) || 1) : 1);
// Fitur "perlu dibersihkan" hanya untuk ruangan (barang dan mobil tidak)
export const needsCleanFlow = (r) => !isItem(r) && !isCar(r);

// Daftar foto (mendukung data lama yang hanya punya satu `image`)
export const roomImages = (r) => r.images || (r.image ? [r.image] : r.photo ? [r.photo] : []);
export const fmtDateTime = (iso) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
export const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
export const markCleaned = (id) =>
  updateRoom(id, { cleanedAt: new Date().toISOString(), needsCleaning: false, cleanNote: undefined, reportedBy: undefined, reportedAt: undefined });

export const fmtDate = (iso) => new Date(iso + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

// Kota sebuah permohonan; jika field location tidak ada, diambil dari asetnya
export const requestCity = (r) => r.location || getRooms().find((x) => x.id === r.roomId)?.location;

// Migrasi sekali jalan (v6): hanya Semarang, tanpa Mess, tanpa pembayaran, + barang & mobil.
(function migrateV6() {
  try {
    if (localStorage.getItem("bk_migr_v6")) return;
    const stored = localStorage.getItem(KEY);
    if (stored) {
      const keep = JSON.parse(stored).filter((r) => r.location === "Semarang" && r.category !== "mess" && r.category !== "mesh");
      const have = new Set(keep.map((r) => r.id));
      const add = ROOMS.filter((r) => (r.category === "barang" || r.category === "mobil") && !have.has(r.id));
      save([...keep, ...add]);
    }
    const alive = new Set(getRooms().map((r) => r.id));
    getRequests().forEach((r) => {
      const active = ["Menunggu Pembayaran", "Menunggu", "Disetujui"].includes(r.status);
      if (!alive.has(r.roomId) && active) {
        updateRequest(r.id, { status: "Dibatalkan", cancelReason: "Aset tidak lagi tersedia (layanan hanya di Semarang)", cancelledAt: new Date().toISOString() });
      } else if (r.status === "Menunggu Pembayaran") {
        updateRequest(r.id, { status: "Menunggu", paymentStatus: undefined }); // pembayaran dihapus -> tunggu persetujuan
      }
    });
    localStorage.setItem("bk_migr_v6", "1");
  } catch { /* abaikan */ }
})();

// Instansi peminjam: KPTIK, atau untuk PNS: nama kantor asalnya (tulisan "PNS" tidak ditampilkan)
export const instansiLabel = (r) => (r?.instansi === "PNS" ? r.kantor || "PNS" : r?.instansi || "");

// Migrasi v7: nama gedung tidak lagi memuat kata kota (Semarang hanya tampil di footer)
(function migrateV7() {
  try {
    if (localStorage.getItem("bk_migr_v7")) return;
    if (localStorage.getItem(KEY)) save(getRooms().map((r) => ({ ...r, building: (r.building || "").replace(/\s+Semarang$/i, "") })));
    localStorage.setItem("bk_migr_v7", "1");
  } catch { /* abaikan */ }
})();

// Migrasi v8: fitur pengelola dihapus (hanya Helpdesk/admin yang mengelola)
(function migrateV8() {
  try {
    if (localStorage.getItem("bk_migr_v8")) return;
    localStorage.removeItem("bk_city_managers");
    localStorage.setItem("bk_migr_v8", "1");
  } catch { /* abaikan */ }
})();
