import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../Layouts/MainLayout";
import Button from "../../Components/Button";
import Avatar from "../../Components/Avatar";
import RequestList from "../Admin/Components/RequestList";
import AdminCalendar from "../Admin/Components/AdminCalendar";
import RoomManager from "../Admin/Components/RoomManager";
import NotifList from "./Components/NotifList";
import ChangePasswordForm from "./Components/ChangePasswordForm";
import { confirmDialog } from "../../Utils/Helpers/SwalHelpers";
import { displayName, getSession, logoutUser } from "../../Utils/Helpers/AuthHelpers";
import { api } from "../../Utils/Helpers/api";

const pill = (n) => n > 0 && <span className="pill">{n}</span>;

// Halaman Helpdesk: dashboard persetujuan, kalender, kelola aset (tambah/ubah/hapus), dan notifikasi (butuh login)
export default function ProfilPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [tab, setTab] = useState("dashboard");
  const [badge, setBadge] = useState({ waiting: 0, unread: 0 });

  const refreshBadge = async () => { // lencana jumlah menunggu & notifikasi belum dibaca
    try {
      const [c, n] = await Promise.all([
        api("/admin/requests/counts", { token: session.token }),
        api("/notifications", { token: session.token }),
      ]);
      setBadge({ waiting: c.Menunggu || 0, unread: n.unread || 0 });
    } catch { /* abaikan */ }
  };
  useEffect(() => {
    refreshBadge();
    const id = setInterval(refreshBadge, 10000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = async () => {
    if (!(await confirmDialog("Keluar dari akun?", "Anda perlu login lagi untuk mengelola permohonan."))) return;
    logoutUser();
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/");
  };

  const tabs = [
    ["dashboard", <>Dashboard Helpdesk{pill(badge.waiting)}</>],
    ["kalender", "Kalender"],
    ["aset", "Kelola Aset"],
    ["notif", <>Notifikasi{pill(badge.unread)}</>],
    ["password", "Ubah Password"],
  ];

  return (
    <MainLayout>
      <main className="container">
        <div className="card profile-head">
          <div className="avatar-edit"><Avatar user={session} large /></div>
          <div>
            <h2 style={{ margin: 0 }}>{displayName(session)}<span className="status done">Admin</span></h2>
            <div className="muted">{session.email}</div>
          </div>
          <button type="button" className="btn danger logout-btn" onClick={logout}>⎋ Logout</button>
        </div>

        <div className="tabs">
          {tabs.map(([id, label]) => (
            <Button key={id} variant={tab === id ? "" : "secondary"} onClick={() => setTab(id)}>{label}</Button>
          ))}
        </div>

        {tab === "dashboard" && <RequestList />}
        {tab === "kalender" && <AdminCalendar />}
        {tab === "aset" && <RoomManager />}
        {tab === "notif" && <NotifList onRead={refreshBadge} />}
        {tab === "password" && <ChangePasswordForm />}
      </main>
    </MainLayout>
  );
}
