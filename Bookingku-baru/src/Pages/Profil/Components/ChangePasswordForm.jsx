import { useState } from "react";
import Card from "../../../Components/Card";
import Button from "../../../Components/Button";
import PasswordInput from "../../../Components/PasswordInput";
import { getSession } from "../../../Utils/Helpers/AuthHelpers";
import { toastError, toastSuccess } from "../../../Utils/Helpers/ToastHelpers";
import { api } from "../../../Utils/Helpers/api";

// Ubah password helpdesk (diperiksa dan disimpan di server)
export default function ChangePasswordForm() {
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const change = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (f.next.length < 8) return toastError("Password baru minimal 8 karakter");
    if (f.next !== f.confirm) return toastError("Konfirmasi password tidak sama");
    setBusy(true);
    try {
      await api("/auth/change-password", { method: "POST", token: getSession()?.token, body: { current: f.current, next: f.next } });
      toastSuccess("Password berhasil diubah");
      setF({ current: "", next: "", confirm: "" });
    } catch (err) {
      toastError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <form onSubmit={submit} style={{ maxWidth: 420 }}>
        <div className="field"><label>Password Saat Ini</label>
          <PasswordInput name="current" value={f.current} onChange={change} required /></div>
        <div className="field"><label>Password Baru (minimal 8 karakter)</label>
          <PasswordInput name="next" value={f.next} onChange={change} required /></div>
        <div className="field"><label>Konfirmasi Password Baru</label>
          <PasswordInput name="confirm" value={f.confirm} onChange={change} required /></div>
        <Button type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Ubah Password"}</Button>
      </form>
    </Card>
  );
}
