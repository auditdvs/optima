# OPTIMA Source Code

Folder ini berisi source code untuk aplikasi OPTIMA.

## Dokumentasi

Untuk dokumentasi user dan sistem, lihat folder `/docs` di root.

## Struktur Folder

```
src/
├── App.tsx              # Komponen utama app dan routing
├── main.tsx             # Entry point React
├── index.css            # Style global dan Tailwind imports
│
├── components/          # Komponen React
│   ├── animation/       # Animasi teks dan visual
│   ├── common/          # Komponen reusable umum
│   ├── layout/          # Komponen layout (Sidebar, Navbar)
│   └── ui/              # Komponen shadcn/ui
│
├── contexts/            # React context providers
│   ├── AuthContext      # Autentikasi dan sesi
│   ├── DashboardCache   # Caching data dashboard
│   └── MapCache         # Caching data peta
│
├── lib/                 # Konfigurasi library
│   └── supabase         # Setup Supabase client
│
├── pages/               # Komponen halaman (19 total)
│
├── services/            # Integrasi service eksternal
│   ├── pdfGenerator     # Generate PDF
│   └── spreadsheet      # Operasi Excel
│
├── styles/              # CSS spesifik komponen
│
└── utils/               # Fungsi utilitas
    ├── componentAccess  # Kontrol akses berbasis role
    ├── cropImage        # Pemrosesan gambar
    └── scheduleUtils    # Penjadwalan audit
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
