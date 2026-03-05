-- =====================================================
-- Setup Tabel RCM Risk Issue
-- Data dari Risk Control Matrix KOMIDA
-- =====================================================

-- 1. Buat tabel rcm_risk_issue
CREATE TABLE IF NOT EXISTS public.rcm_risk_issue (
  id SERIAL PRIMARY KEY,
  no_mega INT,
  mega TEXT,
  no_major TEXT,
  major TEXT,
  no_sub TEXT,
  sub_major TEXT,
  code TEXT NOT NULL,
  risk_issue TEXT,
  kc BOOLEAN DEFAULT false,
  kr BOOLEAN DEFAULT false,
  kp BOOLEAN DEFAULT false,
  contoh_temuan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.rcm_risk_issue ENABLE ROW LEVEL SECURITY;

-- 3. Policy: semua authenticated user bisa SELECT
CREATE POLICY "rcm_select_all" ON public.rcm_risk_issue
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rcm_select_anon" ON public.rcm_risk_issue
  FOR SELECT TO anon USING (true);

-- 4. Trigram index untuk pencarian
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_rcm_code_trgm 
ON public.rcm_risk_issue USING gin (code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_rcm_risk_issue_trgm 
ON public.rcm_risk_issue USING gin (risk_issue gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_rcm_contoh_trgm 
ON public.rcm_risk_issue USING gin (contoh_temuan gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_rcm_sub_major_trgm 
ON public.rcm_risk_issue USING gin (sub_major gin_trgm_ops);

-- 5. Insert data RCM
INSERT INTO public.rcm_risk_issue (no_mega, mega, no_major, major, no_sub, sub_major, code, risk_issue, kc, kr, kp, contoh_temuan) VALUES
(1, 'STRATEGIS', '1.1', 'Perencanaan Strategis', '1.1.1', 'Penyusunan & Distribusi Perencanaan Strategis', 'PDP1', 'Rencana Kerja/ Target Unit Kerja tidak sesuai dengan kondisi bisnis dan atau potensi wilayah', true, true, false, 'Tidak tercapainya target anggota pada posisi tahun kemarin dan bulan berjalan berdasarkan cashflow terbaru'),
(1, 'STRATEGIS', '1.1', 'Perencanaan Strategis', '1.1.1', 'Penyusunan & Distribusi Perencanaan Strategis', 'PDP2', 'Breakdown Target atau Rencana Kerja terlambat', false, true, true, 'Breakdown target ke unit kerja di bawah supervisi Regional/Divisi tidak merata atau tidak tercapai'),
(1, 'STRATEGIS', '1.1', 'Perencanaan Strategis', '1.1.2', 'Evaluasi Rencana Strategis', 'ERS1', 'Realisasi Cashflow tidak sesuai dengan target yang telah ditetapkan/tidak tercapai', true, true, false, 'Realisasi biaya pengeluaran cabang melebihi target cashflow'),
(1, 'STRATEGIS', '1.1', 'Perencanaan Strategis', '1.1.2', 'Evaluasi Rencana Strategis', 'ERS2', 'Tidak optimalnya kinerja tenaga pemasaran (Field Officer)', true, true, true, 'FO tidak mencapai target individual maupun target Kantor Cabang'),
(1, 'STRATEGIS', '1.2', 'Kebijakan dan Prosedur', '1.2.1', 'Penyusunan Kebijakan & Prosedur', 'PKP1', 'SOP/manual/ketentuan lain terlambat/tidak memadai/tidak lengkap/tidak ada', false, false, true, 'Pembuat kebijakan belum membuat ketentuan ataupun belum melakukan update terhadap ketentuan yang sudah ada'),
(1, 'STRATEGIS', '1.2', 'Kebijakan dan Prosedur', '1.2.1', 'Penyusunan Kebijakan & Prosedur', 'PKP2', 'Kebijakan dan prosedur tidak comply dengan ketentuan internal/regulasi eksternal', false, false, true, 'Kebijakan yang di keluarkan oleh lembaga tidak sesuai dengan ketentuan Eksternal (KemenkopUKM maupun ketentuan perundang-undangan)'),
(1, 'STRATEGIS', '1.2', 'Kebijakan dan Prosedur', '1.2.2', 'Pengkinian Kebijakan & Prosedur', 'KKP1', 'Kebijakan dan prosedur tidak/belum dapat diimplementasikan, kadaluarsa, atau tidak sesuai dengan perkembangan bisnis', false, false, true, 'Kebijakan telah kadaluarsa, bertentangan dengan ketentuan lain, atau tidak sesuai dengan perkembangan bisnis'),
(1, 'STRATEGIS', '1.3', 'Pengembangan Produk & Aktivitas', '1.3.1', 'Perancangan Produk / Aktivitas', 'RPA1', 'Penerbitan produk dan pelaksanaan aktivitas/jasa baru tidak sesuai dengan ketentuan', false, false, true, 'Adanya produk/aktivitas baru belum memiliki ketentuan'),
(1, 'STRATEGIS', '1.3', 'Pengembangan Produk & Aktivitas', '1.3.2', 'Uji Coba, Test Market dan Evaluasi', 'UTE1', 'Kegagalan uji coba dan tes market penerbitan produk atau pelaksanaan aktivitas jasa', false, false, true, 'Atas aktivitas baru mengalami kegagalan uji coba'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.1', 'Pelaksanaan Transaksi', 'PTI1', 'Profil anggota tidak akurat, tidak lengkap & tidak diupdate pada sistem', true, false, false, E'Anggota tidak memenuhi syarat pada saat perekrutan anggota baru\nInputan pada sistem tidak sesuai pada Formulir Pengajuan/UK Data (Uji Kelayakan)\nData pada UK masih terdapat field yang kosong\nTidak ada dokumen capres\nJumlah anggota dalam satu kelompok melebihi ketentuan (8 anggota)'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.1', 'Pelaksanaan Transaksi', 'PTI2', 'Pelaksanaan transaksi tidak memenuhi ketentuan/regulasi yang berlaku (Pajak, Ketentuan Regulator, dll)', true, true, true, 'Pembayaran pajak fixed asset (kendaraan bermotor) terlambat'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.1', 'Pelaksanaan Transaksi', 'PTI3', 'Pelaksanaan transaksi finansial tidak benar/ tidak absah / tidak sesuai ketentuan', true, true, true, E'Manipulasi dokumen sumber (kuitansi, voucher, slip)\nPemalsuan Tanda Tangan Pada Slip, Kwitansi, Nota\nPenarikan Sihara tidak sesuai jadwal (bukan dari strategi meminimalisir PAR)'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.1', 'Pelaksanaan Transaksi', 'PTI4', 'Pemungutan atau pembukuan biaya tidak sesuai kewenangan & ketentuan yang berlaku', true, true, true, E'Ada biaya yang tidak dipungut (misal: pembelian buku simpanan oleh anggota namun tidak dipungut)\nBukti pembelian BBM tidak ada\nPembelian diluar ketentuan COA\nPengeluaran BBM dan biaya lain melebihi ketentuan\nSelisih bukti dengan transaksi pengeluaran (BBM atau transaksi biaya)\nNominal pada slip penarikan dan BTC berbeda\nSelisih pencatatan antara voucher dan buku kas cabang\nPembelian sumbangan anggota melebihi budget yang ditentukan\nPungutan biaya UPK namun tidak ditransaksikan'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.1', 'Pelaksanaan Transaksi', 'PTI5', 'Pembatalan transaksi dilakukan tidak sesuai ketentuan yang berlaku', true, true, true, E'Proses error correction/koreksi jurnal tidak benar\nPenyalahgunaan transaksi Un-Approve'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.1', 'Pelaksanaan Transaksi', 'PTI6', 'Penundaan pembukuan, pemberitahuan atau penyelesaian transaksi', true, true, true, E'Anggota bermasalah, penarikan di hari lain tidak langsung dibukukan\nKeterlambatan penginputan pembelian asset ke akun fixed asset\nPembelian barang tidak dibuatkan voucher atau dibukukan pada hari yang sama'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.1', 'Pelaksanaan Transaksi', 'PTI7', 'Dokumen sumber, bukti pembukuan & report tidak lengkap atau tidak ditatakerjakan sesuai ketentuan', true, true, true, E'Tidak ada bukti transaksi (Slip penarikan, slip dana resiko, kwitansi disburse, dll)\nBukti transaksi (Slip Anggota Keluar, BM & BK) tidak ada\nVoucher transaksi salah urut, tidak ada\nKesalahan pencatatan voucher tidak sesuai dengan bukti transaksi'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.1', 'Pelaksanaan Transaksi', 'PTI8', 'Penutupan akun anggota tidak dilakukan sesuai ketentuan', true, false, false, E'Anggota meninggal tetapi belum diajukan pengeluaran anggota\nPengembalian simpanan anggota karena aggota keluar tidak diberikan sebagian atau sepenuhnya\nManipulasi kartu kuning (anggota & suami anggota meninggal) untuk penutupan rekening/akun'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.2', 'Infrastruktur & Pengamanan Proses Transaksi', 'IPT1', 'Pengelolaan User ID, password dan kewenangan limit tidak sesuai ketentuan', true, true, true, 'Approval tidak dilakukan pihak yang berwenang dengan akun mdis yang bukan miliknya (approval oleh staf selain manajer dengan akun manajer)'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.2', 'Infrastruktur & Pengamanan Proses Transaksi', 'IPT2', 'Pengelolaan dokumen berharga tidak tertib/tidak memadai', true, true, true, 'Penyimpanan dokumen lembaga tidak memadai (Stok Buku Simpanan, Kartu Pinjaman Anggota, Formulir Anggota)'),
(2, 'OPERASIONAL', '2.1', 'Proses Transaksi', '2.1.2', 'Infrastruktur & Pengamanan Proses Transaksi', 'IPT3', 'Pengelolaan Infrastruktur pengamanan transaksi (CCTV) tidak memadai', true, true, true, 'Backup data CCTV tidak dilakukan secara memadai'),
(2, 'OPERASIONAL', '2.2', 'Pengelolaan Kantor', '2.2.1', 'Pembukaan / Penempatan / Relokasi Kantor', 'JKC1', 'Pembukaan Kantor tidak didukung analis kelayakan yang memadai', false, true, true, 'Pembukaan kantor tidak disertai dengan kajian/Feasibility Study yang memadai'),
(2, 'OPERASIONAL', '2.2', 'Pengelolaan Kantor', '2.2.1', 'Pembukaan / Penempatan / Relokasi Kantor', 'JKC2', 'Pembukaan/relokasi kantor terlambat atau tidak sesuai jadwal', false, true, true, 'Keterlambatan pembukaan/opening kantor cabang baru'),
(2, 'OPERASIONAL', '2.2', 'Pengelolaan Kantor', '2.2.1', 'Pembukaan / Penempatan / Relokasi Kantor', 'JKC3', 'Pembukaan Kantor tidak didukung dengan SDM dan infrastruktur yang memadai', false, true, true, 'Kantor Cabang belum diisi oleh posisi yang ideal akibat terbatasnya SDM & Infrastruktur'),
(2, 'OPERASIONAL', '2.3', 'Proses Manajemen Risiko', '2.3.1', 'Identifikasi, Pengukuran, Pemantauan dan Pengendalian Risiko', 'PPR1', 'Proses penetapan definisi & kategori risiko tidak sesuai dengan proses bisnis', false, false, true, 'Identifikasi risiko tidak sejalan dengan proses bisnis Lembaga'),
(2, 'OPERASIONAL', '2.3', 'Proses Manajemen Risiko', '2.3.1', 'Identifikasi, Pengukuran, Pemantauan dan Pengendalian Risiko', 'PPR2', 'Risk issue yang dibreakdown ke Unit Kerja tidak relevan dengan risiko yang dihadapi', false, false, true, 'RCSA tidak sesuai dengan identifikasi pada Kantor Cabang'),
(2, 'OPERASIONAL', '2.3', 'Proses Manajemen Risiko', '2.3.1', 'Identifikasi, Pengukuran, Pemantauan dan Pengendalian Risiko', 'PPR3', 'Kegagalan manajemen krisis', false, false, true, NULL),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.1', 'Pelaksanaan Pengadaan Barang & Jasa', 'PBJ1', 'Proses pengadaan barang/jasa IT, non IT, dan jasa konsultan tidak sesuai ketentuan', true, true, true, 'Proses pembelian barang tidak ditatakerjakan dengan baik (kuitansi tidak ada, hilang, dll)'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.1', 'Pelaksanaan Pengadaan Barang & Jasa', 'PBJ2', 'Pengadaan/sewa barang/jasa atau jasa konsultan tidak mendapat harga yang terbaik (terjadi markup)', true, true, true, 'Adanya MarkUp pembelian barang/pembayaran jasa (Sewa Gedung)'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.1', 'Pelaksanaan Pengadaan Barang & Jasa', 'PBJ3', 'Persetujuan biaya pengadaan barang dan jasa tidak sesuai dengan kewenangan/ketentuan', true, true, true, 'Pembelian atas barang dengan yang tidak sesuai dengan limit kewenangannya'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.1', 'Pelaksanaan Pengadaan Barang & Jasa', 'PBJ4', 'Dokumentasi proses pengadaan, sewa barang/ jasa tidak lengkap', true, true, true, 'Dokumen pembelian asset tidak lengkap'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.2', 'Distribusi Barang & Jasa', 'DBJ1', 'Distribusi barang dan jasa tidak efektif dan efisien', true, true, true, 'Pendistribusian dokumen/ kebutuhan kantor cabang tidak dapat dipenuhi dengan tepat waktu, tidak sesuai dengan kebutuhan.'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.3', 'Pemeliharaan Aktiva', 'PAT1', 'Pencatatan aktiva tetap atau barang inventaris tidak tertib atau tidak akurat', true, true, true, E'Kondisi aset tetap rusak tidak dapat digunakan\nPerpindahan aset tidak dilakukan mutasi di data fixed aset\nAset baru belum ditambahkan\nTagging aset belum dilakukan'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.3', 'Pemeliharaan Aktiva', 'PAT2', 'Bukti kepemilikan aktiva tetap/barang inventaris tidak sah/tidak ditatakerjakan sesuai dengan ketentuan', true, true, true, 'Sertifikat rumah/kantor tidak ditatakerjakan dengan baik'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.3', 'Pemeliharaan Aktiva', 'PAT3', 'Aktiva tetap tidak diasuransikan sesuai ketentuan', true, true, true, 'Aset belum diasuransikan (kendaraan bermotor)'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.3', 'Pemeliharaan Aktiva', 'PAT4', 'Penghapusbukuan aktiva tidak sesuai dengan ketentuan', true, false, true, 'Penjualan asset tanpa permohonan terlebih dahulu'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.3', 'Pemeliharaan Aktiva', 'PAT5', 'Pelaksanaan lelang aktiva tetap tidak sesuai dengan ketentuan', true, true, true, 'Penjualan Aset/Inventaris yang dilakukan tidak sesuai dengan ketentuan'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.3', 'Pemeliharaan Aktiva', 'PAT6', 'Pengelolaan inventaris, peralatan & perlengkapan kantor tidak memadai', true, true, true, E'Kartu stock di cabang tidak ada/ tidak update\nInventaris kantor tidak dilakukan service atau maintenance\nPengambilan/pencurian/penggelapan barang fixed asset/non fixed asset untuk kepentingan pribadi'),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.4', 'Pengelolaan Penyedia Jasa', 'PPJ1', 'Tidak tersedia data profil rekanan/penyedia jasa yang akurat', false, false, true, NULL),
(2, 'OPERASIONAL', '2.4', 'Pengelolaan Aset, Logistik & Penunjang', '2.4.4', 'Pengelolaan Penyedia Jasa', 'PPJ2', 'Pengembalian aktiva tetap (IT dan Non IT) oleh pekerja pihak ketiga yang sudah tidak berwenang tidak dilakukan dengan tertib', false, false, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.1', 'Rekrutmen dan Penempatan', 'RKT1', 'Proses pemenuhan SDM tidak sesuai dengan ketentuan dan standar kompetensi yang ditetapkan', false, true, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.1', 'Rekrutmen dan Penempatan', 'RKT2', 'Pemenuhan SDM tidak sesuai dengan formasi', false, true, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.1', 'Rekrutmen dan Penempatan', 'RKT3', 'Pemenuhan SDM tidak sesuai jadwal (terlambat)', false, true, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.2', 'Pelatihan / Pengembangan / Pembinaan SDM', 'PLT1', 'Pengembangan karir pekerja (rotasi dan promosi) tidak sesuai pola pendekatan kompetensi', false, true, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.2', 'Pelatihan / Pengembangan / Pembinaan SDM', 'PLT2', 'Pelaksanaan training tidak sesuai training need assessments (TNA) atau kebutuhan lembaga', false, true, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.2', 'Pelatihan / Pengembangan / Pembinaan SDM', 'PLT3', 'Evaluasi penilaian kinerja pekerja tidak obyektif', true, true, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.2', 'Pelatihan / Pengembangan / Pembinaan SDM', 'PLT4', 'Pegawai tidak melakukan kode etik KOMIDA sesuai ketentuan', true, true, true, E'Karyawan yang melakukan pelanggaran kode etik KOMIDA\nMenerima Gratifikasi (Meminta Fee dalam bentuk barang/uang kepada anggota atau pihak ketiga)\nAtasan mempergunakan jabatannya dalam rangka mempermudah approval pinjaman karyawan'),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.2', 'Pelatihan / Pengembangan / Pembinaan SDM', 'PLT5', 'Pelanggaran Kode Etik, peraturan tata tertib dan kedisiplinan pegawai tidak ditindaklanjuti dengan memadai', true, true, true, 'Staf yang melakukan tindakan fraud / kesalahan lainnya tidak diberikan punishment sesuai dengan ketentuan'),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.3', 'Administrasi Kepegawaian', 'AMK1', 'Pembayaran upah/hak-hak (benefit) pekerja tidak sesuai ketentuan', false, false, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.3', 'Administrasi Kepegawaian', 'AMK2', 'Pengelolaan administrasi & berkas (fisik dokumen) kepegawaian tidak tertib', false, false, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.3', 'Administrasi Kepegawaian', 'AMK3', 'Data sistem SDM tidak akurat', false, false, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.3', 'Administrasi Kepegawaian', 'AMK4', 'Pelaksanaan cuti tidak sesuai ketentuan', true, true, true, 'Cuti karyawan tidak disertakan dengan ijin dari atasan'),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.3', 'Administrasi Kepegawaian', 'AMK5', 'Pencurian aset informasi Lembaga oleh pekerja yang sudah dimutasi ke unit kerja lain/pekerja yang sudah di PHK', true, true, true, 'Bocornya data anggota, ketentuan internal, atau informasi berharga lainnya milik lembaga kepada pihak eksternal KOMIDA'),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.3', 'Administrasi Kepegawaian', 'AMK6', 'Terjadinya akses ilegal oleh pekerja yang sudah dimutasi ke unit kerja lain/pekerja yang sudah di PHK', true, true, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.3', 'Administrasi Kepegawaian', 'AMK7', 'Pengembalian aktiva tetap (IT dan Non IT) oleh pekerja yang dimutasi ke unit kerja lain/pekerja yang sudah di PHK tidak dilakukan dengan tertib', true, true, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.4', 'Penghentian Hubungan Kerja', 'PHK1', 'Proses penghentian hubungan kerja tidak sesuai dengan ketentuan', false, true, true, NULL),
(2, 'OPERASIONAL', '2.5', 'Manajemen SDM', '2.5.4', 'Penghentian Hubungan Kerja', 'PHK2', 'Pemenuhan hak dan kewajiban pekerja yang dikenakan PHK tidak sesuai ketentuan', false, true, true, NULL),
(2, 'OPERASIONAL', '2.6', 'Akuntansi, Pelaporan, Informasi & Komunikasi', '2.6.1', 'Monitoring Kelengkapan & Kewajaran Informasi Keuangan', 'KKI1', 'Biaya pengeluaran tidak terselesaikan (Biaya dibayar dimuka, dll.)', false, false, true, 'UM & LPJ Perdin'),
(2, 'OPERASIONAL', '2.6', 'Akuntansi, Pelaporan, Informasi & Komunikasi', '2.6.1', 'Monitoring Kelengkapan & Kewajaran Informasi Keuangan', 'KKI2', 'Pencatatan transaksi tidak sesuai dengan tujuan penggunaan rekening/ akun', true, true, true, 'Kesalahan input akun transaksi pengeluaran biaya'),
(2, 'OPERASIONAL', '2.6', 'Akuntansi, Pelaporan, Informasi & Komunikasi', '2.6.1', 'Monitoring Kelengkapan & Kewajaran Informasi Keuangan', 'KKI3', 'Perhitungan atau pencatatan pencadangan kerugian tidak sesuai ketentuan', false, false, true, NULL),
(2, 'OPERASIONAL', '2.6', 'Akuntansi, Pelaporan, Informasi & Komunikasi', '2.6.2', 'Rekonsiliasi & Tindak Lanjut', 'RTL1', 'Rekonsiliasi tidak dilaksanakan secara memadai', false, false, true, NULL),
(2, 'OPERASIONAL', '2.6', 'Akuntansi, Pelaporan, Informasi & Komunikasi', '2.6.3', 'Penyusunan & Pendistribusian Laporan', 'PDL1', 'Laporan kepada lembaga eksternal/internal tidak sesuai dengan ketentuan yang berlaku', false, false, true, 'Tidak/Belum dilakukannya pengarsipan laporan keuangan dan perkembangan cabang'),
(2, 'OPERASIONAL', '2.7', 'Pengamanan Sistem Informasi', '2.7.1', 'Pengelolaan Aset Informasi', 'PAI1', 'Perlindungan aset informasi Lembaga tidak memadai', true, true, true, NULL),
(2, 'OPERASIONAL', '2.7', 'Pengamanan Sistem Informasi', '2.7.1', 'Pengelolaan Aset Informasi', 'PAI2', 'Kelemahan pengamanan data/informasi akibat kurangnya pemahaman pekerja', true, true, true, NULL),
(2, 'OPERASIONAL', '2.7', 'Pengamanan Sistem Informasi', '2.7.4', 'Pengendalian Akses', 'AKS2', 'Pengelolaan User ID dan password tidak sesuai ketentuan', false, true, true, 'Tidak adanya pengajuan penghapusan username untuk staf keluar'),
(2, 'OPERASIONAL', '2.8', 'Operasional IT', '2.8.1', 'Proses', 'PIT1', 'Kegagalan operasional Unit Kerja karena kesalahan setting parameter terkait aplikasi', false, false, true, NULL),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.1', 'Permohonan & Analisa Pinjaman/Pembiayaan', 'PAP1', 'Administrasi anggota atau calon anggota tidak lengkap atau tidak ditindaklanjuti sesuai ketentuan', true, false, false, E'Kredit Fiktif/Topengan/Atas Nama\nKredit Tempilan/Share Disbursement\nAnggota dengan ID Ganda (Pinjaman Ganda/Double Financing & Fiktif)'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.1', 'Permohonan & Analisa Pinjaman/Pembiayaan', 'PAP2', 'Perhitungan kebutuhan pinjaman/ pembiayaan tidak akurat', true, false, false, 'Pencairan melebihi rincian kebutuhan anggota'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.1', 'Permohonan & Analisa Pinjaman/Pembiayaan', 'PAP3', 'Penetapan produk pinjaman/ pembiayaan tidak sesuai hasil analisis kredit/tidak sesuai ketentuan', true, false, false, E'Kesalahan analisa produk pembiayaan yang dilakukan staf lapang ketika pengajuan pinjaman\nPenetapan Grace Period untuk sanitasi dan renovasi rumah terjadi kesalahan sehingga muncul arrear'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.2', 'Pemberian Putusan Pinjaman/Pembiayaan', 'PTP1', 'Putusan pinjaman/ pembiayaan tidak sesuai dengan hasil analisis', true, true, false, E'Pemberian pinjaman melebihi ketentuan plafon maksimal\nTidak adanya tandatangan Manajer Cabang pada form pengajuan akad dan pencairan pinjaman'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.3', 'Realisasi & Pencairan Pinjaman/Pembiayaan', 'RPP1', 'Realisasi dan pencairan pinjaman/ pembiayaan dilaksanakan sebelum syarat dan ketentuan pemberian pinjaman dipenuhi', true, false, false, E'Tandatangan anggota berbeda antara form pengajuan dan form pencairan serta akad\nPemotongan Biaya Pencairan diluar ketentuan\nDisburse tidak diberikan kepada anggota'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.4', 'Dokumentasi & Administrasi Pinjaman/Pembiayaan', 'DAP1', 'Berkas pinjaman anggota tidak lengkap atau tidak ditatakerjakan sesuai ketentuan', true, false, false, E'Kartu Pinjaman Anggota tidak ada\nSelisih saldo pada kartu pinjaman anggota\nDokumen pinjaman anggota tidak lengkap\nSaldo Kartu Pinjaman Anggota (KPA) tidak update'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.5', 'Pembinaan & Monitoring Anggota', 'PMA1', 'Pembinaan & monitoring kepada anggota secara off site dan on site tidak dilakukan sesuai ketentuan', true, false, false, E'Monitoring belum dilakukan lebih dari 14 hari atau belum melengkapi form monitoring\nNota Pembelian tidak sesuai/tidak ada/tidak lengkap'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.6', 'Pelaksanaan Proses Angsuran', 'PAA1', 'Proses penyetoran angsuran/ iuran yang berkaitan dengan pinjaman/ pembiayaan tidak dilakukan sesuai ketentuan', true, false, false, E'Angsuran anggota tidak di transaksikan ke kantor/Sistem MDIS\nTransfer anggota ke rekening pribadi staf/asmen/manajer'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.6', 'Pelaksanaan Proses Angsuran', 'PAA2', 'Proses Penagihan Angsuran Pinjaman tidak dilakukan', false, false, false, 'Tidak dilakukannya proses penagihan/pengambilan angsuran ke lapang'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.7', 'Pengelolaan Pinjaman/Pembiayaan yang Bermasalah', 'PPB1', 'Penanganan pinjaman/ pembiayaan bermasalah tidak dilakukan sesuai ketentuan', true, false, false, E'Apabila anggota bermasalah, tidak dilakukan monitoring berkala\nPengambilan simpanan anggota untuk pembayaran angsuran tanpa sepengetahuan anggota'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.8', 'Pelunasan Pinjaman/Pembiayaan', 'PLP1', 'Pelunasan pinjaman/ pembiayaan tidak sesuai ketentuan', true, false, false, E'Penundaan pelunasan client\nDokumen anggota keluar tidak lengkap\nPenyetoran dari anggota WO tidak disetorkan'),
(3, 'KEUANGAN', '3.1', 'Manajemen Proses Pinjaman/Pembiayaan', '3.1.9', 'Penetapan Tunggakan Pinjaman/Pembiayaan', 'TGP1', 'Proses pengelolaan tunggakan pinjaman/ pembiayaan tidak sesuai ketentuan', true, false, false, E'Pelunasan tanpa margin tanpa persetujuan dari Kantor Pusat\nTanggung Renteng tidak efektif'),
(3, 'KEUANGAN', '3.2', 'Manajemen Proses Simpanan', '3.2.1', 'Dokumentasi & Administrasi Simpanan', 'DAS1', 'Berkas simpanan anggota tidak lengkap atau tidak ditatakerjakan sesuai ketentuan', true, false, false, E'Buku Simpanan anggota tidak ada\nSelisih saldo pada buku simpanan anggota\nForm simpanan sihara tidak ada/tidak lengkap/tidak update saldo'),
(3, 'KEUANGAN', '3.2', 'Manajemen Proses Simpanan', '3.2.2', 'Pelaksanaan Proses Setoran/Penarikan', 'PAS1', 'Proses penyetoran iuran yang berkaitan dengan simpanan tidak dilakukan sesuai ketentuan', true, false, false, 'Setoran simpanan (Sukarela dan Hari Raya) tidak ditransaksikan'),
(3, 'KEUANGAN', '3.2', 'Manajemen Proses Simpanan', '3.2.2', 'Pelaksanaan Proses Setoran/Penarikan', 'PAS2', 'Proses penarikan simpanan anggota tidak dilakukan sesuai ketentuan', false, false, false, 'Penarikan simpanan anggota tidak diserahkan kepada anggota'),
(3, 'KEUANGAN', '3.3', 'Manajemen Kas', '3.3.1', 'Pengelolaan Uang Kas', 'PUK1', 'Proses setoran kas tidak sesuai ketentuan', true, true, true, 'Uang Kas/Tunai/Bank tidak balance'),
(3, 'KEUANGAN', '3.3', 'Manajemen Kas', '3.3.1', 'Pengelolaan Uang Kas', 'PUK2', 'Pengelolaan maksimum kas tidak optimal', true, true, true, 'Saldo kas harian cabang melebihi limit kas'),
(3, 'KEUANGAN', '3.3', 'Manajemen Kas', '3.3.1', 'Pengelolaan Uang Kas', 'PUK3', 'Proses rekonsiliasi uang kas tidak sesuai ketentuan', true, true, true, E'Selisih lebih/kurang uang kas\nDitemukannya uang tak bertuan yang tidak terselesaikan'),
(3, 'KEUANGAN', '3.3', 'Manajemen Kas', '3.3.1', 'Pengelolaan Uang Kas', 'PUK4', 'Proses cash opname tidak sesuai ketentuan', true, true, true, E'Tidak dilakukannya/tidak konsistennya proses opname kas\nForm mutasi kas tidak ada tandatangan para pihak\nForm mutasi kas tidak ada'),
(4, 'EKSTERNALITAS', '4.1', 'Hukum & Litigasi', '4.1.1', 'Memberikan Legal Advise dan Bantuan Hukum', 'LAH1', 'Pemberian bantuan hukum tidak melindungi kepentingan Lembaga', false, false, true, NULL),
(4, 'EKSTERNALITAS', '4.1', 'Hukum & Litigasi', '4.1.2', 'Legalitas, Litigasi dan Penanganan Perkara', 'LIT1', 'Penatakerjaan dokumen hukum tidak terjamin keamanannya', true, false, true, 'Tidak adanya dokumen legalitas cabang'),
(4, 'EKSTERNALITAS', '4.1', 'Hukum & Litigasi', '4.1.3', 'Aspek Hukum Perjanjian Dengan Pihak Ketiga', 'HKT1', 'Kontrak/perjanjian dengan pihak ketiga tidak sesuai dengan kaidah hukum', true, true, true, 'Adanya klausul yang melemahkan lembaga di dalam PKS'),
(4, 'EKSTERNALITAS', '4.1', 'Hukum & Litigasi', '4.1.3', 'Aspek Hukum Perjanjian Dengan Pihak Ketiga', 'HKT2', 'Kerjasama dengan pihak ketiga tidak dilandasi dengan kontrak/perjanjian', true, true, true, 'Tidak adanya Perjanjian Kerja Sama (PKS) dengan pihak ketiga'),
(4, 'EKSTERNALITAS', '4.2', 'Interaksi Pelayanan', '4.2.1', 'Pelayanan Kepada Anggota', 'PLA1', 'Standar pelayanan kepada anggota tidak dijalankan sesuai ketentuan', true, false, false, E'Disiplin center tidak dijalankan sebagaimana mestinya\nDalam hal anggota cuti namun anggota/suami meninggal tidak mendapatkan santunan'),
(4, 'EKSTERNALITAS', '4.3', 'Pengelolaan Pengaduan', '4.3.1', 'Penanganan Pengaduan, Pemantauan & Pelaporan', 'PPL1', 'Laporan pengaduan nasabah/customer tidak ditindaklanjuti sesuai ketentuan', true, true, true, NULL);

-- Verify
SELECT COUNT(*) as total_rcm_rows FROM public.rcm_risk_issue;
