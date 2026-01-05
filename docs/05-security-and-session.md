# Keamanan dan Sesi

Dokumen ini menjelaskan langkah-langkah keamanan dan manajemen sesi di OPTIMA.

---

## Autentikasi

OPTIMA menggunakan Supabase Authentication dengan login email/password.

- Password di-hash dan tidak pernah disimpan dalam plain text
- Reset password dilakukan melalui link email dengan token yang memiliki batas waktu
- Percobaan login gagal dicatat

---

## Kontrol Akses Berbasis Role

Akses ke fitur dikontrol berdasarkan role pengguna:

| Role         | Level Akses                        |
| ------------ | ---------------------------------- |
| `superadmin` | Akses sistem penuh, manajemen user |
| `manager`    | Monitoring tim, review QA          |
| `qa`         | Fungsi quality assurance           |
| `dvs`        | Fungsi staff dev and support       |
| `user`       | Fungsi auditor standar             |
| `risk`       | Laporan risk management            |

Setiap halaman dan fitur memeriksa role user sebelum memberikan akses.

---

## Manajemen Sesi

### Durasi Sesi

Sesi tetap aktif selama pengguna berinteraksi dengan sistem.

### Timeout Tidak Aktif

**Logout otomatis terjadi setelah 60 menit tidak aktif.**

Ini diimplementasikan karena dua alasan:

1. **Keamanan** - Mencegah akses tidak sah dari komputer yang ditinggalkan
2. **Performa Server** - Mengurangi penggunaan resource dari koneksi idle

### Peringatan Sebelum Logout

Pengguna menerima notifikasi peringatan **5 menit sebelum** logout otomatis, memungkinkan untuk melanjutkan sesi dengan berinteraksi dengan halaman.

### Aktivitas yang Dihitung

Aksi berikut mereset timer tidak aktif:

- Gerakan mouse
- Klik
- Mengetik
- Scroll
- Input form
- Perubahan tab
- Aksi copy/paste

---

## Validasi Sesi

Pada setiap load halaman:

1. Sistem memeriksa token sesi yang valid
2. Jika tidak ada sesi valid, user diarahkan ke halaman Unauthorized
3. Sesi di-refresh secara berkala untuk mencegah kadaluarsa saat penggunaan aktif

---

## Reset Password

Proses reset password:

1. User memasukkan email di halaman login
2. Sistem mengirim email dengan link reset
3. Link berisi token dengan batas waktu
4. User mengatur password baru
5. Token dibatalkan setelah digunakan

Jika link reset kadaluarsa atau tidak valid, user akan melihat halaman error dengan instruksi untuk meminta link baru.

---

## Pembatasan Akses Data

- User hanya dapat mengakses data yang relevan dengan role mereka
- Beberapa fitur disembunyikan sepenuhnya untuk role yang tidak berwenang
- API call divalidasi terhadap permission user

---

## Logging

Sistem mencatat:

- Percobaan login (sukses dan gagal)
- Modifikasi data (siapa mengubah apa)
- Aksi kritis (penghapusan user, perubahan role)

---

## Praktik Terbaik untuk User

1. **Logout saat selesai** - Terutama di komputer bersama
2. **Jangan berbagi kredensial** - Setiap user harus punya akun sendiri
3. **Laporkan aktivitas mencurigakan** - Hubungi IT segera
4. **Perbarui browser** - Patch keamanan itu penting

---

## Respons Insiden

Jika dicurigai ada masalah keamanan:

1. User harus logout segera
2. Hubungi IT melalui channel internal
3. IT akan menyelidiki dan mengambil tindakan
4. Akun yang terpengaruh mungkin ditangguhkan sementara
