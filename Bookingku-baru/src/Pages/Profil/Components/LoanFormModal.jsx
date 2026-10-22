import { createPortal } from "react-dom";
import { getCategory } from "../../../Utils/Helpers/CategoryHelpers";
import { rentLabel, timeText } from "../../../Utils/Helpers/BookingHelpers";
import { fmtDate, fmtDateTime, isCar, isItem, locationText } from "../../../Utils/Helpers/RoomHelpers";

// Form peminjaman yang bisa dicetak setelah permohonan disetujui. Cetak memakai window.print();
// CSS @media print (class receipt-overlay) hanya menampilkan form ini.
export const canPrintForm = (r) => r.status === "Disetujui" || r.status === "Selesai";

// req: pengajuan (sudah dipetakan), asset: data aset dari /api/assets
export default function LoanFormModal({ req, asset, onClose }) {
  const cat = asset ? getCategory(asset.category) : null;
  const day = String(req.createdAt || new Date().toISOString()).slice(0, 10).replace(/-/g, "");
  const noForm = `FP-${day}-${String(req.id).padStart(5, "0")}`;
  const rows = [
    ["Nama peminjam", req.name],
    ["NIP", req.nip],
    ["Email", req.email],
    ["Satker", req.instansi],
    ["No. Handphone", req.phone],
    ["Aset yang dipinjam", `${req.roomName}${cat ? ` (${cat.name})` : ""}`],
    ["Lokasi", locationText(asset)],
    ["Jumlah", isItem(asset) ? `${req.qty || 1} unit` : isCar(asset) ? "1 unit kendaraan" : "1 ruangan"],
    ["Tanggal pinjam", `${fmtDate(req.startDate)}${req.endDate !== req.startDate ? ` s/d ${fmtDate(req.endDate)}` : ""}`],
    ["Jam", `${timeText(req)} (${rentLabel(req)})`],
    ["Waktu selesai", req.endTime ? `${fmtDate(req.endDate)}, ${req.endTime}` : ""],
    [isCar(asset) ? "Tujuan perjalanan" : "Keperluan", req.agenda],
  ];

  return createPortal(
    <div className="overlay receipt-overlay" onClick={onClose}>
      <div className="modal receipt loan-form" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-head">
          <span className="loan-brand"><img className="loan-logo" src="/logo-mark-color.png" alt="" /> <span className="brand-name"><b>BMN</b>Space</span></span>
          <strong>FORM PEMINJAMAN</strong>
          <span className="status ok" style={{ marginLeft: 0 }}>DISETUJUI</span>
        </div>
        <div className="receipt-inv">No. {noForm}</div>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div className="pf-row" key={k}><span className="muted">{k}</span><span>{v}</span></div>
        ))}
        <div className="pf-row">
          <span className="muted">Disetujui oleh</span>
          <span>{req.decidedByName || "Helpdesk"}{req.decidedAt && ` • ${fmtDateTime(req.decidedAt)}`}</span>
        </div>
        <p className="map-note" style={{ marginTop: 12 }}>
          Ketentuan: aset dipakai sesuai keperluan dan jadwal di atas, dijaga kebersihan dan kondisinya,
          serta dikembalikan tepat waktu. Kerusakan atau kehilangan menjadi tanggung jawab peminjam.
        </p>
        <div className="modal-actions no-print">
          <button type="button" className="link-btn" onClick={onClose}>Tutup</button>
          <button type="button" className="btn" onClick={() => window.print()}>🖨️ Cetak / Simpan PDF</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
