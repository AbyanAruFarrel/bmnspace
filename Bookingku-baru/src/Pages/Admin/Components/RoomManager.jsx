import { useCallback, useEffect, useState } from "react";
import Card from "../../../Components/Card";
import Button from "../../../Components/Button";
import RoomForm from "./RoomForm";
import { deleteCategory, getCategory, isCustomCategory, useCategories } from "../../../Utils/Helpers/CategoryHelpers";
import { getSession } from "../../../Utils/Helpers/AuthHelpers";
import { api } from "../../../Utils/Helpers/api";
import { isCar, isItem, sizeText, stockOf } from "../../../Utils/Helpers/RoomHelpers";
import { confirmDialog } from "../../../Utils/Helpers/SwalHelpers";
import { toastError, toastSuccess } from "../../../Utils/Helpers/ToastHelpers";

// Kelola Aset (Helpdesk): tambah, ubah, dan hapus ruangan / barang / mobil. Data disimpan di server.
export default function RoomManager() {
  const token = getSession()?.token;
  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null = tutup, {} = tambah, room = edit
  const categories = useCategories();
  const [q, setQ] = useState("");   // kata kunci pencarian
  const [cat, setCat] = useState(""); // filter kategori ("" = semua)

  const load = useCallback(async () => {
    try {
      setRooms(await api("/assets"));
      setStatus("ok");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (data) => {
    try {
      if (editing.id) await api(`/admin/assets/${editing.id}`, { method: "PUT", token, body: data });
      else await api("/admin/assets", { method: "POST", token, body: data });
    } catch (e) {
      return toastError(e.message);
    }
    toastSuccess(editing.id ? "Aset diperbarui" : "Aset ditambahkan");
    setEditing(null);
    load();
  };

  const remove = async (r) => {
    if (!(await confirmDialog("Hapus aset?", r.name))) return;
    try {
      await api(`/admin/assets/${r.id}`, { method: "DELETE", token }); // server menolak jika masih ada permohonan aktif
    } catch (e) {
      return toastError(e.message);
    }
    toastSuccess("Aset dihapus");
    load();
  };

  const removeCategory = async (c) => {
    const used = rooms.filter((r) => r.category === c.id).length;
    if (used > 0) return toastError(`Kategori "${c.name}" masih dipakai ${used} aset. Pindahkan atau hapus asetnya dulu.`);
    if (!(await confirmDialog("Hapus kategori?", c.name))) return;
    try {
      await deleteCategory(c.id);
      toastSuccess("Kategori dihapus");
    } catch (e) {
      toastError(e.message);
    }
  };
  const customCats = categories.filter((c) => isCustomCategory(c.id));

  // Pencarian: semua kata harus cocok di nama / gedung / lokasi / kategori / fasilitas
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = rooms.filter((r) => {
    if (cat && r.category !== cat) return false;
    const hay = [r.name, r.building, r.placement, getCategory(r.category).name, ...(r.facilities || [])].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const filtered = !!q.trim() || !!cat;

  return (
    <>
      <div style={{ margin: "16px 0" }}><Button onClick={() => setEditing({})}>+ Tambah Ruangan / Barang / Mobil</Button></div>
      <div className="filterbar" style={{ background: "#fff", marginBottom: 16 }}>
        <input placeholder="Cari nama, gedung, lokasi, atau fasilitas…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Semua Kategori</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <Card>
        {status === "loading" && <p className="muted">Memuat…</p>}
        {status === "error" && <p className="muted">Gagal memuat aset: {error}</p>}
        {status === "ok" && rooms.length === 0 && <p className="muted">Belum ada aset.</p>}
        {status === "ok" && rooms.length > 0 && (
          <p className="muted" style={{ margin: "0 0 4px" }}>
            Menampilkan {shown.length} dari {rooms.length} aset
            {filtered && <button type="button" className="link-btn inline" onClick={() => { setQ(""); setCat(""); }}> • Reset pencarian</button>}
          </p>
        )}
        {status === "ok" && rooms.length > 0 && shown.length === 0 && <p className="muted">Tidak ada aset yang cocok dengan pencarian.</p>}
        {shown.map((r) => (
          <div className="row" key={r.id}>
            <div>
              <strong>{r.name}</strong>{" "}
              <span className="muted">{getCategory(r.category).name}</span>
              <div className="muted">{r.building}</div>
              {r.placement && <div className="muted">📍 Lokasi: {r.placement}</div>}
              <div className="muted">{isItem(r) ? `📦 Stok ${stockOf(r)} unit` : `👥 ${r.capacity} ${isCar(r) ? "penumpang" : "orang"}`}</div>
              {sizeText(r) && <div className="muted">📐 Ukuran {sizeText(r)}</div>}
              <div className="tags" style={{ margin: "6px 0" }}>{(r.facilities || []).map((x) => <span key={x}>{x}</span>)}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setEditing(r)}>Edit</Button>
              <Button variant="danger" onClick={() => remove(r)}>Hapus</Button>
            </div>
          </div>
        ))}
      </Card>
      {customCats.length > 0 && (
        <Card>
          <strong>Kategori tambahan</strong>
          {customCats.map((c) => (
            <div className="row" key={c.id}>
              <div>{c.icon} {c.name} <span className="muted">• {rooms.filter((r) => r.category === c.id).length} aset</span></div>
              <Button variant="danger" onClick={() => removeCategory(c)}>Hapus</Button>
            </div>
          ))}
        </Card>
      )}
      {editing && <RoomForm room={editing} onSubmit={save} onClose={() => setEditing(null)} />}
    </>
  );
}
