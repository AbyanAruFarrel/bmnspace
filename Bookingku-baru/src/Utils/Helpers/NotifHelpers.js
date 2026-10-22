import { getUsers } from "./AuthHelpers";

// Notifikasi untuk Helpdesk dan peminjam (disimpan di localStorage, demo tanpa server).
const KEY = "bk_notifs";
const all = () => JSON.parse(localStorage.getItem(KEY) || "[]");
const save = (l) => localStorage.setItem(KEY, JSON.stringify(l));

export const addNotif = ({ userId, roomId, text }) =>
  !userId ? undefined : // pemesan tamu tidak punya akun -> tidak ada notifikasi
  save([...all(), { id: `${Date.now()}-${Math.random()}`, userId, roomId, text, time: new Date().toISOString(), read: false }]);
export const getNotifs = (userId) => all().filter((n) => n.userId === userId).sort((a, b) => b.time.localeCompare(a.time));
export const unreadCount = (userId) => all().filter((n) => n.userId === userId && !n.read).length;
export const markAllRead = (userId) => {
  if (!unreadCount(userId)) return;
  save(all().map((n) => (n.userId === userId ? { ...n, read: true } : n)));
};

export const notifyUser = (userId, roomId, text) => addNotif({ userId, roomId, text });

// Beri tahu semua admin/Helpdesk (kecuali pelaku sendiri)
export const notifyStaff = (location, roomId, text, exceptId) => {
  const ids = new Set(getUsers().filter((u) => u.role === "admin").map((u) => u.id));
  ids.delete(exceptId);
  ids.forEach((userId) => addNotif({ userId, roomId, text }));
};
