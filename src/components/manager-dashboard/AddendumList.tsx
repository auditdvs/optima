import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Eye, FileDown, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import AssignmentLetterPrint from './AssignmentLetterPrint';

interface Addendum {
  id: string;
  letter_id: string;
  assigment_letter: string;
  assignment_letter_before?: string; // Added field for original letter
  addendum_type: string;
  branch_name: string;
  region: string;
  audit_type: string; // Tambahkan field audit_type
  team: string; // Team members
  leader: string; // Team Leader
  new_team?: string; // New team members for team changes
  new_leader?: string; // New team leader for team changes
  transport: number;
  konsumsi: number;
  etc: number;
  keterangan?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  tanggal_input?: string;
  created_by?: string;
  status: 'pending' | 'approved' | 'rejected'; // Add status field
  excel_file_url?: string; // Add excel file URL field
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  link_file?: string; // Add link file field
  lpj?: string; // Add LPJ field
  um_locked?: boolean; // Add um_locked field
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
  const [letterToPrint, setLetterToPrint] = useState<Addendum | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAddendums();
    fetchAccounts();
  }, [refreshTrigger, user]);

  const fetchAddendums = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('addendum')
        .select('*')
        .eq('created_by', user.id)
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

  const handlePrint = async (addendum: Addendum) => {
    setLetterToPrint(addendum);
    
    // Wait for state to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!printRef.current) return;
    
    try {
      toast.loading('Generating PDF...');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = printRef.current.querySelectorAll('.page');
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }
      
      toast.dismiss();
      pdf.save(`Addendum_${addendum.assigment_letter}.pdf`);
      toast.success('PDF downloaded successfully!');
      setLetterToPrint(null);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Download LPJ (protected Excel from perdin_acc)
  const handleDownloadLPJ = async (addendumId: string) => {
    try {
      toast.loading('Mengunduh file LPJ...', { id: 'lpj-download' });
      
      const { data, error } = await supabase
        .from('addendum')
        .select('lpj, branch_name, assigment_letter')
        .eq('id', addendumId)
        .single();
      
      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data || !data.lpj) {
        toast.error('File LPJ belum tersedia. Addendum harus disetujui terlebih dahulu.', { id: 'lpj-download' });
        return;
      }
      
      console.log('📥 Downloading Addendum LPJ from URL:', data.lpj);
      
      const response = await fetch(data.lpj, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('File kosong atau tidak ditemukan');
      }
      
      const urlParts = data.lpj.split('.');
      const extension = urlParts[urlParts.length - 1].split('?')[0] || 'xlsx';
      
      const downloadFileName = `LPJ_Addendum_${data.branch_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${data.assigment_letter?.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      
      saveAs(blob, downloadFileName);
      
      toast.success('File LPJ addendum berhasil diunduh!', { id: 'lpj-download' });
    } catch (error) {
      console.error('Error downloading addendum LPJ:', error);
      toast.error(`Gagal mengunduh file LPJ: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'lpj-download' });
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
                Pelaksanaan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jenis
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
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
                    {addendum.branch_name} - {addendum.region}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateRange(addendum)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="break-words whitespace-normal max-w-xs">
                      {addendum.addendum_type}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getStatusBadge(addendum.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleViewDetail(addendum)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                      {addendum.status === 'approved' && (
                        <>
                          <button
                            onClick={() => handlePrint(addendum)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Print
                          </button>
                          <button
                            onClick={() => handleDownloadLPJ(addendum.id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            title="Download LPJ Addendum (Protected Excel)"
                          >
                            <FileDown className="w-4 h-4 mr-1" />
                            LPJ
                          </button>
                        </>
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
                {/* Assignment Letter Preview Section - Added at the top */}
                {selectedAddendum.assignment_letter_before && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Nomor Surat Tugas Sebelumnya</h4>
                    <div className="bg-white border border-blue-300 rounded px-3 py-2">
                      <p className="text-sm text-gray-700 font-mono">
                        {selectedAddendum.assignment_letter_before}
                      </p>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      * Nomor surat tugas yang akan di-addendum
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nomor Surat Addendum</label>
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
                    <label className="block text-sm font-medium text-gray-700">Jenis Audit</label>
                    <p className="text-sm text-gray-900">{selectedAddendum.audit_type}</p>
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

                {/* Status and Rejection Reason Section */}
                <div className="mt-6 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1">
                        {getStatusBadge(selectedAddendum.status)}
                      </div>
                    </div>
                    {selectedAddendum.approved_by && selectedAddendum.approved_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {selectedAddendum.status === 'approved' ? 'Disetujui oleh' : 'Diproses oleh'}
                        </label>
                        <p className="text-sm text-gray-900">{selectedAddendum.approved_by}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(selectedAddendum.approved_at)}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Rejection Reason */}
                  {selectedAddendum.status === 'rejected' && selectedAddendum.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-50 rounded-md">
                      <label className="block text-sm font-medium text-red-700">Alasan Penolakan</label>
                      <p className="text-sm text-red-900 mt-1">{selectedAddendum.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Link File Section */}
                {selectedAddendum.link_file && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Link File</h4>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <a
                        href={selectedAddendum.link_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {selectedAddendum.link_file}
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}

                {/* Tim Comparison Section - Untuk Perubahan Tim */}
                {(selectedAddendum.addendum_type && (
                  selectedAddendum.addendum_type.includes('Perubahan Tim') || 
                  selectedAddendum.addendum_type.toLowerCase().includes('perubahan tim')
                ) || selectedAddendum.new_leader || selectedAddendum.new_team) && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Perbandingan Tim</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Tim Sebelumnya */}
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h5 className="text-sm font-semibold text-red-800 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Tim Sebelumnya
                        </h5>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-red-700 mb-1">Ketua Tim Sebelumnya</label>
                            <div className="bg-white p-2 rounded border border-red-300">
                              <p className="text-sm text-gray-900">{selectedAddendum.leader || '-'}</p>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-red-700 mb-1">Anggota Tim Sebelumnya</label>
                            <div className="bg-white p-2 rounded border border-red-300 min-h-[60px]">
                              <p className="text-sm text-gray-900">{formatTeam(selectedAddendum.team || '')}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tim Sekarang */}
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h5 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Tim Sekarang
                        </h5>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-green-700 mb-1">Ketua Tim Baru</label>
                            <div className="bg-white p-2 rounded border border-green-300">
                              <p className="text-sm text-gray-900">{selectedAddendum.new_leader || '-'}</p>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-green-700 mb-1">Anggota Tim Baru</label>
                            <div className="bg-white p-2 rounded border border-green-300 min-h-[60px]">
                              <p className="text-sm text-gray-900">
                                {selectedAddendum.new_team ? 
                                  (selectedAddendum.new_team.split(',').filter((member: string) => member.trim()).join(', ') || 'Tidak ada anggota tambahan') 
                                  : 'Tidak ada anggota tambahan'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Summary perubahan tim */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h6 className="text-sm font-semibold text-blue-800 mb-2">Ringkasan Perubahan</h6>
                      <div className="text-xs text-blue-700 space-y-1">
                        {selectedAddendum.leader !== selectedAddendum.new_leader && (
                          <p>• Ketua Tim berubah dari "{selectedAddendum.leader || 'Tidak ada'}" menjadi "{selectedAddendum.new_leader || 'Tidak ada'}"</p>
                        )}
                        {selectedAddendum.new_team && selectedAddendum.new_team.trim() && (
                          <p>• Anggota tim baru ditambahkan: {selectedAddendum.new_team.split(',').filter((member: string) => member.trim()).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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

                <div className="flex justify-end space-x-4 mt-6">
                  {selectedAddendum.status === 'approved' && (
                    <button
                      onClick={() => handlePrint(selectedAddendum)}
                      className="px-4 py-2 flex items-center bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print
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
      {/* Print Component - Hidden for PDF generation */}
      {letterToPrint && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div ref={printRef}>
            <AssignmentLetterPrint 
              data={letterToPrint} 
              type="addendum-sampel"
            />
          </div>
        </div>
      )}
      
      <style>{`
        @media print {
          body > *:not(.print:block) {
            display: none;
          }
          .print\\:block {
            display: block !important;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }
      `}</style>
    </div>
  );
}
