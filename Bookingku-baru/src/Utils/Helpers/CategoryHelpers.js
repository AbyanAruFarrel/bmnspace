import { useEffect, useState } from "react";
import { CATEGORIES, SIZED } from "../../Data/Dummy";
import { api } from "./api";
import { getSession } from "./AuthHelpers";
import { getSettings, patchSettings } from "./SettingsStore";

// Kategori bawaan ada di Data/Dummy.js. Kategori tambahan (mis. Mess) dibuat Helpdesk lewat
// Kelola Aset dan disimpan di server (terlihat di semua perangkat). `kind` menentukan perilaku aset di kategori itu:
//   ruang  -> kapasitas orang, bisa "perlu dibersihkan", ukuran opsional
//   barang -> stok unit
//   mobil  -> kapasitas penumpang
const EVENT = "categories-updated";

export const KINDS = [
  { id: "ruang", label: "Ruangan / Tempat (mess, kamar, lab, dll.) — kapasitas orang", badgeIcon: "🏠" },
  { id: "barang", label: "Barang / Inventaris — jumlah stok unit", badgeIcon: "📦" },
  { id: "mobil", label: "Kendaraan — kapasitas penumpang", badgeIcon: "🚗" },
];

export const ICON_CHOICES = ["🏠", "🛏️", "🏢", "🏫", "🏕️", "🍽️", "🎤", "🎓", "🔬", "🏋️", "🖨️", "📷", "🚌", "🏍️", "🔧", "📌"];

const readCustom = () => getSettings().categories || [];

export const getCategories = () => [...CATEGORIES, ...readCustom()];

// Kategori sebuah aset; jika kategorinya sudah dihapus, dipakai tampilan cadangan agar halaman tidak error
export const getCategory = (id) =>
  getCategories().find((c) => c.id === id) ||
  { id, name: id || "Lainnya", badge: "LAINNYA", icon: "📌", color: "#64748b", kind: "ruang", missing: true };

export const kindOf = (id) => getCategory(id).kind;
export const isCustomCategory = (id) => readCustom().some((c) => c.id === id);
// Ukuran (panjang × lebar) tampil untuk Ruang Rapat, Aula, dan semua kategori kustom berjenis ruangan
export const isSizedCategory = (id) => SIZED.includes(id) || (isCustomCategory(id) && kindOf(id) === "ruang");

// Dibuat/dihapus di server; server yang memeriksa nama kembar dan kategori yang masih dipakai aset.
export const addCategory = async ({ name, kind, icon, color }) => {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) throw new Error("Nama kategori wajib diisi");
  const cat = await api("/settings/categories", { method: "POST", token: getSession()?.token, body: { name: clean, kind, icon, color } });
  patchSettings({ categories: [...readCustom(), cat] });
  return cat;
};

export const deleteCategory = async (id) => {
  await api(`/settings/categories/${encodeURIComponent(id)}`, { method: "DELETE", token: getSession()?.token });
  patchSettings({ categories: readCustom().filter((c) => c.id !== id) });
};

// Hook: daftar kategori yang otomatis diperbarui saat ada kategori ditambah/dihapus
export function useCategories() {
  const [list, setList] = useState(getCategories);
  useEffect(() => {
    const sync = () => setList(getCategories());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return list;
}
