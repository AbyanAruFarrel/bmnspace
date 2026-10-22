// Layanan hanya di Semarang. Aset yang bisa dipinjam: ruangan, barang, dan mobil kantor.
export const LOCATIONS = ["Semarang"];

export const CATEGORIES = [
  { id: "rapat", name: "Ruang Rapat", badge: "RAPAT", icon: "👥", color: "#0f766e", kind: "ruang" },
  { id: "aula", name: "Aula", badge: "AULA", icon: "🏛️", color: "#c9a24a", kind: "ruang" },
  { id: "cowork", name: "Co-Working Space", badge: "CO-WORKING", icon: "💻", color: "#7c3aed", kind: "ruang" },
  { id: "barang", name: "Barang / Inventaris", badge: "BARANG", icon: "📦", color: "#ea580c", kind: "barang" },
  { id: "mobil", name: "Mobil Kantor", badge: "MOBIL", icon: "🚗", color: "#2563eb", kind: "mobil" },
];

// Foto diunggah admin (JPG) lewat Dashboard Admin > Kelola Aset; jika kosong dipakai warna kategori.
// capacity = kapasitas orang / jumlah penumpang; stock = jumlah unit (khusus barang).
export const ROOMS = [
  { id: 6, name: "Rapat Simpang Lima", building: "Gedung Business", location: "Semarang", category: "rapat", capacity: 8, length: 6, width: 4, facilities: ["TV 50\"", "AC"] },
  { id: 9, name: "Aula Kota Lama", building: "Gedung Business", location: "Semarang", category: "aula", capacity: 120, length: 20, width: 12, facilities: ["Panggung", "Sound System"] },
  { id: 12, name: "Co-Work Pandanaran", building: "Gedung Business", location: "Semarang", category: "cowork", capacity: 25, facilities: ["Wifi High-Speed", "Pantry"] },
  { id: 13, name: "Proyektor Portable", building: "Gudang Inventaris", location: "Semarang", category: "barang", stock: 5, facilities: ["HDMI", "Tripod Screen"] },
  { id: 14, name: "Laptop Kantor", building: "Gudang Inventaris", location: "Semarang", category: "barang", stock: 4, facilities: ["Windows 11", "Charger"] },
  { id: 15, name: "Kamera DSLR", building: "Gudang Inventaris", location: "Semarang", category: "barang", stock: 2, facilities: ["Lensa Kit", "Tas Kamera"] },
  { id: 16, name: "Sound System Portable", building: "Gudang Inventaris", location: "Semarang", category: "barang", stock: 2, facilities: ["Speaker Aktif", "2 Mic Wireless"] },
  { id: 17, name: "Toyota Innova Reborn", building: "Garasi Kantor", location: "Semarang", category: "mobil", capacity: 7, facilities: ["AC", "Bensin", "Matic"] },
  { id: 18, name: "Toyota Avanza", building: "Garasi Kantor", location: "Semarang", category: "mobil", capacity: 7, facilities: ["AC", "Bensin", "Manual"] },
  { id: 19, name: "Toyota Hiace", building: "Garasi Kantor", location: "Semarang", category: "mobil", capacity: 15, facilities: ["AC", "Diesel", "Manual"] },
];

// Kategori yang punya detail ukuran ruangan (panjang x lebar, meter)
export const SIZED = ["rapat", "aula"];

export const CAPACITY_FILTERS = [
  { id: "all", label: "Semua Kapasitas", test: () => true },
  { id: "s", label: "≤ 10 Orang", test: (c) => c <= 10 },
  { id: "m", label: "11 – 30 Orang", test: (c) => c > 10 && c <= 30 },
  { id: "l", label: "> 30 Orang", test: (c) => c > 30 },
];

// Instansi pengguna saat register
export const INSTANSI = ["KPTIK", "PNS"];
