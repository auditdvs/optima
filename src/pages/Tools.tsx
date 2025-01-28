import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { FileSpreadsheet, AlertTriangle } from 'lucide-react';

function Tools() {
  const location = useLocation();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      <Routes>
        <Route path="thc-processing" element={<THCProcessing />} />
        <Route path="anomaly-processing" element={<AnomalyProcessing />} />
      </Routes>
    </div>
  );
}

function THCProcessing() {
  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Data Processing Steps</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/thc-links" className="no-underline">
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

function AnomalyProcessing() {
  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Anomaly Analysis Tools</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a 
          href="https://thc-simpanan.streamlit.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="no-underline"
        >
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">THC Simpanan</h3>
            <p className="text-gray-600">Pengolahan data ini berdasarkan nilai rata-rata, nilai yang sering muncul dan nilai yang berbeda jauh dari kebiasaan anggota.</p>
          </div>
        </a>

        <a 
          href="https://pinjaman-ke.streamlit.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="no-underline"
        >
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">THC Pinjaman</h3>
            <p className="text-gray-600">Pengolahan data ini berdasarkan ketentuan plafon pembiayaan per pinjaman ke-, jangka waktu, jenis pinjaman (sanitasi), masuk atau tidak nya ke dalam simpanan (25%).</p>
          </div>
        </a>

        <a 
          href="https://anomali-keseluruhan.streamlit.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="no-underline"
        >
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Analisa Anomali Keseluruhan</h3>
            <p className="text-gray-600">Pengolahan data ini bertujuan untuk menganalisa total anomali antara pinjaman dan simpanan berdasarkan Petugas Lapang, Center Meeting dan Jadwal Center Meeting.</p>
          </div>
        </a>

        <a 
          href="https://filter-anggota-lebih-dari-8.streamlit.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="no-underline"
        >
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Anggota lebih dari 8</h3>
            <p className="text-gray-600">Pengolahan data ini bertujuan untuk memfilter anggota di center yang lebih dari 8 berdasarkan nilai transaksi harian.</p>
          </div>
        </a>

        <a 
          href="https://filter-prr.streamlit.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="no-underline"
        >
          <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Filter Pencairan Renovasi Rumah</h3>
            <p className="text-gray-600">Pengolahan data ini bertujuan untuk mengecek pencairan renovasi rumah, sesuai ketentuan atau tidaknya.</p>
          </div>
        </a>
      </div>
    </div>
  );
}

export default Tools;