# Changelog

Semua perubahan penting pada OPTIMA didokumentasikan di sini.

---

## [2.0.0] - 2024-12-25

### Ditambahkan

- Background animasi di halaman login
- Deteksi aktivitas untuk input form (mencegah deteksi AFK palsu)
- Restrukturisasi dokumentasi lengkap
- Dokumentasi FAQ

### Diubah

- Peringatan sesi ditingkatkan dari 1 menit menjadi 5 menit sebelum timeout
- Throttle aktivitas dikurangi dari 5 detik menjadi 1 detik
- Pesan inaktivitas diperbarui agar lebih profesional

### Diperbaiki

- Halaman reset password sekarang memvalidasi token dengan benar
- Logout sekarang membersihkan semua data sesi dari localStorage
- Route yang dilindungi sekarang redirect ke halaman Unauthorized dengan benar

### Keamanan

- Ditambahkan validasi token untuk alur reset password
- State sesi tidak lagi persist dari localStorage saat initial load

---

## [1.9.0] - 2024-12-22

### Ditambahkan

- Kartu Admin Issues di statistik dashboard
- Perbaikan tampilan missing documents

### Diubah

- Logika loading jadwal audit dioptimalkan

---

## [1.8.0] - 2024-12-19

### Ditambahkan

- Lokalisasi halaman EWS ke Bahasa Indonesia
- Animasi cloud loader untuk halaman berat
- Otomasi sync data GL Branch

### Diubah

- Format currency diperbarui ke style Indonesia (Jt, M)
- Delay navigasi dikurangi dengan progressive rendering

---

## [1.7.0] - 2024-12-15

### Ditambahkan

- Fitur zoom gambar di detail proyek
- Konfigurasi deployment Docker

---

## [1.6.0] - 2024-12-11

### Ditambahkan

- Backup otomatis Supabase ke MEGA
- Ekspor CSV/JSON untuk semua tabel

---

## [1.5.0] - 2024-12-04

### Diubah

- Margin layout print diperhalus untuk surat penugasan
- Posisi header dan footer diperbaiki untuk kertas A4

---

## [1.0.0] - 2024-11-01

### Ditambahkan

- Rilis awal
- Dashboard dengan statistik audit
- QA section untuk manajemen work paper
- Direktori cabang dengan peta
- Generate surat penugasan
- Panel manajemen user
- Kontrol akses berbasis role

---

## Format Versi

Versi mengikuti [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH**
- MAJOR: Breaking changes
- MINOR: Fitur baru
- PATCH: Bug fixes
