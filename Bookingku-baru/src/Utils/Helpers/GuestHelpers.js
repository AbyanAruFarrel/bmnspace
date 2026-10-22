import { getRequests } from "./AuthHelpers";

// Pemesan tamu (tanpa akun). Data kontak terakhir diingat di browser agar form terisi otomatis.
const KEY = "bk_guest";

export const getGuest = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
export const saveGuest = ({ name, nip, instansi, phone, email }) => localStorage.setItem(KEY, JSON.stringify({ name, nip, instansi, phone, email }));

// 0812... dan +62812... dianggap nomor yang sama
const digits = (p) => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "62" + d.slice(1); return d; };
export const samePhone = (a, b) => !!digits(a) && digits(a) === digits(b);
export const sameEmail = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

// Pesanan milik tamu: email DAN no. handphone harus cocok dengan yang diisi saat memesan
export const guestMatch = (email, phone) => (r) => sameEmail(r.email, email) && samePhone(r.phone, phone);
export const guestRequests = (email, phone) => getRequests().filter(guestMatch(email, phone));

// Kode pesanan singkat untuk ditampilkan ke pemesan
export const orderCode = (r) => `PM-${String(r.id).padStart(5, "0")}`;
