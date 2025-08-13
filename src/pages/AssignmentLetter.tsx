import { FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import AddendumForm from '../components/AddendumForm';
import AddendumList from '../components/AddendumList';
import AssignmentLetterForm from '../components/AssignmentLetterForm';
import AssignmentLetterList from '../components/AssignmentLetterList';

export default function AssignmentLetter() {
  const [activeTab, setActiveTab] = useState<'letter' | 'addendum'>('letter');
  const [showFormModal, setShowFormModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="h-full bg-gray-50 p-0">
  <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Surat Tugas</h1>
          <p className="text-gray-600">Buat surat tugas atau addendum</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => {
                  setActiveTab('letter');
                  setShowFormModal(false);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'letter'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Surat Tugas
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('addendum');
                  setShowFormModal(false);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'addendum'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Addendum
                </div>
              </button>
            </nav>
          </div>

          {/* Action Button */}
          <div className="px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => setShowFormModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Buat {activeTab === 'letter' ? 'Surat Tugas' : 'Addendum'}
            </button>
          </div>
        </div>

        {/* Content - List */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'letter' ? (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Daftar Surat Tugas</h2>
              <AssignmentLetterList refreshTrigger={refreshTrigger} />
            </div>
          ) : (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Daftar Addendum</h2>
              <AddendumList refreshTrigger={refreshTrigger} />
            </div>
          )}
        </div>

        {/* Form Modal */}
        {showFormModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Buat {activeTab === 'letter' ? 'Surat Tugas' : 'Addendum'}
                  </h3>
                  <button
                    onClick={() => setShowFormModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

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
        )}
      </div>
    </div>
  );
}
