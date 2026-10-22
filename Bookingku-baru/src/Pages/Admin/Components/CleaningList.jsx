import { useState } from "react";
import Card from "../../../Components/Card";
import Button from "../../../Components/Button";
import { getUsers } from "../../../Utils/Helpers/AuthHelpers";
import { cleaningTasks, endOf } from "../../../Utils/Helpers/CleaningHelpers";
import { fmtDateTime, markCleaned } from "../../../Utils/Helpers/RoomHelpers";
import { confirmDialog } from "../../../Utils/Helpers/SwalHelpers";
import { toastSuccess } from "../../../Utils/Helpers/ToastHelpers";

export default function CleaningList({ onDone }) {
  const [tasks, setTasks] = useState(() => cleaningTasks());
  const users = getUsers();
  const nameOf = (r) => r.userName || users.find((u) => u.id === r.userId)?.name || `User #${r.userId}`;

  const clean = async (room) => {
    if (!(await confirmDialog("Tandai sudah dibersihkan?", room.name))) return;
    markCleaned(room.id);
    setTasks(cleaningTasks());
    onDone?.();
    toastSuccess("Ruangan ditandai sudah dibersihkan");
  };

  return (
    <Card>
      {tasks.length === 0 && <p className="muted">Semua ruangan sudah bersih ✨</p>}
      {tasks.map(({ room, used }) => (
        <div className="row" key={room.id}>
          <div>
            <strong>{room.name}</strong> <span className="muted">({[room.building, room.placement].filter(Boolean).join(" — ")})</span>
            {room.needsCleaning && (
              <div className="clean warn" style={{ marginTop: 6 }}>
                🧹 Dilaporkan {room.reportedBy}, {fmtDateTime(room.reportedAt)}{room.cleanNote ? ` • “${room.cleanNote}”` : ""}
              </div>
            )}
            {used && (
              <div className="muted" style={{ marginTop: 4 }}>
                📅 Selesai dipakai {nameOf(used)} ({used.agenda}) — berakhir {fmtDateTime(endOf(used).toISOString())}
              </div>
            )}
            <div className="muted">
              {room.cleanedAt ? `Terakhir dibersihkan: ${fmtDateTime(room.cleanedAt)}` : "Belum ada catatan pembersihan"}
            </div>
          </div>
          <Button onClick={() => clean(room)}>🧹 Sudah Dibersihkan</Button>
        </div>
      ))}
    </Card>
  );
}
