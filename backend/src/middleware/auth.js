import "dotenv/config";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error("JWT_SECRET di .env wajib diisi (minimal 32 karakter)");
}

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, name: user.name }, SECRET, { algorithm: "HS256", expiresIn: "8h" });

// Pasang di route yang hanya boleh diakses helpdesk/admin.
export const requireAuth = (req, res, next) => {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Perlu login" });
  try {
    req.user = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
    next();
  } catch {
    res.status(401).json({ error: "Sesi tidak valid atau kedaluwarsa, silakan login lagi" });
  }
};

// Untuk membatasi per peran, misalnya requireRole("admin").
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: "Tidak punya akses" });