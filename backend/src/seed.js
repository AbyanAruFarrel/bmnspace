import { pool } from "./db.js";

const ASSETS = [
  { name: "Rapat Simpang Lima", building: "Gedung Business", category: "rapat", capacity: 8, facilities: ['TV 50"', "AC"] },
  { name: "Aula Kota Lama", building: "Gedung Business", category: "aula", capacity: 120, facilities: ["Panggung", "Sound System"] },
  { name: "Co-Work Pandanaran", building: "Gedung Business", category: "cowork", capacity: 25, facilities: ["Wifi High-Speed", "Pantry"] },
  { name: "Proyektor Portable", building: "Gudang Inventaris", category: "barang", stock: 5, facilities: ["HDMI", "Tripod Screen"] },
  { name: "Laptop Kantor", building: "Gudang Inventaris", category: "barang", stock: 4, facilities: ["Windows 11", "Charger"] },
  { name: "Kamera DSLR", building: "Gudang Inventaris", category: "barang", stock: 2, facilities: ["Lensa Kit", "Tas Kamera"] },
  { name: "Sound System Portable", building: "Gudang Inventaris", category: "barang", stock: 2, facilities: ["Speaker Aktif", "2 Mic Wireless"] },
  { name: "Toyota Innova Reborn", building: "Garasi Kantor", category: "mobil", capacity: 7, facilities: ["AC", "Bensin", "Matic"] },
  { name: "Toyota Avanza", building: "Garasi Kantor", category: "mobil", capacity: 7, facilities: ["AC", "Bensin", "Manual"] },
  { name: "Toyota Hiace", building: "Garasi Kantor", category: "mobil", capacity: 15, facilities: ["AC", "Diesel", "Manual"] },
];

try {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM assets");
  if (rows[0].n > 0) {
    console.log(`Tabel assets sudah berisi ${rows[0].n} data. Seed dilewati.`);
  } else {
    for (const a of ASSETS) {
      await pool.query(
        `INSERT INTO assets (name, building, location, category, capacity, stock, facilities)
         VALUES ($1, $2, 'Semarang', $3, $4, $5, $6)`,
        [a.name, a.building, a.category, a.capacity ?? null, a.stock ?? null, a.facilities]
      );
    }
    console.log(`Berhasil menambah ${ASSETS.length} aset.`);
  }
} catch (err) {
  console.error("Seed gagal:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}