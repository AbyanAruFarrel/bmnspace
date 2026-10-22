import { useState } from "react";
import { getContact, setContact } from "../Utils/Helpers/ContactHelpers";
import { toastError, toastSuccess } from "../Utils/Helpers/ToastHelpers";

// Tombol di footer (khusus Helpdesk) untuk mengisi nama dan nomor kontak yang tampil ke semua pengunjung.
export default function ContactEditor() {
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await setContact(edit);
      setEdit(null);
      toastSuccess("Kontak Helpdesk diperbarui");
    } catch (err) {
      toastError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="footer-location">
      <div className="footer-loc-actions">
        <button type="button" onClick={() => setEdit(getContact())}>✏️ Ubah Kontak Helpdesk</button>
      </div>
      {edit && (
        <div className="overlay" onClick={() => setEdit(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>Ubah Kontak Helpdesk</h2>
            <div className="field"><label>Nama (boleh dikosongkan)</label>
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Contoh: Helpdesk Semarang" /></div>
            <div className="field"><label>No. WhatsApp / Telepon</label>
              <input inputMode="tel" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="08xxxxxxxxxx" /></div>
            <div className="modal-actions">
              <button type="button" className="link-btn" onClick={() => setEdit(null)}>Batal</button>
              <button type="submit" className="btn" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
