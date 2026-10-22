import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const [name, email, password, role = "helpdesk"] = process.argv.slice(2);
if (!name || !email || !password) {
  console.log('Cara pakai: node src/create-user.js "Nama" email@contoh.go.id "PasswordKuat" [helpdesk|admin]');
  process.exit(1);
}
if (password.length < 8) {
  console.log("Password minimal 8 karakter.");
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
    [name, email.toLowerCase(), hash, role]
  );
  console.log(`Akun ${role} dibuat: ${email}`);
} catch (err) {
  console.error(err.code === "23505" ? "Email itu sudah terdaftar." : `Gagal: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}