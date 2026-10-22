import { useState } from "react";
import { getCategory } from "../../../Utils/Helpers/CategoryHelpers";
import { usedSinceClean } from "../../../Utils/Helpers/CleaningHelpers";
import { getSession } from "../../../Utils/Helpers/AuthHelpers";
import { fmtDateTime, isCar, isItem, needsCleanFlow, roomImages, sizeText, stockOf } from "../../../Utils/Helpers/RoomHelpers";

export default function RoomCard({ room, onBook }) {
  const cat = getCategory(room.category);
  const imgs = roomImages(room);
  const [i, setI] = useState(0);
  const idx = Math.min(i, Math.max(imgs.length - 1, 0));
  const bg = imgs.length ? `url(${imgs[idx]}) center/cover` : `linear-gradient(135deg, ${cat.color}, #071a4a)`;
  const viewer = getSession();
  // status kebersihan hanya untuk admin (Helpdesk)
  const canSeeClean = needsCleanFlow(room) && !!viewer && viewer.role === "admin";
  // klik bagian kosong kartu (foto, judul, spasi) -> tampilan pemesanan terbuka
  const openFromEmpty = (e) => {
    if (e.target.closest("button, a, input, select, textarea, [role='button']")) return; // kontrol punya aksi sendiri
    if (window.getSelection()?.toString()) return;                                        // sedang menyeleksi teks
    onBook(room);
  };
  const step = (d) => setI((idx + d + imgs.length) % imgs.length);

  return (
    <div className="room-card" onClick={openFromEmpty}>
      <div className="room-img" style={{ background: bg }}>
        <span className="badge cat">{cat.badge}</span>
        {!imgs.length && <span className="room-emoji">{cat.icon}</span>}
        {imgs.length > 1 && (
          <>
            <button className="car-btn left" onClick={() => step(-1)} aria-label="Foto sebelumnya">‹</button>
            <button className="car-btn right" onClick={() => step(1)} aria-label="Foto berikutnya">›</button>
            <span className="car-count">{idx + 1}/{imgs.length}</span>
          </>
        )}
      </div>
      <div className="room-body">
        <h3>{room.name}</h3>
        <p className="muted">{room.building}</p>
        {room.placement && <p className="cap" style={{ marginTop: 0 }}>📍 Lokasi: <strong>{room.placement}</strong></p>}
        <p className="cap">
          {isItem(room) ? <>📦 Stok: <strong>{stockOf(room)} unit</strong></>
            : isCar(room) ? <>🚗 Kapasitas: <strong>{room.capacity} Penumpang</strong></>
            : <>👥 Kapasitas: <strong>{room.capacity} Orang</strong></>}
        </p>
        {sizeText(room) && <p className="cap" style={{ marginTop: 0 }}>📐 Ukuran: <strong>{sizeText(room)}</strong></p>}
        {canSeeClean && ((room.needsCleaning || usedSinceClean(room))
          ? <p className="clean warn">🧹 Perlu dibersihkan{room.needsCleaning && room.cleanNote ? ` — “${room.cleanNote}”` : ""}</p>
          : room.cleanedAt && <p className="clean">✨ Sudah dibersihkan: {fmtDateTime(room.cleanedAt)}</p>)}
        <div className="tags">{room.facilities.map((x) => <span key={x}>{x}</span>)}</div>
      </div>
    </div>
  );
}
