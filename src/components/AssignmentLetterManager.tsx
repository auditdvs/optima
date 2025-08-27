import { Check, Edit, Eye, FileDown, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AssignmentLetterManagerEdit from '../components/AssignmentLetterManagerEdit';
import { supabase } from '../lib/supabaseClient';

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
  leader: string;
  transport: number;
  konsumsi: number;
  etc: number;
  status: 'pending' | 'approved' | 'rejected';
  tanggal_input?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  risk?: string;
  priority?: string | number;
}

interface Account {
  profile_id: string;
  full_name: string;
}

interface AssignmentLetterManagerProps {
  refreshTrigger?: number;
}

export default function AssignmentLetterManager({ refreshTrigger }: AssignmentLetterManagerProps) {
  const [letters, setLetters] = useState<AssignmentLetter[]>([]);
  const [addendums, setAddendums] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<AssignmentLetter | null>(null);
  const [selectedAddendum, setSelectedAddendum] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'letter' | 'addendum'>('letter');
  const [showAddendumDetailModal, setShowAddendumDetailModal] = useState(false);
  const [showAddendumRejectModal, setShowAddendumRejectModal] = useState(false);
  const [addendumRejectionReason, setAddendumRejectionReason] = useState('');

  useEffect(() => {
    fetchLetters();
    fetchAddendums();
    fetchAccounts();
  }, [refreshTrigger]);

  const fetchLetters = async () => {
    try {
      const { data, error } = await supabase
        .from('letter')
        .select('*')
        .order('tanggal_input', { ascending: false });

      if (error) throw error;
      setLetters(data || []);
    } catch (error) {
      console.error('Error fetching letters:', error);
      toast.error('Gagal mengambil data assignment letters');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAddendums = async () => {
    try {
      const { data, error } = await supabase
        .from('addendum')
        .select('*')
        .order('tanggal_input', { ascending: false });

      if (error) throw error;
      setAddendums(data || []);
    } catch (error) {
      console.error('Error fetching addendums:', error);
      toast.error('Gagal mengambil data addendum');
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
      
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching auditor aliases:', error);
    }
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  };

  const handleApprove = async (letterId: string) => {
    setProcessingId(letterId);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Tidak dapat mengidentifikasi user');
        return;
      }

      const { error } = await supabase
        .from('letter')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', letterId);

      if (error) throw error;

      toast.success('Assignment Letter berhasil disetujui');
      fetchLetters();
    } catch (error) {
      console.error('Error approving letter:', error);
      toast.error('Gagal menyetujui assignment letter');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (letterId: string, reason: string) => {
    setProcessingId(letterId);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Tidak dapat mengidentifikasi user');
        return;
      }

      const { error } = await supabase
        .from('letter')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', letterId);

      if (error) throw error;

      toast.success('Assignment Letter berhasil ditolak');
      setShowRejectModal(false);
      setRejectionReason('');
      fetchLetters();
    } catch (error) {
      console.error('Error rejecting letter:', error);
      toast.error('Gagal menolak assignment letter');
    } finally {
      setProcessingId(null);
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
        return teamArray.join(', ');
      }
      return team;
    } catch {
      return team;
    }
  };

  const getCreatorName = (createdBy: string | undefined) => {
    if (!createdBy) return 'Unknown';
    const account = accounts.find(acc => acc.profile_id === createdBy);
    return account?.full_name || 'Unknown';
  };

  const getApproverName = (approvedBy: string | undefined) => {
    if (!approvedBy) return '-';
    const account = accounts.find(acc => acc.profile_id === approvedBy);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };

  const handleDownloadPDF = async (letter: AssignmentLetter) => {
    // Only allow download if approved
    if (letter.status !== 'approved') {
      toast.error('Hanya assignment letter yang sudah disetujui yang dapat didownload');
      return;
    }

    try {
      // Import the PDF generator function
      const { downloadAssignmentLetterPDF } = await import('../services/pdfGenerator');
      
      const fileName = `Surat_Tugas_${letter.audit_type}_${letter.branch_name.replace(/[^a-zA-Z0-9]/g, '_')}_${letter.assigment_letter.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      toast.loading(`Generating PDF untuk ${letter.audit_type}...`, { id: 'pdf-gen' });
      
      await downloadAssignmentLetterPDF(letter.id, fileName);
      
      toast.success(`PDF ${letter.audit_type} berhasil di-download!`, { id: 'pdf-gen' });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(`Gagal generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'pdf-gen' });
    }
  };
  
  const handleDownloadAddendumPDF = async (addendum: any) => {
    // Only allow download if approved
    if (addendum.status !== 'approved') {
      toast.error('Hanya addendum yang sudah disetujui yang dapat didownload');
      return;
    }

    try {
      // Import the PDF generator function
      const { downloadAddendumPDF } = await import('../services/pdfGenerator');
      
      const fileName = `Addendum_${addendum.addendum_type}_${addendum.branch_name.replace(/[^a-zA-Z0-9]/g, '_')}_${addendum.assigment_letter.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      toast.loading(`Generating PDF untuk addendum...`, { id: 'pdf-gen' });
      
      await downloadAddendumPDF(addendum.id, fileName);
      
      toast.success(`PDF addendum berhasil di-download!`, { id: 'pdf-gen' });
    } catch (error) {
      console.error('Error downloading addendum PDF:', error);
      toast.error(`Gagal generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'pdf-gen' });
    }
  };
  
  const handleDownloadExcel = async (letterId: string, fileName?: string) => {
    try {
      toast.loading('Mengunduh file Excel...', { id: 'excel-download' });
      
      // Query untuk mendapatkan Excel file dari tabel letter (untuk Assignment Letter)
      const { data, error } = await supabase
        .from('letter')
        .select('file_url, branch_name, assigment_letter')
        .eq('id', letterId)
        .not('file_url', 'is', null)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!data || !data.file_url) {
        toast.error('File Excel tidak ditemukan untuk surat tugas ini', { id: 'excel-download' });
        return;
      }
      
      // Download file from URL
      const response = await fetch(data.file_url);
      const blob = await response.blob();
      
      const downloadFileName = fileName || `Excel_${data.branch_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${data.assigment_letter?.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast.success('File Excel berhasil diunduh!', { id: 'excel-download' });
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error(`Gagal mengunduh file Excel: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'excel-download' });
    }
  };

  const handleDownloadAddendumExcel = async (addendumId: string, fileName?: string) => {
    try {
      toast.loading('Mengunduh file Excel addendum...', { id: 'excel-download' });
      
      // Query untuk mendapatkan Excel file dari tabel addendum
      const { data, error } = await supabase
        .from('addendum')
        .select('excel_file_url, branch_name, assigment_letter')
        .eq('id', addendumId)
        .not('excel_file_url', 'is', null)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!data || !data.excel_file_url) {
        toast.error('File Excel tidak ditemukan untuk addendum ini', { id: 'excel-download' });
        return;
      }
      
      // Download file from URL
      const response = await fetch(data.excel_file_url);
      const blob = await response.blob();
      
      const downloadFileName = fileName || `Addendum_Excel_${data.branch_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${data.assigment_letter?.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast.success('File Excel addendum berhasil diunduh!', { id: 'excel-download' });
    } catch (error) {
      console.error('Error downloading addendum Excel:', error);
      toast.error(`Gagal mengunduh file Excel addendum: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'excel-download' });
    }
  };

  const handleViewDetail = (letter: AssignmentLetter) => {
    setSelectedLetter(letter);
    setShowDetailModal(true);
  };
  
  const handleViewAddendumDetail = (addendum: any) => {
    setSelectedAddendum(addendum);
    setShowAddendumDetailModal(true);
  };

  const handleEdit = (letter: AssignmentLetter) => {
    setSelectedLetter(letter);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    fetchLetters();
    toast.success('Assignment Letter berhasil diupdate');
  };
  
  const handleApproveAddendum = async (addendumId: string) => {
    setProcessingId(addendumId);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Tidak dapat mengidentifikasi user');
        return;
      }

      const { error } = await supabase
        .from('addendum')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', addendumId);

      if (error) throw error;

      toast.success('Addendum berhasil disetujui');
      fetchAddendums();
    } catch (error) {
      console.error('Error approving addendum:', error);
      toast.error('Gagal menyetujui addendum');
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleRejectAddendum = async (addendumId: string, reason: string) => {
    setProcessingId(addendumId);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Tidak dapat mengidentifikasi user');
        return;
      }

      const { error } = await supabase
        .from('addendum')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', addendumId);

      if (error) throw error;

      toast.success('Addendum berhasil ditolak');
      setShowAddendumRejectModal(false);
      setAddendumRejectionReason('');
      fetchAddendums();
    } catch (error) {
      console.error('Error rejecting addendum:', error);
      toast.error('Gagal menolak addendum');
    } finally {
      setProcessingId(null);
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
      
      {/* Sub Tab Navigation dengan Statistics */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('letter')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'letter'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  Surat Tugas
                </div>
              </button>
              <button
                onClick={() => setActiveTab('addendum')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'addendum'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  Addendum
                </div>
              </button>
            </nav>
            
            {/* Statistics */}
            <div className="flex items-center space-x-2 py-4">
              {/* Total */}
              <div className="flex items-center bg-gray-100 px-2 py-1 rounded-md">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  <span className="text-xs font-medium text-gray-700">Total:</span>
                  <span className="text-xs font-bold text-gray-900">
                    {activeTab === 'letter' ? letters.length : addendums.length}
                  </span>
                </div>
              </div>
              
              {/* Pending */}
              <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-md border border-yellow-200">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs font-medium text-yellow-700">Pending:</span>
                  <span className="text-xs font-bold text-yellow-800">
                    {activeTab === 'letter' 
                      ? letters.filter(l => l.status === 'pending').length 
                      : addendums.filter(a => a.status === 'pending').length}
                  </span>
                </div>
              </div>
              
              {/* Approved */}
              <div className="flex items-center bg-green-50 px-2 py-1 rounded-md border border-green-200">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-700">Approved:</span>
                  <span className="text-xs font-bold text-green-800">
                    {activeTab === 'letter' 
                      ? letters.filter(l => l.status === 'approved').length 
                      : addendums.filter(a => a.status === 'approved').length}
                  </span>
                </div>
              </div>
              
              {/* Rejected */}
              <div className="flex items-center bg-red-50 px-2 py-1 rounded-md border border-red-200">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  <span className="text-xs font-medium text-red-700">Rejected:</span>
                  <span className="text-xs font-bold text-red-800">
                    {activeTab === 'letter' 
                      ? letters.filter(l => l.status === 'rejected').length 
                      : addendums.filter(a => a.status === 'rejected').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'letter' ? (
        /* Surat Tugas Table */
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nomor Surat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cabang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audit Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat oleh</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      <div>
                        <div className="font-medium">{letter.branch_name}</div>
                        <div className="text-gray-500">{letter.region}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        letter.audit_type === 'reguler' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {letter.audit_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getStatusBadge(letter.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCreatorName(letter.created_by)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {letter.tanggal_input ? new Date(letter.tanggal_input).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetail(letter)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleEdit(letter)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                          title="Edit Assignment Letter"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {letter.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(letter.id)}
                              disabled={processingId === letter.id}
                              className="text-green-600 hover:text-green-900 flex items-center disabled:opacity-50"
                              title="Approve Assignment Letter"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedLetter(letter);
                                setShowRejectModal(true);
                              }}
                              disabled={processingId === letter.id}
                              className="text-red-600 hover:text-red-900 flex items-center disabled:opacity-50"
                              title="Reject Assignment Letter"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Excel download - always available */}
                        <button
                          onClick={() => handleDownloadExcel(letter.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                          title="Download Excel File"
                        >
                          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        {/* PDF download - only for approved */}
                        {letter.status === 'approved' && (
                          <button
                            onClick={() => handleDownloadPDF(letter)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Download PDF File"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Addendum Table */
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nomor Addendum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nomor ST</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cabang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {addendums.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
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
                      {addendum.assignment_letter_before}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{addendum.branch_name}</div>
                        <div className="text-gray-500">{addendum.region}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 break-words">
                        {addendum.addendum_type || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="line-clamp-2 max-w-xs">
                        {addendum.description || addendum.keterangan || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getStatusBadge(addendum.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewAddendumDetail(addendum)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                          title="View Addendum Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {addendum.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveAddendum(addendum.id)}
                              disabled={processingId === addendum.id}
                              className="text-green-600 hover:text-green-900 flex items-center disabled:opacity-50"
                              title="Approve Addendum"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedAddendum(addendum);
                                setShowAddendumRejectModal(true);
                              }}
                              disabled={processingId === addendum.id}
                              className="text-red-600 hover:text-red-900 flex items-center disabled:opacity-50"
                              title="Reject Addendum"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Excel download - always available if file exists */}
                        {addendum.excel_file_url && (
                          <button
                            onClick={() => handleDownloadAddendumExcel(addendum.id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            title="Download Addendum Excel File"
                          >
                            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        )}

                        {/* PDF download - only for approved */}
                        {addendum.status === 'approved' && (
                          <button
                            onClick={() => handleDownloadAddendumPDF(addendum)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Download Addendum PDF File"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLetter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detail Assignment Letter</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nomor Surat</label>
                    <p className="text-sm text-gray-900">{selectedLetter.assigment_letter}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedLetter.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cabang</label>
                    <p className="text-sm text-gray-900">{selectedLetter.branch_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Regional</label>
                    <p className="text-sm text-gray-900">{selectedLetter.region}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipe Audit</label>
                    <p className="text-sm text-gray-900">{selectedLetter.audit_type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ketua Tim</label>
                    <p className="text-sm text-gray-900">{selectedLetter.leader || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tim Auditor</label>
                    <p className="text-sm text-gray-900">{formatTeam(selectedLetter.team)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Periode Audit</label>
                    <p className="text-sm text-gray-900">{formatAuditPeriod(selectedLetter)}</p>
                  </div>
                </div>

                {/* Status Information */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-3">Informasi Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dibuat oleh</label>
                      <p className="text-sm text-gray-900">{getCreatorName(selectedLetter.created_by)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tanggal Dibuat</label>
                      <p className="text-sm text-gray-900">{formatDateTime(selectedLetter.tanggal_input)}</p>
                    </div>
                    {(selectedLetter.status === 'approved' || selectedLetter.status === 'rejected') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {selectedLetter.status === 'approved' ? 'Disetujui oleh' : 'Ditolak oleh'}
                          </label>
                          <p className="text-sm text-gray-900">{getApproverName(selectedLetter.approved_by)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Tanggal {selectedLetter.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                          </label>
                          <p className="text-sm text-gray-900">{formatDateTime(selectedLetter.approved_at)}</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {selectedLetter.status === 'rejected' && selectedLetter.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-50 rounded-md">
                      <label className="block text-sm font-medium text-red-700">Alasan Penolakan</label>
                      <p className="text-sm text-red-900 mt-1">{selectedLetter.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Budget Section */}
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-3">Anggaran</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Transportasi</span>
                      <span className="text-sm text-gray-900 font-medium">
                        Rp {selectedLetter.transport?.toLocaleString('id-ID') || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Konsumsi</span>
                      <span className="text-sm text-gray-900 font-medium">
                        Rp {selectedLetter.konsumsi?.toLocaleString('id-ID') || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Lain-lain</span>
                      <span className="text-sm text-gray-900 font-medium">
                        Rp {selectedLetter.etc?.toLocaleString('id-ID') || '0'}
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

                <div className="flex justify-end mt-6 space-x-3">
                  {/* Excel download - always available */}
                  <button
                    onClick={() => handleDownloadExcel(selectedLetter.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Excel
                  </button>
                  
                  {/* PDF download - only for approved */}
                  {selectedLetter.status === 'approved' && (
                    <button
                      onClick={() => handleDownloadPDF(selectedLetter)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Download PDF
                    </button>
                  )}
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

      {/* Edit Modal */}
      {showEditModal && selectedLetter && (
        <AssignmentLetterManagerEdit
          letter={selectedLetter}
          onSuccess={handleEditSuccess}
          onCancel={() => setShowEditModal(false)}
        />
      )}

      {/* Reject Modal for Assignment Letter */}
      {showRejectModal && selectedLetter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tolak Assignment Letter</h3>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Nomor Surat: <strong>{selectedLetter.assigment_letter}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Cabang: <strong>{selectedLetter.branch_name}</strong>
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alasan Penolakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Masukkan alasan penolakan..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleReject(selectedLetter.id, rejectionReason)}
                  disabled={!rejectionReason.trim() || processingId === selectedLetter.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === selectedLetter.id ? 'Processing...' : 'Tolak'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Addendum Detail Modal */}
      {showAddendumDetailModal && selectedAddendum && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detail Addendum</h3>
                <button
                  onClick={() => setShowAddendumDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nomor Addendum</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.assigment_letter}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nomor ST Sebelumnya</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.assignment_letter_before}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedAddendum.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipe Addendum</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.addendum_type || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cabang</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.branch_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Regional</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.region}</p>
                  </div>
                </div>
                
                {/* Keterangan Section */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-3">Keterangan</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900">
                      {selectedAddendum.description || selectedAddendum.keterangan || '-'}
                    </p>
                  </div>
                </div>

                {/* Status Information */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-3">Informasi Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dibuat oleh</label>
                      <p className="text-sm text-gray-900">{getCreatorName(selectedAddendum.created_by)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tanggal Dibuat</label>
                      <p className="text-sm text-gray-900">{formatDateTime(selectedAddendum.tanggal_input)}</p>
                    </div>
                    {(selectedAddendum.status === 'approved' || selectedAddendum.status === 'rejected') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {selectedAddendum.status === 'approved' ? 'Disetujui oleh' : 'Ditolak oleh'}
                          </label>
                          <p className="text-sm text-gray-900">{getApproverName(selectedAddendum.approved_by)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Tanggal {selectedAddendum.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                          </label>
                          <p className="text-sm text-gray-900">{formatDateTime(selectedAddendum.approved_at)}</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {selectedAddendum.status === 'rejected' && selectedAddendum.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-50 rounded-md">
                      <label className="block text-sm font-medium text-red-700">Alasan Penolakan</label>
                      <p className="text-sm text-red-900 mt-1">{selectedAddendum.rejection_reason}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6 space-x-3">
                  {/* Excel download - always available if file exists */}
                  {selectedAddendum.excel_file_url && (
                    <button
                      onClick={() => handleDownloadAddendumExcel(selectedAddendum.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Excel
                    </button>
                  )}
                  
                  {/* PDF download - only for approved */}
                  {selectedAddendum.status === 'approved' && (
                    <button
                      onClick={() => handleDownloadAddendumPDF(selectedAddendum)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Download PDF
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddendumDetailModal(false)}
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

      {/* Reject Modal for Addendum */}
      {showAddendumRejectModal && selectedAddendum && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tolak Addendum</h3>
                <button
                  onClick={() => {
                    setShowAddendumRejectModal(false);
                    setAddendumRejectionReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Nomor Addendum: <strong>{selectedAddendum.assigment_letter}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Cabang: <strong>{selectedAddendum.branch_name}</strong>
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alasan Penolakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={addendumRejectionReason}
                  onChange={(e) => setAddendumRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Masukkan alasan penolakan..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddendumRejectModal(false);
                    setAddendumRejectionReason('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleRejectAddendum(selectedAddendum.id, addendumRejectionReason)}
                  disabled={!addendumRejectionReason.trim() || processingId === selectedAddendum.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === selectedAddendum.id ? 'Processing...' : 'Tolak'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
