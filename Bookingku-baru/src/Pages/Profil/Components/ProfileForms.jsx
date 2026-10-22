import { INSTANSI } from "../../../Data/Dummy";
import { useState } from "react";
import PasswordInput from "../../../Components/PasswordInput";
import Card from "../../../Components/Card";
import Button from "../../../Components/Button";
import { changePassword, titleFromGender, updateProfile } from "../../../Utils/Helpers/AuthHelpers";
import { localIso } from "../../../Utils/Helpers/BookingHelpers";
import { toastError, toastSuccess } from "../../../Utils/Helpers/ToastHelpers";

const GENDERS = ["Laki-laki", "Perempuan"];
const useForm = (initial) => {
  const [f, setF] = useState(initial);
  return [f, (e) => setF({ ...f, [e.target.name]: e.target.value }), setF];
};

// Data diri: instansi, nama lengkap, tanggal lahir, jenis kelamin (sapaan Mr/Mrs otomatis mengikuti)
export function PersonalForm({ profile, onSaved }) {
  const [f, change] = useForm({
    instansi: profile.instansi || "", name: profile.name || "", birthDate: profile.birthDate || "",
    gender: GENDERS.includes(profile.gender) ? profile.gender : "",
  });
  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toastError("Nama lengkap wajib diisi");
    // ganti jenis kelamin -> sapaan ikut berganti (Mr / Mrs)
    const r = updateProfile(profile.id, { title: titleFromGender(f.gender) || profile.title || "", instansi: f.instansi, name: f.name.trim(), birthDate: f.birthDate, gender: f.gender });
    if (!r.ok) return toastError(r.message);
    toastSuccess("Data diri disimpan");
    onSaved();
  };
  return (
    <Card>
      <form onSubmit={submit}>
        <div className="two">
          <div className="field"><label>Sapaan (otomatis)</label>
            <input value={titleFromGender(f.gender) || profile.title || "—"} readOnly /></div>
          <div className="field"><label>Instansi</label>
            <select name="instansi" value={f.instansi} onChange={change}>
              <option value="">— Pilih —</option>
              {INSTANSI.map((i) => <option key={i}>{i}</option>)}
            </select></div>
          <div className="field"><label>Nama Lengkap</label>
            <input name="name" value={f.name} onChange={change} required /></div>
          <div className="field"><label>Tanggal Lahir</label>
            <input type="date" name="birthDate" max={localIso(new Date())} value={f.birthDate} onChange={change} /></div>
          <div className="field"><label>Jenis Kelamin</label>
            <select name="gender" value={f.gender} onChange={change}>
              <option value="">— Pilih —</option>
              {GENDERS.map((g) => <option key={g}>{g}</option>)}
            </select></div>
        </div>
        <Button type="submit">Simpan Data Diri</Button>
      </form>
    </Card>
  );
}

// Kontak: email, telepon/WhatsApp, dari instansi mana (kantor asal)
export function ContactForm({ profile, onSaved }) {
  const [f, change] = useForm({ email: profile.email || "", phone: profile.phone || "", kantor: profile.kantor || "" });
  const submit = (e) => {
    e.preventDefault();
    const digits = f.phone.replace(/\D/g, "");
    if (f.phone && (digits.length < 8 || digits.length > 15)) return toastError("Nomor telepon harus 8–15 digit");
    const r = updateProfile(profile.id, { email: f.email.trim(), phone: f.phone.trim(), kantor: f.kantor.trim() });
    if (!r.ok) return toastError(r.message);
    toastSuccess("Informasi kontak disimpan");
    onSaved();
  };
  return (
    <Card>
      <form onSubmit={submit}>
        <div className="two">
          <div className="field"><label>Alamat Email</label>
            <input type="email" name="email" value={f.email} onChange={change} required disabled={profile.role === "admin"} /></div>
          <div className="field"><label>Nomor Telepon / WhatsApp</label>
            <input type="tel" name="phone" placeholder="+62 812 3456 7890" value={f.phone} onChange={change} /></div>
        </div>
        {profile.role !== "admin" && (
          <>
            <div className="field"><label>Dari Instansi Mana</label>
              <input name="kantor" placeholder="Contoh: Dinas Kominfo Provinsi Jawa Tengah" value={f.kantor} onChange={change} /></div>
            {profile.instansi === "PNS" && <p className="muted" style={{ marginTop: 0 }}>Pengguna PNS wajib mengisi dari instansi mana sebelum mengajukan peminjaman.</p>}
          </>
        )}
        <p className="muted" style={{ marginTop: 0 }}>Email dipakai untuk login. Jika diganti, gunakan email baru saat login berikutnya.</p>
        <Button type="submit">Simpan Kontak</Button>
      </form>
    </Card>
  );
}

// Ubah password
export function PasswordForm({ profile }) {
  const [f, change, setF] = useForm({ current: "", next: "", confirm: "" });
  const submit = (e) => {
    e.preventDefault();
    if (f.next.length < 6) return toastError("Password baru minimal 6 karakter");
    if (f.next !== f.confirm) return toastError("Konfirmasi password tidak sama");
    const r = changePassword(profile.id, f.current, f.next);
    if (!r.ok) return toastError(r.message);
    toastSuccess("Password berhasil diubah");
    setF({ current: "", next: "", confirm: "" });
  };
  return (
    <Card>
      <form onSubmit={submit} style={{ maxWidth: 420 }}>
        <div className="field"><label>Password Saat Ini</label>
          <PasswordInput name="current" value={f.current} onChange={change} required /></div>
        <div className="field"><label>Password Baru</label>
          <PasswordInput name="next" value={f.next} onChange={change} required /></div>
        <div className="field"><label>Konfirmasi Password Baru</label>
          <PasswordInput name="confirm" value={f.confirm} onChange={change} required /></div>
        <Button type="submit">Ubah Password</Button>
      </form>
    </Card>
  );
}
