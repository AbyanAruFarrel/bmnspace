// Aturan jadwal peminjaman (sama dengan BookingHelpers.js di frontend).
//
// Ruangan & mobil (jam kerja):
//   Satu hari    : jam mulai s/d jam selesai pada hari itu (07:30-17:00).
//   Berhari-hari : hari pertama mulai 07:30, hari tengah 07:30-17:00, hari terakhir sampai jam selesai (maks. 17:00).
// Barang (24 jam, kontinu):
//   Bisa dipinjam kapan saja. Hari pertama mulai di jam yang dipilih, hari tengah penuh 00:00-24:00,
//   hari terakhir sampai jam selesai (maks. 23:59).
export const OPEN = "07:30";
export const CLOSE = "17:00";
export const MULTI_START = "07:30";
export const MULTI_END = "17:00";
export const ITEM_OPEN = "00:00";
export const ITEM_CLOSE = "23:59";
export const MAX_DAYS = 366;

// kind: "ruang" | "barang" | "mobil"
// SEMUA kategori (ruangan, barang, mobil) bisa dipinjam 24 jam. Untuk kembali ke jam kerja bagi ruangan/mobil,
// pakai versi: kind === "barang" ? {...24 jam} : {...jam kerja}.
export const rulesFor = (_kind) => ({ continuous: true, open: ITEM_OPEN, close: ITEM_CLOSE, multiStart: null, multiEnd: ITEM_CLOSE });

const toMin = (t) => { const [h, m] = String(t).slice(0, 5).split(":").map(Number); return h * 60 + m; };
const day = (s) => String(s).slice(0, 10);
const addDay = (iso) => new Date(Date.parse(iso + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);

// r berbentuk baris database: start_date, end_date, start_time, end_time
export const isMulti = (r) => day(r.start_date) !== day(r.end_date);

// Jendela waktu (menit dari 00:00) yang dipakai pengajuan pada satu tanggal
export const windowOn = (r, date, continuous = false) => {
  const first = date === day(r.start_date), last = date === day(r.end_date);
  if (continuous) {
    return [
      first ? toMin(r.start_time || ITEM_OPEN) : 0,
      last ? toMin(r.end_time || ITEM_CLOSE) : 1440,
    ];
  }
  if (!isMulti(r)) return [toMin(r.start_time), toMin(r.end_time || CLOSE)];
  return [
    first ? toMin(r.start_time || MULTI_START) : toMin(MULTI_START),
    last ? toMin(r.end_time || MULTI_END) : toMin(MULTI_END),
  ];
};

export const daysOf = (r) => {
  const out = [];
  for (let d = day(r.start_date), i = 0; d <= day(r.end_date) && i < MAX_DAYS + 1; d = addDay(d), i++) out.push(d);
  return out;
};

// existing: pengajuan aktif (Menunggu/Disetujui) milik aset yang sama. nw: pengajuan baru {…, qty}.
// capacity: 1 untuk ruangan/mobil, stok untuk barang. continuous: true untuk barang (24 jam).
export const hasClash = (existing, nw, capacity, continuous = false) => {
  for (const date of daysOf(nw)) {
    const [ns, ne] = windowOn(nw, date, continuous);
    const on = existing
      .filter((r) => date >= day(r.start_date) && date <= day(r.end_date))
      .map((r) => ({ w: windowOn(r, date, continuous), u: capacity > 1 ? Math.max(1, Number(r.qty) || 1) : 1 }))
      .filter((x) => x.w[0] < ne && x.w[1] > ns);
    // Pemakaian tertinggi terjadi di awal pengajuan baru atau di awal salah satu pengajuan lain
    const points = [ns, ...on.map((x) => x.w[0]).filter((t) => t > ns && t < ne)];
    const worst = Math.max(0, ...points.map((t) => on.filter((x) => x.w[0] <= t && t < x.w[1]).reduce((n, x) => n + x.u, 0)));
    if (worst + nw.qty > capacity) return true;
  }
  return false;
};
