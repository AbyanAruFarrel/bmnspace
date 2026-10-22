// Foto profil; jika belum ada, tampil huruf pertama nama.
export default function Avatar({ user, large = false }) {
  return (
    <span className={`avatar ${large ? "avatar-lg" : ""}`}>
      {user?.photo ? <img src={user.photo} alt={user.name || "Foto profil"} /> : user?.name?.[0]?.toUpperCase()}
    </span>
  );
}
