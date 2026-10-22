// Login helpdesk memakai API backend (token JWT disimpan per tab di sessionStorage).
// Fungsi permohonan/profil lama di bawah masih memakai localStorage dan akan dihapus bertahap.
import { api } from "./api";
const USERS = "bk_users";
const SESSION = "bk_session";
const REQUESTS = "bk_requests";
const read = (k, d) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));


export const getUsers = () => read(USERS, []);
// Sesi login disimpan PER TAB (sessionStorage): admin dan user bisa login bersamaan di tab berbeda
// pada satu browser tanpa saling menimpa. Data lain (akun, permohonan, notifikasi, chat) tetap di localStorage.
localStorage.removeItem(SESSION); // buang sisa sesi lama yang dibagi antar tab
// Sesi hanya sah jika punya token dari server (sesi lama tanpa token diabaikan).
export const getSession = () => {
  try { const x = JSON.parse(sessionStorage.getItem(SESSION)); return x?.token ? x : null; } catch { return null; }
};
export const getToken = () => getSession()?.token || null;
export const isAdmin = () => getSession()?.role === "admin";

// Sapaan otomatis dari jenis kelamin: Laki-laki -> Mr, Perempuan -> Mrs
export const titleFromGender = (g) => (g === "Laki-laki" ? "Mr" : g === "Perempuan" ? "Mrs" : "");

export const registerUser = ({ name, email, password, gender, instansi }) => {
  const users = read(USERS, []);
  if (users.some((u) => u.email === email)) return { ok: false, message: "Email sudah terdaftar" };
  users.push({ id: Date.now(), name, email, password, gender, title: titleFromGender(gender), instansi, role: "user" }); // register selalu role user
  localStorage.setItem(USERS, JSON.stringify(users));
  return { ok: true };
};

// Login helpdesk lewat API. Di tampilan semua staf memakai peran "admin"; peran asli ada di staffRole.
export const loginUser = async (email, password) => {
  try {
    const { token, user } = await api("/auth/login", { method: "POST", body: { email, password } });
    const session = { ...user, role: "admin", staffRole: user.role, token };
    sessionStorage.setItem(SESSION, JSON.stringify(session));
    return { ok: true, user: session };
  } catch (e) {
    return { ok: false, message: e.message };
  }
};

export const logoutUser = () => sessionStorage.removeItem(SESSION);

// ---- permohonan peminjaman ----
// Alur status: "Menunggu" (menunggu persetujuan Helpdesk) -> "Disetujui" -> "Selesai"
// Cabang lain: "Ditolak" (oleh Helpdesk) atau "Dibatalkan" (oleh peminjam / kedaluwarsa).
const NOTIFS = "bk_notifs";
export const getRequests = () => read(REQUESTS, []);
export const addRequest = (r) => localStorage.setItem(REQUESTS, JSON.stringify([...getRequests(), r]));
export const removeRequest = (id) =>
  localStorage.setItem(REQUESTS, JSON.stringify(getRequests().filter((r) => r.id !== id)));
export const updateRequest = (id, patch) =>
  localStorage.setItem(REQUESTS, JSON.stringify(getRequests().map((r) => (r.id === id ? { ...r, ...patch } : r))));

// ---- profil ----
export const getProfile = (userId) => {
  const u = read(USERS, []).find((x) => x.id === userId);
  if (!u) return null;
  const { password: _pw, ...safe } = u;
  return { ...safe, role: safe.role || "user" };
};

// patch: name, birthDate, gender, title, email, phone, kantor
export const updateProfile = (userId, patch) => {
  const users = read(USERS, []);
  const i = users.findIndex((u) => u.id === userId);
  if (i < 0) return { ok: false, message: "Akun tidak ditemukan" };
  if (patch.email && users.some((u) => u.id !== userId && u.email === patch.email))
    return { ok: false, message: "Email sudah dipakai akun lain" };
  if (patch.username && users.some((u) => u.id !== userId && u.username?.toLowerCase() === patch.username.toLowerCase()))
    return { ok: false, message: "Username sudah dipakai" };
  users[i] = { ...users[i], ...patch };
  localStorage.setItem(USERS, JSON.stringify(users));
  if (getSession()?.id === userId) {
    const { password: _pw, ...safe } = users[i];
    sessionStorage.setItem(SESSION, JSON.stringify({ ...safe, role: safe.role || "user" }));
  }
  window.dispatchEvent(new Event("profile-updated")); // agar header ikut menyegarkan nama
  return { ok: true };
};

export const changePassword = (userId, current, next) => {
  const users = read(USERS, []);
  const u = users.find((x) => x.id === userId);
  if (!u) return { ok: false, message: "Akun tidak ditemukan" };
  if (u.password !== current) return { ok: false, message: "Password saat ini salah" };
  u.password = next;
  localStorage.setItem(USERS, JSON.stringify(users));
  return { ok: true };
};

// ---- lupa password (demo tanpa server email: kode verifikasi ditampilkan di layar) ----
const RESET = "bk_reset";
export const requestReset = (email) => {
  const u = read(USERS, []).find((x) => x.email === email);
  if (!u) return { ok: false, message: "Email tidak terdaftar" };
  if (u.role === "admin") return { ok: false, message: "Akun admin tidak bisa direset dari sini" };
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const all = read(RESET, {});
  all[email] = { code, exp: Date.now() + 10 * 60 * 1000, tries: 0 }; // berlaku 10 menit, maks. 5 percobaan
  localStorage.setItem(RESET, JSON.stringify(all));
  return { ok: true, code };
};

export const confirmReset = (email, code, next) => {
  const all = read(RESET, {});
  const save = () => localStorage.setItem(RESET, JSON.stringify(all));
  const r = all[email];
  if (!r) return { ok: false, message: "Minta kode verifikasi dulu" };
  if (Date.now() > r.exp) { delete all[email]; save(); return { ok: false, message: "Kode kedaluwarsa, kirim ulang kode" }; }
  if (r.code !== code) {
    r.tries += 1;
    if (r.tries >= 5) { delete all[email]; save(); return { ok: false, message: "Terlalu banyak percobaan, kirim ulang kode" }; }
    save();
    return { ok: false, message: `Kode salah (${5 - r.tries} percobaan lagi)` };
  }
  const users = read(USERS, []);
  const u = users.find((x) => x.email === email);
  if (!u) return { ok: false, message: "Akun tidak ditemukan" };
  u.password = next;
  localStorage.setItem(USERS, JSON.stringify(users));
  delete all[email];
  save();
  return { ok: true };
};

// Nama tampilan dengan sapaan: "Mr Dio" / "Mrs Sari" (tanpa sapaan -> nama saja)
export const displayName = (u) => (u?.title ? `${u.title} ${u.name}` : u?.name || "");
