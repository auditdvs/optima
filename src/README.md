# OPTIMA Source Code

Folder ini berisi source code untuk aplikasi **OPTIMA** — sistem manajemen audit internal berbasis web.

## Dokumentasi

Untuk dokumentasi user dan sistem, lihat folder `/docs` di root.

---

## Struktur Folder

```
src/
├── App.tsx               # Komponen utama, routing, dan provider wrapper
├── main.tsx              # Entry point React
├── index.css             # Style global dan Tailwind imports
├── vite-env.d.ts         # Type declarations untuk Vite
│
├── assets/               # Asset statis (gambar, logo, dsb.)
│
├── components/           # Komponen React yang dapat digunakan ulang
│   ├── BellIcon.tsx              # Ikon notifikasi animasi
│   ├── ChatWidget.tsx            # Widget chat floating
│   ├── MenuIcon.tsx              # Ikon menu hamburger animasi
│   ├── SearchIcon.tsx            # Ikon pencarian animasi
│   ├── SettingsIcon.tsx          # Ikon pengaturan animasi
│   ├── SparklesIcon.tsx          # Ikon sparkle animasi
│   ├── THCTable.tsx              # Tabel THC (Tingkat Hutang Cabang) dengan filter per kolom
│   │
│   ├── account-settings/         # Komponen pengaturan akun
│   │   ├── AccountSettings.tsx         # Form update profil & password
│   │   ├── AuditRatingCalculator.tsx   # Kalkulator rating audit
│   │   └── ThemeSelector.tsx           # Pemilih tema tampilan
│   │
│   ├── add-user/                 # Komponen panel admin
│   │   ├── AuditorManagement.tsx       # Manajemen data auditor
│   │   ├── DatabaseMonitoring.tsx      # Monitoring database & backup
│   │   ├── PendingApprovals.tsx        # Antrean reprocess approval surat tugas & addendum
│   │   └── UserManagement.tsx          # Manajemen user & role
│   │
│   ├── animation/                # Komponen animasi
│   │   ├── CloudLoader.tsx             # Loading animasi cloud
│   │   ├── TextTyping.tsx              # Animasi mengetik teks
│   │   └── WaveBackground.tsx          # Background animasi gelombang
│   │
│   ├── assignment/               # Komponen pengajuan surat tugas
│   │   └── RPMRegistration.tsx         # Form registrasi & tabel surat tugas RPM
│   │
│   ├── common/                   # Komponen utilitas umum
│   │   ├── AuditFraudTable.tsx         # Tabel audit fraud
│   │   ├── AuditScheduleViewer.tsx     # Viewer jadwal audit
│   │   ├── AuditTable.tsx              # Tabel audit utama (EWS, anomali)
│   │   ├── CountUp.tsx                 # Animasi angka count-up
│   │   ├── CurrencyCountUp.tsx         # Animasi angka count-up format mata uang
│   │   ├── CustomCheckbox.tsx          # Komponen checkbox kustom
│   │   ├── EChartComponent.tsx         # Wrapper Apache ECharts
│   │   ├── LazyEChart.tsx              # Lazy loading ECharts
│   │   ├── Loader.tsx                  # Komponen loading spinner
│   │   ├── LoadingAnimation.tsx        # Animasi loading ringan
│   │   └── Logo.tsx                    # Komponen logo OPTIMA
│   │
│   ├── dashboard/                # Komponen widget dashboard utama
│   │   ├── AuditSchedule.tsx           # Widget jadwal audit
│   │   ├── AuditSummary.tsx            # Widget ringkasan audit (EWS, timeline)
│   │   ├── AuditorPerforma.tsx         # Widget performa auditor
│   │   ├── BranchLocationTable.tsx     # Tabel lokasi cabang
│   │   ├── DashboardStats.tsx          # Kartu statistik ringkasan dashboard
│   │   ├── FraudData.tsx               # Widget data fraud
│   │   ├── TimelineView.tsx            # Timeline saldo & PAR
│   │   └── TopFraudTable.tsx           # Tabel top fraud
│   │
│   ├── layout/                   # Komponen tata letak global
│   │   ├── AccountSettings.tsx         # Drawer pengaturan akun (dalam layout)
│   │   ├── AuditRatingCalculator.tsx   # Kalkulator rating (dalam layout)
│   │   ├── Layout.tsx                  # Layout utama (sidebar + konten)
│   │   ├── Navbar.tsx                  # Navigasi atas (notifikasi, profil, pencarian)
│   │   └── Sidebar.tsx                 # Sidebar navigasi accordion
│   │
│   ├── manager-dashboard/        # Komponen untuk dashboard manajer
│   │   ├── AddendumForm.tsx            # Form pembuatan addendum
│   │   ├── AddendumList.tsx            # Daftar addendum yang diajukan
│   │   ├── AssignmentLetterForm.tsx    # Form pembuatan surat tugas
│   │   ├── AssignmentLetterList.tsx    # Daftar surat tugas
│   │   ├── AssignmentLetterManager.tsx # Panel approval surat tugas, addendum, LPJ & mutasi
│   │   ├── AssignmentLetterManagerEdit.tsx # Form edit surat tugas yang sudah ada
│   │   ├── AssignmentLetterPrint.tsx   # Preview & cetak surat tugas
│   │   ├── AuditMutasi.tsx             # Manajemen pengajuan audit mutasi
│   │   └── LpjSubmission.tsx           # Pengajuan & approval LPJ (Laporan Pertanggungjawaban)
│   │
│   ├── pull-request/             # Komponen Data Pull Request (EWS)
│   │   ├── ComponentAccessGuard.tsx    # Guard akses berbasis komponen
│   │   ├── DataAccessGuard.tsx         # Guard akses berbasis data
│   │   ├── DbLoanSaving.tsx            # Tabel kredit & simpanan
│   │   ├── DetailAnggota.tsx           # Detail data anggota
│   │   ├── FixAsset.tsx                # Tabel aset tetap
│   │   ├── KDP.tsx                     # Tabel Kredit Dalam Perhatian
│   │   ├── TAK.tsx                     # Tabel Tagihan Aktif Kredit
│   │   ├── THC.tsx                     # Tabel Tingkat Hutang Cabang
│   │   └── TLP.tsx                     # Tabel Tunggakan Lebih dari Periode
│   │
│   ├── qa-management/            # Komponen halaman QA Management
│   │   ├── MatriksSection.tsx          # Tabel & upload matriks temuan
│   │   └── RPMLetterTable.tsx          # Tabel surat RPM
│   │
│   ├── tools/                    # Komponen halaman Tools
│   │   ├── COA.tsx                     # Chart of Accounts viewer
│   │   └── ToolsError.tsx              # Fallback error state untuk tools
│   │
│   ├── tutorials/                # Komponen halaman Tutorials
│   │   ├── ThemeSelector.tsx           # Pilihan tema dalam tutorial
│   │   └── TutorialCard.tsx            # Kartu individual tutorial
│   │
│   └── ui/                       # Komponen UI primitif (shadcn/ui)
│       ├── accordion, badge, button, card, checkbox, dialog,
│       ├── dropdown-menu, input, label, popover, progress,
│       ├── scroll-area, select, separator, skeleton, slider,
│       ├── switch, table, tabs, textarea, toast, tooltip, dsb.
│
├── contexts/                     # React Context Providers
│   ├── AuthContext.tsx           # Autentikasi user, sesi, dan role
│   ├── DashboardCacheContext.tsx # Cache data dashboard (audit, EWS, statistik)
│   ├── MapCacheContext.tsx       # Cache data peta cabang
│   ├── PresenceContext.tsx       # Status online/offline user real-time
│   └── ThemeContext.tsx          # Konteks tema tampilan (light/dark)
│
├── data/                         # Data statis lokal
│
├── lib/                          # Konfigurasi library eksternal
│   ├── firebase.ts               # Konfigurasi Firebase (push notification)
│   ├── supabase.ts               # Supabase client (anon key)
│   ├── supabaseClient.ts         # Supabase client alias
│   ├── supabaseService.ts        # Supabase client (service role, admin ops)
│   └── utils.ts                  # Helper fungsi umum
│
├── pages/                        # Komponen halaman (26 total)
│   ├── AccountSettingsPage.tsx   # Pengaturan akun user
│   ├── AddUser.tsx               # Panel admin: user, auditor, reprocess queue
│   ├── AssignmentLetter.tsx      # Pengajuan & manajemen surat tugas auditor
│   ├── AuditeeSurvey.tsx         # Halaman survei auditee (publik, tanpa login)
│   ├── AuditorWorkpapers.tsx     # Kertas kerja auditor
│   ├── BranchDirectory.tsx       # Direktori & peta cabang
│   ├── Broadcast.tsx             # Broadcast pesan ke user
│   ├── ChatPage.tsx              # Halaman chat real-time (dengan reaksi kustom)
│   ├── CompanyRegulations.tsx    # Peraturan & kebijakan perusahaan
│   ├── Dashboard.tsx             # Dashboard utama
│   ├── EmailAddress.tsx          # Direktori alamat email
│   ├── Login.tsx                 # Halaman login
│   ├── ManagerDashboard.tsx      # Dashboard manajer (approval, LPJ, fraud data)
│   ├── NotificationHistory.tsx   # Riwayat notifikasi
│   ├── PullRequestPage.tsx       # Data request EWS
│   ├── QA.tsx                    # QA Section (monitoring audit aktif)
│   ├── QAManagement.tsx          # QA Management (checklist dokumen, matriks, surat tugas)
│   ├── ResetPassword.tsx         # Reset password
│   ├── SupportTickets.tsx        # Tiket dukungan (helpdesk)
│   ├── SurveyTokenManager.tsx    # Manajemen token survei auditee
│   ├── Tools.tsx                 # Halaman tools (COA, kalkulator, dsb.)
│   ├── Tutorials.tsx             # Halaman tutorial & panduan
│   ├── UnauthorizedPage.tsx      # Halaman akses ditolak
│   ├── UpdateLocation.tsx        # Update lokasi auditor
│   ├── VideoCallPage.tsx         # Video call (fullscreen, integrasi Jitsi)
│   └── WorkPapers.tsx            # Wrapper kertas kerja
│
├── services/                     # Integrasi service & logika bisnis
│   ├── grammarService.ts         # Koreksi tata bahasa (AI-assisted)
│   ├── letterService.ts          # Approval surat tugas & addendum (dengan proteksi UM sheet)
│   ├── pdfGenerator.ts           # Generate PDF surat tugas & addendum
│   ├── spreadsheetService.js     # Operasi file Excel (baca/tulis)
│   └── supabaseClient.ts         # Supabase client untuk services
│
├── styles/                       # CSS spesifik komponen
│
└── utils/                        # Fungsi utilitas
    ├── componentAccessUtils.ts   # Kontrol akses komponen berbasis role
    ├── cropImage.ts              # Pemrosesan & crop gambar profil
    └── scheduleUtils.ts          # Kalkulasi & penjadwalan audit
```

---

## Halaman & Akses Role

| Route                 | Halaman           | Role yang Diizinkan                          |
| --------------------- | ----------------- | -------------------------------------------- |
| `/dashboard`          | Dashboard Utama   | Semua role                                   |
| `/manager-dashboard`  | Dashboard Manajer | `superadmin`, `manager`                      |
| `/qa-section`         | QA Section        | `qa`, `superadmin`, `dvs`, `manager`         |
| `/qa-management`      | QA Management     | `superadmin`, `qa`, `manager`                |
| `/assignment-letter`  | Surat Tugas       | `user`, `dvs`, `qa`, `manager`, `superadmin` |
| `/auditor-workpapers` | Kertas Kerja      | Semua role                                   |
| `/pull-request`       | Data EWS          | Semua role                                   |
| `/branch-directory`   | Direktori Cabang  | Semua role                                   |
| `/chat`               | Chat              | Semua role                                   |
| `/email-address`      | Direktori Email   | Semua role                                   |
| `/broadcast`          | Broadcast         | `superadmin`, `manager`, `qa`, `dvs`         |
| `/support-tickets`    | Support Tickets   | Semua role                                   |
| `/survey-manager`     | Survey Manager    | Semua kecuali `risk`                         |
| `/tools`              | Tools             | Semua role                                   |
| `/tutorials`          | Tutorials         | Semua kecuali `risk`                         |
| `/add-user`           | Admin Panel       | `superadmin`                                 |
| `/video-call`         | Video Call        | Semua role                                   |
| `/account-settings`   | Pengaturan Akun   | Semua role                                   |
| `/survey/:token`      | Survei Auditee    | Publik (tanpa login)                         |

---

## Supabase Edge Functions

Tersimpan di `/supabase/functions/`:

| Fungsi                | Deskripsi                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `approve-letter`      | Proses approval surat tugas: proteksi sheet UM di Excel & update status DB                                                                                           |
| `approve-addendum`    | Proses approval addendum: proteksi sheet UM di Excel & update status DB                                                                                              |
| `reprocess-approvals` | Reprocess batch surat tugas & addendum yang approved namun belum terproteksi. Mode: `check` (cek pending), `letter` (proses 1 surat), `addendum` (proses 1 addendum) |

---

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy Edge Function

```bash
npx supabase functions deploy <nama-fungsi> --project-ref <project-ref>
```

Contoh:

```bash
npx supabase functions deploy reprocess-approvals --project-ref keamzxefzypvbaxjyacv
```
