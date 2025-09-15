import { useState } from 'react';
import DbLoanSaving from '../components/DbLoanSaving';
import DetailAnggota from '../components/DetailAnggota';
import FixAsset from '../components/FixAsset';

function PullRequestPage() {
  // Add active tab state
  const [activeTab, setActiveTab] = useState('pullRequests');

  return (
    <div className="w-full h-full flex flex-col px-4 py-2">
      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'pullRequests'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('pullRequests')}
        >
          Db Loan and Saving
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'srssRequests'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('srssRequests')}
        >
          Detail Anggota 
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'fixAsset'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('fixAsset')}
        >
          Fix Asset
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'pullRequests' && <DbLoanSaving />}
      {activeTab === 'srssRequests' && <DetailAnggota />}
      {activeTab === 'fixAsset' && <FixAsset />}
    </div>
  );
}

export default PullRequestPage;