import { AlertTriangle, ArrowLeft, ClipboardList, Download, ExternalLink, File, FileSpreadsheet, Table } from 'lucide-react';
import { Link, Route, Routes } from 'react-router-dom';
import COA from '../components/COA';
import '../styles/download-button.css';

// Component untuk card yang bisa diklik dengan external link
function ExternalLinkCard({ url, title, description, className = "" }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="no-underline h-full"
    >
      <div className={`p-4 border rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col ${className}`}>
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <ExternalLink size={16} className="text-gray-400 flex-shrink-0 ml-2" />
        </div>
        <p className="text-gray-600 flex-grow">{description}</p>
      </div>
    </a>
  );
}

// Component untuk download card
function DownloadCard({ url, title, description }) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full">
      <div className="p-6 flex flex-col justify-between h-full">
        <div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900">{title}</h3>
          <p className="text-gray-600 mb-6">{description}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="Download-button"
        >
          <Download size={16} />
          <span>Download File</span>
        </a>
      </div>
    </div>
  );
}

// Component untuk back button
function BackButton({ to, text = "Kembali" }) {
  return (
    <div className="flex items-center mb-6">
      <Link to={to} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
        <ArrowLeft size={16} className="mr-2" />
        {text}
      </Link>
    </div>
  );
}

function THCLinks() {
  const thcLinks = [
    {
      url: "https://olah-data-thc.streamlit.app/",
      title: "THC Regional A, B, C",
      description: "Pengolahan data THC untuk regional A, B, dan C"
    },
    {
      url: "https://thc-alter-2.streamlit.app/",
      title: "THC Regional D, E, F",
      description: "Pengolahan data THC untuk regional D, E, dan F"
    },
    {
      url: "https://thc-alter-0103.streamlit.app/",
      title: "THC Regional G, H, I",
      description: "Pengolahan data THC untuk regional G, H, dan I"
    },
    {
      url: "https://thc-0104.streamlit.app/",
      title: "THC Regional J, K, L",
      description: "Pengolahan data THC untuk regional J, K, dan L"
    },
    {
      url: "https://thc-0105.streamlit.app/",
      title: "THC Regional M, N, O",
      description: "Pengolahan data THC untuk regional M, N, dan O"
    },
    {
      url: "https://thc-0106.streamlit.app/",
      title: "THC Regional P, Q, R, S",
      description: "Pengolahan data THC untuk regional P, Q, R, dan S"
    },
    {
      url: "https://thc-link-adm.streamlit.app/",
      title: "THC Admin Panel",
      description: "Panel administrasi khusus untuk admin"
    }
  ];

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <BackButton to="/tools/thc-processing" />
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">THC Regional Links</h2>
        <p className="text-gray-600">Pilih link sesuai dengan regional yang akan diproses</p>
        <h3 className="text-sm text-red-500 mt-1">Catatan: Jika tools regional nya sedang error pakai link yang lain dulu ya.</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {thcLinks.map((link, index) => (
          <ExternalLinkCard
            key={index}
            url={link.url}
            title={link.title}
            description={link.description}
            className={link.title.includes("Admin") ? "border-orange-200 bg-orange-50" : ""}
          />
        ))}
      </div>
    </div>
  );
}

function WorkPaperLinks() {
  const workPaperLinks = [
    {
      url: "https://kk-anggota-keluar.streamlit.app/",
      title: "Anggota Keluar",
      description: "Kertas kerja untuk sampel anggota keluar"
    },
    {
      url: "https://kk-anggota-par.streamlit.app/",
      title: "Anggota PAR",
      description: "Kertas kerja untuk sampel anggota PAR"
    },
    {
      url: "https://kk-konsumsi.streamlit.app/",
      title: "Analisa Konsumsi",
      description: "Pengecekkan biaya pengeluaran konsumsi berdasarkan kriteria kuantitas beras, galon, gula, dll"
    },
    {
      url: "https://kk-simpanan-pinjaman.streamlit.app/",
      title: "Simpanan & Pinjaman",
      description: "Analisa simpanan dan pinjaman berdasarkan center sampel dari THC"
    },
    {
      url: "https://kk-santunan-meninggal.streamlit.app/",
      title: "Santunan Meninggal",
      description: "Pengecekkan santunan anggota dan suami meninggal"
    },
    {
      url: "https://analysis-trx-bbm.streamlit.app/",
      title: "Analisa BBM",
      description: "Ketentuan maksimal jumlah BBM dalam 1 bulan sesuai jabatan"
    },
    {
      url: "https://analysis-trx-fc.streamlit.app/",
      title: "Analisa Fotocopy",
      description: "Analisa jumlah form fotocopy berdasarkan kewajaran harga per lembar"
    }
  ];

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <BackButton to="/tools/work-paper" />
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kertas Kerja Digital</h2>
        <p className="text-gray-600">Tools untuk generate dan menganalisa kertas kerja pemeriksaan audit</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {workPaperLinks.map((link, index) => (
          <ExternalLinkCard
            key={index}
            url={link.url}
            title={link.title}
            description={link.description}
          />
        ))}
      </div>
    </div>
  );
}

function Tools() {
  const mainTools = [
    {
      to: "/tools/thc-processing",
      icon: FileSpreadsheet,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      title: "THC Data Processing",
      description: "Pengolahan dan analisis data THC"
    },
    {
      to: "/tools/anomaly-processing",
      icon: AlertTriangle,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      title: "Anomaly Processing",
      description: "Deteksi dan analisis anomali data"
    },
    {
      to: "/tools/work-paper",
      icon: ClipboardList,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      title: "Work Paper",
      description: "Template dan tools kertas kerja"
    },
    {
      to: "/tools/tools-update",
      icon: File,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      title: "Tools Updates",
      description: "Update tools dan template terbaru"
    }
  ];
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tools & Utilities</h1>
          <p className="text-gray-600">Kumpulan tools untuk membantu proses audit dan pemeriksaan</p>
        </div>
        <Link 
          to="/tools/coa"
          className="bg-lime-500 hover:bg-lime-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2"
        >
          <Table size={20} />
          Chart of Accounts
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {mainTools.map((tool, index) => {
          const IconComponent = tool.icon;
          return (
            <Link 
              key={index}
              to={tool.to}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-all duration-300 p-6 group"
            >
              <div className="flex items-start">
                <div className={`p-3 rounded-lg ${tool.iconBg} ${tool.iconColor} group-hover:scale-110 transition-transform`}>
                  <IconComponent size={24} />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{tool.title}</h3>
                  <p className="text-sm text-gray-600">{tool.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Routes>
        <Route path="thc-processing" element={<THCProcessing />} />
        <Route path="thc-processing/thc-links" element={<THCLinks />} />
        <Route path="anomaly-processing" element={<AnomalyProcessing />} />
        <Route path="work-paper" element={<WorkPaper />} />
        <Route path="work-paper/work-paper-links" element={<WorkPaperLinks />} />
        <Route path="tools-update" element={<UpdateTools />} />
        <Route path="coa" element={<COA />} />
      </Routes>
    </div>
  );
}

function THCProcessing() {
  const processingSteps = [
    {
      step: "01",
      title: "THC Processing",
      description: "Pengolahan data menggunakan bahan THC, Database Simpanan dan Database Pinjaman",
      link: "/tools/thc-processing/thc-links",
      isInternal: true
    },
    {
      step: "02", 
      title: "TAK Processing",
      description: "Pengolahan data menggunakan bahan TAK dan Database Simpanan",
      link: "https://tr-anggota-keluar.streamlit.app/",
      isInternal: false
    },
    {
      step: "03",
      title: "TLP & KDP Processing", 
      description: "Pengolahan data menggunakan bahan TLP, KDP dan Database Pinjaman",
      link: "https://tlp-kdp.streamlit.app/",
      isInternal: false
    },
    {
      step: "04",
      title: "VLOOKUP & N/A Handler",
      description: "Pengolahan data N/A yang sudah dicari secara manual dengan VLOOKUP",
      link: "https://merge-app.streamlit.app/",
      isInternal: false
    },
    {
      step: "05",
      title: "Merge Simpanan & Pinjaman",
      description: "Penggabungan data pivot simpanan dan pinjaman yang sudah diproses",
      link: "https://merge-dbcr.streamlit.app/",
      isInternal: false
    },
    {
      step: "06",
      title: "Format Data THC Gabungan",
      description: "Format final data THC gabungan dari semua sumber data",
      link: "https://format-data-thc-gabungan.streamlit.app/",
      isInternal: false
    }
  ];

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Processing Workflow</h2>
        <p className="text-gray-600">Ikuti langkah-langkah berikut untuk memproses data THC secara berurutan</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processingSteps.map((step, index) => (
          step.isInternal ? (
            <Link key={index} to={step.link} className="no-underline h-full">
              <div className="p-6 border-2 border-blue-200 bg-blue-50 rounded-lg hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                <div className="flex items-center mb-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold mr-3">
                    {step.step}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                </div>
                <p className="text-gray-600 flex-grow">{step.description}</p>
              </div>
            </Link>
          ) : (
            <a key={index} href={step.link} target="_blank" rel="noopener noreferrer" className="no-underline h-full">
              <div className="p-6 border rounded-lg hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-600 text-white text-sm font-bold mr-3">
                      {step.step}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                  </div>
                  <ExternalLink size={16} className="text-gray-400" />
                </div>
                <p className="text-gray-600 flex-grow">{step.description}</p>
              </div>
            </a>
          )
        ))}
      </div>
    </div>
  );
}

function WorkPaper() {
  const downloadTemplates = [
    {
      title: "KK Pemeriksaan Audit Reguler",
      description: "Template kertas kerja untuk pemeriksaan audit reguler",
      url: "https://drive.google.com/uc?export=download&id=1FdEazpTh4usSVS4DGZrSoP7wnyGHANw8"
    },
    {
      title: "KK Pemeriksaan Audit Khusus",
      description: "Template kertas kerja untuk pemeriksaan audit khusus/fraud",
      url: "https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/documents//KK%20Pemeriksaan%20Audit%20Khusus.xlsx"
    }
  ];

  return (
    <div className="mt-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Digital Work Paper Tools */}
        <Link to="/tools/work-paper/work-paper-links" className="no-underline">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full border-2 border-purple-200">
            <div className="p-6 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center mb-4">
                  <ClipboardList className="text-purple-600 mr-3" size={24} />
                  <h3 className="text-xl font-semibold text-gray-900">Kertas Kerja Digital</h3>
                </div>
                <p className="text-gray-700">Tools online untuk generate kertas kerja pemeriksaan audit secara otomatis</p>
              </div>
              <div className="mt-4 text-purple-600 font-medium">
                Akses Tools →
              </div>
            </div>
          </div>
        </Link>

        {/* Download Templates */}
        {downloadTemplates.map((template, index) => (
          <DownloadCard
            key={index}
            url={template.url}
            title={template.title}
            description={template.description}
          />
        ))}
      </div>
    </div>
  );
}

function AnomalyProcessing() {
  const anomalyTools = [
    {
      url: "https://thc-simpanan.streamlit.app/",
      title: "THC Simpanan",
      description: "Analisis berdasarkan nilai rata-rata, nilai yang sering muncul dan nilai yang berbeda jauh dari kebiasaan anggota",
      category: "THC Analysis"
    },
    {
      url: "https://pinjaman-ke.streamlit.app/",
      title: "THC Pinjaman",
      description: "Analisis berdasarkan ketentuan plafon pembiayaan per pinjaman, jangka waktu, jenis pinjaman",
      category: "THC Analysis"
    },
    {
      url: "https://anomali-keseluruhan.streamlit.app/",
      title: "Analisa Anomali Keseluruhan",
      description: "Analisa total anomali pinjaman dan simpanan berdasarkan Petugas Lapang dan Center Meeting",
      category: "General Analysis"
    },
    {
      url: "https://danaresiko.streamlit.app/",
      title: "Anomali Dana Resiko",
      description: "Pengecekkan data anggota dan yang diajukan dana resiko",
      category: "Risk Analysis"
    },
    {
      url: "https://filter-prr.streamlit.app/",
      title: "Filter Pencairan Renovasi Rumah",
      description: "Pengecekkan pencairan renovasi rumah sesuai ketentuan",
      category: "Disbursement"
    },
    {
      url: "https://trialbalance.streamlit.app/",
      title: "Analisa Trial Balance",
      description: "Mengetahui fokus pemeriksaan kantor cabang antara pinjaman dan simpanan",
      category: "Financial Analysis"
    },
    {
      url: "https://top-up.streamlit.app/",
      title: "Analisa Top Up",
      description: "Analisa anomali top up pinjaman",
      category: "Loan Analysis"
    }
  ];

  // Group tools by category
  const groupedTools = anomalyTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {});

  const categoryColors = {
    "THC Analysis": "border-blue-200 bg-blue-50",
    "General Analysis": "border-purple-200 bg-purple-50", 
    "Risk Analysis": "border-red-200 bg-red-50",
    "Disbursement": "border-green-200 bg-green-50",
    "Financial Analysis": "border-yellow-200 bg-yellow-50",
    "Loan Analysis": "border-indigo-200 bg-indigo-50"
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Anomaly Analysis Tools</h2>
        <p className="text-gray-600">Tools untuk mendeteksi dan menganalisa berbagai jenis anomali dalam data</p>
      </div>
      
      <div className="space-y-8">
        {Object.entries(groupedTools).map(([category, tools]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool, index) => (
                <ExternalLinkCard
                  key={index}
                  url={tool.url}
                  title={tool.title}
                  description={tool.description}
                  className={categoryColors[category] || ""}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpdateTools() {
  const updateTools = [
    {
      title: "Format Data THC Gabungan Pivot",
      description: "Format data THC gabungan yang sudah diselaraskan dengan tools THC untuk analisa lebih lanjut",
      url: "https://docs.google.com/spreadsheets/d/1i0cTy-rbn3iMdLAnjxLk0pwv5p6LQTJM/export?format=xlsx",
      type: "Excel Template"
    },
    {
      title: "Format Laporan Standard",
      description: "Template format laporan yang sesuai dengan standar pelaporan audit",
      url: "https://drive.google.com/uc?export=download&id=1BAddVvqtT0ciWGan_3YR8SsRHG3gA6Ce",
      type: "Document Template"
    },
    {
      title: "Absensi dan Berita Acara",
      description: "Template berita acara, agenda entrance dan exit meeting untuk dokumentasi audit",
      url: "https://drive.google.com/uc?export=download&id=1SWTh4x1_19lFaTZX7Uz7Bwwv9jUpUmBy",
      type: "Meeting Template"
    }
  ];

  return (
    <div className="mt-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tools & Template Updates</h2>
        <p className="text-gray-600">Download template dan tools terbaru untuk mendukung proses audit</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {updateTools.map((tool, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold text-gray-900">{tool.title}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {tool.type}
                </span>
              </div>
              <p className="text-gray-600 mb-6 flex-grow">{tool.description}</p>
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="Download-button mt-auto"
              >
                <Download size={16} />
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
