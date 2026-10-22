import "dotenv/config";
import pg from "pg";

// Kolom DATE dikembalikan sebagai teks "2026-10-19", bukan objek Date (menghindari geser zona waktu).
pg.types.setTypeParser(1082, (v) => v);

// Pool = kumpulan koneksi ke database yang dipakai ulang oleh semua request.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);