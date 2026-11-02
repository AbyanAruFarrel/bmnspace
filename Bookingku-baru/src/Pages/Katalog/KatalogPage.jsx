import { useEffect, useState } from "react";
import MainLayout from "../../Layouts/MainLayout";
import FilterBar from "./Components/FilterBar";
import RoomCard from "./Components/RoomCard";
import BookingModal from "./Components/BookingModal";
import { CAPACITY_FILTERS } from "../../Data/Dummy";
import { displayName, getSession } from "../../Utils/Helpers/AuthHelpers";
import { isItem, stockOf } from "../../Utils/Helpers/RoomHelpers";
import { isPastBooking, rulesFor } from "../../Utils/Helpers/BookingHelpers";
import { api } from "../../Utils/Helpers/api";
import { confirmDialog } from "../../Utils/Helpers/SwalHelpers";
import { toastError, toastSuccess } from "../../Utils/Helpers/ToastHelpers";
import { orderCode, saveGuest } from "../../Utils/Helpers/GuestHelpers";
import Swal from "sweetalert2";

export default function KatalogPage() {
  const [f, setF] = useState({ q: "", cat: "", cap: "all" });
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(getSession); // untuk animasi beranda saat login
  useEffect(() => {
    const sync = () => setMe(getSession());
    window.addEventListener("auth-changed", sync);
    window.addEventListener("profile-updated", sync);
    return () => { window.removeEventListener("auth-changed", sync); window.removeEventListener("profile-updated", sync); };
  }, []);

  const capTest = CAPACITY_FILTERS.find((c) => c.id === f.cap).test;
  const q = f.q.toLowerCase();
  const [assets, setAssets] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [loadError, setLoadError] = useState("");
  useEffect(() => { // daftar aset diambil dari server
    api("/assets")
      .then((list) => { setAssets(list); setStatus("ok"); })
      .catch((e) => { setLoadError(e.message); setStatus("error"); });
  }, []);
  const rooms = assets.filter((r) =>
    (!f.cat || r.category === f.cat) && (isItem(r) ? f.cap === "all" : capTest(r.capacity)) &&
    (r.name + r.building + (r.placement || "")).toLowerCase().includes(q)
  );

  const [prefill, setPrefill] = useState(null); // tanggal & jam dari form di kartu
  const openBooking = (r, initial) => {
    setPrefill(initial || null);
    setRoom(r);
  };

  // Alur: peminjam mengajukan -> status "Menunggu" -> Helpdesk menyetujui atau menolak.
  // Pengecekan jadwal bentrok dilakukan server (hasil akhirnya yang berlaku).
  const submit = async (d) => {
    if (d.endDate < d.startDate) return toastError("Tanggal selesai tidak boleh sebelum tanggal mulai");
    const R = rulesFor(isItem(room)); // barang: 24 jam; ruangan/mobil: jam kerja
    if (d.mode === "multi") {
      if (d.endDate <= d.startDate) return toastError("Pilih tanggal selesai setelah tanggal mulai untuk peminjaman berhari-hari");
      if (R.continuous) { // barang: jam ambil dan jam kembali bebas (24 jam)
        if (!d.startTime) return toastError("Jam ambil wajib diisi");
        if (!d.endTime || d.endTime > R.close) return toastError(`Jam kembali hari terakhir maksimal ${R.close}`);
      } else { // ruangan/mobil: mulai otomatis 07:30, selesai maksimal 17:00
        if (!d.endTime || d.endTime <= R.multiStart || d.endTime > R.multiEnd) return toastError(`Jam selesai hari terakhir harus antara ${R.multiStart} dan ${R.multiEnd}`);
      }
    } else {
      if (!d.startTime || d.startTime < R.open || d.startTime >= R.close) return toastError(`Jam mulai harus di jam operasional ${R.open}–${R.close}`);
      if (!d.endTime || d.endTime <= R.open || d.endTime > R.close) return toastError(`Jam selesai harus di jam operasional ${R.open}–${R.close}`);
      if (d.endTime <= d.startTime) return toastError("Jam selesai harus setelah jam mulai");
    }
    if (!d.name) return toastError("Nama lengkap wajib diisi");
    if (!/^\d+$/.test(d.nip.replace(/\s/g, ""))) return toastError("NIP wajib diisi (hanya angka)");
    if (!d.instansi) return toastError("Satker wajib diisi");
    if (!d.phone) return toastError("No. handphone wajib diisi");
    if (!/^\S+@\S+\.\S+$/.test(d.email)) return toastError("Email tidak valid");
    if (isPastBooking(d)) return toastError("Waktu yang dipilih sudah lewat. Pilih tanggal/jam setelah waktu sekarang.");
    if (isItem(room) && d.qty > stockOf(room)) return toastError(`Stok hanya ${stockOf(room)} unit`);
    const qtyText = isItem(room) ? ` × ${d.qty} unit` : "";
    if (!(await confirmDialog("Ajukan peminjaman?", `${room.name}${qtyText} • ${d.startDate} s/d ${d.endDate}. Anda perlu menunggu persetujuan Helpdesk.`))) return;

    try {
      const req = await api("/requests", {
        method: "POST",
        body: {
          assetId: room.id, name: d.name, nip: d.nip.replace(/\s/g, ""), instansi: d.instansi, phone: d.phone, email: d.email, agenda: d.agenda,
          startDate: d.startDate, endDate: d.endDate, startTime: d.startTime, endTime: d.endTime, qty: d.qty,
        },
      });
      saveGuest(d); // form berikutnya terisi otomatis di browser ini
      const savedEnd = req?.end_time ? String(req.end_time).slice(0, 5) : "";
      if (savedEnd && savedEnd !== d.endTime) { // server menyimpan jam selesai berbeda dari yang dipilih
        console.warn("Jam selesai dikirim", d.endTime, "tetapi server menyimpan", savedEnd);
        toastError(`Peringatan: jam selesai yang tersimpan di server ${savedEnd}, bukan ${d.endTime}. Hubungi Helpdesk.`);
      }
      setRoom(null);
      toastSuccess("Permohonan terkirim. Menunggu persetujuan.");
      Swal.fire({ icon: "success", title: "Permohonan terkirim", confirmButtonText: "OK",
        html: `Kode pesanan: <b>${orderCode(req)}</b><br/>Pantau statusnya lewat menu <b>Cek Pesanan</b> memakai NIP dan No. Handphone Anda.` });
    } catch (err) {
      toastError(err.message); // mis. jadwal bentrok dari server
    }
  };

  return (
    <MainLayout>
      <section key={me ? "in" : "out"} className={`hero ${me ? "hero-animate" : ""}`}>
        {me && <span className="hero-hello"><span className="wave">👋</span> Halo, {displayName(me)}</span>}
        <h1>Pinjam <em>Ruangan, Barang<br />&amp; Mobil Kantor</em> dengan Mudah</h1>
        <p>Pilih Ruangan, Barang, atau Mobil, cek jadwalnya, lalu ajukan peminjaman. Tanpa login cukup isi data diri Anda.</p>
      </section>
      <main className="container">
        <FilterBar f={f} setF={setF} />
        {status === "loading" && <p className="muted">Memuat daftar aset…</p>}
        {status === "error" && <p className="muted">Gagal memuat aset: {loadError}. Pastikan server backend berjalan.</p>}
        {status === "ok" && rooms.length === 0 && <p className="muted">Tidak ada aset yang cocok.</p>}
        <div className="grid">{rooms.map((r) => <RoomCard key={r.id} room={r} onBook={openBooking} />)}</div>
      </main>
      {room && <BookingModal room={room} initial={prefill} onClose={() => setRoom(null)} onSubmit={submit} />}
    </MainLayout>
  );
}
