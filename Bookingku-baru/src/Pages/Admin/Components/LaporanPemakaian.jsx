import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AssetSelect from "../../../Components/AssetSelect";
import { api } from "../../../Utils/Helpers/api";
import { getToken, getSession, displayName } from "../../../Utils/Helpers/AuthHelpers";
import { getCategory, useCategories } from "../../../Utils/Helpers/CategoryHelpers";
import { fmtDate, fmtDateTime } from "../../../Utils/Helpers/RoomHelpers";
import { localIso } from "../../../Utils/Helpers/BookingHelpers";

const hhmm = (t) => String(t || "").slice(0, 5);
const dateOnly = (d) => String(d).slice(0, 10);

// Laporan pemakaian BMN: per Nama BMN -> tanggal pemakaian, unit peminjam, keperluan. Bisa dicetak per periode.
export default function LaporanPemakaian() {
  const now = new Date();
  const [from, setFrom] = useState(localIso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(localIso(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  const [asset, setAsset] = useState("");
  const [assets, setAssets] = useState([]);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const cats = useCategories();

  useEffect(() => { api("/assets").then(setAssets).catch(() => {}); }, []);

  const generate = async (e) => {
    e?.preventDefault();
    setError("");
    if (!from || !to) return setError("Isi tanggal mulai dan tanggal akhir");
    if (to < from) return setError("Tanggal akhir harus sama atau setelah tanggal mulai");
    const q = new URLSearchParams({ from, to });
    if (String(asset).startsWith("cat:")) q.set("category", String(asset).slice(4));
    else if (asset) q.set("assetId", asset);
    setLoading(true);
    try { setRows(await api(`/admin/report?${q}`, { token: getToken() })); }
    catch (err) { setRows(null); setError(err.message); }
    finally { setLoading(false); }
  };

  const groups = useMemo(() => {
    const m = new Map();
    (rows || []).forEach((r) => {
      const k = r.asset_id;
      if (!m.has(k)) m.set(k, { name: r.asset_name, category: r.category, items: [] });
      m.get(k).items.push(r);
    });
    return [...m.values()];
  }, [rows]);

  const dateText = (r) => {
    const s = dateOnly(r.start_date), e = dateOnly(r.end_date);
    const t = `${hhmm(r.start_time)}–${hhmm(r.end_time)}`;
    return s === e ? `${fmtDate(s)}, ${t}` : `${fmtDate(s)} ${hhmm(r.start_time)} s/d ${fmtDate(e)} ${hhmm(r.end_time)}`;
  };
  const unitText = (r) => [r.requester_name, r.requester_instansi].filter(Boolean).join(" — ");
  const session = getSession();

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Laporan Pemakaian BMN</h3>
      <p className="muted" style={{ marginTop: 0 }}>Hanya pemakaian yang disetujui. Riwayat otomatis dihapus setelah 1 tahun, jadi periode laporan maksimal 366 hari.</p>
      <form onSubmit={generate} className="report-filter">
        <div className="field"><label>Dari tanggal</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required /></div>
        <div className="field"><label>Sampai tanggal</label><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} required /></div>
        <div className="field"><label>BMN</label>
          <AssetSelect value={asset} onChange={setAsset} groups={[
            { options: [{ value: "", label: "📋 Semua BMN" }, ...cats.map((c) => ({ value: `cat:${c.id}`, label: `${c.icon} Semua ${c.name}` }))] },
            ...cats.map((c) => ({ label: c.name, options: assets.filter((r) => r.category === c.id).map((r) => ({ value: r.id, label: r.name })) })).filter((g) => g.options.length),
          ]} />
        </div>
        <button type="submit" className="btn" disabled={loading}>{loading ? "Memuat…" : "Tampilkan Laporan"}</button>
      </form>
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {rows && (
        <div style={{ marginTop: 12 }}>
          <p><strong>{rows.length}</strong> pemakaian pada <strong>{groups.length}</strong> BMN.
            {rows.length >= 5000 && " (dibatasi 5000 baris; persempit periode)"}</p>
          <button type="button" className="btn" disabled={!rows.length} onClick={() => setPreview(true)}>🖨️ Pratinjau & Cetak</button>
        </div>
      )}
      {preview && rows && createPortal(
        <div className="overlay receipt-overlay" onClick={() => setPreview(false)}>
          <div className="modal receipt report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-title">
              <strong>LAPORAN PEMAKAIAN BARANG MILIK NEGARA (BMN)</strong>
              <div>Periode: {fmtDate(from)} s/d {fmtDate(to)}</div>
            </div>
            {groups.map((g, gi) => (
              <div className="report-group" key={gi}>
                <h4>{gi + 1}. {g.name} <span className="muted">({getCategory(g.category).name})</span></h4>
                <table className="report-table">
                  <thead><tr><th>No</th><th>Tanggal Pemakaian</th><th>Peminjam</th><th>Keperluan</th></tr></thead>
                  <tbody>
                    {g.items.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{dateText(r)}{Number(r.qty) > 1 ? ` • ${r.qty} unit` : ""}</td>
                        <td>{unitText(r)}</td>
                        <td>{r.agenda}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <p className="muted report-foot">Dicetak {fmtDateTime(new Date().toISOString())} oleh {displayName(session)}</p>
            <div className="modal-actions no-print">
              <button type="button" className="link-btn" onClick={() => setPreview(false)}>Tutup</button>
              <button type="button" className="btn" onClick={() => window.print()}>🖨️ Cetak / Simpan PDF</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
