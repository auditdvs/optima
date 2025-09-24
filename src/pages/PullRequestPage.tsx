import { useState } from 'react';
import DbLoanSaving from '../components/DbLoanSaving';
import DetailAnggota from '../components/DetailAnggota';
import FixAsset from '../components/FixAsset';
import THC from '../components/THC';
import TLP from '../components/TLP';
// Import TAK dan KDP
// Pastikan file TAK.tsx dan KDP.tsx sudah ada di ../components
import KDP from '../components/KDP';
import TAK from '../components/TAK';

function PullRequestPage() {
  // Add active tab state
  const [activeTab, setActiveTab] = useState('pullRequests');

  return (
    <div className="w-full h-full flex flex-col px-4 py-2">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Database</h1>
        <p className="text-gray-600 text-sm">
          {/* Keterangan akan diisi sendiri */}
          Request data berdasarkan kebutuhan user, untuk saat ini hanya tersedia data cabang yang ada di MDIS1 saja.
        </p>
      </div>

      {/* Tab Navigation with shadow and consistent styling */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b">
          <button
            className={`py-3 px-6 font-medium text-sm flex-1 text-center ${
              activeTab === 'pullRequests'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('pullRequests')}
          >
            Db Loan and Saving
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm flex-1 text-center ${
              activeTab === 'srssRequests'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('srssRequests')}
          >
            Detail Anggota
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm flex-1 text-center ${
              activeTab === 'fixAsset'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('fixAsset')}
          >
            Fix Asset
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm flex-1 text-center ${
              activeTab === 'thc'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('thc')}
          >
            THC
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm flex-1 text-center ${
              activeTab === 'tak'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('tak')}
          >
            TAK
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm flex-1 text-center ${
              activeTab === 'tlp'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('tlp')}
          >
            TLP
          </button>
          <button
            className={`py-3 px-6 font-medium text-sm flex-1 text-center ${
              activeTab === 'kdp'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('kdp')}
          >
            KDP
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === 'pullRequests' && <DbLoanSaving />}
        {activeTab === 'srssRequests' && <DetailAnggota />}
        {activeTab === 'fixAsset' && <FixAsset />}
        {activeTab === 'thc' && <THC />}
        {activeTab === 'tak' && <TAK />}
        {activeTab === 'tlp' && <TLP />}
        {activeTab === 'kdp' && <KDP />}
      </div>
    </div>
  );
}

export default PullRequestPage;