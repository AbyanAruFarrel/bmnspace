// Lokasi Google Maps tanpa API key: peta ditampilkan lewat iframe "output=embed".
// Input admin (Helpdesk) bisa berupa alamat, koordinat ("-7.79,110.36"), atau link Google Maps.
const isUrl = (s) => /^https?:\/\//i.test(s);

// Ambil kata kunci pencarian dari input; null jika link tidak bisa dibaca (mis. link pendek maps.app.goo.gl)
export const mapQuery = (input) => {
  const s = (input || "").trim();
  if (!s) return null;
  const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return `${at[1]},${at[2]}`;
  const q = s.match(/[?&]q=([^&]+)/);
  if (q) return decodeURIComponent(q[1].replace(/\+/g, " "));
  const place = s.match(/\/maps\/place\/([^/@?]+)/);
  if (place) return decodeURIComponent(place[1].replace(/\+/g, " "));
  return isUrl(s) ? null : s;
};

export const embedUrl = (addr) => {
  const q = mapQuery(addr);
  return q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed` : null;
};
export const openUrl = (addr) =>
  isUrl(addr.trim()) ? addr.trim() : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr.trim())}`;
export const dirUrl = (addr) => {
  const q = mapQuery(addr);
  return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : openUrl(addr);
};
