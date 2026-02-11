import { useEffect, useState } from "react";
import "../../styles/audit-rating.css";

function AuditRatingCalculator() {
  const [minor, setMinor] = useState<number>(0);
  const [moderate, setModerate] = useState<number>(0);
  const [major, setMajor] = useState<number>(0);
  const [fraud, setFraud] = useState<boolean>(false);
  const [rating, setRating] = useState<string>("LOW");
  const [showCriteria, setShowCriteria] = useState<boolean>(false);

  useEffect(() => {
    calculateRating();
  }, [minor, moderate, major, fraud]);

  const calculateRating = () => {
    if (fraud) {
      setRating("HIGH");
      return;
    }

    if (major >= 3) {
      setRating("HIGH");
      return;
    }

    if (major === 2) {
      setRating(moderate > 10 ? "HIGH" : "MEDIUM");
      return;
    }

    if (major === 1) {
      setRating(moderate > 12 ? "HIGH" : "MEDIUM");
      return;
    }

    // major === 0
    if (moderate > 15) setRating("HIGH");
    else if (moderate >= 8) setRating("MEDIUM");
    else setRating("LOW");
  };

  return (
    <>
      <div className="text-center mb-6 relative z-1">
        <h2 className="text-xl font-semibold text-indigo-600 mb-2">Audit Rating Calculator</h2>
        <p className="text-gray-500 text-sm">Masukkan jumlah temuan dan checklist fraud jika ada.</p>
        <p className="text-gray-500 text-sm">Hasil rating akan muncul otomatis.</p>
      </div>

      <div className="space-y-5 relative z-1">
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="minor">Minor</label>
          <div className="relative">
            <input
              type="number"
              id="minor"
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-gray-900"
              min="0"
              value={minor}
              onChange={(e) => setMinor(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="moderate">Moderate</label>
          <div className="relative">
            <input
              type="number"
              id="moderate"
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-gray-900"
              min="0"
              value={moderate}
              onChange={(e) => setModerate(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="major">Major</label>
          <div className="relative">
            <input
              type="number"
              id="major"
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-gray-900" 
              min="0"
              value={major}
              onChange={(e) => setMajor(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="form-group mt-4">
          <div className="flex items-center">
            <input
              id="fraud"
              type="checkbox"
              checked={fraud}
              onChange={(e) => setFraud(e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="fraud" className="ml-2 block text-sm text-gray-700">
              Terdapat Fraud
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <div className="text-sm font-medium text-gray-700 mb-3">Rating Audit Issue Anda:</div>
        <div className={`
          py-2 px-8 rounded-full font-semibold text-white text-base min-w-[120px] text-center
          ${rating === 'LOW' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 
            rating === 'MEDIUM' ? 'bg-gradient-to-r from-amber-500 to-yellow-600' :
            'bg-gradient-to-r from-rose-500 to-red-600'}
          shadow-lg
        `}>
          {rating}
        </div>
        
        {/* Button untuk menampilkan kriteria - Ukuran lebih kecil dan subtle */}
        <button
          type="button"
          onClick={() => setShowCriteria(true)}
          className="mt-4 flex items-center gap-1 px-2 py-1 text-xs text-indigo-500 bg-white hover:bg-indigo-50 rounded border border-indigo-100 transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Lihat Kriteria Rating
        </button>
      </div>

      {/* Modal dialog untuk kriteria - tampil saat diklik */}
      {showCriteria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setShowCriteria(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Background accent yang lebih halus dan rapi */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-50 rounded-full opacity-30"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-50 rounded-full opacity-30"></div>
            <div className="absolute top-1/2 right-0 transform translate-x-1/3 -translate-y-1/2 w-32 h-32 bg-blue-50 rounded-full opacity-20"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-40 h-40 bg-purple-50 rounded-full opacity-20"></div>
            
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-600">
                    <path clipRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" fillRule="evenodd"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Kriteria Rating Audit</h3>
              </div>
              <button 
                onClick={() => setShowCriteria(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content - pastikan ini memiliki z-index lebih tinggi dari background */}
            <div className="space-y-4 mt-2 relative z-10 max-h-[60vh] overflow-y-auto">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-semibold text-green-800 mb-2 text-sm">LOW</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  <li>Tidak ada issue/temuan dengan kategori MAJOR atau ada 1 s.d. 7 issue/temuan kategori MODERATE</li>
                </ul>
              </div>
              
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <h4 className="font-semibold text-amber-800 mb-2 text-sm">MEDIUM</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  <li>Tidak ada issue/temuan kategori MAJOR dan terdapat 8 s.d. 15 temuan/issue kategori MODERATE atau</li>
                  <li>Terdapat 1 issue/temuan kategori MAJOR dan terdapat s.d. 12 issue/temuan kategori MODERATE atau</li>
                  <li>Terdapat 2 issue/temuan kategori MAJOR dan terdapat s.d. 10 issue/temuan kategori MODERATE</li>
                </ul>
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <h4 className="font-semibold text-red-800 mb-2 text-sm">HIGH</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  <li>Tidak ada issue/temuan kategori MAJOR dan terdapat lebih dari 15 temuan/issue kategori MODERATE atau</li>
                  <li>Terdapat 1 issue/temuan kategori MAJOR dan lebih dari 12 issue/temuan kategori MODERATE atau</li>
                  <li>Terdapat 2 issue/temuan kategori MAJOR dan lebih dari 10 issue/temuan kategori MODERATE atau</li>
                  <li>Terdapat lebih dari 2 issue/temuan kategori MAJOR dan atau tidak ada issue/temuan dengan kategori MODERATE atau</li>
                  <li>Terdapat <strong>FRAUD</strong></li>
                </ul>
              </div>

              {/* Link dokumen */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <a 
                  href="https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/documents/Memo%20Intern%20-%20Penetapan%20Audit%20Rating.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                >
                  Memo Intern - Penetapan Audit Rating
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AuditRatingCalculator;