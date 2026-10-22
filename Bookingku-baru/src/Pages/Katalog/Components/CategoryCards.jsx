import { useCategories } from "../../../Utils/Helpers/CategoryHelpers";
import { getRooms } from "../../../Utils/Helpers/RoomHelpers";

export default function CategoryCards({ active, onSelect, rooms = getRooms() }) {
  const categories = useCategories();
  return (
    <div className="cat-row">
      {categories.map((c) => (
        <button key={c.id} className={`cat-card ${active === c.id ? "active" : ""}`} onClick={() => onSelect(c.id)}>
          <span className="cat-icon" style={{ background: c.color }}>{c.icon}</span>
          {c.name}
          <small>{rooms.filter((r) => r.category === c.id).length} {c.kind === "ruang" ? "ruangan" : c.kind === "barang" ? "jenis" : "unit"}</small>
        </button>
      ))}
    </div>
  );
}
