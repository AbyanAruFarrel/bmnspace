import app from "./app.js";
import { expireStale } from "./expire.js";

// Dipakai untuk menjalankan server di komputer sendiri (npm start / npm run dev).
const PORT = process.env.PORT || 4000;

// Bersihkan pengajuan kedaluwarsa tiap 5 menit (di Vercel hal ini juga dijalankan setiap ada permintaan terkait).
setInterval(() => expireStale().catch((e) => console.error("expireStale:", e.message)), 5 * 60 * 1000);

app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
