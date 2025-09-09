import { Eye, FileDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { downloadAssignmentLetterPDF } from '../services/pdfGenerator';

interface AssignmentLetter {
  id: string;
  branch_name: string;
  region: string;
  audit_type: string;
  assigment_letter: string;
  audit_period_start: string | null;
  audit_period_end: string | null;
  audit_start_date: string;
  audit_end_date: string;
  team: string;
  leader: string; // Team Leader
  transport: number;
  konsumsi: number;
  etc: number;
  tanggal_input?: string;
  created_by?: string;
  status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

interface Account {
  profile_id: string;
  full_name: string;
}

interface AssignmentLetterListProps {
  refreshTrigger: number;
}

export default function AssignmentLetterList({ refreshTrigger }: AssignmentLetterListProps) {
  const [letters, setLetters] = useState<AssignmentLetter[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<AssignmentLetter | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchLetters();
    fetchAccounts();
  }, [refreshTrigger, user]);

  const fetchLetters = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('letter')
        .select('*')
        .eq('created_by', user.id)
        .order('id', { ascending: false });

      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      console.log('Letter data:', data); // Debug log
      setLetters(data || []);
    } catch (error) {
      console.error('Error fetching letters:', error);
      toast.error('Failed to fetch assignment letters');
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

  const formatAuditPeriod = (letter: AssignmentLetter) => {
    if (letter.audit_period_start && letter.audit_period_end) {
      return `${new Date(letter.audit_period_start).toLocaleDateString('id-ID')} - ${new Date(letter.audit_period_end).toLocaleDateString('id-ID')}`;
    }
    if (letter.audit_start_date && letter.audit_end_date) {
      return `${new Date(letter.audit_start_date).toLocaleDateString('id-ID')} - ${new Date(letter.audit_end_date).toLocaleDateString('id-ID')}`;
    }
    return '-';
  };

  const formatTeam = (team: string) => {
    if (!team) return '-';
    try {
      const teamArray = JSON.parse(team);
      if (Array.isArray(teamArray)) {
        // Bersihkan setiap nama dari spasi ekstra dan format ulang
        return teamArray
          .map(member => member.trim())
          .filter(member => member.length > 0)
          .join(', '); // Pastikan ada spasi setelah koma
      }
      return team;
    } catch {
      // Jika bukan JSON, coba split by koma dan format ulang
      if (team.includes(',')) {
        return team.split(',')
          .map(member => member.trim())
          .filter(member => member.length > 0)
          .join(', ');
      }
      return team;
    }
  };

  const getCreatorName = (createdBy: string | undefined) => {
    console.log('Looking for creator:', createdBy); // Debug log
    console.log('Available accounts:', accounts); // Debug log
    
    if (!createdBy) return 'Unknown';
    const account = accounts.find(acc => acc.profile_id === createdBy);
    
    console.log('Found account:', account); // Debug log
    return account?.full_name || 'Unknown';
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">-</span>;
    
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
    }
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

  const handleViewDetail = (letter: AssignmentLetter) => {
    setSelectedLetter(letter);
    setShowDetailModal(true);
  };

  const handleDownloadPDF = async (letter: AssignmentLetter) => {
    // Only allow download if approved
    if (letter.status !== 'approved') {
      toast.error('Hanya assignment letter yang sudah disetujui yang dapat didownload');
      return;
    }

    setPdfLoading(letter.id);
    try {
      const fileName = `Surat_Tugas_${letter.audit_type}_${letter.branch_name.replace(/[^a-zA-Z0-9]/g, '_')}_${letter.assigment_letter.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      toast.loading(`Generating PDF untuk ${letter.audit_type}...`, { id: 'pdf-gen' });
      
      await downloadAssignmentLetterPDF(letter.id, fileName);
      
      toast.success(`PDF ${letter.audit_type} berhasil di-download!`, { id: 'pdf-gen' });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(`Gagal generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'pdf-gen' });
    } finally {
      setPdfLoading(null);
    }
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
                Tipe Audit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pelaksanaan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tim
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {letters.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Belum ada surat tugas
                </td>
              </tr>
            ) : (
              letters.map((letter, index) => (
                <tr key={letter.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {letter.assigment_letter}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {letter.branch_name} - {letter.region}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      letter.audit_type === 'reguler' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {letter.audit_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getStatusBadge(letter.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatAuditPeriod(letter)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="break-words whitespace-normal">
                      {formatTeam(letter.team)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetail(letter)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                      {letter.status === 'approved' ? (
                        <button
                          onClick={() => handleDownloadPDF(letter)}
                          disabled={pdfLoading === letter.id}
                          className="text-green-600 hover:text-green-900 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FileDown className="w-4 h-4 mr-1" />
                          {pdfLoading === letter.id ? 'Generating...' : 'PDF'}
                        </button>
                      ) : (
                        <span className="text-gray-400 flex items-center text-xs">
                          <FileDown className="w-4 h-4 mr-1" />
                          {letter.status === 'pending' ? 'Pending' : letter.status === 'rejected' ? 'Rejected' : 'N/A'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLetter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detail Surat Tugas</h3>
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
                    <p className="text-sm text-gray-900">{selectedLetter.assigment_letter}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Regional</label>
                    <p className="text-sm text-gray-900">{selectedLetter.region}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nama Cabang</label>
                    <p className="text-sm text-gray-900">{selectedLetter.branch_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Jenis Audit</label>
                    <p className="text-sm text-gray-900">{selectedLetter.audit_type || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tim Auditor</label>
                    <p className="text-sm text-gray-900">{formatTeam(selectedLetter.team)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ketua Tim</label>
                    <p className="text-sm text-gray-900">{selectedLetter.leader || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Periode Audit</label>
                    <p className="text-sm text-gray-900">{formatAuditPeriod(selectedLetter)}</p>
                  </div>
                </div>

                {/* Creator and Date Info */}
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dibuat oleh</label>
                      <p className="text-sm text-gray-900">
                        {getCreatorName(selectedLetter.created_by)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tanggal/Waktu Input</label>
                      <p className="text-sm text-gray-900">
                        {formatDateTime(selectedLetter.tanggal_input)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason Section - Only show if rejected */}
                {selectedLetter.status === 'rejected' && selectedLetter.rejection_reason && (
                  <div className="border-t pt-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-red-700 mb-2">Alasan Penolakan</label>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{selectedLetter.rejection_reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Budget Section */}
                {(selectedLetter.transport !== undefined || selectedLetter.konsumsi !== undefined || selectedLetter.etc !== undefined) && (
                  <div className="mt-6 border-t pt-4">
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Anggaran</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Transportasi</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {selectedLetter.transport !== undefined ? `Rp ${selectedLetter.transport.toLocaleString('id-ID')}` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Konsumsi</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {selectedLetter.konsumsi !== undefined ? `Rp ${selectedLetter.konsumsi.toLocaleString('id-ID')}` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">Lain-lain</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {selectedLetter.etc !== undefined ? `Rp ${selectedLetter.etc.toLocaleString('id-ID')}` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                        <span className="text-sm font-bold text-gray-900">Total</span>
                        <span className="text-sm font-bold text-indigo-700">
                          Rp {((selectedLetter.transport || 0) + (selectedLetter.konsumsi || 0) + (selectedLetter.etc || 0)).toLocaleString('id-ID')}
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
