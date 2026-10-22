// Lokasi Google Maps yang tampil di footer. Disimpan di server; hanya Helpdesk yang bisa mengubahnya.
import { api } from "./api";
import { getSession } from "./AuthHelpers";
import { getSettings, patchSettings } from "./SettingsStore";

const DEFAULT = { name: "Kantor BMNSpace", address: "Gedung Business Semarang, Semarang" };

export const getFooterLocation = () => ({ name: DEFAULT.name, address: getSettings().footerLocation?.address || DEFAULT.address });

export const setFooterLocation = async (loc) => {
  const address = (loc.address || "").trim() || DEFAULT.address;
  await api("/settings/footer-location", { method: "PUT", token: getSession()?.token, body: { address } });
  patchSettings({ footerLocation: { address } });
};
