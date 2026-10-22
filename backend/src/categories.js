import { pool } from "./db.js";

// Kategori bawaan (sama dengan Data/Dummy.js di frontend). kind: ruang | barang | mobil
export const BUILTIN = [
  { id: "rapat", name: "Ruang Rapat", kind: "ruang" },
  { id: "aula", name: "Aula", kind: "ruang" },
  { id: "cowork", name: "Co-Working Space", kind: "ruang" },
  { id: "barang", name: "Barang / Inventaris", kind: "barang" },
  { id: "mobil", name: "Mobil Kantor", kind: "mobil" },
];
export const SIZED_BUILTIN = ["rapat", "aula"];

// db boleh pool atau client transaksi
export const getCustom = async (db = pool) => {
  const r = await db.query("SELECT value FROM settings WHERE key = 'categories'");
  return Array.isArray(r.rows[0]?.value) ? r.rows[0].value : [];
};

// Mengembalikan "ruang" | "barang" | "mobil", atau null jika kategori tidak dikenal
export const kindOf = async (id, db = pool) => {
  const b = BUILTIN.find((c) => c.id === id);
  if (b) return b.kind;
  return (await getCustom(db)).find((c) => c.id === id)?.kind ?? null;
};

// Ukuran (panjang x lebar) berlaku untuk Rapat, Aula, dan kategori kustom berjenis ruang
export const isSized = async (id, db = pool) =>
  SIZED_BUILTIN.includes(id) || (!BUILTIN.some((c) => c.id === id) && (await kindOf(id, db)) === "ruang");
