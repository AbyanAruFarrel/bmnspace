import "dotenv/config";
import express from "express";
import cors from "cors";
import { query } from "./db.js";
import assetsRouter from "./routes/assets.js";
import requestsRouter from "./routes/requests.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import notificationsRouter from "./routes/notifications.js";
import { expireStale } from "./expire.js";
import adminAssets from "./routes/adminAssets.js";
import settingsRouter from "./routes/settings.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "6mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "BMNSpace API", time: new Date().toISOString() });
});

// Bersihkan pengajuan kedaluwarsa tiap 5 menit (juga dijalankan saat ada permintaan terkait).
setInterval(() => expireStale().catch((e) => console.error("expireStale:", e.message)), 5 * 60 * 1000);
app.use("/api/settings", settingsRouter);
app.use("/api/admin/assets", adminAssets);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/auth", authRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/assets", assetsRouter);
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));