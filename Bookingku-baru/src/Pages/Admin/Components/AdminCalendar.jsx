import { useCallback, useEffect, useState } from "react";
import Card from "../../../Components/Card";
import { getSession } from "../../../Utils/Helpers/AuthHelpers";
import { localIso, timeText } from "../../../Utils/Helpers/BookingHelpers";
import { STATUS_CLS, statusLabel } from "../../../Utils/Helpers/PaymentHelpers";
import { useCategories } from "../../../Utils/Helpers/CategoryHelpers";
import { fmtDate, isItem } from "../../../Utils/Helpers/RoomHelpers";
import { api, mapRequest } from "../../../Utils/Helpers/api";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Kalender pengecekan Helpdesk: semua peminjaman (ruangan, barang, mobil) per tanggal, dari server.
export default function AdminCalendar() {
  const token = getSession()?.token;
  const CATEGORIES = useCategories();
  const [mo, setMo] = useState(0);
  const [asset, setAsset] = useState(""); // "" = semua, "cat:xxx" = satu kategori, "id" = satu aset
  const [sel, setSel] = useState(localIso(new Date()));
  const [assets, setAssets] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + mo, 1);
  const y = base.getFullYear(), m = base.getMonth();
  const total = new Date(y, m + 1, 0).getDate();
  const from = localIso(new Date(y, m, 1)), to = localIso(new Date(y, m, total));

  useEffect(() => { api("/assets").then(setAssets).catch(() => {}); }, []);
  const load = useCallback(
    () => api(`/admin/calendar?from=${from}&to=${to}`, { token })
      .then((r) => { setRows(r.map(mapRequest)); setError(""); })
      .catch((e) => setError(e.message)),
    [from, to, token]
  );
  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const go = (delta) => { // pindah bulan; tanggal terpilih ikut pindah ke bulan itu
    const n = delta === 0 ? 0 : mo + delta;
    setMo(n);
    setSel(localIso(n === 0 ? now : new Date(now.getFullYear(), now.getMonth() + n, 1)));
  };

  const assetOf = (r) => assets.find((a) => a.id === r.assetId);
  const inFilter = (r) => {
    if (!asset) return true;
    if (asset.startsWith("cat:")) return assetOf(r)?.category === asset.slice(4);
    return String(r.assetId) === asset;
  };
  const reqs = rows.filter(inFilter);
  const onDay = (iso) => reqs.filter((r) => iso >= r.startDate && iso <= r.endDate);
  const todayIso = localIso(now);
  const dayList = onDay(sel).sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));

  return (
    <>
     <div className="filterbar" style={{ gridTemplateColumns: "1fr", marginBottom: 12 }}>
        <select className="acal-select" value={asset} onChange={(e) => setAsset(e.target.value)}>
          <option value="">📅 Semua aset</option>
          {CATEGORIES.map((c) => <option key={c.id} value={`cat:${c.id}`}>{c.icon} Semua {c.name}</option>)}
          {CATEGORIES.map((c) => (
            <optgroup key={c.id} label={c.name}>
              {assets.filter((r) => r.category === c.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="calendar">
        <div className="cal-head">
          <strong>📅 Kalender Peminjaman — {base.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</strong>
          <span className="cal-nav">
            <button type="button" onClick={() => go(-1)} aria-label="Bulan sebelumnya">‹</button>
            <button type="button" onClick={() => go(0)} aria-label="Bulan ini" title="Bulan ini">•</button>
            <button type="button" onClick={() => go(1)} aria-label="Bulan berikutnya">›</button>
          </span>
        </div>
        <div className="cal-legend">
          <span className="legend warn">⏳ Menunggu persetujuan</span>
          <span className="legend ok">✅ Disetujui</span>
          <span className="legend done">🏁 Selesai</span>
        </div>
        {error && <p className="muted">Gagal memuat kalender: {error}</p>}
        <div className="cal-grid">
          {DAYS.map((d) => <span key={d} className="cal-day-name">{d}</span>)}
          {Array.from({ length: base.getDay() }, (_, i) => <span key={"e" + i} />)}
          {Array.from({ length: total }, (_, i) => {
            const d = i + 1;
            const iso = localIso(new Date(y, m, d));
            const list = onDay(iso);
            const n = (s) => list.filter((r) => r.status === s).length;
            return (
              <button type="button" key={d} onClick={() => setSel(iso)}
                className={`acal-cell ${sel === iso ? "selected" : ""} ${iso === todayIso ? "today" : ""}`}>
                <b>{d}</b>
                <span className="acal-dots">
                  {n("Menunggu") > 0 && <i className="dot wait">{n("Menunggu")}</i>}
                  {n("Disetujui") > 0 && <i className="dot ok">{n("Disetujui")}</i>}
                  {n("Selesai") > 0 && <i className="dot done">{n("Selesai")}</i>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <Card>
        <strong>{fmtDate(sel)}</strong> <span className="muted">• {dayList.length} peminjaman</span>
        {dayList.length === 0 && <p className="muted">Tidak ada peminjaman pada tanggal ini.</p>}
        {dayList.map((r) => (
          <div className="row" key={r.id}>
            <div>
              <strong>{r.roomName}</strong>
              <span className={`status ${STATUS_CLS[r.status]}`}>{statusLabel(r)}</span>
              <div className="muted">👤 {r.name}{r.instansi && ` (${r.instansi})`} • 🕒 {timeText(r)}{isItem(assetOf(r)) && ` • ${r.qty || 1} unit`}</div>
              <div className="muted">{fmtDate(r.startDate)}{r.endDate !== r.startDate && ` s/d ${fmtDate(r.endDate)}`} • Keperluan: {r.agenda}</div>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
