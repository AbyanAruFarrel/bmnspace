import "dotenv/config";
import pg from "pg";

// Kolom DATE dikembalikan sebagai teks "2026-10-19", bukan objek Date (menghindari geser zona waktu).
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Di Vercel tiap instance fungsi punya pool sendiri, jadi dibuat kecil agar batas koneksi Neon tidak habis.
  max: process.env.VERCEL ? 3 : 10,
});
pool.on("error", (err) => console.error("Kesalahan koneksi database:", err.message));

export const query = (text, params) => pool.query(text, params);
