// Pengaturan situs yang disimpan di server (lokasi footer, kontak helpdesk, kategori buatan sendiri).
// Diambil sekali saat halaman dibuka lalu disimpan di memori, sehingga helper lain tetap bisa membacanya langsung.
import { api } from "./api";

let state = { footerLocation: null, contact: null, categories: [] };

export const getSettings = () => state;

const announce = () => {
  ["location-updated", "categories-updated", "contact-updated"].forEach((n) => window.dispatchEvent(new Event(n)));
};

export const patchSettings = (patch) => {
  state = { ...state, ...patch };
  announce();
};

export const loadSettings = async () => {
  try {
    const d = await api("/settings");
    state = { ...state, ...d };
    announce();
  } catch { /* server belum terjangkau: pakai nilai bawaan, dicoba lagi saat halaman dibuka ulang */ }
};
