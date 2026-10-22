import { api } from "./api";
import { getSession } from "./AuthHelpers";
import { getSettings, patchSettings } from "./SettingsStore";

// Nomor 08xx -> 628xx untuk tautan WhatsApp
export const waUrl = (phone) => {
  let d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  return `https://wa.me/${d}`;
};

// Kontak Helpdesk di footer (diisi Helpdesk lewat tombol "Ubah Kontak", tersimpan di server)
export const footerContacts = () => {
  const c = getSettings().contact;
  return [{ label: "Helpdesk", exists: !!c, name: c?.name || "", phone: c?.phone || "" }];
};

export const getContact = () => ({ name: "", phone: "", ...(getSettings().contact || {}) });

export const setContact = async ({ name, phone }) => {
  const body = { name: (name || "").trim(), phone: (phone || "").trim() };
  await api("/settings/contact", { method: "PUT", token: getSession()?.token, body });
  patchSettings({ contact: body });
};
