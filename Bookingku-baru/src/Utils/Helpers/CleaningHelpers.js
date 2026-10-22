import { getRequests } from "./AuthHelpers";
import { CLOSE, OPEN } from "./BookingHelpers";
import { getRooms, needsCleanFlow } from "./RoomHelpers";

// Waktu mulai & selesai pemakaian sesuai jam yang diisi peminjam
export const startOf = (r) => new Date(`${r.startDate}T${r.startTime || OPEN}:00`);
// Jika admin menandai selesai lebih awal, waktu selesai = saat itu juga
export const endOf = (r) =>
  r.finishedAt ? new Date(r.finishedAt) : new Date(`${r.endDate}T${r.endTime || CLOSE}:00`);

// Pemakaian terakhir (disetujui) yang sudah selesai
export const lastFinishedUse = (roomId, now = new Date()) =>
  getRequests()
    .filter((r) => r.roomId === roomId && (r.status === "Disetujui" || r.status === "Selesai") && endOf(r) <= now && endOf(r) > startOf(r))
    .sort((a, b) => endOf(b) - endOf(a))[0] || null;

// Ruangan sudah dipakai lagi sejak pembersihan terakhir?
export const usedSinceClean = (room, now = new Date()) => {
  const u = lastFinishedUse(room.id, now);
  return !!u && endOf(u) > new Date(room.cleanedAt || 0);
};

// Daftar tugas pembersihan: dilaporkan user dan/atau selesai dipakai
export const cleaningTasks = (userId) => // userId diisi = hanya ruangan di kota yang dikelola user itu
  getRooms()
    .filter((room) => needsCleanFlow(room))
    .map((room) => {
      const used = usedSinceClean(room) ? lastFinishedUse(room.id) : null;
      return room.needsCleaning || used ? { room, used } : null;
    })
    .filter(Boolean);
