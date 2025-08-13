import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

interface Addendum {
  id: string;
  letter_id: string;
  assigment_letter: string;
  addendum_type: string;
  branch_name: string;
  region: string;
  team: string; // Team members
  leader: string; // Team Leader
  transport: number;
  konsumsi: number;
  etc: number;
  keterangan?: string;
  start_date?: string;
  end_date?: string;
  tanggal_input?: string;
  created_by?: string;
}

interface Account {
  profile_id: string;
  full_name: string;
}

interface AddendumListProps {
  refreshTrigger: number;
}

export default function AddendumList({ refreshTrigger }: AddendumListProps) {
  const [addendums, setAddendums] = useState<Addendum[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAddendum, setSelectedAddendum] = useState<Addendum | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAddendums();
    fetchAccounts();
  }, [refreshTrigger]);

  const fetchAddendums = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('addendum')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      console.log('Addendum data:', data); // Debug log
      setAddendums(data || []);
    } catch (error) {
      console.error('Error fetching addendums:', error);
      toast.error('Failed to fetch addendums');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('auditor_aliases')
        .select('profile_id, full_name');

      if (error) {
        console.error('Error fetching auditor aliases:', error);
        return;
      }
      
      console.log('Auditor aliases data:', data); // Debug log
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching auditor aliases:', error);
    }
  };

  const formatTeam = (team: string) => {
    if (!team) return '-';
    try {
      const teamArray = JSON.parse(team);
      if (Array.isArray(teamArray)) {
        return teamArray.join(', ');
      }
      return team;
    } catch {
      return team;
    }
  };

  const formatDateRange = (addendum: Addendum) => {
    if (addendum.start_date && addendum.end_date) {
      return `${new Date(addendum.start_date).toLocaleDateString('id-ID')} - ${new Date(addendum.end_date).toLocaleDateString('id-ID')}`;
    }
    return '-';
  };

  const getCreatorName = (createdBy: string | undefined) => {
    console.log('Looking for creator:', createdBy); // Debug log
    console.log('Available accounts:', accounts); // Debug log
    
    if (!createdBy) return 'Unknown';
    const account = accounts.find(acc => acc.profile_id === createdBy);
    
    console.log('Found account:', account); // Debug log
    return account?.full_name || 'Unknown';
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'long' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    return `${day}, ${month} ${year} | ${time}`;
  };

  const handleViewDetail = (addendum: Addendum) => {
    setSelectedAddendum(addendum);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nomor Surat
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cabang - Regional
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pelaksanaan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jenis
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {addendums.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Belum ada addendum
                </td>
              </tr>
            ) : (
              addendums.map((addendum, index) => (
                <tr key={addendum.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {addendum.assigment_letter}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {addendum.branch_name} - {addendum.region}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateRange(addendum)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {addendum.addendum_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetail(addendum)}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAddendum && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detail Addendum</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nomor Surat</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.assigment_letter}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Regional</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.region}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nama Cabang</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.branch_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Jenis Addendum</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.addendum_type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tim Auditor</label>
                    <p className="text-sm text-gray-900">{formatTeam(selectedAddendum.team)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ketua Tim</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.leader || '-'}</p>
                  </div>
                  {selectedAddendum.start_date && selectedAddendum.end_date && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Periode</label>
                      <p className="text-sm text-gray-900">{formatDateRange(selectedAddendum)}</p>
                    </div>
                  )}
                  {selectedAddendum.keterangan && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Keterangan</label>
                      <p className="text-sm text-gray-900">{selectedAddendum.keterangan}</p>
                    </div>
                  )}
                </div>

                {/* Creator and Date Info */}
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dibuat oleh</label>
                      <p className="text-sm text-gray-900">
                        {getCreatorName(selectedAddendum.created_by)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tanggal/Waktu Input</label>
                      <p className="text-sm text-gray-900">
                        {formatDateTime(selectedAddendum.tanggal_input)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Budget Section */}
                {(selectedAddendum.transport !== undefined || selectedAddendum.konsumsi !== undefined || selectedAddendum.etc !== undefined) && (
                  <div className="mt-6 border-t pt-4">
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Anggaran</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Transportasi</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {selectedAddendum.transport !== undefined ? `Rp ${selectedAddendum.transport.toLocaleString('id-ID')}` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Konsumsi</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {selectedAddendum.konsumsi !== undefined ? `Rp ${selectedAddendum.konsumsi.toLocaleString('id-ID')}` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Lain-lain</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {selectedAddendum.etc !== undefined ? `Rp ${selectedAddendum.etc.toLocaleString('id-ID')}` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                        <span className="text-sm font-bold text-gray-900">Total</span>
                        <span className="text-sm font-bold text-indigo-700">
                          Rp {((selectedAddendum.transport || 0) + (selectedAddendum.konsumsi || 0) + (selectedAddendum.etc || 0)).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
