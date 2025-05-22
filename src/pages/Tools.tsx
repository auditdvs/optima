import { AlertTriangle, ClipboardList, File, FileSpreadsheet } from 'lucide-react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import '../styles/download-button.css';

function THCLinks() {
  const thcLinks = [
    {
      url: "https://olah-data-thc.streamlit.app/",
      title: "THC Link 1",
      description: "Regional : A, B, C"
    },
    {
      url: "https://thc-alter-2.streamlit.app/",
      title: "THC Link 2",
      description: "Regional D, E, F"
    },
    {
      url: "https://thc-alter-0103.streamlit.app/",
      title: "THC Link 3",
      description: "Regional G, H, I"
    },
    {
      url: "https://thc-0104.streamlit.app/",
      title: "THC Link 4",
      description: "Regional J, K, L"
    },
    {
      url: "https://thc-0105.streamlit.app/",
      title: "THC Link 5",
      description: "Regional M, N, O"
    },
    {
      url: "https://thc-0106.streamlit.app/",
      title: "THC Link 6",
      description: "Regional P, Q, R, S"
    },
    {
      url: "https://thc-link-adm.streamlit.app/",
      title: "Admin Only",
      description: "This links only for admin's"
    }
  ];

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <Link to="/tools/thc-processing" className="text-blue-600 hover:text-blue-800">
          ← Kembali
        </Link>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">THC Regional Links</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {thcLinks.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline"
          >
            <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold mb-2">{link.title}</h3>
              <p className="text-gray-600">{link.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function WorkPaperLinks() {
  const workPaperLinks = [
    {
      url: "https://kk-anggota-keluar.streamlit.app/",
      title: "Kertas Kerja - Anggota Keluar",
      description: "Ini berisikan untuk sampel anggota keluar."
    },
    {
      url: "https://kk-anggota-par.streamlit.app/",
      title: "Kertas Kerja - Anggota PAR",
      description: "Ini berisikan untuk sampel anggota PAR"
    },
    {
      url: "https://kk-konsumsi.streamlit.app/",
      title: "Kertas Kerja - Konsumsi",
      description: "Ini berisikan untuk pengecekkan biaya pengeluaran konsumsi, beradasarkan kriteria total kuantitas beras, galon, gula, dll"
    },
    {
      url: "https://kk-simpanan-pinjaman.streamlit.app/",
      title: "Kertas Kerja - Simpanan dan Pinjaman",
      description: "Ini berisikan simpanan dan pinjaman berdasarkan center sampel dari THC yang sudah di buat. Tolong pilih center sesuai sampel yang dipakai"
    },
        {
      url: "https://kk-santunan-meninggal.streamlit.app/",
      title: "Kertas Kerja - Santunan Meninggal",
      description: "Ini berisikan pengecekkan santunan anggota dan suami meninggal"
    },
    {
      url: "https://analysis-trx-bbm.streamlit.app/",
      title: "Kertas Kerja - Analisa BBM",
      description: "Ini berisikan ketentuan maksimal jumlah BBM dalam 1 bulan sesuai dengan jabatan"
    },
    {
      url: "https://analysis-trx-fc.streamlit.app/",
      title: "Kertas Kerja - Analisa Fotocopy",
      description: "Ini berisikan untuk jumlah form yang difotocopy, berdasarkan jumlah kewajaran harga per lembar."
    }
  ];

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <Link to="/tools/work-paper" className="text-blue-600 hover:text-blue-800">
          ← Kembali
        </Link>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Kertas Kerja Links</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 grid-auto-rows-fr">
        {workPaperLinks.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline h-full"
          >
            <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-2">{link.title}</h3>
              <p className="text-gray-600 flex-grow">{link.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function Tools() {
  const location = useLocation();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link 
          to="/tools/thc-processing"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <FileSpreadsheet size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">THC Data Processing</h3>
              <p className="text-sm text-gray-600">Process and analyze THC data</p>
            </div>
          </div>
        </Link>

        <Link 
          to="/tools/anomaly-processing"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <AlertTriangle size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Anomaly Processing</h3>
              <p className="text-sm text-gray-600">Detect and analyze anomalies</p>
            </div>
          </div>
        </Link>

        <Link 
          to="/tools/work-paper"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <ClipboardList size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Work Paper</h3>
              <p className="text-sm text-gray-600">Access work paper templates and tools</p>
            </div>
          </div>
        </Link>

        <Link 
          to="/tools/tools-update"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <File size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Tools Updates</h3>
              <p className="text-sm text-gray-600">Updated tools anomalies etc</p>
            </div>
          </div>
        </Link>
      </div>

      <Routes>
        <Route path="thc-processing" element={<THCProcessing />} />
        <Route path="thc-processing/thc-links" element={<THCLinks />} />
        <Route path="anomaly-processing" element={<AnomalyProcessing />} />
        <Route path="work-paper" element={<WorkPaper />} />
        <Route path="work-paper/work-paper-links" element={<WorkPaperLinks />} />
        <Route path="tools-update" element={<UpdateTools />} />
      </Routes>
    </div>
  );
}

function THCProcessing() {
  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Data Processing Steps</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/tools/thc-processing/thc-links" className="no-underline">
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">01. THC</h3>
            <p className="text-gray-600">Pengolahan data ini menggunakan bahan THC, Db Simpanan dan Db Pinjaman.</p>
          </div>
        </Link>
        
        <a href="https://tr-anggota-keluar.streamlit.app/" 
           className="no-underline" 
           target="_blank" 
           rel="noopener noreferrer">
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">02. TAK</h3>
            <p className="text-gray-600">Pengolahan data ini menggunakan bahan TAK dan Db Simpanan.</p>
          </div>
        </a>

        <a href="https://tlp-kdp.streamlit.app/" 
           className="no-underline" 
           target="_blank" 
           rel="noopener noreferrer">
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">03. TLP & KDP</h3>
            <p className="text-gray-600">Pengolahan data ini menggunakan bahan TLP, KDP dan Db Pinjaman.</p>
          </div>
        </a>

        <a href="https://merge-app.streamlit.app/" 
           className="no-underline" 
           target="_blank" 
           rel="noopener noreferrer">
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">04. VLOOK-UP & N/A</h3>
            <p className="text-gray-600">Pengolahan data ini menggunakan bahan data sebelumnya yang N/A dan sudah dicari secara manual.</p>
          </div>
        </a>

        <a href="https://merge-dbcr.streamlit.app/" 
           className="no-underline" 
           target="_blank" 
           rel="noopener noreferrer">
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">05. Merge Simpanan & Pinjaman</h3>
            <p className="text-gray-600">Pengolahan data ini menggunakan bahan data sebelumnya (Pivot Simpanan dan Pinjaman N/A yang sudah di Vlookup dan disatukan dengan pivot pinjaman).</p>
          </div>
        </a>

        <a href="https://format-data-thc-gabungan.streamlit.app/" 
           className="no-underline" 
           target="_blank" 
           rel="noopener noreferrer">
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">06. Format Data THC Gabungan</h3>
            <p className="text-gray-600">Pengolahan data ini menggunakan bahan data sebelumnya (THC Final yang gabungan dari Simpanan dan Pinjaman, TLP, dan KDP).</p>
          </div>
        </a>
      </div>
    </div>
  );
}

function WorkPaper() {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        <Link to="/tools/work-paper/work-paper-links" className="no-underline">
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full">
            <div className="p-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Kertas Kerja</h3>
                <p className="text-gray-600 mb-6">Tools untuk generate kertas kerja pemeriksaan audit.</p>
              </div>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full">
          <div className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">KK Pemeriksaan Audit Reguler</h3>
              <p className="text-gray-600 mb-6">Download template kertas kerja pemeriksaan audit reguler.</p>
            </div>
            <a
              href="https://drive.google.com/uc?export=download&id=1FdEazpTh4usSVS4DGZrSoP7wnyGHANw8"
              target="_blank"
              rel="noopener noreferrer"
              className="Download-button"
            >
              <svg
                viewBox="0 0 640 512"
                width="20"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="white"
                  d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
                ></path>
              </svg>
              <span>Download Template</span>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full">
          <div className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">KK Pemeriksaan Audit Khusus</h3>
              <p className="text-gray-600 mb-6">Download template kertas kerja pemeriksaan audit khusus/fruad.</p>
            </div>
            <a
              href="https://drive.google.com/uc?export=download&id=1yyWunXE2auCiuBEdRPfzrFPZyyLxYu-d"
              target="_blank"
              rel="noopener noreferrer"
              className="Download-button"
            >
              <svg
                viewBox="0 0 640 512"
                width="20"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="white"
                  d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
                ></path>
              </svg>
              <span>Download Template</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}


function AnomalyProcessing() {
  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Anomaly Analysis Tools</h2>
      
      <div className="max-h-[600px] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <a 
            href="https://thc-simpanan.streamlit.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="no-underline h-full"
          >
            <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-2">THC Simpanan</h3>
              <p className="text-gray-600 flex-grow">Pengolahan data ini berdasarkan nilai rata-rata, nilai yang sering muncul dan nilai yang berbeda jauh dari kebiasaan anggota.</p>
            </div>
          </a>

          <a 
            href="https://pinjaman-ke.streamlit.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="no-underline h-full"
          >
            <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-2">THC Pinjaman</h3>
              <p className="text-gray-600 flex-grow">Pengolahan data ini berdasarkan ketentuan plafon pembiayaan per pinjaman ke-, jangka waktu, jenis pinjaman (sanitasi), masuk atau tidak nya ke dalam simpanan (25%).</p>
            </div>
          </a>

          <a 
            href="https://anomali-keseluruhan.streamlit.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="no-underline h-full"
          >
            <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Analisa Anomali Keseluruhan</h3>
              <p className="text-gray-600 flex-grow">Pengolahan data ini bertujuan untuk menganalisa total anomali antara pinjaman dan simpanan berdasarkan Petugas Lapang, Center Meeting dan Jadwal Center Meeting.</p>
            </div>
          </a>

          <a 
            href="https://danaresiko.streamlit.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="no-underline h-full"
          >
            <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Anomali Danaresiko</h3>
              <p className="text-gray-600 flex-grow">Pengolahan data ini bertujuan untuk mengecek data anggota dan yang diajukan danaresiko.</p>
            </div>
          </a>

          <a 
            href="https://filter-prr.streamlit.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="no-underline h-full"
          >
            <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Filter Pencairan Renovasi Rumah</h3>
              <p className="text-gray-600 flex-grow">Pengolahan data ini bertujuan untuk mengecek pencairan renovasi rumah, sesuai ketentuan atau tidaknya.</p>
            </div>
          </a>

          <a 
            href="https://trialbalance.streamlit.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="no-underline h-full"
          >
            <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Analisa Trial Balance</h3>
              <p className="text-gray-600 flex-grow">Analisa ini bertujuan untuk mengetahui fokus pemeriksaan kantor cabang, antara pinjaman dan simpanan.</p>
            </div>
          </a>

          <a 
            href="https://top-up.streamlit.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="no-underline h-full"
          >
            <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Analisa Top Up</h3>
              <p className="text-gray-600 flex-grow">Analisa ini bertujuan untuk mengetahui anomali top up.</p>
            </div>
          </a>
          
        </div>
      </div>
    </div>
  );
}

function UpdateTools() {
  const tools = [
    {
      title: "Format data THC Gabungan Pivot",
      description: "Format data THC gabungan yang sudah diselaraskan dengan tools THC.",
      url: "https://docs.google.com/spreadsheets/d/1i0cTy-rbn3iMdLAnjxLk0pwv5p6LQTJM/export?format=xlsx"
    },
    {
      title: "Format Laporan",
      description: "Contoh format laporan yang baik dan benar.",
      url: "https://drive.google.com/uc?export=download&id=1BAddVvqtT0ciWGan_3YR8SsRHG3gA6Ce"
    },
    {
      title: "Absensi dan Berita acara",
      description: "Contoh format berita acara, agenda entrance dan exit meeting.",
      url: "https://drive.google.com/uc?export=download&id=1SWTh4x1_19lFaTZX7Uz7Bwwv9jUpUmBy"
    }
  ];

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">{tool.title}</h3>
              <p className="text-gray-600 mb-6">{tool.description}</p>
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="Download-button"
              >
                <svg
                  viewBox="0 0 640 512"
                  width="20"
                  height="16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="white"
                    d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
                  ></path>
                </svg>
                <span>Download File</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Tools;
