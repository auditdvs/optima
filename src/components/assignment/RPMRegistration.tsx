import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { AlertTriangle, ArrowUpDown, Download, Pencil, Plus, RotateCcw, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

// Interface for RPM Registration
export interface RPMRegistration {
  id?: string;
  letter_number: string;
  letter_date: string;
  region: string;
  branch_or_region_ho: string;
  subject: string;
  status: 'Adequate' | 'Inadequate' | 'Reminder 1' | 'Reminder 2';
  due_date: string;
  created_at?: string;
  created_by?: string;
}

// Helper functions
const getRomanNumeral = (month: number): string => {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romanNumerals[month];
};

const generateLetterNumber = async (): Promise<string> => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const month = getRomanNumeral(currentDate.getMonth());
  
  try {
    // Query database untuk mendapatkan semua surat RPM di tahun ini
    const { data: lettersThisYear, error } = await supabase
      .from('rpm_registration')
      .select('letter_number')
      .gte('created_at', `${currentYear}-01-01`)
      .lte('created_at', `${currentYear}-12-31`);

    if (error) {
      console.error('Error querying RPM letters:', error);
      throw error;
    }

    // Parse nomor dari semua surat yang ada, cari yang terbesar
    let maxNumber = 0;
    lettersThisYear?.forEach(letter => {
      if (letter.letter_number) {
        // Extract nomor dari format "060/RPM/KMD-AUDIT/II/2026"
        const match = letter.letter_number.match(/^(\d+)\//); 
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });

    // Nomor berikutnya adalah max + 1
    const nextNumber = maxNumber + 1;
    const paddedNumber = String(nextNumber).padStart(3, '0');

    return `${paddedNumber}/RPM/KMD-AUDIT/${month}/${currentYear}`;
  } catch (error) {
    console.error('Error generating RPM letter number:', error);
    // Fallback
    return `001/RPM/KMD-AUDIT/${month}/${currentYear}`;
  }
};

const getDueDate = (status: RPMRegistration['status']): string => {
  switch (status) {
    case 'Reminder 1':
    case 'Reminder 2':
      return '';
    case 'Adequate':
      return 'Finished';
    case 'Inadequate':
      return 'Open';
    default:
      return '';
  }
};

// Column helper
const columnHelper = createColumnHelper<RPMRegistration>();

// Props interface
interface RPMRegistrationProps {
  refreshTrigger?: number;
}

export default function RPMRegistrationComponent({ refreshTrigger }: RPMRegistrationProps) {
  const { userRole } = useAuth();
  const [letters, setLetters] = useState<RPMRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLetter, setEditingLetter] = useState<RPMRegistration | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  
  // Check if user can delete (superadmin, manager, qa, dvs)
  const canDelete = ['superadmin', 'manager', 'qa', 'dvs'].includes(userRole || '');
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLetterId, setDeletingLetterId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // All branches list and lookup map for auto-fill region
  const [allBranches, setAllBranches] = useState<string[]>([]);
  const [branchToRegion, setBranchToRegion] = useState<Record<string, string>>({});
  
  // Track pending changes (local only, not saved to DB yet)
  const [pendingChanges, setPendingChanges] = useState<Record<string, { status?: string; due_date?: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [newLetter, setNewLetter] = useState<Partial<RPMRegistration>>({
    region: '',
    branch_or_region_ho: '',
    subject: '',
    status: 'Inadequate',
    letter_date: new Date().toISOString().split('T')[0]
  });

  // Preview letter number state
  const [previewLetterNumber, setPreviewLetterNumber] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;

  // Fetch preview letter number
  const fetchPreviewLetterNumber = async () => {
    setLoadingPreview(true);
    try {
      const letterNumber = await generateLetterNumber();
      setPreviewLetterNumber(letterNumber);
    } catch (error) {
      console.error('Error fetching preview:', error);
      setPreviewLetterNumber('Error');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Update preview when modal opens or branch changes
  useEffect(() => {
    if (showAddModal && newLetter.branch_or_region_ho && newLetter.region) {
      fetchPreviewLetterNumber();
    }
  }, [showAddModal, newLetter.branch_or_region_ho, newLetter.region]);

  // Handle branch selection - auto-fill region
  const handleBranchSelect = (branchName: string) => {
    const region = branchToRegion[branchName] || '';
    setNewLetter({ ...newLetter, branch_or_region_ho: branchName, region });
  };

  // Fetch branches once and store all data
  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('name, region')
        .order('name');

      if (error) throw error;
      
      if (data) {
        // Create lookup map: branch name -> region
        const lookup: Record<string, string> = {};
        const names: string[] = [];
        
        data.forEach(branch => {
          if (branch.name && branch.region) {
            lookup[branch.name] = branch.region;
            names.push(branch.name);
          }
        });
        
        setBranchToRegion(lookup);
        setAllBranches(names);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Fetch letters
  const fetchLetters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rpm_registration')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLetters(data || []);
    } catch (error) {
      console.error('Error fetching letters:', error);
      toast.error('Failed to fetch letters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchLetters();
  }, [refreshTrigger]);

  // Add new letter with retry logic
  const handleAddLetter = async () => {
    if (!newLetter.region || !newLetter.branch_or_region_ho || !newLetter.subject) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const dueDate = getDueDate(newLetter.status as RPMRegistration['status']);

      // Retry logic untuk handle concurrent submission
      let insertSuccess = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!insertSuccess && attempts < maxAttempts) {
        attempts++;

        try {
          // Generate nomor surat baru di setiap attempt
          const letterNumber = await generateLetterNumber();

          const { error } = await supabase
            .from('rpm_registration')
            .insert([{
              ...newLetter,
              letter_number: letterNumber,
              due_date: dueDate
            }]);

          if (error) {
            // Check duplicate key error
            if (error.code === '23505' || error.message?.toLowerCase().includes('duplicate')) {
              console.warn(`Attempt ${attempts}: Duplicate RPM number detected, retrying...`);
              
              if (attempts < maxAttempts) {
                // Random delay 100-300ms
                await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
                continue;
              }
            }
            throw error;
          }

          insertSuccess = true;
        } catch (attemptError: any) {
          if (attempts >= maxAttempts) throw attemptError;
        }
      }

      toast.success('Letter added successfully');
      setShowAddModal(false);
      setNewLetter({
        region: '',
        branch_or_region_ho: '',
        subject: '',
        status: 'Inadequate',
        letter_date: new Date().toISOString().split('T')[0]
      });
      fetchLetters();
    } catch (error) {
      console.error('Error adding letter:', error);
      toast.error('Failed to add letter');
    }
  };

  // Update status - local only, save later
  const handleUpdateStatus = (id: string, status: RPMRegistration['status']) => {
    const dueDate = getDueDate(status);
    
    // Update local display
    setLetters(prev => prev.map(letter => 
      letter.id === id ? { ...letter, status, due_date: dueDate } : letter
    ));
    
    // Track change for batch save
    setPendingChanges(prev => ({
      ...prev,
      [id]: { ...prev[id], status, due_date: dueDate }
    }));
  };

  // Update due date - local only, save later
  const handleUpdateDueDate = (id: string, dueDate: string) => {
    // Update local display
    setLetters(prev => prev.map(letter => 
      letter.id === id ? { ...letter, due_date: dueDate } : letter
    ));
    
    // Track change for batch save
    setPendingChanges(prev => ({
      ...prev,
      [id]: { ...prev[id], due_date: dueDate }
    }));
  };

  // Save all pending changes to database
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) return;
    
    setIsSaving(true);
    try {
      // Batch update all pending changes
      const updates = Object.entries(pendingChanges).map(([id, changes]) => 
        supabase
          .from('rpm_registration')
          .update(changes)
          .eq('id', id)
      );
      
      await Promise.all(updates);
      
      setPendingChanges({});
      toast.success('Perubahan berhasil disimpan!');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Gagal menyimpan perubahan');
      // Revert on error
      fetchLetters();
    } finally {
      setIsSaving(false);
    }
  };

  // Discard all pending changes
  const handleDiscardChanges = () => {
    setPendingChanges({});
    fetchLetters();
  };

  // Edit letter
  const handleEditLetter = (letter: RPMRegistration) => {
    setEditingLetter(letter);
    setShowEditModal(true);
  };

  // Update letter
  const handleUpdateLetter = async () => {
    if (!editingLetter?.id) return;

    try {
      const { error } = await supabase
        .from('rpm_registration')
        .update({
          region: editingLetter.region,
          branch_or_region_ho: editingLetter.branch_or_region_ho,
          subject: editingLetter.subject,
          letter_date: editingLetter.letter_date
        })
        .eq('id', editingLetter.id);

      if (error) throw error;

      toast.success('Letter updated successfully');
      setShowEditModal(false);
      setEditingLetter(null);
      fetchLetters();
    } catch (error) {
      console.error('Error updating letter:', error);
      toast.error('Failed to update letter');
    }
  };

  // Delete letter - show confirmation modal
  const handleDeleteLetter = (id: string) => {
    setDeletingLetterId(id);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingLetterId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('rpm_registration')
        .delete()
        .eq('id', deletingLetterId);

      if (error) throw error;

      toast.success('Surat berhasil dihapus');
      fetchLetters();
    } catch (error) {
      console.error('Error deleting letter:', error);
      toast.error('Gagal menghapus surat');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeletingLetterId(null);
    }
  };

  // Export to Excel
  const handleExport = () => {
    try {
      const exportData = letters.map((letter, index) => ({
        'No': index + 1,
        'Letter Number': letter.letter_number,
        'Letter Date': letter.letter_date,
        'Region': letter.region,
        'Branch/Region/HO': letter.branch_or_region_ho,
        'Subject': letter.subject,
        'Status': letter.status,
        'Due Date': letter.due_date
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'RPM Registration');
      XLSX.writeFile(workbook, `rpm_registration_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  // Row color based on status
  const getRowClassName = (_status: string, dueDate: string): string => {
    if (dueDate === 'Finished') return 'bg-green-50';
    if (dueDate === 'Open') return 'bg-red-50';
    if (dueDate) return 'bg-yellow-50';
    return '';
  };

  // Table columns
  const columns = [
    columnHelper.display({
      id: 'row_number',
      header: 'No',
      cell: info => (
        <span className="text-sm font-medium text-gray-700">
          {info.row.index + 1}
        </span>
      ),
    }),
    columnHelper.accessor('letter_number', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          NO. SURAT
          <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('letter_date', {
      header: 'Tanggal Surat',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('region', {
      header: 'Regional',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('branch_or_region_ho', {
      header: 'Cabang/Region/HO',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('subject', {
      header: 'Perihal',
      cell: info => (
        <div className="whitespace-normal break-words max-w-xs">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <select
          value={info.getValue()}
          onChange={(e) => handleUpdateStatus(info.row.original.id!, e.target.value as RPMRegistration['status'])}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          <option value="Adequate">Memadai</option>
          <option value="Reminder 1">Reminder 1</option>
          <option value="Reminder 2">Reminder 2</option>
          <option value="Inadequate">Tidak Memadai</option>
        </select>
      ),
    }),
    columnHelper.accessor('due_date', {
      header: 'Due Date',
      cell: info => {
        const status = info.row.original.status;
        if (status === 'Reminder 1' || status === 'Reminder 2') {
          return (
            <input
              type="date"
              value={info.getValue() || ''}
              onChange={(e) => handleUpdateDueDate(info.row.original.id!, e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          );
        }
        return <span className="text-sm">{info.getValue()}</span>;
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Aksi',
      cell: info => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditLetter(info.row.original)}
            className="px-2 py-1.5 text-xs font-medium text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-md transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          {canDelete && (
            <button
              onClick={() => handleDeleteLetter(info.row.original.id!)}
              className="px-2 py-1.5 text-xs font-medium text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-md transition-colors"
              title="Hapus"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: letters,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Cari surat..."
            className="pl-9 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <>
              <button
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Batal
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="inline-flex items-center justify-center px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg shadow-md shadow-amber-500/20 hover:bg-amber-600 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Simpan ({Object.keys(pendingChanges).length})
                  </>
                )}
              </button>
            </>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Surat
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : letters.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Belum ada surat RPM yang terdaftar.</p>
            <p className="text-sm mt-1">Klik "Tambah Surat" untuk menambahkan.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id}
                  className={getRowClassName(row.original.status, row.original.due_date)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Tambah Surat RPM</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Letter Date - Auto today, read-only */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tanggal Surat</label>
                  <input
                    type="text"
                    value={new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Tanggal surat otomatis hari ini</p>
                </div>

                {/* Branch selection with auto-fill Regional */}
                <div className="flex gap-3">
                  <div className="flex-1 relative z-20">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cabang/Region/HO *</label>
                    <select
                      value={newLetter.branch_or_region_ho}
                      onChange={(e) => handleBranchSelect(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">-- Pilih Cabang --</option>
                      {allBranches.map((branch: string) => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-20 flex-shrink-0">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Regional</label>
                    <input
                      type="text"
                      value={newLetter.region || '-'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-center cursor-not-allowed font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perihal *</label>
                  <textarea
                    value={newLetter.subject}
                    onChange={(e) => setNewLetter({ ...newLetter, subject: e.target.value })}
                    placeholder="Masukkan perihal surat"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newLetter.status === 'Adequate'}
                        onChange={() => setNewLetter({ ...newLetter, status: 'Adequate' })}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Memadai</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newLetter.status === 'Reminder 1'}
                        onChange={() => setNewLetter({ ...newLetter, status: 'Reminder 1' })}
                        className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                      />
                      <span className="text-sm text-gray-700">Reminder 1</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newLetter.status === 'Reminder 2'}
                        onChange={() => setNewLetter({ ...newLetter, status: 'Reminder 2' })}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">Reminder 2</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newLetter.status === 'Inadequate'}
                        onChange={() => setNewLetter({ ...newLetter, status: 'Inadequate' })}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">Tidak Memadai</span>
                    </label>
                  </div>
                </div>

                {/* Letter Number Preview - Moved to bottom to avoid blocking dropdown */}
                {newLetter.region && newLetter.branch_or_region_ho && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <label className="block text-xs font-medium text-indigo-600 mb-1">Preview Nomor Surat</label>
                    {loadingPreview ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-500">Generating...</p>
                      </div>
                    ) : (
                      <p className="text-lg font-bold text-indigo-800">{previewLetterNumber}</p>
                    )}
                    <p className="text-xs text-indigo-500 mt-1">Nomor surat akan di-generate otomatis saat disimpan</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddLetter}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingLetter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Edit Surat RPM</h3>
                <button
                  onClick={() => { setShowEditModal(false); setEditingLetter(null); }}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Nomor Surat</label>
                  <input
                    type="text"
                    value={editingLetter.letter_number}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Surat</label>
                  <input
                    type="date"
                    value={editingLetter.letter_date}
                    onChange={(e) => setEditingLetter({ ...editingLetter, letter_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Regional</label>
                  <input
                    type="text"
                    value={editingLetter.region}
                    onChange={(e) => setEditingLetter({ ...editingLetter, region: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cabang/Region/HO</label>
                  <input
                    type="text"
                    value={editingLetter.branch_or_region_ho}
                    onChange={(e) => setEditingLetter({ ...editingLetter, branch_or_region_ho: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perihal</label>
                  <textarea
                    value={editingLetter.subject}
                    onChange={(e) => setEditingLetter({ ...editingLetter, subject: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => { setShowEditModal(false); setEditingLetter(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateLetter}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl animate-in zoom-in-95 fade-in duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Hapus Surat?</h3>
              <p className="text-gray-500 text-center mb-6">
                Apakah Anda yakin ingin menghapus surat ini? Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeletingLetterId(null); }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Hapus
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
