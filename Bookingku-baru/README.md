# BMNSpace
Logo: `public/logo-mark.png` (ikon putih-emas untuk header/footer yang berlatar biru), `public/logo-mark-color.png` (versi berwarna untuk form cetak), dan favicon `public/favicon.png` / `favicon-32.png`.

Sistem peminjaman **ruangan, barang, dan mobil kantor** di **Semarang**, tanpa login untuk peminjam.

    npm install
    npm run dev

**Versi tanpa login untuk peminjam.** Siapa pun bisa memesan tanpa membuat akun; form pemesanan meminta
**Nama Lengkap, Instansi, No. Handphone, dan Email** (diingat di browser untuk pemesanan berikutnya).
Peminjam memantau/membatalkan pesanan lewat menu **Cek Pesanan** (email + No. Handphone harus cocok dengan yang diisi saat memesan).
Login hanya untuk **Helpdesk (admin)**: `admin@gmail.com` / `admin123`. Register dan lupa password sudah dihapus.
Data permohonan disimpan di localStorage (demo tanpa backend).

## Aset yang bisa dipinjam
- **Ruangan**: Ruang Rapat, Aula, Co-Working Space.
- **Barang / Inventaris**: punya stok (jumlah unit); peminjam memilih jumlah unit, jadwal bentrok jika stok tidak cukup.
- **Mobil Kantor**: dipinjam per jam atau berhari-hari, isi tujuan perjalanan.

Foto profil Helpdesk bisa diganti di halaman Profil. Nama kota hanya tampil di footer.

## Alur peminjaman (menunggu persetujuan)
1. Peminjam (tanpa login) mengajukan → status **Menunggu Persetujuan** (jadwal langsung terkunci agar tidak dobel).
2. **Helpdesk Semarang** menyetujui atau menolak (alasan wajib saat menolak) dari *Dashboard Admin*. Peminjam melihat hasilnya di menu Cek Pesanan; Helpdesk melihat kontak pemesan (HP & email) di dashboard.
3. Peminjam masih bisa **Batalkan** selama belum diputuskan. Permohonan yang tidak diputuskan sampai waktu mulai lewat otomatis **Dibatalkan**.
4. Setelah **Disetujui**: tombol *Cetak Form* (form peminjaman) muncul **hanya untuk Helpdesk (admin)**; tombol *Selesai Memakai* / *Sudah Dikembalikan* (barang) dan *Perlu Dibersihkan* (hanya ruangan), tersedia di Cek Pesanan.
5. Meminjam di waktu yang sudah lewat tidak diizinkan.

## Fitur Helpdesk (admin)
- **Dashboard Helpdesk**: daftar permohonan, tab *Menunggu Persetujuan* dengan tombol Setujui / Tolak.
- **Kalender**: pengecekan semua peminjaman per tanggal, bisa difilter per kategori atau per aset; klik tanggal untuk melihat detail.
- **Lokasi Google Maps** ada di footer; admin bisa mengganti lokasinya lewat tombol "Ubah Lokasi".
- **Kelola Aset**: tambah/edit/hapus ruangan, barang, dan mobil.

## Catatan migrasi
Fitur pembayaran dan monitoring pembayaran sudah dihapus seluruhnya.
Saat pertama dibuka, data lama di browser otomatis dibersihkan: aset di luar Semarang dan Ruang Mess dihapus,
permohonan aktif pada aset itu dibatalkan, dan pesanan "Menunggu Pembayaran" dijadikan "Menunggu Persetujuan".
