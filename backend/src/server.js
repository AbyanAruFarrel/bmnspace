import app from "./app.js";
import { expireStale } from "./expire.js";
import { purgeOld } from "./purge.js";

// Dipakai untuk menjalankan server di komputer sendiri (npm start / npm run dev).
const PORT = process.env.PORT || 4000;

// Bersihkan pengajuan kedaluwarsa tiap 5 menit (di Vercel hal ini juga dijalankan setiap ada permintaan terkait).
setInterval(() => expireStale().catch((e) => console.error("expireStale:", e.message)), 5 * 60 * 1000);

// Hapus riwayat yang lebih dari 1 tahun: sekali saat start lalu tiap 24 jam (di Vercel dijalankan oleh Vercel Cron).
const purge = () => purgeOld().then((d) => { if (d.requests || d.notifications) console.log("Riwayat lama dihapus:", d); }).catch((e) => console.error("purgeOld:", e.message));
purge();
setInterval(purge, 24 * 60 * 60 * 1000);

app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
