import { saveAs } from 'file-saver';
import { Check, ChevronDown, ChevronUp, Eye, FileDown, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { approveAddendumFallback, approveAddendumWithProtection, approveLetterFallback, approveLetterWithProtection } from '../../services/letterService';

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
  lpj?: string;
  um_locked?: boolean;
}

interface Account {
  profile_id: string;
  full_name: string;
}

interface AssignmentLetterManagerProps {
  refreshTrigger?: number;
  initialTab?: 'letter' | 'addendum' | 'lpj' | 'mutasi';
}

interface LpjSubmission {
  id: string;
  letter_id: number | null;
  addendum_id: number | null;
  letter_number: string;
  description: string;
  file_url: string;
  file_name: string;
  created_at: string;
  created_by: string;
  submitter_name?: string;
  status_approve?: 'open' | 'close';
}

export default function AssignmentLetterManager({ refreshTrigger, initialTab = 'letter' }: AssignmentLetterManagerProps) {
  const [letters, setLetters] = useState<AssignmentLetter[]>([]);
  const [addendums, setAddendums] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<AssignmentLetter | null>(null);
  const [selectedAddendum, setSelectedAddendum] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'letter' | 'addendum' | 'lpj' | 'mutasi'>(initialTab || 'letter');
  const [lpjSubmissions, setLpjSubmissions] = useState<LpjSubmission[]>([]);
  const [lpjFilter, setLpjFilter] = useState<'all' | 'submitted' | 'pending'>('all');
  const [lpjSortField, setLpjSortField] = useState<'letter_number' | 'type' | null>(null);
  const [lpjSortOrder, setLpjSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Sorting states for Surat Tugas
  const [letterSortField, setLetterSortField] = useState<'letter_number' | 'status' | null>(null);
  const [letterSortOrder, setLetterSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Sorting states for Addendum
  const [addendumSortField, setAddendumSortField] = useState<'letter_number' | 'status' | null>(null);
  const [addendumSortOrder, setAddendumSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [showAddendumDetailModal, setShowAddendumDetailModal] = useState(false);
  const [showAddendumRejectModal, setShowAddendumRejectModal] = useState(false);
  const [addendumRejectionReason, setAddendumRejectionReason] = useState('');
  const [isEditingKeterangan, setIsEditingKeterangan] = useState(false);
  const [editedKeterangan, setEditedKeterangan] = useState('');
  
  // Audit Mutasi states
  const [mutasiList, setMutasiList] = useState<any[]>([]);
  const [selectedMutasi, setSelectedMutasi] = useState<any>(null);
  const [showMutasiDetailModal, setShowMutasiDetailModal] = useState(false);
  const [showMutasiRejectModal, setShowMutasiRejectModal] = useState(false);
  const [showMutasiApproveConfirm, setShowMutasiApproveConfirm] = useState(false);
  const [mutasiRejectionReason, setMutasiRejectionReason] = useState('');

  useEffect(() => {
    fetchLetters();
    fetchAddendums();
    fetchAccounts();
    fetchLpjSubmissions();
    fetchMutasiList();
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

  const fetchLpjSubmissions = async () => {
    try {
      // Fetch auditor aliases first for mapping names
      const { data: aliases } = await supabase
        .from('auditor_aliases')
        .select('profile_id, full_name');

      // Fetch all LPJ submissions
      const { data: lpjs, error } = await supabase
        .from('lpj_submissions')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching LPJ submissions:', error);
        return;
      }

      // Map submitter names
      const lpjsWithNames = lpjs?.map(lpj => {
        const submitter = aliases?.find(a => a.profile_id === lpj.created_by);
        return {
          ...lpj,
          submitter_name: submitter?.full_name || 'Unknown'
        };
      }) || [];

      setLpjSubmissions(lpjsWithNames);
    } catch (error) {
      console.error('Error fetching LPJ submissions:', error);
    }
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  };

  const fetchMutasiList = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_mutasi')
        .select('*')
        .order('departure_date', { ascending: false });

      if (error) throw error;
      setMutasiList(data || []);
    } catch (error) {
      console.error('Error fetching mutasi:', error);
    }
  };

  const handleApproveMutasi = async (id: number) => {
    setProcessingId(String(id));
    try {
      const { error } = await supabase
        .from('audit_mutasi')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Audit Mutasi disetujui');
      setShowMutasiDetailModal(false);
      fetchMutasiList();
    } catch (error) {
      console.error('Error approving mutasi:', error);
      toast.error('Gagal menyetujui');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectMutasi = async (id: number, reason: string) => {
    if (!reason.trim()) {
      toast.error('Alasan penolakan harus diisi');
      return;
    }
    setProcessingId(String(id));
    try {
      const { error } = await supabase
        .from('audit_mutasi')
        .update({ status: 'rejected', reject_reason: reason })
        .eq('id', id);

      if (error) throw error;
      toast.success('Audit Mutasi ditolak');
      setShowMutasiRejectModal(false);
      setShowMutasiDetailModal(false);
      setMutasiRejectionReason('');
      fetchMutasiList();
    } catch (error) {
      console.error('Error rejecting mutasi:', error);
      toast.error('Gagal menolak');
    } finally {
      setProcessingId(null);
    }
  };

  const formatMutasiDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatMutasiCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const handleApprove = async (letterId: string) => {
    setProcessingId(letterId);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Tidak dapat mengidentifikasi user');
        return;
      }

      toast.loading('Memproses approval dan memproteksi sheet UM...', { id: 'approve-letter' });

      try {
        // Try using edge function for approval with UM protection
        const result = await approveLetterWithProtection(letterId, user.id);
        
        if (result.umSheetProtected) {
          toast.success('Assignment Letter disetujui & sheet UM diproteksi!', { id: 'approve-letter' });
        } else {
          toast.success('Assignment Letter disetujui (sheet UM tidak ditemukan)', { id: 'approve-letter' });
        }
      } catch (edgeFunctionError) {
        // Fallback to direct database update if edge function fails
        console.warn('Edge function failed, using fallback:', edgeFunctionError);
        
        await approveLetterFallback(letterId, user.id);
        toast.success('Assignment Letter berhasil disetujui (fallback)', { id: 'approve-letter' });
      }
      
      // Close the modal after successful approval
      setShowDetailModal(false);
      setSelectedLetter(null);
      
      fetchLetters();
    } catch (error) {
      console.error('Error approving letter:', error);
      toast.error('Gagal menyetujui assignment letter', { id: 'approve-letter' });
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
    const formatDateShort = (dateStr: string) => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    };

    if (letter.audit_start_date && letter.audit_end_date) {
      return `${formatDateShort(letter.audit_start_date)} s.d. ${formatDateShort(letter.audit_end_date)}`;
    }
    return '-';
  };

  const formatAddendumPeriod = (addendum: any) => {
    const formatDateShort = (dateStr: string) => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    };

    if (addendum.start_date && addendum.end_date) {
      return `${formatDateShort(addendum.start_date)} s.d. ${formatDateShort(addendum.end_date)}`;
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
      const { downloadAssignmentLetterPDF } = await import('../../services/pdfGenerator');
      
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
      const { downloadAddendumPDF } = await import('../../services/pdfGenerator');
      
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
        .single();
      
      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data || !data.file_url) {
        toast.error('File Excel tidak ditemukan untuk surat tugas ini', { id: 'excel-download' });
        return;
      }
      
      console.log('📥 Downloading Excel from URL:', data.file_url);
      
      // Download file from URL with proper options
      const response = await fetch(data.file_url, {
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
      
      // Determine file extension from URL or default to xlsx
      const urlParts = data.file_url.split('.');
      const extension = urlParts[urlParts.length - 1].split('?')[0] || 'xlsx';
      
      const downloadFileName = fileName || `Excel_${data.branch_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${data.assigment_letter?.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      
      // Use file-saver for reliable download with correct filename
      saveAs(blob, downloadFileName);
      
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
        .single();
      
      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data || !data.excel_file_url) {
        toast.error('File Excel tidak ditemukan untuk addendum ini', { id: 'excel-download' });
        return;
      }
      
      console.log('📥 Downloading Addendum Excel from URL:', data.excel_file_url);
      
      // Download file from URL with proper options
      const response = await fetch(data.excel_file_url, {
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
      
      // Determine file extension from URL or default to xlsx
      const urlParts = data.excel_file_url.split('.');
      const extension = urlParts[urlParts.length - 1].split('?')[0] || 'xlsx';
      
      const downloadFileName = fileName || `Addendum_Excel_${data.branch_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${data.assigment_letter?.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      
      // Use file-saver for reliable download with correct filename
      saveAs(blob, downloadFileName);
      
      toast.success('File Excel addendum berhasil diunduh!', { id: 'excel-download' });
    } catch (error) {
      console.error('Error downloading addendum Excel:', error);
      toast.error(`Gagal mengunduh file Excel addendum: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'excel-download' });
    }
  };

  // Download LPJ for Letter (protected Excel from perdin_acc)
  const handleDownloadLPJ = async (letterId: string, fileName?: string) => {
    try {
      toast.loading('Mengunduh file LPJ...', { id: 'lpj-download' });
      
      const { data, error } = await supabase
        .from('letter')
        .select('lpj, branch_name, assigment_letter')
        .eq('id', letterId)
        .single();
      
      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data || !data.lpj) {
        toast.error('File LPJ belum tersedia. Surat tugas harus disetujui terlebih dahulu.', { id: 'lpj-download' });
        return;
      }
      
      console.log('📥 Downloading LPJ from URL:', data.lpj);
      
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
      
      const downloadFileName = fileName || `LPJ_${data.branch_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${data.assigment_letter?.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      
      saveAs(blob, downloadFileName);
      
      toast.success('File LPJ berhasil diunduh!', { id: 'lpj-download' });
    } catch (error) {
      console.error('Error downloading LPJ:', error);
      toast.error(`Gagal mengunduh file LPJ: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'lpj-download' });
    }
  };

  // Download LPJ for Addendum (protected Excel from perdin_acc)
  const handleDownloadAddendumLPJ = async (addendumId: string, fileName?: string) => {
    try {
      toast.loading('Mengunduh file LPJ addendum...', { id: 'lpj-download' });
      
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
      
      const downloadFileName = fileName || `LPJ_Addendum_${data.branch_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${data.assigment_letter?.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      
      saveAs(blob, downloadFileName);
      
      toast.success('File LPJ addendum berhasil diunduh!', { id: 'lpj-download' });
    } catch (error) {
      console.error('Error downloading addendum LPJ:', error);
      toast.error(`Gagal mengunduh file LPJ addendum: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'lpj-download' });
    }
  };

  const handleViewDetail = (letter: AssignmentLetter) => {
    setSelectedLetter(letter);
    setShowDetailModal(true);
  };
  
  const handleViewAddendumDetail = (addendum: any) => {
    setSelectedAddendum(addendum);
    setEditedKeterangan(addendum.keterangan || addendum.description || '');
    setIsEditingKeterangan(false);
    setShowAddendumDetailModal(true);
  };

  const handleSaveKeterangan = async () => {
    if (!selectedAddendum) return;
    
    try {
      const { error } = await supabase
        .from('addendum')
        .update({ keterangan: editedKeterangan })
        .eq('id', selectedAddendum.id);

      if (error) throw error;

      toast.success('Keterangan berhasil diupdate');
      setSelectedAddendum({ ...selectedAddendum, keterangan: editedKeterangan });
      setIsEditingKeterangan(false);
      fetchAddendums();
    } catch (error) {
      console.error('Error updating keterangan:', error);
      toast.error('Gagal mengupdate keterangan');
    }
  };


  
  const handleApproveAddendum = async (addendumId: string) => {
    setProcessingId(addendumId);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Tidak dapat mengidentifikasi user');
        return;
      }

      toast.loading('Memproses approval dan memproteksi sheet UM...', { id: 'approve-addendum' });

      try {
        // Try using edge function for approval with UM protection
        const result = await approveAddendumWithProtection(addendumId, user.id);
        
        if (result.umSheetProtected) {
          toast.success('Addendum disetujui & sheet UM diproteksi!', { id: 'approve-addendum' });
        } else {
          toast.success('Addendum disetujui (sheet UM tidak ditemukan)', { id: 'approve-addendum' });
        }
      } catch (edgeFunctionError) {
        // Fallback to direct database update if edge function fails
        console.error('❌ Edge function failed for addendum:', addendumId);
        
        // Show the actual error in toast for debugging
        const errorMessage = edgeFunctionError instanceof Error ? edgeFunctionError.message : 'Unknown error';
        
        await approveAddendumFallback(addendumId, user.id);
        toast.success(`Addendum disetujui (fallback: ${errorMessage})`, { id: 'approve-addendum' });
      }

      fetchAddendums();
      
      // Update selectedAddendum status untuk UI update langsung
      if (selectedAddendum && selectedAddendum.id === addendumId) {
        setSelectedAddendum({
          ...selectedAddendum,
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
          um_locked: true
        });
      }
    } catch (error) {
      console.error('Error approving addendum:', error);
      toast.error('Gagal menyetujui addendum', { id: 'approve-addendum' });
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
      
      // Update selectedAddendum status untuk UI update langsung
      if (selectedAddendum && selectedAddendum.id === addendumId) {
        setSelectedAddendum({
          ...selectedAddendum,
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        });
      }
    } catch (error) {
      console.error('Error rejecting addendum:', error);
      toast.error('Gagal menolak addendum');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadLPJFile = async (item: any, isAcc: boolean = true) => {
    if (!item.lpj || !item.lpj.file_url) return;
    
    try {
      const label = isAcc ? 'ACC' : 'Original';
      toast.loading(`Downloading file ${label}...`, { id: 'download-lpj' });
      
      let fileUrl = item.lpj.file_url;
      
      // If downloading original (non-ACC) version, convert URL from perdin_acc to perdin bucket
      if (!isAcc) {
        // Extract file path from URL and reconstruct for perdin bucket
        // URL format: https://xxx.supabase.co/storage/v1/object/public/perdin_acc/path/to/file.xlsx
        // Convert to: https://xxx.supabase.co/storage/v1/object/public/perdin/path/to/file.xlsx
        fileUrl = item.lpj.file_url.replace('/perdin_acc/', '/perdin/');
      }
      
      // Fetch the file as blob
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      
      // Determine extension from original URL or content-type
      const urlPart = fileUrl.split('?')[0]; // Remove query params
      const extension = urlPart.split('.').pop() || 'xlsx';
      
      // Sanitize filename parts
      const safeNo = item.assigment_letter.replace(/[\/\\?%*:|"<>]/g, '_'); // Replace invalid file chars with _
      const safeType = item.type.replace(/[\/\\?%*:|"<>]/g, '_');
      const safeInputter = (item.lpj.submitter_name || 'Unknown').replace(/[\/\\?%*:|"<>]/g, '_');
      const suffix = isAcc ? '_ACC' : '_Original';
      
      const filename = `${safeNo}_${safeType}_${safeInputter}${suffix}.${extension}`;
      
      saveAs(blob, filename);
      
      toast.success(`File ${label} downloaded`, { id: 'download-lpj' });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Gagal mendownload file', { id: 'download-lpj' });
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
      
      {/* Summary Stats Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Surat Tugas</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Addendum</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">LPJ</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Audit Mutasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Total Row */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-medium text-gray-700">Total</td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                  {letters.length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                  {addendums.length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                  {letters.filter(l => l.status === 'approved').length + addendums.filter(a => a.status === 'approved').length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                  {mutasiList.length}
                </span>
              </td>
            </tr>
            {/* Pending Row */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-medium text-yellow-700">Pending</td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  {letters.filter(l => l.status === 'pending').length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  {addendums.filter(a => a.status === 'pending').length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  {(letters.filter(l => l.status === 'approved').length + addendums.filter(a => a.status === 'approved').length) - lpjSubmissions.length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  {mutasiList.filter(m => m.status === 'pending').length}
                </span>
              </td>
            </tr>
            {/* Approved Row */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-medium text-green-700">Approved</td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  {letters.filter(l => l.status === 'approved').length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  {addendums.filter(a => a.status === 'approved').length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  {lpjSubmissions.length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  {mutasiList.filter(m => m.status === 'approved').length}
                </span>
              </td>
            </tr>
            {/* Rejected Row */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-medium text-red-700">Rejected</td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  {letters.filter(l => l.status === 'rejected').length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  {addendums.filter(a => a.status === 'rejected').length}
                </span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="text-gray-400 text-xs">-</span>
              </td>
              <td className="px-4 py-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  {mutasiList.filter(m => m.status === 'rejected').length}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="px-6 -mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('letter')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'letter'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Surat Tugas
            </button>
            <button
              onClick={() => setActiveTab('addendum')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'addendum'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Addendum
            </button>
            <button
              onClick={() => setActiveTab('lpj')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'lpj'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Laporan Pertanggungjawaban
            </button>
            <button
              onClick={() => setActiveTab('mutasi')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mutasi'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Audit Mutasi
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'lpj' ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 md:p-6">
            {/* Header with Filter */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Laporan Pertanggungjawaban</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Filter:</span>
                <select
                  value={lpjFilter}
                  onChange={(e) => setLpjFilter(e.target.value as 'all' | 'submitted' | 'pending')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">Semua</option>
                  <option value="submitted">Sudah Input</option>
                  <option value="pending">Belum Input</option>
                </select>
              </div>
            </div>
            
            {/* Single Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        if (lpjSortField === 'letter_number') {
                          setLpjSortOrder(lpjSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setLpjSortField('letter_number');
                          setLpjSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Nomor Surat
                        {lpjSortField === 'letter_number' && (
                          lpjSortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cabang</th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        if (lpjSortField === 'type') {
                          setLpjSortOrder(lpjSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setLpjSortField('type');
                          setLpjSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Jenis
                        {lpjSortField === 'type' && (
                          lpjSortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inputter</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status LPJ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Build unified data
                    const submittedLetterIds = new Set(lpjSubmissions.filter(l => l.letter_id).map(l => String(l.letter_id)));
                    const submittedAddendumIds = new Set(lpjSubmissions.filter(l => l.addendum_id).map(l => String(l.addendum_id)));
                    
                    // Combine all approved items
                    const allItems = [
                      ...letters.filter(l => l.status === 'approved').map(l => {
                        const lpj = lpjSubmissions.find(s => String(s.letter_id) === String(l.id));
                        return {
                          id: l.id,
                          assigment_letter: l.assigment_letter,
                          branch_name: l.branch_name,
                          type: 'Surat Tugas',
                          created_by: l.created_by,
                          hasLpj: submittedLetterIds.has(String(l.id)),
                          lpj: lpj
                        };
                      }),
                      ...addendums.filter(a => a.status === 'approved').map(a => {
                        const lpj = lpjSubmissions.find(s => String(s.addendum_id) === String(a.id));
                        return {
                          id: a.id,
                          assigment_letter: a.assigment_letter,
                          branch_name: a.branch_name,
                          type: 'Addendum',
                          created_by: a.created_by,
                          hasLpj: submittedAddendumIds.has(String(a.id)),
                          lpj: lpj
                        };
                      })
                    ];
                    
                    // Apply filter
                    let filteredItems = allItems.filter(item => {
                      if (lpjFilter === 'submitted') return item.hasLpj;
                      if (lpjFilter === 'pending') return !item.hasLpj;
                      return true;
                    });
                    
                    // Apply sorting
                    if (lpjSortField) {
                      filteredItems = [...filteredItems].sort((a, b) => {
                        let valueA = '';
                        let valueB = '';
                        
                        if (lpjSortField === 'letter_number') {
                          valueA = a.assigment_letter || '';
                          valueB = b.assigment_letter || '';
                        } else if (lpjSortField === 'type') {
                          valueA = a.type || '';
                          valueB = b.type || '';
                        }
                        
                        const comparison = valueA.localeCompare(valueB, 'id', { numeric: true });
                        return lpjSortOrder === 'asc' ? comparison : -comparison;
                      });
                    }
                    
                    if (filteredItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                            {lpjFilter === 'pending' ? 'Semua surat sudah memiliki LPJ 🎉' : 
                             lpjFilter === 'submitted' ? 'Belum ada LPJ yang diinput' : 
                             'Tidak ada data'}
                          </td>
                        </tr>
                      );
                    }
                    
                    return filteredItems.map((item, index) => (
                      <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">{item.assigment_letter}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.branch_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${item.type === 'Surat Tugas' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {getCreatorName(item.created_by)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.hasLpj ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                              <Check className="w-3 h-3 mr-1" />
                              Sudah Input
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
                              Belum Input
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.hasLpj && item.lpj ? (
                            <select
                              value={item.lpj.status_approve || 'open'}
                              disabled={item.lpj.status_approve === 'close'}
                              onChange={async (e) => {
                                const newStatus = e.target.value as 'open' | 'close';
                                if (newStatus === 'open' && item.lpj?.status_approve === 'close') {
                                  toast.error('Status Close tidak dapat diubah kembali ke Open');
                                  return;
                                }

                                try {
                                  const { error } = await supabase
                                    .from('lpj_submissions')
                                    .update({ status_approve: newStatus })
                                    .eq('id', item.lpj!.id);
                                  
                                  if (error) throw error;
                                  
                                  toast.success(`Status berhasil diubah ke ${newStatus === 'open' ? 'Open' : 'Close'}`);
                                  fetchLpjSubmissions();
                                } catch (error) {
                                  console.error('Error updating status:', error);
                                  toast.error('Gagal mengubah status');
                                }
                              }}
                              className={`px-2 py-1 text-xs rounded-lg border focus:ring-2 focus:ring-indigo-500 appearance-none ${
                                (item.lpj.status_approve || 'open') === 'open' 
                                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700 cursor-pointer' 
                                  : 'bg-green-100 border-green-300 text-green-800 font-medium cursor-not-allowed'
                              }`}
                            >
                              <option value="open">Open</option>
                              <option value="close">Close</option>
                            </select>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.lpj ? (
                            <div className="flex flex-row gap-3">
                              <button 
                                onClick={() => handleDownloadLPJFile(item, true)}
                                className="inline-flex items-center text-xs text-green-600 hover:text-green-800"
                                title="Download file yang sudah diverifikasi (ACC)"
                              >
                                <FileDown className="w-3 h-3 mr-1" />
                                ACC
                              </button>
                              <button 
                                onClick={() => handleDownloadLPJFile(item, false)}
                                className="inline-flex items-center text-xs text-orange-600 hover:text-orange-800"
                                title="Download file original (belum ACC)"
                              >
                                <FileDown className="w-3 h-3 mr-1" />
                                Original
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'letter' ? (
        /* Surat Tugas Table */
        <div className="bg-white rounded-lg shadow-sm">
          <div className="overflow-x-auto" style={{ transform: 'rotateX(180deg)' }}>
            <div style={{ transform: 'rotateX(180deg)' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        if (letterSortField === 'letter_number') {
                          setLetterSortOrder(letterSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setLetterSortField('letter_number');
                          setLetterSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Nomor Surat
                        {letterSortField === 'letter_number' && (
                          letterSortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cabang</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audit Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anggaran</th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        if (letterSortField === 'status') {
                          setLetterSortOrder(letterSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setLetterSortField('status');
                          setLetterSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {letterSortField === 'status' && (
                          letterSortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibuat oleh</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelaksanaan Audit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                let sortedLetters = [...letters];
                
                if (letterSortField) {
                  sortedLetters.sort((a, b) => {
                    let valueA = '';
                    let valueB = '';
                    
                    if (letterSortField === 'letter_number') {
                      valueA = a.assigment_letter || '';
                      valueB = b.assigment_letter || '';
                    } else if (letterSortField === 'status') {
                      valueA = a.status || '';
                      valueB = b.status || '';
                    }
                    
                    const comparison = valueA.localeCompare(valueB, 'id', { numeric: true });
                    return letterSortOrder === 'asc' ? comparison : -comparison;
                  });
                }
                
                if (sortedLetters.length === 0) {
                  return (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                        Belum ada surat tugas
                      </td>
                    </tr>
                  );
                }
                
                return sortedLetters.map((letter, index) => (
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
                      <div className="text-sm">
                        <div className="font-medium text-green-700">
                          Rp {((letter.transport || 0) + (letter.konsumsi || 0) + (letter.etc || 0)).toLocaleString('id-ID')}
                        </div>
                        <div className="text-xs text-gray-500">
                          T: {(letter.transport || 0).toLocaleString('id-ID')} | 
                          K: {(letter.konsumsi || 0).toLocaleString('id-ID')} | 
                          L: {(letter.etc || 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getStatusBadge(letter.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCreatorName(letter.created_by)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatAuditPeriod(letter)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetail(letter)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                        {letter.status === 'approved' && (
                          <button
                            onClick={() => handleDownloadLPJ(letter.id)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Download LPJ (Protected Excel)"
                          >
                            <FileDown className="w-4 h-4 mr-1" />
                            LPJ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'addendum' ? (
        /* Addendum Table */
        <div className="bg-white rounded-lg shadow-sm">
          <div className="overflow-x-auto" style={{ transform: 'rotateX(180deg)' }}>
            <div style={{ transform: 'rotateX(180deg)' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        if (addendumSortField === 'letter_number') {
                          setAddendumSortOrder(addendumSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setAddendumSortField('letter_number');
                          setAddendumSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Nomor Addendum
                        {addendumSortField === 'letter_number' && (
                          addendumSortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nomor ST</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cabang</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anggaran</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link File</th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => {
                        if (addendumSortField === 'status') {
                          setAddendumSortOrder(addendumSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setAddendumSortField('status');
                          setAddendumSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {addendumSortField === 'status' && (
                          addendumSortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periode Audit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                let sortedAddendums = [...addendums];
                
                if (addendumSortField) {
                  sortedAddendums.sort((a, b) => {
                    let valueA = '';
                    let valueB = '';
                    
                    if (addendumSortField === 'letter_number') {
                      valueA = a.assigment_letter || '';
                      valueB = b.assigment_letter || '';
                    } else if (addendumSortField === 'status') {
                      valueA = a.status || '';
                      valueB = b.status || '';
                    }
                    
                    const comparison = valueA.localeCompare(valueB, 'id', { numeric: true });
                    return addendumSortOrder === 'asc' ? comparison : -comparison;
                  });
                }
                
                if (sortedAddendums.length === 0) {
                  return (
                    <tr>
                      <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                        Belum ada addendum
                      </td>
                    </tr>
                  );
                }
                
                return sortedAddendums.map((addendum, index) => (
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
                      <div className="text-sm">
                        {((addendum.transport || 0) + (addendum.konsumsi || 0) + (addendum.etc || 0)) > 0 ? (
                          <>
                            <div className="font-medium text-green-700">
                              Rp {((addendum.transport || 0) + (addendum.konsumsi || 0) + (addendum.etc || 0)).toLocaleString('id-ID')}
                            </div>
                            <div className="text-xs text-gray-500">
                              T: {(addendum.transport || 0).toLocaleString('id-ID')} | 
                              K: {(addendum.konsumsi || 0).toLocaleString('id-ID')} | 
                              L: {(addendum.etc || 0).toLocaleString('id-ID')}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {addendum.link_file ? (
                        <a
                          href={addendum.link_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                          title="Klik untuk membuka link"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="max-w-32 truncate">Link File</span>
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">No link</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getStatusBadge(addendum.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatAddendumPeriod(addendum)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewAddendumDetail(addendum)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                          title="View Addendum Details"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                        {addendum.status === 'approved' && (
                          <button
                            onClick={() => handleDownloadAddendumLPJ(addendum.id)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Download LPJ Addendum (Protected Excel)"
                          >
                            <FileDown className="w-4 h-4 mr-1" />
                            LPJ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'mutasi' ? (
        /* Audit Mutasi Table */
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auditor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Berangkat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dari</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ke</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mutasiList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Belum ada data audit mutasi
                  </td>
                </tr>
              ) : (
                mutasiList.map((mutasi, index) => (
                  <tr key={mutasi.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mutasi.auditor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatMutasiDate(mutasi.departure_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{mutasi.from_branch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{mutasi.to_branch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {mutasi.status === 'approved' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
                      ) : mutasi.status === 'rejected' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => {
                          setSelectedMutasi(mutasi);
                          setShowMutasiDetailModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Full
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Mutasi Detail Modal */}
      {showMutasiDetailModal && selectedMutasi && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detail Audit Mutasi</h3>
              <button
                onClick={() => {
                  setShowMutasiDetailModal(false);
                  setSelectedMutasi(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Auditor</label>
                  <p className="text-sm font-semibold text-gray-900">{selectedMutasi.auditor_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Tanggal Berangkat</label>
                  <p className="text-sm text-gray-900">{formatMutasiDate(selectedMutasi.departure_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Dari Cabang/Regional</label>
                  <p className="text-sm text-gray-900">{selectedMutasi.from_branch}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Ke Cabang/Regional</label>
                  <p className="text-sm text-gray-900">{selectedMutasi.to_branch}</p>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Rincian Biaya</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transportasi</span>
                    <span className="font-medium text-gray-900">{formatMutasiCurrency(selectedMutasi.transport)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Konsumsi</span>
                    <span className="font-medium text-gray-900">{formatMutasiCurrency(selectedMutasi.konsumsi)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Lainnya</span>
                    <span className="font-medium text-gray-900">{formatMutasiCurrency(selectedMutasi.lainnya)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-indigo-600">{formatMutasiCurrency(selectedMutasi.total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedMutasi.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Catatan</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedMutasi.notes}</p>
                </div>
              )}

              {/* Attachment */}
              {selectedMutasi.file_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Lampiran</label>
                  <a
                    href={selectedMutasi.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download {selectedMutasi.file_name || 'File'}
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowMutasiRejectModal(true)}
                  disabled={processingId === String(selectedMutasi.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </button>
                <button
                  onClick={() => setShowMutasiApproveConfirm(true)}
                  disabled={processingId === String(selectedMutasi.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {processingId === String(selectedMutasi.id) ? 'Processing...' : 'Accept'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mutasi Reject Modal */}
      {showMutasiRejectModal && selectedMutasi && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tolak Audit Mutasi</h3>
              <button
                onClick={() => {
                  setShowMutasiRejectModal(false);
                  setMutasiRejectionReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Auditor: <strong>{selectedMutasi.auditor_name}</strong>
              </p>
              <p className="text-sm text-gray-600">
                {selectedMutasi.from_branch} → {selectedMutasi.to_branch}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={mutasiRejectionReason}
                onChange={(e) => setMutasiRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={3}
                placeholder="Masukkan alasan penolakan..."
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMutasiRejectModal(false);
                  setMutasiRejectionReason('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={() => handleRejectMutasi(selectedMutasi.id, mutasiRejectionReason)}
                disabled={!mutasiRejectionReason.trim() || processingId === String(selectedMutasi.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === String(selectedMutasi.id) ? 'Processing...' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mutasi Approve Confirmation Modal */}
      {showMutasiApproveConfirm && selectedMutasi && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-xl bg-white">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi Persetujuan</h3>
              <p className="text-sm text-gray-600 mb-4">
                Apakah Anda yakin ingin menyetujui audit mutasi untuk <strong>{selectedMutasi.auditor_name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {selectedMutasi.from_branch} → {selectedMutasi.to_branch}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowMutasiApproveConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setShowMutasiApproveConfirm(false);
                    handleApproveMutasi(selectedMutasi.id);
                  }}
                  disabled={processingId === String(selectedMutasi.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Ya, Setujui
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLetter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detail Assignment Letter</h3>
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
                  {/* Approve/Reject buttons - only for pending */}
                  {selectedLetter.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedLetter(selectedLetter);
                          setShowRejectModal(true);
                        }}
                        disabled={processingId === selectedLetter.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(selectedLetter.id)}
                        disabled={processingId === selectedLetter.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {processingId === selectedLetter.id ? 'Processing...' : 'Approve'}
                      </button>
                    </>
                  )}
                  
                  {/* Excel download - always available */}
                  <button
                    onClick={() => handleDownloadExcel(selectedLetter.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download UM Perdin
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
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-900">Keterangan</h4>
                    {!isEditingKeterangan ? (
                      <button
                        onClick={() => setIsEditingKeterangan(true)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setIsEditingKeterangan(false);
                            setEditedKeterangan(selectedAddendum.keterangan || selectedAddendum.description || '');
                          }}
                          className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveKeterangan}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Simpan
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {isEditingKeterangan ? (
                      <textarea
                        value={editedKeterangan}
                        onChange={(e) => setEditedKeterangan(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                        placeholder="Masukkan keterangan..."
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        {selectedAddendum.keterangan || selectedAddendum.description || '-'}
                      </p>
                    )}
                  </div>
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
                  {/* Approve/Reject buttons - only for pending */}
                  {selectedAddendum.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedAddendum(selectedAddendum);
                          setShowAddendumRejectModal(true);
                        }}
                        disabled={processingId === selectedAddendum.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveAddendum(selectedAddendum.id)}
                        disabled={processingId === selectedAddendum.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {processingId === selectedAddendum.id ? 'Processing...' : 'Approve'}
                      </button>
                    </>
                  )}
                  
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
