import { useState } from "react";
import { LOCATIONS } from "../../../Data/Dummy";
import CategoryForm from "./CategoryForm";
import { isSizedCategory, kindOf, useCategories } from "../../../Utils/Helpers/CategoryHelpers";
import { roomImages } from "../../../Utils/Helpers/RoomHelpers";
import { fileToJpegDataUrl, isJpg, MAX_PHOTOS } from "../../../Utils/Helpers/ImageHelpers";
import { toastError } from "../../../Utils/Helpers/ToastHelpers";

export default function RoomForm({ room, locations = LOCATIONS, onSubmit, onClose }) {
  const categories = useCategories();
  const [addCat, setAddCat] = useState(false);
  const [f, setF] = useState({
    name: "", building: "", placement: "", location: locations[0], category: categories[0].id,
    capacity: 10, stock: 1, length: "", width: "",
    ...room,
    facilities: (room?.facilities || []).join(", "),
  });
  const [images, setImages] = useState(() => (room ? roomImages(room) : []));
  const kind = kindOf(f.category);
  const item = kind === "barang";
  const sized = isSizedCategory(f.category);
  const change = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const addFiles = async (e) => {
    const files = [...e.target.files];
    e.target.value = ""; // supaya file yang sama bisa dipilih lagi
    const next = [...images];
    for (const file of files) {
      if (next.length >= MAX_PHOTOS) { toastError(`Maksimal ${MAX_PHOTOS} foto per ruangan`); break; }
      if (!isJpg(file)) { toastError(`${file.name}: hanya file JPG/JPEG`); continue; }
      try { next.push(await fileToJpegDataUrl(file)); }
      catch { toastError(`${file.name}: gagal dibaca`); }
    }
    setImages(next);
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      name: f.name.trim(), building: f.building.trim(), placement: (f.placement || "").trim(), location: f.location, category: f.category,
      capacity: item ? undefined : Number(f.capacity), stock: item ? Math.max(1, Number(f.stock) || 1) : undefined,
      length: sized && Number(f.length) > 0 ? Number(f.length) : undefined,
      width: sized && Number(f.width) > 0 ? Number(f.width) : undefined,
      facilities: f.facilities.split(",").map((x) => x.trim()).filter(Boolean),
      managerId: undefined, // field lama (per ruangan) dihapus
      images, image: undefined, // `image` (lama) diganti `images`
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{room?.id ? "Edit Aset" : "Tambah Aset"}</h2>
        <div className="field"><label>Nama Aset (ruangan / barang / mobil)</label>
          <input name="name" value={f.name} onChange={change} required /></div>
        <div className="field"><label>Nama Gedung / Gudang / Garasi</label>
          <input name="building" value={f.building} onChange={change} required /></div>
        <div className="field"><label>Lokasi Barang / Ruangan Berada (lantai, ruang, blok, rak, dll.)</label>
          <input name="placement" placeholder="Contoh: Lantai 2, Ruang Arsip / Mess Blok A No. 3 / Rak B-2" value={f.placement} onChange={change} /></div>
        <div className="two">
          {locations.length > 1 && (
            <div className="field"><label>Lokasi</label>
              <select name="location" value={f.location} onChange={change}>
                {locations.map((l) => <option key={l}>{l}</option>)}</select></div>
          )}
          <div className="field"><label>Kategori</label>
            <select name="category" value={f.category} onChange={change}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
            <button type="button" className="link-btn inline" style={{ alignSelf: "flex-start" }} onClick={() => setAddCat(true)}>+ Kategori baru (mis. Mess)</button></div>
          {item ? (
            <div className="field"><label>Jumlah Stok (unit)</label>
              <input type="number" min="1" name="stock" value={f.stock} onChange={change} required /></div>
          ) : (
            <div className="field"><label>{kind === "mobil" ? "Kapasitas (penumpang)" : "Kapasitas (orang)"}</label>
              <input type="number" min="1" name="capacity" value={f.capacity} onChange={change} required /></div>
          )}
        </div>
        {sized && (
          <div className="two">
            <div className="field"><label>Panjang ruangan (meter)</label>
              <input type="number" min="0" step="0.1" name="length" placeholder="Contoh: 8" value={f.length} onChange={change} /></div>
            <div className="field"><label>Lebar ruangan (meter)</label>
              <input type="number" min="0" step="0.1" name="width" placeholder="Contoh: 6" value={f.width} onChange={change} /></div>
          </div>
        )}
        <div className="field"><label>Fasilitas (pisahkan dengan koma)</label>
          <input name="facilities" placeholder="Proyektor, AC, Wifi High-Speed / Matic, Bensin" value={f.facilities} onChange={change} /></div>

        <div className="field">
          <label>Foto (JPG, maks. {MAX_PHOTOS}) — {images.length} dipilih</label>
          <input type="file" accept=".jpg,.jpeg,image/jpeg" multiple onChange={addFiles} />
          {images.length > 0 && (
            <div className="thumbs">
              {images.map((src, i) => (
                <div className="thumb" key={i}>
                  <img src={src} alt={`Foto ${i + 1}`} />
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="link-btn" onClick={onClose}>Batal</button>
          <button type="submit" className="btn">Simpan</button>
        </div>
      </form>
      {addCat && (
        <CategoryForm
          onClose={() => setAddCat(false)}
          onSaved={(cat) => { setF((p) => ({ ...p, category: cat.id })); setAddCat(false); }}
        />
      )}
    </div>
  );
}
