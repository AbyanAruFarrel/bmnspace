import { pool } from "./db.js";

// Pengajuan "Menunggu" yang waktu mulainya sudah lewat otomatis dibatalkan.
// db bisa berupa pool (default) atau client yang sedang dalam transaksi.
export const expireStale = (db = pool) =>
  db.query(
    `UPDATE requests
     SET status = 'Dibatalkan',
         cancel_reason = 'Otomatis dibatalkan: belum diputuskan Helpdesk sampai waktu mulai'
     WHERE status = 'Menunggu'
       AND (start_date + start_time) <= (now() AT TIME ZONE 'Asia/Jakarta')`
  );