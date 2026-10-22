// Pemanggil API backend. Alamat server diambil dari VITE_API_URL (lihat langkah deploy);
// jika tidak ada, dipakai server lokal.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body, token } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.", 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* respons tanpa isi */ }
  if (!res.ok) {
    // Token helpdesk ditolak/kedaluwarsa -> layout akan mengeluarkan pengguna dari sesi
    if (res.status === 401 && token) window.dispatchEvent(new Event("auth-expired"));
    throw new ApiError(data?.error || "Terjadi kesalahan pada server", res.status);
  }
  return data;
}

// Baris pengajuan dari API (snake_case) -> bentuk yang dipakai tampilan (camelCase).
// Peminjaman disetujui yang waktu selesainya sudah lewat otomatis dianggap "Selesai".
// Waktu selesai sebuah pengajuan (tanggal selesai + jam selesai). Jika jam selesai kosong:
// berhari-hari dianggap 17:00, satu hari 22:00 (jam tutup).
const endOf = (r) => {
  const endDate = String(r.end_date).slice(0, 10);
  const multi = endDate !== String(r.start_date).slice(0, 10);
  const time = r.end_time ? String(r.end_time).slice(0, 5) : multi ? "17:00" : "22:00";
  return new Date(`${endDate}T${time}:00`);
};
export const isEnded = (r, now = new Date()) => endOf(r) <= now;
const autoStatus = (r) => (r.status === "Disetujui" && isEnded(r) ? "Selesai" : r.status);

export const mapRequest = (r) => ({
  id: r.id,
  assetId: r.asset_id,
  roomName: r.asset_name,
  name: r.requester_name,
  nip: r.requester_nip,
  instansi: r.requester_instansi, // = Satker
  agenda: r.agenda,
  startDate: r.start_date,
  endDate: r.end_date,
  startTime: String(r.start_time).slice(0, 5),
  endTime: r.end_time ? String(r.end_time).slice(0, 5) : "",
  qty: r.qty,
  status: autoStatus(r),
  reason: r.reject_reason,
  cancelReason: r.cancel_reason,
  decidedAt: r.decided_at,
  decidedByName: r.decided_by_name, // hanya ada di data helpdesk
  phone: r.requester_phone,        // hanya ada di data helpdesk
  email: r.requester_email,        // hanya ada di data helpdesk
  createdAt: r.created_at,
});
