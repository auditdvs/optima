# OPTIMA

**Operational Performance and Internal Audit Management Application**

OPTIMA adalah sistem pendukung audit internal yang dirancang untuk mempermudah alur kerja audit, pengelolaan data, dan aktivitas monitoring untuk Divisi Audit Internal.

---

## Tujuan

OPTIMA berfungsi sebagai platform terpusat untuk:

- Mengelola penugasan dan jadwal audit
- Melacak progress dan status dokumentasi audit
- Membuat surat penugasan dan laporan
- Menyediakan akses cepat ke peraturan perusahaan dan data cabang
- Memonitor kasus fraud dan temuan audit

---

## Pengguna

| Role       | Deskripsi                                             |
| ---------- | ----------------------------------------------------- |
| Auditor    | Auditor lapangan yang melakukan audit cabang          |
| QA         | Tim Quality Assurance yang mereview kelengkapan audit |
| Manager    | Manager divisi yang memonitor performa tim            |
| DVS        | Staff divisi yang menangani tugas administratif       |
| Superadmin | Administrator sistem dengan akses penuh               |

---

## Teknologi

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Visualisasi**: Recharts, ECharts, Leaflet Maps
- **Otomasi**: n8n workflows

---

## Dokumentasi

Dokumentasi lengkap tersedia di folder `/docs`:

| Dokumen                                                | Deskripsi                       |
| ------------------------------------------------------ | ------------------------------- |
| [Overview](./docs/01-overview.md)                      | Latar belakang dan scope sistem |
| [Panduan Pengguna](./docs/02-user-guide.md)            | Cara menggunakan OPTIMA         |
| [Alur Request Data](./docs/03-data-request-flow.md)    | Cara kerja request data         |
| [Arsitektur Sistem](./docs/04-system-architecture.md)  | Arsitektur teknis               |
| [Keamanan dan Sesi](./docs/05-security-and-session.md) | Kebijakan keamanan              |
| [Error dan Logging](./docs/06-error-and-logging.md)    | Penanganan error                |
| [FAQ](./docs/07-faq.md)                                | Pertanyaan yang sering diajukan |

Lihat [CHANGELOG.md](./CHANGELOG.md) untuk riwayat versi.

---

## Quick Start

```bash
npm install
npm run dev
```

---

**Versi**: 2.0 | **Dikelola oleh**: IT Divisi Audit Internal
