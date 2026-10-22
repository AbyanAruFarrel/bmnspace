// Pembayaran sudah dihapus dari aplikasi. File ini tinggal berisi label status & aturan aksi permohonan.

export const STATUS_LABEL = {
  Menunggu: "Menunggu Persetujuan", Disetujui: "Disetujui", Ditolak: "Ditolak", Selesai: "Selesai", Dibatalkan: "Dibatalkan",
};
export const STATUS_CLS = { Menunggu: "", Disetujui: "ok", Ditolak: "no", Selesai: "done", Dibatalkan: "no" };
export const statusLabel = (r) => STATUS_LABEL[r.status] || r.status;

// Peminjam hanya bisa membatalkan selagi masih menunggu persetujuan
export const canCancel = (r) => r.status === "Menunggu";
// Tombol "Selesai" hanya untuk admin (Helpdesk), dan hanya selama masih berstatus Disetujui.
// Jika waktu selesai sudah lewat, status otomatis menjadi Selesai (lihat mapRequest di api.js).
export const canFinish = (r) => r.status === "Disetujui";
