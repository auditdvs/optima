CREATE TABLE IF NOT EXISTS public.system_changelog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    release_date DATE NOT NULL,
    icon TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed existing data
INSERT INTO public.system_changelog (release_date, icon, title, description, created_at) VALUES 
('2026-03-10', 'Wrench', 'Hari Ini - Menambahkan Fitur Manual Changelog', 'Membuat tabel integrasi database Supabase untuk sistem changelog agar pencatatan update log dapat ditambahkan secara dinamis oleh tim Admin melalui antarmuka.', NOW()),
('2026-03-09', 'Wrench', 'Penyesuaian Layout Visual Heatmap & Total Statistik', 'Menyesuaikan Account Settings Page agar tata letak Audit Activity Heatmap berada di sebelah panel Total Statistics Cards menggunakan GridLayout untuk mencegah horizontal scrollbar.', NOW()),
('2026-03-06', 'Wrench', 'Perbaikan Bug Kesalahan Tabel Form', 'Memperbaiki bug kritikal di mana data salah tujuan masuk ke struktur dvs_task. Logic insert direvisi agar proses input dikirim dengan benar ke tabel branch_info.', NOW()),
('2026-03-04', 'Wrench', 'Refine Detail Addendum Modal', 'Mendesain ulang tampilan pop-up Addendum sehingga informasinya berukuran ideal & padat. Informasi utama dapat di-scroll nyaman di dalam pop-up tanpa merusak layar.', NOW()),
('2026-03-02', 'Wrench', 'Logika Pencarian & Statistik Penugasan Auditor', 'Penambahan deteksi fuzzy matching di Auditor Tracking, dan menghitung otomatis sejarah pelacakan data perpanjangan tugas (Addendum) ke dalam log pelacakan statistik.', NOW()),
('2026-03-02', 'Wrench', 'Refaktor Komponen AddUser', 'Memecah file UI AddUser ke beberapa file independen seperti AuditorTracking, MSSQLConnectionLog, dan PICModals agar kode lebih cepat, rapi, dan mudah di-maintenance.', NOW()),
('2026-03-01', 'Smartphone', 'Fitur Video Call (Zoom-like)', 'Membuat fitur video call terintegrasi di dalam aplikasi yang memungkinkan meeting virtual secara real-time antar pengguna layaknya Zoom.', NOW()),

('2026-02-28', 'MessageCircle', 'Fitur Obrolan Chat Interaktif', 'Menambahkan fitur real-time chat yang memfasilitasi komunikasi antar staf dari mana pun secara dinamis di dalam platform.', NOW()),

('2026-02-27', 'Palette', 'Penggabungan Header Komponen Admin', 'Menggabungkan tab-tab admin terpisah menjadi satu desain interaktif di atas header bergaya Pill ringkas.', NOW()),
('2026-02-26', 'Palette', 'Refinement Manajemen Shortlink', 'UI Shortlink bisa langsung diklik; membatasi generate Shortlink menjadi 1 per hari tiap user, dan perbaikan double-count clicks.', NOW()),
('2026-02-25', 'Palette', 'Pembaruan Admin Response Modals', 'Menstandarisasi UI modal validasi status (untuk TAK, TLP, KDP) agar sejalan dengan desain di THC, membuang textarea tidak berguna, dan memperbaiki status Failed.', NOW()),
('2026-02-23', 'Palette', 'Sistem Keamanan Modal Fraud Staff', 'Mengimplementasikan modal password-protected (password: optima) sebelum membuka jendela Detail Staf di Fraud Cases untuk mencegah klik tidak tersengaja.', NOW()),
('2026-02-18', 'Palette', 'Dashboard Responsive Layout', 'Merapikan komponen kartu Dashboard Summary sehingga antarmukanya responsif di layar tablet/ponsel.', NOW()),
('2026-02-17', 'Palette', 'Refinement Chat Reactions', 'Menambahkan sistem reaction kustom interaktif pada obrolan yang langsung terintegrasi menggunakan aset gambar dari basis data Supabase.', NOW()),

('2026-01-09', 'Rocket', 'Major Update & Profil', 'Peluncuran pembaruan sistem besar di awal Januari, diikuti pembaruan/sinkronisasi pengaturan data profil dan informasi login.', NOW()),
('2026-01-07', 'Rocket', 'Dashboard & Maps', 'Penyesuaian visual utama untuk komponen Maps serta pembaruan elemen Dashboard.', NOW()),
('2026-01-06', 'Rocket', 'RPM & Kertas Kerja', 'Penyesuaian modul pengelolaan Workpapers (kertas kerja laporan) dan pengelolaan data RPM.', NOW()),
('2026-01-05', 'Rocket', 'Notifikasi & Manajemen Tanggal', 'Pembaruan aliran fitur notifikasi masuk ke sistem serta standarisasi fungsi tampilan waktu dan kalender.', NOW());
