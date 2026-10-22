import Card from "../../../Components/Card";
import { getRequests } from "../../../Utils/Helpers/AuthHelpers";
import { rentLabel, timeText } from "../../../Utils/Helpers/BookingHelpers";
import { endOf, startOf } from "../../../Utils/Helpers/CleaningHelpers";
import { fmtDate, getRooms, isItem } from "../../../Utils/Helpers/RoomHelpers";

// Aset yang pernah benar-benar dipakai: disetujui/selesai dan waktunya sudah lewat
export default function RentalHistory({ userId }) {
  const now = new Date();
  const done = getRequests()
    .filter((r) => r.userId === userId && (r.status === "Disetujui" || r.status === "Selesai") && endOf(r) <= now && endOf(r) > startOf(r))
    .sort((a, b) => endOf(b) - endOf(a));

  return (
    <Card>
      <p className="muted" style={{ marginTop: 0 }}>
        {done.length} kali peminjaman
      </p>
      {done.length === 0 && <p className="muted">Belum ada riwayat peminjaman.</p>}
      {done.map((r) => (
        <div className="row" key={r.id}>
          <div>
            <strong>{r.roomName}</strong>
            <div className="muted">📅 {fmtDate(r.startDate)}{r.endDate !== r.startDate && ` s/d ${fmtDate(r.endDate)}`} • {timeText(r)}</div>
            <div className="muted">{rentLabel(r)}{isItem(getRooms().find((x) => x.id === r.roomId)) && ` • ${r.qty || 1} unit`} • Keperluan: {r.agenda}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}
