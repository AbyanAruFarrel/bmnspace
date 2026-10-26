// Aturan jadwal peminjaman (sama dengan BookingHelpers.js di frontend).
// Satu hari      : jam mulai s/d jam selesai pada hari itu (jam operasional 08:00-22:00).
// Berhari-hari   : hari pertama mulai 07:30, hari tengah 07:30-17:00,
//                  hari terakhir 07:30 sampai jam selesai yang dipilih (maks. 17:00).
export const OPEN = "07:30";
export const CLOSE = "17:00";
export const MULTI_START = "07:30";
export const MULTI_END = "17:00";
export const MAX_DAYS = 366;

const toMin = (t) => { const [h, m] = String(t).slice(0, 5).split(":").map(Number); return h * 60 + m; };
const day = (s) => String(s).slice(0, 10);
const addDay = (iso) => new Date(Date.parse(iso + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);

// r berbentuk baris database: start_date, end_date, start_time, end_time
export const isMulti = (r) => day(r.start_date) !== day(r.end_date);

// Jendela waktu (menit dari 00:00) yang dipakai pengajuan pada satu tanggal
export const windowOn = (r, date) => {
  if (!isMulti(r)) return [toMin(r.start_time), toMin(r.end_time || CLOSE)];
  return [
    date === day(r.start_date) ? toMin(r.start_time || MULTI_START) : toMin(MULTI_START),
    date === day(r.end_date) ? toMin(r.end_time || MULTI_END) : toMin(MULTI_END),
  ];
};

export const daysOf = (r) => {
  const out = [];
  for (let d = day(r.start_date), i = 0; d <= day(r.end_date) && i < MAX_DAYS + 1; d = addDay(d), i++) out.push(d);
  return out;
};

// existing: pengajuan aktif (Menunggu/Disetujui) milik aset yang sama. nw: pengajuan baru {…, qty}.
// capacity: 1 untuk ruangan/mobil, stok untuk barang.
export const hasClash = (existing, nw, capacity) => {
  for (const date of daysOf(nw)) {
    const [ns, ne] = windowOn(nw, date);
    const on = existing
      .filter((r) => date >= day(r.start_date) && date <= day(r.end_date))
      .map((r) => ({ w: windowOn(r, date), u: capacity > 1 ? Math.max(1, Number(r.qty) || 1) : 1 }))
      .filter((x) => x.w[0] < ne && x.w[1] > ns);
    // Pemakaian tertinggi terjadi di awal pengajuan baru atau di awal salah satu pengajuan lain
    const points = [ns, ...on.map((x) => x.w[0]).filter((t) => t > ns && t < ne)];
    const worst = Math.max(0, ...points.map((t) => on.filter((x) => x.w[0] <= t && t < x.w[1]).reduce((n, x) => n + x.u, 0)));
    if (worst + nw.qty > capacity) return true;
  }
  return false;
};
