import { useState } from "react";
import { createPortal } from "react-dom";
import { addCategory, ICON_CHOICES, KINDS } from "../../../Utils/Helpers/CategoryHelpers";
import { toastError } from "../../../Utils/Helpers/ToastHelpers";

// Modal "Tambah Kategori Baru". Sengaja tanpa <form> karena bisa dibuka dari dalam form Tambah Aset
// (form di dalam form tidak valid); Enter di kolom nama tetap menyimpan.
export default function CategoryForm({ onSaved, onClose }) {
  const [f, setF] = useState({ name: "", kind: "ruang", icon: ICON_CHOICES[0], color: "#0f766e" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    try {
      onSaved(await addCategory(f));
    } catch (e) {
      toastError(e.message);
    }
  };

  return createPortal(
    <div className="overlay" style={{ zIndex: 60 }} onClick={onClose}>
      <div className="modal small" onClick={(e) => e.stopPropagation()}>
        <h2>Tambah Kategori Baru</h2>
        <div className="field"><label>Nama Kategori</label>
          <input value={f.name} onChange={set("name")} placeholder="Contoh: Mess, Laboratorium, Motor Dinas"
            autoFocus onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }} /></div>
        <div className="field"><label>Jenis Aset di Kategori Ini</label>
          <select value={f.kind} onChange={set("kind")}>
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select></div>
        <div className="field"><label>Ikon</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ICON_CHOICES.map((i) => (
              <button type="button" key={i} onClick={() => setF({ ...f, icon: i })}
                style={{ fontSize: 20, padding: "4px 8px", borderRadius: 8, cursor: "pointer", background: "#fff",
                  border: f.icon === i ? "2px solid #1d4ed8" : "1px solid #d1d5db" }}>{i}</button>
            ))}
          </div></div>
        <div className="field"><label>Warna</label>
          <input type="color" value={f.color} onChange={set("color")} style={{ height: 40, padding: 4 }} /></div>
        <div className="modal-actions">
          <button type="button" className="link-btn" onClick={onClose}>Batal</button>
          <button type="button" className="btn" onClick={save}>Simpan Kategori</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
