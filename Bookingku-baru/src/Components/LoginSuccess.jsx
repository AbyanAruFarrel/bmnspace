import { useEffect, useRef } from "react";

// Popup singkat di tengah layar setelah login/register; menutup sendiri
export default function LoginSuccess({ info, onClose }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const t = setTimeout(() => closeRef.current(), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="success-overlay" onClick={onClose}>
      <div className="success-card" role="status" aria-live="polite">
        <svg className="success-check" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="28" />
          <path d="M20 33 L29 42 L45 24" />
        </svg>
        <h3>{info.isNew ? "Registrasi Berhasil" : "Login Berhasil"}</h3>
        <p>Selamat datang, {info.name}</p>
      </div>
    </div>
  );
}
