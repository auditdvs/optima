# Error dan Logging

Dokumen ini menjelaskan penanganan error dan logging di OPTIMA.

---

## Error Umum

### Error Autentikasi

| Error               | Penyebab                  | Solusi                          |
| ------------------- | ------------------------- | ------------------------------- |
| "Failed to sign in" | Email atau password salah | Cek kredensial dan coba lagi    |
| "Session expired"   | Timeout tidak aktif       | Refresh halaman lalu Login lagi |
| "Access Restricted" | Tidak login               | Login untuk mengakses halaman   |

---

### Error Data

| Error                 | Penyebab                     | Solusi                          |
| --------------------- | ---------------------------- | ------------------------------- |
| "Failed to load data" | Masalah jaringan atau server | Refresh halaman                 |
| "No data found"       | Hasil kosong                 | Cek filter atau rentang tanggal |
| "Failed to save"      | Error validasi atau server   | Cek field yang wajib diisi      |

---

### Error File

| Error             | Penyebab                             | Solusi                              |
| ----------------- | ------------------------------------ | ----------------------------------- |
| "Download failed" | Error saat generate file             | Coba lagi atau kurangi rentang data |
| "Upload failed"   | File terlalu besar atau format salah | Cek ukuran dan tipe file            |

---

## Tampilan Error

Error ditampilkan ke user melalui notifikasi toast:

- **Toast merah** - Error yang perlu perhatian
- **Toast kuning** - Peringatan atau pemberitahuan penting
- **Toast hijau** - Konfirmasi sukses

---

## Apa yang Dilakukan Sistem

Ketika error terjadi:

1. **Menangkap error** - Mencegah app crash
2. **Mencatat error** - Merekam detail untuk debugging
3. **Menampilkan pesan yang ramah** - Tanpa jargon teknis
4. **Menyediakan opsi recovery** - Refresh, retry, atau hubungi IT

---

## Logging

### Yang Dicatat

| Event          | Informasi yang Dicatat                      |
| -------------- | ------------------------------------------- |
| Login          | Email user, timestamp, sukses/gagal         |
| Perubahan data | User, record ID, nilai lama/baru, timestamp |
| Error          | Tipe error, stack trace, konteks user       |
| Aksi kritis    | User, tipe aksi, record yang terpengaruh    |

### Penyimpanan Log

- Log disimpan di Supabase
- Periode retensi: 90 hari
- Akses: Hanya administrator IT

---

## Melaporkan Masalah

Jika menemukan error yang persisten:

1. Catat pesan error dan apa yang sedang kamu lakukan
2. Ambil screenshot jika memungkinkan
3. Gunakan tombol "Report Error" di Tools
4. Atau hubungi IT langsung dengan detailnya

### Informasi yang Perlu Disertakan

- Nama dan email kamu
- Halaman mana yang sedang dibuka
- Aksi apa yang sedang dicoba
- Pesan error yang muncul
- Waktu kejadian

---

## Status Sistem

Jika banyak user melaporkan masalah:

- Cek apakah ada outage yang diketahui
- IT akan mengirim notifikasi broadcast untuk masalah sistem
- Waktu resolusi yang diharapkan akan dikomunikasikan

---

## Troubleshooting Mandiri

Sebelum menghubungi IT, coba langkah-langkah ini:

1. **Refresh halaman** - Membersihkan masalah sementara
2. **Clear cache browser** - Menghapus data cached lama
3. **Logout dan login lagi** - Mereset sesi
4. **Coba browser lain** - Mengesampingkan masalah browser
5. **Cek koneksi internet** - Pastikan jaringan stabil
