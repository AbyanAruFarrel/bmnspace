import { useState } from "react";
import Card from "../../../Components/Card";
import Button from "../../../Components/Button";
import { rentLabel, timeText } from "../../../Utils/Helpers/BookingHelpers";
import { STATUS_CLS, canCancel, statusLabel } from "../../../Utils/Helpers/PaymentHelpers";
import { fmtDate, fmtDateTime, isItem } from "../../../Utils/Helpers/RoomHelpers";
import { orderCode } from "../../../Utils/Helpers/GuestHelpers";
import { confirmDialog } from "../../../Utils/Helpers/SwalHelpers";
import { toastError, toastSuccess } from "../../../Utils/Helpers/ToastHelpers";
import { api } from "../../../Utils/Helpers/api";

const STATUS = [
  ["Menunggu", "⏳", "Menunggu Persetujuan"], ["Disetujui", "✅", "Disetujui"], ["Selesai", "🏁", "Selesai"],
  ["Ditolak", "❌", "Ditolak"], ["Dibatalkan", "🚫", "Dibatalkan"],
];

// Daftar pesanan milik peminjam (tanpa login).
// requests: hasil Cek Pesanan (sudah dipetakan); assets: daftar aset; creds: { email, phone } untuk
// membuktikan kepemilikan; onChanged: memuat ulang daftar setelah ada perubahan.
// Alur: ajukan -> menunggu persetujuan Helpdesk -> disetujui -> selesai (otomatis setelah waktu selesai, atau ditandai Helpdesk)
export default function RequestStatus({ requests, assets, creds, onChanged }) {
  const [filter, setFilter] = useState("Semua");
  const [busy, setBusy] = useState(false);
  const shown = requests.filter((r) => filter === "Semua" || r.status === filter);
  const assetOf = (r) => assets.find((a) => a.id === r.assetId);

  const act = async (r, path, body, okText) => {
    setBusy(true);
    try {
      await api(`/requests/${r.id}/${path}`, { method: "POST", body: { ...creds, ...body } });
      toastSuccess(okText);
    } catch (e) {
      toastError(e.message); // mis. status sudah berubah karena diputuskan Helpdesk
    }
    try { await onChanged(); } catch { /* daftar akan dimuat ulang saat disegarkan */ }
    setBusy(false);
  };

  const cancel = async (r) => {
    if (!(await confirmDialog("Batalkan permohonan?", "Permohonan yang belum disetujui akan dibatalkan dan jadwalnya dilepas."))) return;
    act(r, "cancel", { reason: "Dibatalkan oleh peminjam" }, "Permohonan dibatalkan");
  };

  return (
    <>
      <div className="stats">
        {STATUS.map(([s, icon, label]) => (
          <button key={s} className={`stat ${filter === s ? "active" : ""}`} onClick={() => setFilter(filter === s ? "Semua" : s)}>
            <span>{icon}</span><strong>{requests.filter((r) => r.status === s).length}</strong><small>{label}</small>
          </button>
        ))}
      </div>
      <Card>
        <p className="muted" style={{ marginTop: 0 }}>
          {filter === "Semua" ? `Semua pengajuan (${requests.length})` : `Status: ${filter} (${shown.length})`}
          {filter !== "Semua" && <button className="link-btn inline" onClick={() => setFilter("Semua")}> • Tampilkan semua</button>}
        </p>
        {shown.length === 0 && <p className="muted">Belum ada pengajuan.</p>}
        {shown.map((r) => {
          const asset = assetOf(r);
          return (
            <div className="row" key={r.id}>
              <div>
                <strong>{r.roomName}</strong>
                <span className={`status ${STATUS_CLS[r.status]}`}>{statusLabel(r)}</span>
                <div className="muted">Kode pesanan: {orderCode(r)}</div>
                <div className="muted">{rentLabel(r)} • {fmtDate(r.startDate)} s/d {fmtDate(r.endDate)} • {timeText(r)}{isItem(asset) && ` • ${r.qty || 1} unit`}</div>
                <div className="muted">Keperluan: {r.agenda}</div>
                {r.status === "Menunggu" && <div className="muted">⏳ Menunggu persetujuan Helpdesk.</div>}
                {r.status === "Disetujui" && <div className="muted">Disetujui Helpdesk{r.decidedAt && ` • ${fmtDateTime(r.decidedAt)}`}. Silakan gunakan sesuai jadwal.</div>}
                {r.status === "Selesai" && <div className="muted">🏁 Peminjaman telah selesai.</div>}
                {r.status === "Ditolak" && <div className="muted">Alasan ditolak: {r.reason || "—"}</div>}
                {r.status === "Dibatalkan" && r.cancelReason && <div className="muted">Alasan: {r.cancelReason}</div>}
              </div>
              <div className="actions">
                {canCancel(r) && <Button variant="danger" disabled={busy} onClick={() => cancel(r)}>Batalkan</Button>}
              </div>
            </div>
          );
        })}
      </Card>
    </>
  );
}
