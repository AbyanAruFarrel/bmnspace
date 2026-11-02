import { getRequests, updateRequest } from "./AuthHelpers";

export const OPEN = "07:30";   // jam operasional
export const CLOSE = "17:00";
// Peminjaman berhari-hari: tiap hari 07:30–17:00 (jam mulai otomatis 07:30, jam selesai maksimal 17:00)
export const MULTI_START = "07:30";
export const MULTI_END = "17:00";
// Barang bisa dipinjam kapan saja (24 jam, kontinu)
export const ITEM_OPEN = "00:00";
export const ITEM_CLOSE = "23:59";

// Aturan jam per jenis aset. continuous = true untuk barang (24 jam).
//   ruangan/mobil: satu hari OPEN-CLOSE; berhari-hari mulai 07:30, hari terakhir sampai maks. 17:00
//   barang       : jam mulai & selesai bebas 00:00-23:59, hari tengah dipakai penuh
export const rulesFor = (continuous) =>
  continuous
    ? { continuous: true, open: ITEM_OPEN, close: ITEM_CLOSE, multiStart: null, multiEnd: ITEM_CLOSE }
    : { continuous: false, open: OPEN, close: CLOSE, multiStart: MULTI_START, multiEnd: MULTI_END };

// "Menunggu" (belum diputuskan admin) dan "Disetujui" sama-sama mengunci jadwal.
// Ditolak, Dibatalkan, dan Selesai tidak menghalangi peminjam lain.
// Jadwal terpakai per aset diambil dari API (lihat AvailabilityCalendar) dan sudah hanya berisi
// pengajuan aktif (Menunggu/Disetujui).
const busy = {};
const cont = {}; // aset mana yang dipinjam 24 jam (barang)
export const setBusy = (roomId, list, continuous = false) => { busy[roomId] = list; cont[roomId] = !!continuous; };
const active = (roomId, exceptId) =>
  (busy[roomId] || []).filter((r) => exceptId === undefined || r.id !== exceptId);

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const fmtMin = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const localIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Peminjaman punya jam mulai (hari pertama) dan jam selesai (hari terakhir).
// Berhari-hari: tiap hari 07:30–17:00, hari terakhir berakhir di jam selesai yang dipilih.
export const isMulti = (r) => r.startDate !== r.endDate;
const eff = (r, date, continuous = false) => {
  if (continuous) { // 24 jam: hari pertama dari jam mulai, hari tengah penuh, hari terakhir sampai jam selesai
    return [date === r.startDate ? r.startTime || ITEM_OPEN : ITEM_OPEN, date === r.endDate ? r.endTime || ITEM_CLOSE : "24:00"];
  }
  return isMulti(r)
    ? [date === r.startDate ? r.startTime || MULTI_START : MULTI_START, date === r.endDate ? r.endTime || MULTI_END : MULTI_END]
    : [r.startTime || OPEN, r.endTime || CLOSE];
};
// Jumlah unit yang dipinjam (hanya barang berstok > 1 yang memakai qty)
const units = (r, stock) => (stock > 1 ? Math.max(1, Number(r.qty) || 1) : 1);

export const rentLabel = (r) => (isMulti(r) ? "Berhari-hari" : "Satu Hari");
// continuous = true (barang): berhari-hari dipakai terus-menerus dari jam mulai sampai jam selesai
export const timeText = (r, continuous = false) =>
  !r.endTime ? `mulai ${r.startTime || OPEN}`
    : isMulti(r) ? (continuous ? `mulai ${r.startTime}, selesai ${r.endTime} di hari terakhir`
      : `tiap hari ${r.startTime || MULTI_START}–${MULTI_END}, hari terakhir sampai ${r.endTime}`)
    : `${r.startTime}–${r.endTime}`;

// Segmen waktu pada satu tanggal beserta jumlah unit terpakai: [[mulai, selesai, terpakai], ...]
const segments = (list, date, stock, continuous = false) => {
  const on = list.filter((r) => date >= r.startDate && date <= r.endDate).map((r) => ({ t: eff(r, date, continuous).map(toMin), u: units(r, stock) }));
  const cuts = [...new Set(on.flatMap((x) => x.t))].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const used = on.filter((x) => x.t[0] < cuts[i + 1] && x.t[1] > cuts[i]).reduce((s, x) => s + x.u, 0);
    if (used > 0) out.push([cuts[i], cuts[i + 1], used]);
  }
  return out;
};
const merge = (list) => {
  const out = [];
  [...list].sort((a, b) => a[0] - b[0]).forEach((x) => {
    const last = out[out.length - 1];
    if (last && x[0] <= last[1]) last[1] = Math.max(last[1], x[1]); else out.push([x[0], x[1]]);
  });
  return out;
};

// Slot jam yang TIDAK tersedia pada satu tanggal (semua unit terpakai), dalam menit dari 00:00
export const slotsOn = (roomId, date, stock = 1) =>
  merge(segments(active(roomId), date, stock, !!cont[roomId]).filter((s) => s[2] >= stock));

// Unit yang masih tersisa sepanjang jam tertentu pada satu tanggal (untuk info barang)
export const freeUnits = (roomId, date, stock = 1) => stock - Math.max(0, ...segments(active(roomId), date, stock, !!cont[roomId]).map((s) => s[2]));

// Hari yang ada peminjamannya = "Sedang dipakai" (merah). free = unit yang masih tersisa sepanjang hari (0 = tidak bisa dipinjam).
export const dayStatus = (roomId, y, m, total, stock = 1) => {
  const res = {};
  const list = active(roomId);
  for (let d = 1; d <= total; d++) {
    const iso = localIso(new Date(y, m, d));
    if (!list.some((r) => iso >= r.startDate && iso <= r.endDate)) continue;
    const isCont = !!cont[roomId];
    const segs = segments(list, iso, stock, isCont);
    const slots = merge(segs.filter((s) => s[2] >= stock));
    // full = jam kerja penuh terpakai (merah); selain itu masih ada jam/unit kosong (kuning)
    // ruangan/mobil: jam kerja 07:30–17:00; barang: seharian penuh 00:00–23:59
    const fullFrom = isCont ? 0 : toMin(OPEN), fullTo = isCont ? toMin(ITEM_CLOSE) : toMin(MULTI_END);
    const full = slots.some((s) => s[0] <= fullFrom && s[1] >= fullTo);
    res[d] = { status: full ? "full" : "partial", full, slots, free: stock - Math.max(0, ...segs.map((s) => s[2])) };
  }
  return res;
};

// Bentrok jika pada jam yang diminta sisa unit tidak cukup (ruangan/mobil = 1 unit).
// exceptId: abaikan permohonan itu sendiri.
export const isClash = (roomId, n, exceptId, stock = 1) => {
  const list = active(roomId, exceptId);
  const need = units(n, stock);
  const end = new Date(n.endDate + "T00:00");
  for (let d = new Date(n.startDate + "T00:00"), i = 0; d <= end && i < 400; d.setDate(d.getDate() + 1), i++) {
    const iso = localIso(d);
    const [ns, ne] = eff(n, iso, !!cont[roomId]).map(toMin);
    const worst = Math.max(0, ...segments(list, iso, stock, !!cont[roomId]).filter((s) => s[0] < ne && s[1] > ns).map((s) => s[2]));
    if (worst + need > stock) return true;
  }
  return false;
};

// ---- waktu real time ----
// Batas terakhir permohonan masih berguna: jam mulai di hari pertama
export const startCutoff = (r) => new Date(`${r.startDate}T${r.startTime || CLOSE}:00`);
// Permohonan di bawah jam real time tidak boleh
export const isPastBooking = (r, now = new Date()) => startCutoff(r) <= now;
// Jam mulai paling awal yang boleh dipilih pada tanggal tertentu (hari ini = menit berikutnya)
export const minStartTime = (dateIso, now = new Date(), open = OPEN, close = CLOSE) => {
  if (dateIso !== localIso(now)) return open;
  return fmtMin(Math.min(toMin(close), Math.max(toMin(open), now.getHours() * 60 + now.getMinutes() + 1)));
};
export const addMinutes = (t, n) => fmtMin(Math.min(24 * 60 - 1, toMin(t) + n));

// Permohonan yang belum diputuskan sampai waktu mulainya lewat -> dibatalkan otomatis (jadwal dilepas)
export const expireStale = () => {
  const now = new Date();
  getRequests().filter((r) => r.status === "Menunggu" && startCutoff(r) <= now)
    .forEach((r) => updateRequest(r.id, { status: "Dibatalkan", cancelReason: "Kedaluwarsa: tidak diproses sebelum waktu mulai", cancelledAt: now.toISOString() }));
};
