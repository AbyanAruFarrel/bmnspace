import { useEffect, useState } from "react";
import { dayStatus, fmtMin, freeUnits, localIso, setBusy, slotsOn } from "../../../Utils/Helpers/BookingHelpers";
import { api } from "../../../Utils/Helpers/api";
import { isItem, stockOf } from "../../../Utils/Helpers/RoomHelpers";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MAX_AHEAD = 24; // bulan ke depan

export default function AvailabilityCalendar({ room, onPick, selected }) {
  const roomId = room.id, stock = stockOf(room);
  const [mo, setMo] = useState(0);
  const [, setTick] = useState(0); // memicu gambar ulang setelah jadwal dari server tiba
  const [loadError, setLoadError] = useState("");
  useEffect(() => { // ambil jadwal terpakai aset ini dari server (tanpa data pribadi)
    let alive = true;
    const t = new Date();
    const from = localIso(t);
    const to = localIso(new Date(t.getFullYear(), t.getMonth() + MAX_AHEAD + 1, 0));
    setBusy(roomId, []);
    api(`/requests/availability/${roomId}?from=${from}&to=${to}`)
      .then((list) => { if (alive) { setBusy(roomId, list); setLoadError(""); setTick((n) => n + 1); } })
      .catch((e) => { if (alive) setLoadError(e.message); });
    return () => { alive = false; };
  }, [roomId]);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + mo, 1);
  const y = base.getFullYear(), m = base.getMonth();
  const total = new Date(y, m + 1, 0).getDate();
  const status = dayStatus(roomId, y, m, total, stock);
  const todayIso = localIso(now);
  const hours = (slots) => slots.map((s) => `${fmtMin(s[0])}–${fmtMin(s[1])}`).join(", ");
  const selSlots = selected ? slotsOn(roomId, selected, stock) : [];

  return (
    <div className="calendar">
      <div className="cal-head">
        <strong>📅 Ketersediaan — {base.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</strong>
        <span className="cal-nav">
          <button type="button" disabled={mo === 0} onClick={() => setMo(mo - 1)} aria-label="Bulan sebelumnya">‹</button>
          <button type="button" disabled={mo >= MAX_AHEAD} onClick={() => setMo(mo + 1)} aria-label="Bulan berikutnya">›</button>
        </span>
      </div>
      <div className="cal-legend">
        <span className="legend warn">🟡 Kuning = Sebagian terpakai (masih ada jam/unit kosong)</span>
        <span className="legend">🔴 Merah = Penuh (jam kerja 07:30–17:00)</span>
        <small className="muted">Permohonan yang menunggu persetujuan maupun yang disetujui menandai jadwal.</small>
      </div>
      {loadError && <p className="muted">Gagal memuat jadwal: {loadError}</p>}
      <div className="cal-grid">
        {DAYS.map((d) => <span key={d} className="cal-day-name">{d}</span>)}
        {Array.from({ length: base.getDay() }, (_, i) => <span key={"e" + i} />)}
        {Array.from({ length: total }, (_, i) => {
          const d = i + 1;
          const iso = localIso(new Date(y, m, d));
          const s = status[d];
          const noneLeft = !!s && s.full; // jam kerja penuh terpakai
          return (
            <button type="button" key={d} disabled={noneLeft || iso < todayIso}
              title={!s ? "Tersedia" : s.full ? "Penuh seharian" : `Sebagian terpakai${isItem(room) && s.free > 0 ? ` (sisa ${s.free} unit)` : " — masih ada jam kosong"}`}
              className={`cal-cell ${s ? (s.full ? "booked" : "partial") : ""} ${selected === iso ? "selected" : ""}`}
              onClick={() => onPick(iso)}>
              {d}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="slots-info">
          {selSlots.length ? `Sudah dipakai pada ${selected}: ${hours(selSlots)}. Anda masih bisa meminjam di luar jam tersebut.` : isItem(room) && freeUnits(roomId, selected, stock) < stock ? `Sebagian unit sedang dipakai pada ${selected}.` : `Tersedia pada ${selected}.`}
          {isItem(room) && ` Sisa unit terbanyak: ${Math.max(0, freeUnits(roomId, selected, stock))} dari ${stock}.`}
        </p>
      )}
    </div>
  );
}
