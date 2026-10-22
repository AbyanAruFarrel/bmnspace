import { useState } from "react";
import Card from "../../../Components/Card";
import { getRequests } from "../../../Utils/Helpers/AuthHelpers";
import { waUrl } from "../../../Utils/Helpers/ContactHelpers";
import { fmtDate, instansiLabel } from "../../../Utils/Helpers/RoomHelpers";

// Admin: daftar pemesan (tamu tanpa akun), dikelompokkan dari permohonan berdasarkan email / No. HP.
export default function UserList() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const reqs = getRequests().sort((a, b) => b.id - a.id);

  const map = new Map();
  reqs.forEach((r) => {
    const key = (r.email || r.phone || `u${r.userId}`).toLowerCase();
    if (!map.has(key)) map.set(key, { key, name: r.userName, instansi: instansiLabel(r), email: r.email, phone: r.phone, reqs: [] });
    map.get(key).reqs.push(r);
  });
  const people = [...map.values()];
  const shown = people.filter((p) => `${p.name} ${p.instansi} ${p.email || ""} ${p.phone || ""}`.toLowerCase().includes(q.toLowerCase()));
  const count = (p, s) => p.reqs.filter((r) => !s || r.status === s).length;

  const rows = (p) => [
    ["Nama lengkap", p.name], ["Satker", p.instansi], ["Email", p.email && <a href={`mailto:${p.email}`}>{p.email}</a>],
    ["No. Handphone", p.phone && <a href={waUrl(p.phone)} target="_blank" rel="noopener noreferrer">{p.phone}</a>],
    ["Pemesanan pertama", fmtDate(p.reqs[p.reqs.length - 1].createdAt?.slice(0, 10) || p.reqs[p.reqs.length - 1].startDate)],
  ];

  return (
    <>
      <div className="field" style={{ maxWidth: 420 }}>
        <input placeholder="Cari nama, satker, email, atau telepon..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card>
        <p className="muted" style={{ marginTop: 0 }}>{shown.length} dari {people.length} pemesan</p>
        {shown.length === 0 && <p className="muted">Belum ada pemesan.</p>}
        {shown.map((p) => (
          <button key={p.key} className="user-row" onClick={() => setSel(p)}>
            <span className="avatar">{p.name?.[0]?.toUpperCase()}</span>
            <span className="thread-info">
              <strong>{p.name}</strong>
              <span className="muted">{[p.instansi, p.email, p.phone].filter(Boolean).join(" • ")}</span>
            </span>
            <span className="muted">{count(p)} pengajuan</span>
          </button>
        ))}
      </Card>

      {sel && (
        <div className="overlay" onClick={() => setSel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{sel.name}</h2>
            <div className="stats" style={{ gridTemplateColumns: "repeat(2, 1fr)", margin: "8px 0 12px" }}>
              {["Disetujui", "Selesai"].map((s) => (
                <div className="stat" style={{ cursor: "default", padding: "8px 4px" }} key={s}>
                  <strong style={{ fontSize: 20 }}>{count(sel, s)}</strong><small>{s}</small>
                </div>
              ))}
            </div>
            {rows(sel).map(([label, value]) => (
              <div className="pf-row" key={label}><span className="muted">{label}</span><span>{value || <span className="muted">—</span>}</span></div>
            ))}
            <div className="modal-actions"><button className="link-btn" onClick={() => setSel(null)}>Tutup</button></div>
          </div>
        </div>
      )}
    </>
  );
}
