import { useEffect, useState } from "react";
import MapModal from "../Pages/Katalog/Components/MapModal";
import { getSession } from "../Utils/Helpers/AuthHelpers";
import { getFooterLocation, setFooterLocation } from "../Utils/Helpers/LocationHelpers";
import { openUrl } from "../Utils/Helpers/MapHelpers";
import { toastError, toastSuccess } from "../Utils/Helpers/ToastHelpers";

// Lokasi Google Maps di footer. Admin bisa mengganti lokasinya kapan saja.
export default function FooterLocation() {
  const [loc, setLoc] = useState(getFooterLocation);
  const [map, setMap] = useState(false);
  const [edit, setEdit] = useState(null); // null | { name, address }
  const admin = getSession()?.role === "admin";

  useEffect(() => {
    const sync = () => setLoc(getFooterLocation());
    window.addEventListener("location-updated", sync);
    return () => window.removeEventListener("location-updated", sync);
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await setFooterLocation(edit);
      setEdit(null);
      toastSuccess("Lokasi footer diperbarui");
    } catch (err) {
      toastError(err.message);
    }
  };

  return (
    <div className="footer-location">
      <div className="footer-loc-actions">
        <button type="button" onClick={() => setMap(true)}>📍 Lokasi Kantor BMNSpace</button>
        {admin && <button type="button" onClick={() => setEdit({ ...loc })}>✏️ Ubah Lokasi</button>}
      </div>
      {map && <MapModal title={loc.name} address={loc.address} onClose={() => setMap(false)} />}
      {edit && (
        <div className="overlay" onClick={() => setEdit(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>Ubah Lokasi Kantor BMNSpace</h2>
            <div className="field"><label>Lokasi Google Maps (alamat, koordinat, atau link)</label>
              <input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} required
                placeholder="Jl. Pandanaran No. 1, Semarang  /  -6.9932,110.4203  /  link Google Maps" />
              {edit.address.trim() && (
                <a className="map-check" href={openUrl(edit.address)} target="_blank" rel="noopener noreferrer">🔎 Cek di Google Maps</a>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="link-btn" onClick={() => setEdit(null)}>Batal</button>
              <button type="submit" className="btn">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
