import { Edit2, FileDown, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

interface AuditMutasi {
  id: number;
  auditor_name: string;
  departure_date: string;
  from_branch: string;
  to_branch: string;
  transport: number;
  konsumsi: number;
  lainnya: number;
  total: number;
  notes?: string;
  file_url?: string;
  file_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string;
  created_by?: string;
  created_at?: string;
}

interface Auditor {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function AuditMutasi() {
  const [data, setData] = useState<AuditMutasi[]>([]);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    auditor_name: '',
    departure_date: '',
    from_branch: '',
    to_branch: '',
    transport: 0,
    konsumsi: 0,
    lainnya: 0,
    notes: ''
  });
  const [isPerdinLibur, setIsPerdinLibur] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCostDetail, setShowCostDetail] = useState<AuditMutasi | null>(null);
  const [showRejectReason, setShowRejectReason] = useState<AuditMutasi | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchAuditors();
    fetchBranches();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      
      setCurrentUserId(session.user.id);
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
      
      if (data?.role) setUserRole(data.role);
    } catch (error) {
      console.log('Could not fetch user role');
    }
  };

  const fetchData = async () => {
    try {
      const { data: mutasiData, error } = await supabase
        .from('audit_mutasi')
        .select('*')
        .order('departure_date', { ascending: false });

      if (error) throw error;
      setData(mutasiData || []);
    } catch (error) {
      console.error('Error fetching audit mutasi:', error);
      toast.error('Gagal mengambil data audit mutasi');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditors = async () => {
    try {
      const { data, error } = await supabase
        .from('auditors')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setAuditors(data?.filter(a => a.name) || []);
    } catch (error) {
      console.error('Error fetching auditors:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches_info')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      auditor_name: '',
      departure_date: '',
      from_branch: '',
      to_branch: '',
      transport: 0,
      konsumsi: 0,
      lainnya: 0,
      notes: ''
    });
    setEditingId(null);
    setShowForm(false);
    setSelectedFile(null);
    setExistingFileUrl(null);
    setExistingFileName(null);
    setIsPerdinLibur(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let fileUrl = existingFileUrl;
      let fileName = existingFileName;
      
      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const timestamp = Date.now();
        const filePath = `${formData.auditor_name.replace(/\s+/g, '_')}_${timestamp}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('mutasi')
          .upload(filePath, selectedFile, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('mutasi')
          .getPublicUrl(filePath);
        
        fileUrl = publicUrl;
        fileName = selectedFile.name;
      }
      
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('audit_mutasi')
          .update({
            auditor_name: formData.auditor_name,
            departure_date: formData.departure_date,
            from_branch: formData.from_branch,
            to_branch: formData.to_branch,
            transport: formData.transport,
            konsumsi: formData.konsumsi,
            lainnya: formData.lainnya,
            notes: formData.notes,
            file_url: fileUrl,
            file_name: fileName
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Data berhasil diupdate');
      } else {
        // Insert new with status pending
        const { error } = await supabase
          .from('audit_mutasi')
          .insert({
            ...formData,
            file_url: fileUrl,
            file_name: fileName,
            status: 'pending',
            created_by: user?.id
          });

        if (error) throw error;
        toast.success('Data berhasil ditambahkan, menunggu approval');
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving audit mutasi:', error);
      toast.error('Gagal menyimpan data');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item: AuditMutasi) => {
    setFormData({
      auditor_name: item.auditor_name,
      departure_date: item.departure_date,
      from_branch: item.from_branch,
      to_branch: item.to_branch,
      transport: item.transport,
      konsumsi: item.konsumsi,
      lainnya: item.lainnya,
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setExistingFileUrl(item.file_url || null);
    setExistingFileName(item.file_name || null);
    setSelectedFile(null);
    setIsPerdinLibur(item.to_branch === 'Perdin Libur Lebaran');
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    try {
      const { error } = await supabase
        .from('audit_mutasi')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Data berhasil dihapus');
      fetchData();
    } catch (error) {
      console.error('Error deleting audit mutasi:', error);
      toast.error('Gagal menghapus data');
    }
  };





  const getStatusBadge = (item: AuditMutasi) => {
    switch (item.status) {
      case 'approved':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'rejected':
        return (
          <button
            onClick={() => setShowRejectReason(item)}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer transition-colors"
            title="Klik untuk lihat alasan"
          >
            Rejected
          </button>
        );
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };

  const isManager = userRole === 'manager' || userRole === 'superadmin';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Audit Mutasi</h2>
          <p className="text-sm text-gray-500">Kelola data mutasi auditor antar cabang</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Mutasi
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Mutasi' : 'Tambah Mutasi Baru'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Auditor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auditor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.auditor_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, auditor_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Pilih Auditor</option>
                    {auditors.map(auditor => (
                      <option key={auditor.id} value={auditor.name}>{auditor.name}</option>
                    ))}
                  </select>
                </div>

                {/* Departure Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Berangkat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.departure_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, departure_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                {/* From Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dari Cabang/Regional <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.from_branch}
                    onChange={(e) => setFormData(prev => ({ ...prev, from_branch: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Pilih Cabang Asal</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.name}>{branch.name}</option>
                    ))}
                  </select>
                </div>

                {/* To Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ke Cabang/Regional {!isPerdinLibur && <span className="text-red-500">*</span>}
                  </label>
                  
                  {isPerdinLibur ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-amber-50 text-amber-700 font-medium">
                      Perdin Libur Lebaran
                    </div>
                  ) : (
                    <select
                      value={formData.to_branch}
                      onChange={(e) => setFormData(prev => ({ ...prev, to_branch: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Pilih Cabang Tujuan</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.name}>{branch.name}</option>
                      ))}
                    </select>
                  )}
                  
                  {/* Perdin Libur Checkbox - below dropdown */}
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="perdinLibur"
                      checked={isPerdinLibur}
                      onChange={(e) => {
                        setIsPerdinLibur(e.target.checked);
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, to_branch: 'Perdin Libur Lebaran' }));
                        } else {
                          setFormData(prev => ({ ...prev, to_branch: '' }));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="perdinLibur" className="ml-2 text-sm text-gray-600">
                      Perdin Libur Lebaran
                    </label>
                  </div>
                </div>

                {/* Transport */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transportasi (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.transport}
                    onChange={(e) => setFormData(prev => ({ ...prev, transport: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="0"
                  />
                </div>

                {/* Konsumsi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Konsumsi (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.konsumsi}
                    onChange={(e) => setFormData(prev => ({ ...prev, konsumsi: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="0"
                  />
                </div>

                {/* Lainnya */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lainnya (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.lainnya}
                    onChange={(e) => setFormData(prev => ({ ...prev, lainnya: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="0"
                  />
                </div>

                {/* Total Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-indigo-700 font-semibold">
                    {formatCurrency(formData.transport + formData.konsumsi + formData.lainnya)}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                  placeholder="Catatan tambahan (isi apa aja)"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Upload className="w-4 h-4 inline mr-1" />
                  Lampiran Excel
                </label>
                <div className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                  selectedFile || existingFileUrl
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-indigo-400'
                }`}>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error('Ukuran file maksimal 10MB');
                          e.target.value = '';
                          return;
                        }
                        setSelectedFile(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-center">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileDown className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">{selectedFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : existingFileUrl ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileDown className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">{existingFileName || 'File tersimpan'}</span>
                        <span className="text-xs text-gray-500">(klik untuk ganti)</span>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                        <p className="text-sm text-gray-600">Klik untuk upload file Excel</p>
                        <p className="text-xs text-gray-400">XLS, XLSX • Maks 10MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {uploading ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Auditor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tgl Berangkat</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dari</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ke</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Lampiran</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Belum ada data audit mutasi
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.auditor_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.departure_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.from_branch}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.to_branch}</td>
                    <td className="px-4 py-3 text-sm text-right relative">
                      <button
                        onClick={() => setShowCostDetail(item)}
                        className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        title="Klik untuk lihat rincian"
                      >
                        {formatCurrency(item.total)}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {getStatusBadge(item)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {/* Only show file to creator or manager */}
                      {(item.created_by === currentUserId || isManager) && item.file_url ? (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-green-600 hover:text-green-800 text-xs font-medium"
                          title={item.file_name || 'Download'}
                        >
                          <FileDown className="w-4 h-4 mr-1" />
                          File
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Approve/Reject buttons for managers on pending items */}
                        {/* Edit only for creator (when pending) or manager */}
                        {((item.status === 'pending' && item.created_by === currentUserId) || isManager) && (
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* Delete only for managers */}
                        {isManager && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Cost Detail Popup */}
      {showCostDetail && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowCostDetail(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Rincian Biaya</h3>
              <button
                onClick={() => setShowCostDetail(null)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-600 mb-3">
                <span className="font-medium text-gray-900">{showCostDetail.auditor_name}</span>
                <span className="mx-2">•</span>
                <span>{formatDate(showCostDetail.departure_date)}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transportasi</span>
                  <span className="font-medium text-gray-900">{formatCurrency(showCostDetail.transport)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Konsumsi</span>
                  <span className="font-medium text-gray-900">{formatCurrency(showCostDetail.konsumsi)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lainnya</span>
                  <span className="font-medium text-gray-900">{formatCurrency(showCostDetail.lainnya)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-indigo-600">{formatCurrency(showCostDetail.total)}</span>
                </div>
              </div>
              {showCostDetail.notes && (
                <div className="text-sm">
                  <span className="text-gray-500">Catatan:</span>
                  <p className="text-gray-700 mt-1">{showCostDetail.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Popup */}
      {showRejectReason && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowRejectReason(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Alasan Penolakan</h3>
              <button
                onClick={() => setShowRejectReason(null)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-600 mb-3">
                <span className="font-medium text-gray-900">{showRejectReason.auditor_name}</span>
                <span className="mx-2">•</span>
                <span>{showRejectReason.from_branch} → {showRejectReason.to_branch}</span>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <p className="text-sm text-red-800">
                  {showRejectReason.reject_reason || 'Tidak ada alasan yang dicantumkan'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
