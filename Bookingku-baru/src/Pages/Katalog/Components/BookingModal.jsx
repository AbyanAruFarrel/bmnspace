import { useState } from "react";
import { CLOSE, MULTI_END, MULTI_START, OPEN, localIso, minStartTime } from "../../../Utils/Helpers/BookingHelpers";
import { getGuest } from "../../../Utils/Helpers/GuestHelpers";
import { isCar, isItem, sizeText, stockOf } from "../../../Utils/Helpers/RoomHelpers";
import AvailabilityCalendar from "./AvailabilityCalendar";

export default function BookingModal({ room, initial, onClose, onSubmit }) {
  const item = isItem(room), car = isCar(room), stock = stockOf(room);
  const guest = getGuest(); // kontak pemesan terakhir di browser ini (tanpa login)
  const [f, setF] = useState({ mode: "single", startDate: "", endDate: "", startTime: "", endTime: "", qty: 1, name: guest.name || "", nip: guest.nip || "", instansi: guest.instansi || "", phone: guest.phone || "", email: guest.email || "", agenda: "", ...initial });
  const change = (e) => setF({ ...f, [e.target.name]: e.target.value });
  const multi = f.mode === "multi"; // peminjaman berhari-hari
  const today = localIso(new Date());
  const nextDay = (iso) => { const d = new Date(iso + "T00:00"); d.setDate(d.getDate() + 1); return localIso(d); };
  // Berhari-hari mulai 07:30: jika hari ini sudah lewat 07:30, tanggal mulai paling awal besok
  const minDate = multi && minStartTime(today) > MULTI_START ? nextDay(today) : today;
  const pick = (d) => setF({ ...f, startDate: d, endDate: multi ? (f.endDate > d ? f.endDate : "") : d });
  const setMode = (mode) => setF({ ...f, mode, startTime: mode === "multi" ? MULTI_START : "", endTime: "",
    startDate: mode === "multi" && f.startDate && f.startDate < minDate ? "" : f.startDate, endDate: mode === "multi" ? "" : f.startDate });
  const minStart = minStartTime(f.startDate || today); // hari ini: tidak boleh sebelum jam sekarang
  const minEnd = multi ? MULTI_START : f.startTime || OPEN; // satu hari: jam selesai harus setelah jam mulai
  const maxEnd = multi ? MULTI_END : CLOSE;
  const data = { ...f, endDate: multi ? f.endDate : f.startDate, startTime: multi ? MULTI_START : f.startTime, qty: item ? Number(f.qty) || 1 : 1, name: f.name.trim(), nip: f.nip.trim(), instansi: f.instansi.trim(), phone: f.phone.trim(), email: f.email.trim() };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSubmit(data); }}>
        <h2>Pinjam {room.name}</h2>

        {sizeText(room) && <p className="muted" style={{ marginTop: 0 }}>📐 Ukuran ruangan: {sizeText(room)} • 👥 Kapasitas {room.capacity} orang</p>}
        <AvailabilityCalendar room={room} onPick={pick} selected={f.startDate} />

        <div className="field"><label>Jenis Peminjaman</label>
          <div className="tabs" style={{ margin: 0 }}>
            <button type="button" className={`btn ${multi ? "secondary" : ""}`} onClick={() => setMode("single")}>Jam</button>
            <button type="button" className={`btn ${multi ? "" : "secondary"}`} onClick={() => setMode("multi")}>Hari</button>
          </div>
        </div>
        <div className="two">
          <div className="field"><label>Tanggal Mulai</label>
            <input type="date" name="startDate" min={minDate} value={f.startDate} onChange={(e) => pick(e.target.value)} required /></div>
          {multi && (
            <div className="field"><label>Sampai Tanggal</label>
              <input type="date" name="endDate" min={f.startDate ? nextDay(f.startDate) : nextDay(minDate)} value={f.endDate} onChange={change} required /></div>
          )}
          <div className="field"><label>Jam {item ? "Ambil" : "Mulai"}{multi ? " (otomatis)" : ""}</label>
            <input type="time" name="startTime" min={multi ? undefined : minStart} max={CLOSE} value={multi ? MULTI_START : f.startTime}
              onChange={change} readOnly={multi} required /></div>
          <div className="field"><label>Jam Selesai{multi ? " (hari terakhir, maks. " + MULTI_END + ")" : ""}</label>
            <input type="time" name="endTime" min={minEnd} max={maxEnd} value={f.endTime} onChange={change} required /></div>
          {item && (
            <div className="field"><label>Jumlah unit (stok {stock})</label>
              <input type="number" name="qty" min="1" max={stock} value={f.qty} onChange={change} required /></div>
          )}
        </div>
        {!multi && (f.startDate || today) === today && <p className="muted" style={{ marginTop: 0 }}>Hari ini jam mulai paling awal {minStart} (tidak bisa meminjam waktu yang sudah lewat).</p>}
        <p className="muted" style={{ marginTop: 0 }}>
          {multi
            ? `Peminjaman berhari-hari: jam mulai otomatis ${MULTI_START}, dipakai tiap hari ${MULTI_START}–${MULTI_END}. Pilih sampai hari apa dan jam berapa (maks. ${MULTI_END}) di hari terakhir.`
            : `Jam selesai wajib diisi (jam operasional ${OPEN}–${CLOSE}).`}
          {" "}Peminjaman otomatis berstatus selesai setelah lewat tanggal & jam selesai.
        </p>

        <h3 style={{ margin: "14px 0 6px" }}>Data Pemesan</h3>
        <div className="field"><label>Nama Lengkap</label>
          <input name="name" autoComplete="name" placeholder="Nama lengkap Anda" value={f.name} onChange={change} required /></div>
        <div className="two">
          <div className="field"><label>NIP</label>
            <input name="nip" inputMode="numeric" placeholder="Nomor Induk Pegawai" value={f.nip} onChange={change} required /></div>
          <div className="field"><label>Email</label>
            <input type="email" name="email" autoComplete="email" placeholder="nama@instansi.go.id" value={f.email} onChange={change} required /></div>
        </div>
        <div className="field"><label>Satker</label>
          <input name="instansi" autoComplete="organization" placeholder="Contoh: KPTIK / Dinas Kominfo Provinsi Jawa Tengah" value={f.instansi} onChange={change} required /></div>
        <div className="field"><label>No. Handphone</label>
          <input type="tel" name="phone" inputMode="tel" autoComplete="tel" placeholder="Contoh: 081234567890" value={f.phone} onChange={change} required /></div>
        <div className="field"><label>{car ? "Tujuan / Keperluan Perjalanan" : "Keperluan / Agenda"}</label>
          <textarea name="agenda" rows="3" placeholder={car ? "Contoh: Kunjungan ke klien di Solo" : "Contoh: Workshop & Rapat Evaluasi Tim"}
            value={f.agenda} onChange={change} required /></div>
        <p className="map-note">Permohonan peminjaman harus menunggu persetujuan Helpdesk. Pantau statusnya lewat menu “Cek Pesanan” memakai email dan No. Handphone yang Anda isi.</p>
        <div className="modal-actions">
          <button type="button" className="link-btn" onClick={onClose}>Batal</button>
          <button type="submit" className="btn">Ajukan Peminjaman</button>
        </div>
      </form>
    </div>
  );
}
