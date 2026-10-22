import { useCallback, useEffect, useState } from "react";
import Card from "../../../Components/Card";
import { getSession } from "../../../Utils/Helpers/AuthHelpers";
import { fmtDateTime } from "../../../Utils/Helpers/RoomHelpers";
import { api } from "../../../Utils/Helpers/api";

// Notifikasi helpdesk: pengajuan baru, pembatalan, dan selesai memakai (dari server)
export default function NotifList({ onRead }) {
  const token = getSession()?.token;
  const [data, setData] = useState({ unread: 0, items: [] });
  const load = useCallback(() => api("/notifications", { token }).then(setData).catch(() => {}), [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => { // otomatis dianggap terbaca setelah dilihat beberapa detik
    if (!data.unread) return;
    const t = setTimeout(async () => {
      try { await api("/notifications/read-all", { method: "POST", token }); onRead?.(); load(); } catch { /* coba lagi nanti */ }
    }, 3000);
    return () => clearTimeout(t);
  }, [data.unread]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <p className="muted" style={{ margin: 0 }}>{data.items.length} notifikasi</p>
      {data.items.length === 0 && <p className="muted">Belum ada notifikasi.</p>}
      {data.items.map((n) => (
        <div className={`row notif ${n.is_read ? "" : "unread"}`} key={n.id}>
          <div>{n.text}<div className="muted">{fmtDateTime(n.created_at)}</div></div>
        </div>
      ))}
    </Card>
  );
}
