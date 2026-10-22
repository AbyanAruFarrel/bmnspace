import "dotenv/config";
import express from "express";
import cors from "cors";
import assetsRouter from "./routes/assets.js";
import requestsRouter from "./routes/requests.js";
import authRouter from "./routes/auth.js";
import adminAssetsRouter from "./routes/adminAssets.js";
import adminRouter from "./routes/admin.js";
import notificationsRouter from "./routes/notifications.js";
import settingsRouter from "./routes/settings.js";

// Aplikasi Express saja (tanpa app.listen) supaya bisa dipakai lokal (server.js) maupun di Vercel (api/index.js).
const app = express();

// Di belakang proxy hosting, ambil IP asli pengunjung (dipakai pembatas permintaan).
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY));

// Izinkan frontend memanggil API ini. Isi FRONTEND_URL dengan alamat web Anda (tanpa garis miring di akhir).
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
// Batas isi permintaan; Vercel sendiri membatasi sekitar 4,5 MB.
app.use(express.json({ limit: "4mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "BMNSpace API", time: new Date().toISOString() });
});

app.use("/api/assets", assetsRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin/assets", adminAssetsRouter); // harus sebelum /api/admin
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/settings", settingsRouter);

export default app;
