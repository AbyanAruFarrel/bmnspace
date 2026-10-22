import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../Utils/Helpers/api";
import { toastError } from "../Utils/Helpers/ToastHelpers";
import { toast } from "react-toastify";
import LoginSuccess from "../Components/LoginSuccess";
import { footerContacts, waUrl } from "../Utils/Helpers/ContactHelpers";
import FooterLocation from "../Components/FooterLocation";
import ContactEditor from "../Components/ContactEditor";
import { loadSettings } from "../Utils/Helpers/SettingsStore";
import AuthModal from "../Pages/Auth/Components/AuthModal";
import { displayName, getSession, logoutUser } from "../Utils/Helpers/AuthHelpers";

// Dari mana saja: window.dispatchEvent(new CustomEvent("open-auth", { detail: "login" }))
export default function MainLayout({ title, children }) {
  const navigate = useNavigate();
  const { pathname, key } = useLocation();
  // key "default" = halaman dibuka langsung (tidak ada riwayat) -> kembali ke beranda
  const back = () => (key === "default" ? navigate("/") : navigate(-1));
  const [user, setUser] = useState(getSession);
  const [auth, setAuth] = useState(null); // null | "login" | "register"
  const [unread, setUnread] = useState(0);
  // sambutan; untuk admin dibawa lewat sessionStorage karena halaman berpindah ke /profil
  const [welcome, setWelcome] = useState(() => { try { return JSON.parse(sessionStorage.getItem("bk_welcome")); } catch { return null; } });
  useEffect(() => { sessionStorage.removeItem("bk_welcome"); }, []);
  const [, bump] = useState(0); // render ulang footer saat pengaturan dari server tiba / berubah
  useEffect(() => {
    loadSettings();
    const re = () => bump((n) => n + 1);
    window.addEventListener("contact-updated", re);
    return () => window.removeEventListener("contact-updated", re);
  }, []);

  useEffect(() => { // nama di header ikut berubah setelah profil disimpan
    const refresh = () => setUser(getSession());
    window.addEventListener("profile-updated", refresh);
    return () => window.removeEventListener("profile-updated", refresh);
  }, []);

  useEffect(() => { // notifikasi helpdesk dari server: ringkasan saat masuk + toast saat ada yang baru
    if (!user?.token) return;
    const seenKey = `bk_seen_${user.id}`;
    let prev = null, alive = true;
    const poll = async () => {
      try {
        const { unread: n, items } = await api("/notifications", { token: user.token });
        if (!alive) return;
        const isNew = prev === null ? n > 0 && sessionStorage.getItem(seenKey) !== String(n) : n > prev;
        if (isNew) {
          toast(<div className="chat-toast"><strong>🔔 {n > 1 ? `${n} notifikasi belum dibaca` : "Notifikasi baru"}</strong><span>{items[0]?.text}</span></div>,
            { className: "toast-chat", icon: false, closeButton: false, autoClose: 4500, onClick: () => navigate("/profil") });
        }
        if (prev === null || n !== prev) sessionStorage.setItem(seenKey, String(n));
        prev = n;
        setUnread(n);
      } catch { /* abaikan; dicoba lagi di putaran berikutnya */ }
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => { alive = false; clearInterval(id); };
  }, [user?.id, user?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { // token ditolak server (kedaluwarsa) -> keluar dari sesi
    const expired = () => {
      if (!getSession()) return;
      logoutUser();
      setUser(null);
      window.dispatchEvent(new Event("auth-changed"));
      toastError("Sesi login berakhir. Silakan login lagi.");
      navigate("/");
    };
    window.addEventListener("auth-expired", expired);
    return () => window.removeEventListener("auth-expired", expired);
  }, [navigate]);

  useEffect(() => {
    const open = (e) => setAuth(e.detail || "login");
    window.addEventListener("open-auth", open);
    return () => window.removeEventListener("open-auth", open);
  }, []);

  const onSuccess = (u, isNew) => {
    setUser(u);
    setAuth(null);
    window.dispatchEvent(new Event("auth-changed"));
    const info = { name: displayName(u), role: u.role || "user", isNew };
    if (u.role === "admin") {
      sessionStorage.setItem("bk_welcome", JSON.stringify(info));
      navigate("/profil");
    } else setWelcome(info);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand"><img className="logo" src="/logo-mark.png" alt="BMNSpace" /> <span className="brand-name"><b>BMN</b>Space</span></Link>
        <strong className="topbar-title">{title}</strong>
        <div className="topbar-actions">
          {user ? (
            <>
              <Link to="/profil" className="topbar-user" title="Profil saya">{user.photo ? <img className="topbar-ava" src={user.photo} alt="" /> : "👤 "}Halo, {displayName(user)}{unread > 0 && <span className="pill">{unread}</span>}</Link>
            </>
          ) : (
            <>
              <Link to="/cek" className="btn-nav primary" style={{ textDecoration: "none" }}>🔎 Cek Pesanan</Link>
              <button className="btn-nav" onClick={() => setAuth("login")} title="Khusus Helpdesk">Login Helpdesk</button>
            </>
          )}
        </div>
      </header>
      {pathname !== "/" && (
        <div className="back-bar"><button className="back-btn" onClick={back}>← Kembali</button></div>
      )}
      {children}
      <footer className="footer">
        <div className="footer-brand"><img className="footer-logo" src="/logo-mark.png" alt="" /> <span className="brand-name"><b>BMN</b>Space</span></div>
        <div className="footer-tagline">Multi-Service Rental Platform</div>
        <FooterLocation />
        <div className="footer-contacts">
          {footerContacts().map((c) => (
            <div className="footer-contact" key={c.label}>
              <small>{c.label}{c.name ? ` — ${c.name}` : ""}</small>
              {c.phone
                ? <a href={waUrl(c.phone)} target="_blank" rel="noopener noreferrer">📞 {c.phone}</a>
                : <span className="none">{c.exists ? "Nomor belum diisi" : "Belum tersedia"}</span>}
            </div>
          ))}
        </div>
        {user?.role === "admin" && <ContactEditor />}
        <div className="footer-copy">© {new Date().getFullYear()} BMNSpace — peminjaman ruangan, barang &amp; mobil kantor</div>
      </footer>
      {welcome && <LoginSuccess info={welcome} onClose={() => setWelcome(null)} />}
      {auth && <AuthModal onClose={() => setAuth(null)} onSuccess={onSuccess} />}
    </div>
  );
}
