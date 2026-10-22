import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import Card from "../../../Components/Card";
import Button from "../../../Components/Button";
import LoanFormModal, { canPrintForm } from "../../Profil/Components/LoanFormModal";
import { displayName, getSession } from "../../../Utils/Helpers/AuthHelpers";
import { rentLabel, timeText } from "../../../Utils/Helpers/BookingHelpers";
import { STATUS_CLS, canFinish, statusLabel } from "../../../Utils/Helpers/PaymentHelpers";
import { fmtDate, isItem } from "../../../Utils/Helpers/RoomHelpers";
import { confirmDialog } from "../../../Utils/Helpers/SwalHelpers";
import { toastError, toastSuccess } from "../../../Utils/Helpers/ToastHelpers";
import { waUrl } from "../../../Utils/Helpers/ContactHelpers";
import { api, isEnded, mapRequest } from "../../../Utils/Helpers/api";

// [status, label tab]
const TABS = [["Menunggu", "Menunggu Persetujuan"], ["Disetujui", "Disetujui"], ["Selesai", "Selesai"], ["Semua", "Semua"]];

// Daftar permohonan untuk Helpdesk: setujui, tolak, dan cetak form (data dari server)
export default function RequestList() {
  const token = getSession()?.token;
  const [filter, setFilter] = useState("Menunggu");
  const [all, setAll] = useState([]);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const finishing = useRef(new Set()); // id yang sudah dikirim untuk diselesaikan otomatis

  const load = useCallback(async () => {
    try {
      // Semua data diambil lalu disaring di sini, karena status "Selesai" otomatis ditentukan dari waktu selesai
      const rows = await api("/admin/requests", { token });
      setAll(rows.map(mapRequest));
      setError("");
      // Peminjaman disetujui yang tanggal & jam selesainya sudah lewat -> status Selesai juga disimpan di server
      const due = rows.filter((r) => r.status === "Disetujui" && isEnded(r) && !finishing.current.has(r.id));
      due.forEach((r) => finishing.current.add(r.id));
      await Promise.allSettled(due.map((r) => api(`/admin/requests/${r.id}/finish`, { method: "POST", token })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { api("/assets").then(setAssets).catch(() => {}); }, []);
  useEffect(() => { // permohonan baru muncul tanpa reload
    setLoading(true);
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  const list = all.filter((r) => filter === "Semua" || r.status === filter);
  const count = (s) => (s === "Semua" ? all.length : all.filter((r) => r.status === s).length);
  const assetOf = (r) => assets.find((a) => a.id === r.assetId);

  const approve = async (r) => {
    if (!(await confirmDialog("Setujui permohonan?", `${r.roomName} • ${r.name} • ${r.startDate} s/d ${r.endDate}`))) return;
    try {
      await api(`/admin/requests/${r.id}/approve`, { method: "POST", token });
      toastSuccess("Permohonan disetujui");
      setForm({ ...r, status: "Disetujui", decidedAt: new Date().toISOString(), decidedByName: displayName(getSession()) }); // form cetak
    } catch (e) {
      toastError(e.message);
    }
    load();
  };

  // Hanya admin yang bisa menandai selesai lebih awal; setelah waktu selesai lewat, status otomatis Selesai
  const finish = async (r) => {
    if (!(await confirmDialog("Tandai peminjaman selesai?", `${r.roomName} • ${r.name}`))) return;
    try {
      await api(`/admin/requests/${r.id}/finish`, { method: "POST", token });
      toastSuccess("Peminjaman ditandai selesai");
    } catch (e) {
      toastError(e.message);
    }
    load();
  };

  const reject = async (r) => {
    const res = await Swal.fire({
      title: `Tolak permohonan ${r.roomName}?`, input: "text", inputPlaceholder: "Alasan penolakan",
      inputValidator: (v) => (!v?.trim() ? "Alasan wajib diisi" : undefined),
      showCancelButton: true, confirmButtonText: "Tolak", cancelButtonText: "Batal",
    });
    if (!res.isConfirmed) return;
    try {
      await api(`/admin/requests/${r.id}/reject`, { method: "POST", token, body: { reason: res.value.trim() } });
      toastSuccess("Permohonan ditolak");
    } catch (e) {
      toastError(e.message);
    }
    load();
  };

  return (
    <>
      <div className="tabs" style={{ marginTop: 0 }}>
        {TABS.map(([s, label]) => (
          <Button key={s} variant={s === filter ? "" : "secondary"} onClick={() => setFilter(s)}>
            {label} ({count(s)})
          </Button>
        ))}
      </div>
      <Card>
        {error && <p className="muted">Gagal memuat data: {error}</p>}
        {!error && loading && <p className="muted">Memuat…</p>}
        {!error && !loading && list.length === 0 && <p className="muted">Tidak ada permohonan.</p>}
        {list.map((r) => {
          const asset = assetOf(r);
          return (
            <div className="row" key={r.id}>
              <div>
                <strong>{r.roomName}</strong>
                <span className={`status ${STATUS_CLS[r.status]}`}>{statusLabel(r)}</span>
                <div className="muted">Peminjam: {r.name}{r.nip && ` • NIP: ${r.nip}`}{r.instansi && ` • Satker: ${r.instansi}`}</div>
                {(r.phone || r.email) && (
                  <div className="muted">Kontak: {r.phone && <a href={waUrl(r.phone)} target="_blank" rel="noopener noreferrer">📞 {r.phone}</a>}
                    {r.phone && r.email && " • "}{r.email && <a href={`mailto:${r.email}`}>✉️ {r.email}</a>}</div>
                )}
                <div className="muted">{rentLabel(r)} • {fmtDate(r.startDate)} s/d {fmtDate(r.endDate)} • {timeText(r)}{isItem(asset) && ` • ${r.qty || 1} unit`}</div>
                <div className="muted">Keperluan: {r.agenda}</div>
                {r.decidedByName && <div className="muted">Diputuskan oleh {r.decidedByName}</div>}
                {r.status === "Ditolak" && r.reason && <div className="muted">Alasan ditolak: {r.reason}</div>}
                {r.status === "Dibatalkan" && r.cancelReason && <div className="muted">Alasan: {r.cancelReason}</div>}
              </div>
              <div className="actions">
                {canPrintForm(r) && <Button variant="secondary" onClick={() => setForm(r)}>🖨️ Cetak Form</Button>}
                {canFinish(r) && <Button variant="secondary" onClick={() => finish(r)}>🏁 Tandai Selesai</Button>}
                {r.status === "Menunggu" && <Button onClick={() => approve(r)}>✅ Setujui</Button>}
                {r.status === "Menunggu" && <Button variant="danger" onClick={() => reject(r)}>Tolak</Button>}
              </div>
            </div>
          );
        })}
      </Card>
      {form && <LoanFormModal req={form} asset={assetOf(form)} onClose={() => setForm(null)} />}
    </>
  );
}
