import { pool } from "./db.js";

// Riwayat peminjaman (dan notifikasi) yang lebih tua dari 1 tahun dihapus otomatis.
// Patokannya tanggal SELESAI peminjaman (tanggal Jakarta), bukan tanggal pengajuan.
export const purgeOld = async (db = pool) => {
  const req = await db.query(
    "DELETE FROM requests WHERE end_date < ((now() AT TIME ZONE 'Asia/Jakarta')::date - INTERVAL '1 year')"
  );
  const notif = await db.query("DELETE FROM notifications WHERE created_at < now() - INTERVAL '1 year'");
  return { requests: req.rowCount, notifications: notif.rowCount };
};
