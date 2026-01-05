# Arsitektur Sistem

Dokumen ini menjelaskan arsitektur teknis OPTIMA.
---
## Arsitektur High-Level

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   Web Browser    |---->|   React App      |---->|   Supabase       |
|   (User)         |     |   (Frontend)     |     |   (Backend)      |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                                                  +------------------+
                                                  |                  |
                                                  |   PostgreSQL     |
                                                  |   (Database)     |
                                                  |                  |
                                                  +------------------+
                                                          ^
                                                          |
+------------------+     +------------------+             |
|                  |     |                  |             |
|   MSSQL Server   |---->|   n8n Automation |-------------+
|   (MDISCore)     |     |   (Sync Jobs)    |
|                  |     |                  |
+------------------+     +------------------+
```

---

## Komponen

### Frontend

| Teknologi    | Fungsi          |
| ------------ | --------------- |
| React 18     | Framework UI    |
| TypeScript   | Type safety     |
| Vite         | Build tool      |
| Tailwind CSS | Styling         |
| shadcn/ui    | Komponen UI     |
| Recharts     | Charts          |
| ECharts      | Advanced charts |
| Leaflet      | Maps            |

**Direktori Utama:**

- `/src/pages` - Komponen halaman (routes)
- `/src/components` - Komponen UI reusable
- `/src/contexts` - State management global
- `/src/services` - Integrasi API dan service

---

### Backend (Supabase)

| Service  | Fungsi              |
| -------- | ------------------- |
| Auth     | Autentikasi user    |
| Database | Database PostgreSQL |
| Storage  | Penyimpanan file    |
| Realtime | Subscription live   |

**Tabel Utama:**
## Data Model OPTIMA

Dokumen ini menjelaskan struktur tabel utama dan pendukung yang digunakan dalam sistem OPTIMA berdasarkan fungsi operasionalnya.

---

## 1. Audit & Penugasan

Tabel-tabel yang berkaitan langsung dengan proses audit dan pengelolaannya.

- `audit_master`  
  Tabel inti yang menyimpan data utama audit dan menjadi referensi bagi modul audit lainnya.

- `audit_regular`  
  Menyimpan data audit reguler.

- `audit_fraud`  
  Menyimpan data audit yang berkaitan dengan kasus fraud.

- `audit_counts`  
  Menyimpan agregasi atau perhitungan terkait audit.

- `audit_schedule`  
  Menyimpan jadwal pelaksanaan audit.

- `audits`  
  Menyimpan catatan audit secara umum.

- `auditor_assignments`  
  Mengelola penugasan auditor ke audit tertentu.

- `auditor_aliases`  
  Menyimpan alias atau identitas alternatif auditor.

---

## 2. Auditor & User Management

Tabel yang berkaitan dengan pengguna, auditor, dan hak akses.

- `auditors`  
  Menyimpan profil auditor.

- `profiles`  
  Menyimpan profil pengguna sistem.

- `user_roles`  
  Mengelola peran dan hak akses pengguna.

- `user_status`  
  Menyimpan status akun pengguna.

- `component_access_control`  
  Mengatur hak akses pengguna terhadap komponen sistem.

- `pic`  
  Menyimpan data person in charge.

---

## 3. Cabang & Aktivitas

Tabel referensi cabang dan aktivitas operasionalnya.

- `branches`  
  Direktori cabang.

- `branches_info`  
  Informasi tambahan terkait cabang.

- `branch_activity`  
  Mencatat aktivitas cabang.

---

## 4. Fraud & Investigasi

Tabel yang mendukung pencatatan dan analisis fraud.

- `fraud_cases`  
  Menyimpan data kasus fraud.

- `fraud_payments`  
  Menyimpan transaksi yang terindikasi fraud.

- `fraud_payments_audits`  
  Relasi antara audit dan transaksi fraud.

---

## 5. Work Paper & Dokumentasi Audit

Tabel yang mendukung dokumentasi hasil audit.

- `work_papers`  
  Menyimpan dokumen kerja audit.

- `work_paper_auditors`  
  Relasi work paper dengan auditor.

- `work_paper_persons`  
  Relasi work paper dengan pihak terkait.

- `addendum`  
  Dokumen tambahan audit.

- `documents`  
  Penyimpanan dokumen sistem.

---

## 6. Surat & Administrasi

Tabel yang berkaitan dengan surat dan administrasi.

- `letter`  
  Menyimpan surat resmi.

- `letter_sequence`  
  Mengelola penomoran surat.

- `rpm_letters`  
  Surat terkait RPM.

---

## 7. Request & Tools Pendukung

Tabel pendukung operasional sistem.

- `pull_requests`  
  Menyimpan permintaan penarikan data.

- `grammar_requests`  
  Permintaan pengecekan tata bahasa.

- `tools_errors`  
  Log error dari tools internal.

- `recap`  
  Rekapitulasi data tertentu.

---

## 8. Modul Data & Laporan

Tabel data spesifik modul.

- `dbLoanSaving`  
  Data pinjaman dan simpanan.

- `detail_nasabah_srss`  
  Detail nasabah SRSS.

- `fix_asset`  
  Data aset tetap.

- `kdp`  
  Data KDP.

- `tak`  
  Data TAK.

- `thc`  
  Data THC.

- `tlp`  
  Data TLP.

- `matriks`  
  Matriks penilaian atau kontrol.

---

## 9. Sistem & Notifikasi

Tabel pengaturan dan notifikasi sistem.

- `app_settings`  
  Konfigurasi aplikasi.

- `system_settings`  
  Konfigurasi sistem.

- `notifications`  
  Notifikasi sistem ke pengguna.

- `notification_reads`  
  Status baca notifikasi.

- `email`  
  Log atau pengelolaan email sistem.


---

### Database (PostgreSQL)

Dihosting di Supabase dengan:

- Row Level Security (RLS) policies
- Real-time subscriptions
- Backup otomatis

---

### Otomasi (Python Script automation in docker container)

Menangani tugas terjadwal:

- Sync data dari MSSQL ke Supabase
- Trigger notifikasi
- Generate laporan

**Deploy di:** Docker container

---

### Integrasi Eksternal

| Sistem          | Tipe Integrasi | Jadwal         |
| -------------   | -------------- | -------------- |
| MDISCore (MSSQL)| Sync data      | Harian/Bulanan |
| Email (SMTP)    | Notifikasi     | On-demand      |
| Telegram        | Broadcast      | On-demand      |

---

## Alur Data

### Autentikasi User

```
Browser --> Supabase Auth --> JWT Token --> API Access
```

### Query Data

```
Komponen --> Context --> Supabase Client --> PostgreSQL --> Response
```

### Sync Data

```
Python Script --> MSSQL Query --> Transform --> Supabase Upsert
```

---

## Strategi Caching

Untuk meningkatkan performa:

1. **Dashboard Cache** - Work papers dan statistik di-cache saat pertama load
2. **Map Cache** - Koordinat cabang di-cache untuk rendering peta
3. **Session Storage** - Preferensi user disimpan lokal

---

## Deployment

| Komponen | Platform                    |
| -------- | --------------------------- |
| Frontend | Static hosting (Vite build) |
| Backend  | Supabase Cloud              |
| Otomasi  | Docker di server lokal      |

---

## Keamanan

Lihat [Keamanan dan Sesi](./05-security-and-session.md) untuk detail.
