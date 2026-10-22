import { readFileSync } from "node:fs";
import { pool } from "./db.js";

const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

try {
  await pool.query(sql);
  const r = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("Tabel di database:", r.rows.map((x) => x.table_name).join(", "));
} catch (err) {
  console.error("Gagal membuat tabel:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}