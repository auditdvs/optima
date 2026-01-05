# Alur Request Data

Dokumen ini menjelaskan cara kerja request dan pemrosesan data di OPTIMA.

---

## Ringkasan

OPTIMA mengambil data dari berbagai sumber termasuk database internal dan sistem eksternal. Beberapa data tersedia secara instan, sementara request lainnya memerlukan waktu pemrosesan.

---

## Sumber Data

| Sumber        | Tipe             | Ketersediaan              |
| ------------- | ---------------- | ------------------------- |
| Supabase      | Database utama   | Real-time                 |
| MSSQL (ORBIT) | Sistem perbankan | Sync harian               |
| Branch GL     | Data keuangan    | Sync bulanan (tanggal 16) |

---

## Alur Request

### Data Instan

Sebagian besar data di OPTIMA tersedia langsung:

- Record audit
- Informasi cabang
- Data pengguna
- Notifikasi

Data ini diambil langsung dari database dan di-cache untuk performa.

---

### Data Sync Terjadwal

Beberapa data disinkronkan sesuai jadwal:

1. **Data GL Cabang**

   - Sync tanggal 16 setiap bulan
   - Berisi saldo keuangan
   - Digunakan untuk EWS (Early Warning System)

2. **Direktori Cabang**
   - Sync harian jam 00:00
   - Berisi detail cabang dari core system

---

### Alur Pemrosesan

Untuk data yang memerlukan pemrosesan:

```
Request User
    |
    v
Antrian (jika sibuk)
    |
    v
Pemrosesan
    |
    v
Selesai --> Download Tersedia
    |
    v
Kadaluarsa (setelah masa retensi)
```

---

## Retensi File

File yang diunduh dan ekspor bersifat temporal:

| Tipe File    | Retensi              |
| ------------ | -------------------- |
| Laporan PDF  | Sampai sesi berakhir |
| Ekspor Excel | Sampai sesi berakhir |
| File Backup  | Download manual saja |

File tidak disimpan permanen di server. Selalu download segera setelah generate.

---

## Otomasi

OPTIMA menggunakan otomasi terjadwal untuk:

1. **Sync Data**

   - Update data cabang harian
   - Sync data keuangan bulanan

2. **Notifikasi**

   - Reminder deadline audit
   - Alert kelengkapan dokumen

3. **Pembersihan**
   - Pembersihan sesi kadaluarsa
   - Penghapusan file temporal

---

## Batasan

- Ekspor data besar mungkin memerlukan waktu untuk generate
- Beberapa data eksternal memiliki delay hingga 24 jam
- Download file spesifik per sesi

---

## Troubleshooting

**Data tidak muncul?**

- Cek apakah sync sudah selesai
- Pastikan kamu punya akses ke tipe data tersebut
- Hubungi IT jika masalah berlanjut

**Ekspor gagal?**

- Coba rentang tanggal yang lebih kecil
- Tunggu dan coba lagi
- Cek koneksi jaringan
