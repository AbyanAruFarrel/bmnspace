import { useState } from "react";
import PasswordInput from "../../../Components/PasswordInput";
import { loginUser } from "../../../Utils/Helpers/AuthHelpers";
import { toastError } from "../../../Utils/Helpers/ToastHelpers";

// Login hanya untuk Helpdesk. Pemesan biasa tidak perlu login.
export default function AuthModal({ onClose, onSuccess }) {
  const [f, setF] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const change = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await loginUser(f.email.trim(), f.password);
    setBusy(false);
    if (!res.ok) return toastError(res.message);
    onSuccess(res.user, false);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal small" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Login Helpdesk</h2>
        <p className="muted" style={{ marginTop: -8 }}>Khusus pengelola. Untuk meminjam, Anda tidak perlu login.</p>
        <div className="field"><label>Email</label>
          <input type="email" name="email" value={f.email} onChange={change} required /></div>
        <div className="field"><label>Password</label>
          <PasswordInput name="password" value={f.password} onChange={change} required /></div>
        <button type="submit" className="btn full" disabled={busy}>{busy ? "Memeriksa…" : "Masuk"}</button>
        <p className="muted switch"><button type="button" className="link-btn inline right" onClick={onClose}>Batal</button></p>
      </form>
    </div>
  );
}
