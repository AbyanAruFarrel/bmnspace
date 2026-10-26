import { useEffect, useMemo, useState } from "react";
import MainLayout from "../../Layouts/MainLayout";
import Card from "../../Components/Card";
import RequestStatus from "../Profil/Components/RequestStatus";
import { getGuest } from "../../Utils/Helpers/GuestHelpers";
import { toastError } from "../../Utils/Helpers/ToastHelpers";
import { api, mapRequest } from "../../Utils/Helpers/api";

// Pemesan tamu memantau pesanannya: email DAN No. Handphone harus sama dengan yang diisi saat memesan.
export default function CekPesananPage() {
  const g = getGuest();
  const [f, setF] = useState({ email: g.email || "", phone: g.phone || "" });
  const [found, setFound] = useState(null); // { creds, name, rows } (rows = data mentah dari server)
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 30000); return () => clearInterval(id); }, []);
  // dipetakan ulang tiap 30 detik: peminjaman yang waktunya lewat otomatis tampil "Selesai"
  const requests = useMemo(() => (found ? found.rows.map(mapRequest) : []), [found, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const change = (e) => setF({ ...f, [e.target.name]: e.target.value });

  useEffect(() => { api("/assets").then(setAssets).catch(() => {}); }, []); // untuk satuan unit & jenis aset

  const load = async (creds) => {
    const list = await api("/requests/lookup", { method: "POST", body: creds });
    setFound({ creds, name: list[0].requester_name, rows: list });
  };

  const search = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await load({ email: f.email.trim(), phone: f.phone.trim() });
    } catch (err) {
      setFound(null);
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    try { await load(found.creds); } catch (err) { toastError(err.message); } finally { setLoading(false); }
  };

  return (
    <MainLayout>
      <main className="container">
        <Card>
          <form onSubmit={search}>
            <h2 style={{ marginTop: 0 }}>Cek Status Pesanan</h2>
            <p className="muted" style={{ marginTop: -8 }}>Masukkan email dan No. Handphone yang Anda isi saat memesan.</p>
            <div className="two">
              <div className="field"><label>Email</label>
                <input type="email" name="email" value={f.email} onChange={change} required /></div>
              <div className="field"><label>No. Handphone</label>
                <input type="tel" name="phone" inputMode="tel" value={f.phone} onChange={change} required /></div>
            </div>
            <button type="submit" className="btn" disabled={loading}>{loading ? "Mencari…" : "Cari Pesanan"}</button>
          </form>
        </Card>
        {found && (
          <div style={{ marginTop: 16 }}>
            <p className="muted">
              Pesanan atas nama <strong>{found.name}</strong>
              <button type="button" className="link-btn inline" onClick={refresh} disabled={loading}> • 🔄 Segarkan</button>
            </p>
            <RequestStatus requests={requests} assets={assets} creds={found.creds} onChanged={() => load(found.creds)} />
          </div>
        )}
      </main>
    </MainLayout>
  );
}
