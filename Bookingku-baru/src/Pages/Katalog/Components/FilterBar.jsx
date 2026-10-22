import { CAPACITY_FILTERS } from "../../../Data/Dummy";
import { useCategories } from "../../../Utils/Helpers/CategoryHelpers";

// Layanan hanya di Semarang, jadi tidak ada filter lokasi.
export default function FilterBar({ f, setF }) {
  const categories = useCategories();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="filterbar">
      <input placeholder="Cari ruangan, barang, atau mobil..." value={f.q} onChange={set("q")} />
      <select value={f.cat} onChange={set("cat")}>
        <option value="">Semua Kategori</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={f.cap} onChange={set("cap")}>
        {CAPACITY_FILTERS.map((c) => <option key={c.id} value={c.id}>👥 {c.label}</option>)}
      </select>
    </div>
  );
}
