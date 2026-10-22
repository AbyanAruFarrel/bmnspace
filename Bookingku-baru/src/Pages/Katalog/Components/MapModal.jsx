import { dirUrl, embedUrl, openUrl } from "../../../Utils/Helpers/MapHelpers";

// Peta lokasi (Google Maps). title = nama lokasi, address = alamat / koordinat / link Google Maps
export default function MapModal({ title, address, onClose }) {
  const embed = embedUrl(address);
  const showText = !/^https?:\/\//i.test(address);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: 4 }}>Lokasi {title}</h2>
        {showText && <p className="muted" style={{ marginTop: 0 }}>📍 {address}</p>}
        {embed ? (
          <iframe title={`Peta ${title}`} src={embed} className="map-frame" loading="lazy"
            referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        ) : (
          <p className="muted">Pratinjau peta tidak tersedia untuk link ini. Gunakan tombol di bawah untuk membukanya.</p>
        )}
        <div className="modal-actions">
          <button type="button" className="link-btn" onClick={onClose}>Tutup</button>
          <a className="btn secondary" href={dirUrl(address)} target="_blank" rel="noopener noreferrer">🧭 Petunjuk Arah</a>
          <a className="btn" href={openUrl(address)} target="_blank" rel="noopener noreferrer">Buka di Google Maps</a>
        </div>
      </div>
    </div>
  );
}
