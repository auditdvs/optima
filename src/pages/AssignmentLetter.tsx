import { FileText, Plus, Upload } from 'lucide-react';
import { useState } from 'react';
import AddendumForm from '../components/manager-dashboard/AddendumForm';
import AddendumList from '../components/manager-dashboard/AddendumList';
import AssignmentLetterForm from '../components/manager-dashboard/AssignmentLetterForm';
import AssignmentLetterList from '../components/manager-dashboard/AssignmentLetterList';
import LpjSubmission from '../components/manager-dashboard/LpjSubmission';

export default function AssignmentLetter() {
  const [activeTab, setActiveTab] = useState<'letter' | 'addendum' | 'lpj'>('letter');
  const [showFormModal, setShowFormModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="h-full bg-gray-50 p-4 md:p-6 overflow-y-auto">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Assignment</h1>
            <p className="text-sm md:text-base text-gray-600">Buat surat tugas, addendum, dan LPJ.</p>
          </div>
        
          {/* Download Template Button - only show for letter/addendum tabs */}
          {(activeTab === 'letter' || activeTab === 'addendum') && (
            <button
              onClick={async () => {
                try {
                  const response = await fetch('https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/letter/UM%20-%20FILE%20MENTAH.xlsx');
                  const blob = await response.blob();
                  const link = document.createElement('a');
                  link.href = window.URL.createObjectURL(blob);
                  link.download = 'UM KC ...., 202....xlsx';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (error) {
                  console.error('Download failed', error);
                  alert('Gagal mengunduh template');
                }
              }}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-sm font-semibold rounded-xl bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all active:scale-95 shadow-sm"
            >
              <FileText className="w-5 h-5 mr-2" />
              Download Template UM
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex overflow-x-auto">
              <button
                onClick={() => {
                  setActiveTab('letter');
                  setShowFormModal(false);
                }}
                className={`flex-1 min-w-[120px] py-4 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'letter'
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Surat Tugas
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('addendum');
                  setShowFormModal(false);
                }}
                className={`flex-1 min-w-[120px] py-4 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'addendum'
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Addendum
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('lpj');
                  setShowFormModal(false);
                }}
                className={`flex-1 min-w-[180px] py-4 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'lpj'
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Upload className="w-5 h-5 mr-2" />
                  LPJ
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content - List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {activeTab === 'letter' ? (
            <div className="p-4 md:p-6 overflow-x-auto">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Surat Tugas</h2>
                  <button
                    onClick={() => setShowFormModal(true)}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-md shadow-indigo-600/20 text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Surat Tugas
                  </button>
                </div>
                <p className="text-sm text-red-500 mt-1">Sebelum submit surat tugas, pastikan semua data sudah terisi dengan benar.</p>
              </div>
              <AssignmentLetterList refreshTrigger={refreshTrigger} />
            </div>
          ) : activeTab === 'addendum' ? (
            <div className="p-4 md:p-6 overflow-x-auto">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Daftar Addendum</h2>
                  <button
                    onClick={() => setShowFormModal(true)}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-md shadow-indigo-600/20 text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95"
                  >
                  <Plus className="w-4 h-4 mr-2" />
                  Buat Addendum
                </button>
                </div>
                <p className="text-sm text-red-500 mt-1">Sebelum submit addendum, pastikan semua data sudah terisi dengan benar.</p>
              </div>
              <AddendumList refreshTrigger={refreshTrigger} />
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <LpjSubmission />
            </div>
          )}
        </div>

        {/* Form Modal - Only for letter/addendum */}
        {showFormModal && (activeTab === 'letter' || activeTab === 'addendum') && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4 sm:p-6 flex items-start justify-center">
            <div className="relative w-full max-w-4xl shadow-xl rounded-lg bg-white my-8">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900">
                    Buat {activeTab === 'letter' ? 'Surat Tugas' : 'Addendum'}
                  </h3>
                  <button
                    onClick={() => setShowFormModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="max-h-[80vh] overflow-y-auto pr-2">
                  {activeTab === 'letter' ? (
                    <AssignmentLetterForm
                      onSuccess={handleFormSuccess}
                      onCancel={() => setShowFormModal(false)}
                    />
                  ) : (
                    <AddendumForm
                      onSuccess={handleFormSuccess}
                      onCancel={() => setShowFormModal(false)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

