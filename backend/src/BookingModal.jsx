import { useState } from "react";
import { addMinutes, localIso, minStartTime, rulesFor } from "../../../Utils/Helpers/BookingHelpers";
import TimeInput24 from "../../../Components/TimeInput24";
import { getGuest } from "../../../Utils/Helpers/GuestHelpers";
import { isCar, isItem, sizeText, stockOf } from "../../../Utils/Helpers/RoomHelpers";
import AvailabilityCalendar from "./AvailabilityCalendar";

export default function BookingModal({ room, initial, onClose, onSubmit }) {
  const item = isItem(room), car = isCar(room), stock = stockOf(room);
  const guest = getGuest(); // kontak pemesan terakhir di browser ini (tanpa login)
  const [f, setF] = useState({ mode: "single", startDate: "", endDate: "", startTime: "", endTime: "", qty: 1, name: guest.name || "", nip: guest.nip || "", instansi: guest.instansi || "", phone: guest.phone || "", email: guest.email || "", agenda: "", ...initial });
  const change = (e) => setF({ ...f, [e.target.name]: e.target.value });
  const R = rulesFor(item); // barang: 24 jam kontinu; ruangan/mobil: jam kerja
  const multi = f.mode === "multi"; // peminjaman berhari-hari
  const fixedStart = multi && !R.continuous; // ruangan/mobil berhari-hari: jam mulai otomatis 07:30
  const today = localIso(new Date());
  const nextDay = (iso) => { const d = new Date(iso + "T00:00"); d.setDate(d.getDate() + 1); return localIso(d); };
  // Ruangan/mobil berhari-hari mulai 07:30: jika hari ini sudah lewat 07:30, tanggal mulai paling awal besok
  const minDate = fixedStart && minStartTime(today, new Date(), R.open, R.close) > R.multiStart ? nextDay(today) : today;
  const pick = (d) => setF({ ...f, startDate: d, endDate: multi ? (f.endDate > d ? f.endDate : "") : d });
  const setMode = (mode) => setF({ ...f, mode, startTime: mode === "multi" && !R.continuous ? R.multiStart : "", endTime: "",
    startDate: mode === "multi" && f.startDate && f.startDate < minDate ? "" : f.startDate, endDate: mode === "multi" ? "" : f.startDate });
  const minStart = minStartTime(f.startDate || today, new Date(), R.open, R.close); // hari ini: tidak boleh sebelum jam sekarang
  const startVal = fixedStart ? R.multiStart : f.startTime;
  // Jam selesai: satu hari harus setelah jam mulai; berhari-hari (barang) bebas di hari terakhir
  const minEnd = multi ? (R.continuous ? R.open : R.multiStart) : addMinutes(f.startTime || R.open, 5);
  const maxEnd = multi ? R.multiEnd : R.close;
  const data = { ...f, endDate: multi ? f.endDate : f.startDate, startTime: startVal, qty: item ? Number(f.qty) || 1 : 1, name: f.name.trim(), nip: f.nip.trim(), instansi: f.instansi.trim(), phone: f.phone.trim(), email: f.email.trim() };

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
          <div className="field"><label>Jam {item ? "Ambil" : "Mulai"}{fixedStart ? " (otomatis)" : ""}</label>
            <TimeInput24 name="startTime" value={startVal} onChange={(v) => setF({ ...f, startTime: v })}
              min={fixedStart ? R.multiStart : minStart} max={fixedStart ? R.multiStart : R.close} disabled={fixedStart} required /></div>
          <div className="field"><label>Jam {item ? "Kembali" : "Selesai"}{multi ? (R.continuous ? " (hari terakhir)" : " (hari terakhir, maks. " + R.multiEnd + ")") : ""}</label>
            <TimeInput24 name="endTime" value={f.endTime} onChange={(v) => setF({ ...f, endTime: v })} min={minEnd} max={maxEnd} required /></div>
          {item && (
            <div className="field"><label>Jumlah unit (stok {stock})</label>
              <input type="number" name="qty" min="1" max={stock} value={f.qty} onChange={change} required /></div>
          )}
        </div>
        {!multi && (f.startDate || today) === today && <p className="muted" style={{ marginTop: 0 }}>Hari ini jam mulai paling awal {minStart} (tidak bisa meminjam waktu yang sudah lewat).</p>}
        <p className="muted" style={{ marginTop: 0 }}>
          {R.continuous
            ? `Barang bisa dipinjam kapan saja, 24 jam (${R.open}–${R.close}), termasuk berhari-hari. Pilih jam ambil dan jam kembali.`
            : multi
              ? `Peminjaman berhari-hari: jam mulai otomatis ${R.multiStart}, dipakai tiap hari ${R.multiStart}–${R.multiEnd}. Pilih sampai hari apa dan jam berapa (maks. ${R.multiEnd}) di hari terakhir.`
              : `Jam selesai wajib diisi (jam operasional ${R.open}–${R.close}).`}
          {" "}Jam memakai format 24 jam. Peminjaman otomatis berstatus selesai setelah lewat tanggal & jam selesai.
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
        <p className="map-note">Permohonan peminjaman harus menunggu persetujuan Helpdesk. Pantau statusnya lewat menu “Cek Pesanan” memakai NIP dan No. Handphone yang Anda isi. Tidak perlu login.</p>
        <div className="modal-actions">
          <button type="button" className="link-btn" onClick={onClose}>Batal</button>
          <button type="submit" className="btn">Ajukan Peminjaman</button>
        </div>
      </form>
    </div>
  );
}
