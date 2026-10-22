import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const BASE = "http://localhost:4000/api";
const cek = (label, got, want) => console.log(got === want ? "OK   " : "GAGAL", label, `(dapat ${got}, harapan ${want})`);
const login = (email, password) =>
  fetch(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
const me = (token) => fetch(`${BASE}/auth/me`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

const EMAIL = "tes-login@example.com", PASS = "PasswordTes123";
try {
  await pool.query("DELETE FROM users WHERE email = $1", [EMAIL]);
  await pool.query("INSERT INTO users (name, email, password_hash) VALUES ('Tes Login', $1, $2)", [EMAIL, await bcrypt.hash(PASS, 10)]);

  const ok = await login(EMAIL, PASS);
  cek("Login benar", ok.status, 200);
  const { token, user } = await ok.json();
  cek("Respons berisi token", typeof token, "string");
  cek("Respons tidak membocorkan hash", "password_hash" in user, false);

  cek("Password salah -> 401", (await login(EMAIL, "salah")).status, 401);
  cek("Email tidak ada -> 401", (await login("tidakada@example.com", PASS)).status, 401);
  cek("Data kosong -> 400", (await login("", "")).status, 400);
  cek("/me dengan token -> 200", (await me(token)).status, 200);
  cek("/me tanpa token -> 401", (await me(null)).status, 401);
  cek("/me token dipalsukan -> 401", (await me(token.slice(0, -3) + "abc")).status, 401);
} finally {
  await pool.query("DELETE FROM users WHERE email = $1", [EMAIL]);
  console.log("Akun tes dihapus.");
  await pool.end();
}