import { useState } from 'react';
import ComponentAccessGuard from '../components/pull-request/ComponentAccessGuard';
import DbLoanSaving from '../components/pull-request/DbLoanSaving';
import DetailAnggota from '../components/pull-request/DetailAnggota';
import FixAsset from '../components/pull-request/FixAsset';
import KDP from '../components/pull-request/KDP';
import TAK from '../components/pull-request/TAK';
import THC from '../components/pull-request/THC';
import TLP from '../components/pull-request/TLP';

import { RefreshCw } from 'lucide-react';

function PullRequestPage() {
  // Add active tab state
  const [activeTab, setActiveTab] = useState('pullRequests');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="w-full h-full flex flex-col px-4 py-2">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-5xl font-bold text-gray-900">Database</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-full transition-all duration-300 ease-in-out border border-transparent
              ${isRefreshing 
                ? 'bg-indigo-100 text-indigo-600 shadow-inner cursor-not-allowed' 
                : 'hover:bg-white hover:border-gray-200 hover:shadow-md text-gray-500 hover:text-indigo-600 active:scale-95'
              }`}
            title="Refresh Data"
          >
            <RefreshCw 
              size={20} 
              className={`transition-transform duration-700 ${isRefreshing ? 'animate-spin' : ''}`} 
            />
          </button>
        </div>
        <p className="text-gray-600 text-sm">
          {/* Keterangan akan diisi sendiri */}
          Request data berdasarkan kebutuhan user, untuk saat ini hanya tersedia data cabang yang ada di MDIS1 saja.
        </p>
      </div>

      {/* Tab Navigation with shadow and consistent styling */}
      <div className="bg-white rounded-lg shadow-md mb-6 w-full">
        <div className="flex border-b overflow-x-auto no-scrollbar w-full">
          <button
            className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex-shrink-0 md:flex-1 text-center ${
              activeTab === 'pullRequests'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('pullRequests')}
          >
            Db Loan and Saving
          </button>
          <button
            className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex-shrink-0 md:flex-1 text-center ${
              activeTab === 'srssRequests'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('srssRequests')}
          >
            Detail Anggota
          </button>
          <button
            className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex-shrink-0 md:flex-1 text-center ${
              activeTab === 'fixAsset'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('fixAsset')}
          >
            Fix Asset
          </button>
          <button
            className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex-shrink-0 md:flex-1 text-center ${
              activeTab === 'thc'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('thc')}
          >
            THC
          </button>
          <button
            className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex-shrink-0 md:flex-1 text-center ${
              activeTab === 'tak'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('tak')}
          >
            TAK
          </button>
          <button
            className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex-shrink-0 md:flex-1 text-center ${
              activeTab === 'tlp'
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('tlp')}
          >
            TLP
          </button>
          <button
            className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex-shrink-0 md:flex-1 text-center ${
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
        {activeTab === 'pullRequests' && (
          <ComponentAccessGuard componentName="db_loan_saving">
            <DbLoanSaving key={refreshKey} />
          </ComponentAccessGuard>
        )}
        {activeTab === 'srssRequests' && (
          <ComponentAccessGuard componentName="detail_anggota">
            <DetailAnggota key={refreshKey} />
          </ComponentAccessGuard>
        )}
        {activeTab === 'fixAsset' && (
          <ComponentAccessGuard componentName="fix_asset">
            <FixAsset key={refreshKey} />
          </ComponentAccessGuard>
        )}
        {activeTab === 'thc' && (
          <ComponentAccessGuard componentName="thc">
            <THC key={refreshKey} />
          </ComponentAccessGuard>
        )}
        {activeTab === 'tak' && (
          <ComponentAccessGuard componentName="tak">
            <TAK key={refreshKey} />
          </ComponentAccessGuard>
        )}
        {activeTab === 'tlp' && (
          <ComponentAccessGuard componentName="tlp">
            <TLP key={refreshKey} />
          </ComponentAccessGuard>
        )}
        {activeTab === 'kdp' && (
          <ComponentAccessGuard componentName="kdp">
            <KDP key={refreshKey} />
          </ComponentAccessGuard>
        )}
      </div>
    </div>
  );
}

export default PullRequestPage;