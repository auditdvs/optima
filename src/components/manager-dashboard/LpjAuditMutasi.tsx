import { Edit2, FileText, PlusIcon, Save, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

interface AuditMutasiRecord {
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
  // LPJ columns
  lpj_file_url?: string;
  lpj_file_name?: string;
  lpj_file_path?: string;
  lpj_description?: string;
  lpj_submitted_at?: string;
  finance_comment?: string | null;
}

export default function LpjAuditMutasi() {
  const [mutasiList, setMutasiList] = useState<AuditMutasiRecord[]>([]);
  const [pendingDocs, setPendingDocs] = useState<AuditMutasiRecord[]>([]);
  const [selectedMutasiId, setSelectedMutasiId] = useState<string>('');
  const [selectedDetail, setSelectedDetail] = useState<AuditMutasiRecord | null>(null);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  // Edit state
  const [editingItem, setEditingItem] = useState<AuditMutasiRecord | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedMutasiId) {
      const record = pendingDocs.find(m => m.id === Number(selectedMutasiId));
      setSelectedDetail(record || null);
    } else {
      setSelectedDetail(null);
    }
  }, [selectedMutasiId, pendingDocs]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: mutasiData, error } = await supabase
        .from('audit_mutasi')
        .select('*')
        .eq('status', 'approved')
        .eq('created_by', user.id)
        .order('departure_date', { ascending: false });

      if (error) throw error;

      const allData = mutasiData || [];

      // Fetch finance comments from finance_lpj_review (ref_type = 'mutasi')
      const mutasiIds = allData.map(m => String(m.id));
      let financeCommentMap = new Map<string, string | null>();
      if (mutasiIds.length > 0) {
        const { data: reviewData } = await supabase
          .from('finance_lpj_review')
          .select('ref_id, comment')
          .eq('ref_type', 'mutasi')
          .in('ref_id', mutasiIds);
        reviewData?.forEach(r => financeCommentMap.set(r.ref_id, r.comment));
      }

      // Merge comments into records
      const enrichedData = allData.map(m => ({
        ...m,
        finance_comment: financeCommentMap.get(String(m.id)) ?? null,
      }));

      setMutasiList(enrichedData);
      setPendingDocs(enrichedData.filter(m => !m.lpj_file_url));
    } catch (error) {
      console.error('Error fetching LPJ Mutasi data:', error);
      toast.error('Gagal mengambil data LPJ Mutasi');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, userId: string): Promise<{ publicUrl: string; filePath: string }> => {
    const fileExt = file.name.split('.').pop();
    const timestamp = new Date().getTime();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filePath = `${userId}/${timestamp}_${safeFileName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('lpj-mutasi')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('lpj-mutasi')
      .getPublicUrl(filePath);

    return { publicUrl, filePath };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMutasiId || !file || !description) {
      toast.error('Mohon lengkapi semua field');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { publicUrl, filePath } = await uploadFile(file, user.id);

      const { data: updateData, error: updateError } = await supabase
        .from('audit_mutasi')
        .update({
          lpj_file_url: publicUrl,
          lpj_file_name: file.name,
          lpj_file_path: filePath,
          lpj_description: description,
          lpj_submitted_at: new Date().toISOString(),
        })
        .eq('id', Number(selectedMutasiId))
        .select();

      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) {
        throw new Error(`Update tidak berhasil. Kemungkinan RLS policy membatasi UPDATE. ID: ${selectedMutasiId}`);
      }

      toast.success('LPJ Audit Mutasi berhasil disubmit!');
      closeFormModal();
      fetchData();
    } catch (error) {
      console.error('Error submitting LPJ Mutasi:', error);
      toast.error('Gagal submit LPJ: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editFile || !editDescription) {
      toast.error('Mohon lengkapi semua field');
      return;
    }

    setEditSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete old file from storage if exists
      if (editingItem.lpj_file_path) {
        await supabase.storage
          .from('lpj-mutasi')
          .remove([editingItem.lpj_file_path]);
      }

      // Upload new file
      const { publicUrl, filePath } = await uploadFile(editFile, user.id);

      const { data: updateData, error: updateError } = await supabase
        .from('audit_mutasi')
        .update({
          lpj_file_url: publicUrl,
          lpj_file_name: editFile.name,
          lpj_file_path: filePath,
          lpj_description: editDescription,
          lpj_submitted_at: new Date().toISOString(),
        })
        .eq('id', editingItem.id)
        .select();

      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) {
        throw new Error('Update tidak berhasil. Cek RLS policy.');
      }

      toast.success('LPJ berhasil diperbarui!');
      closeEditModal();
      fetchData();
    } catch (error) {
      console.error('Error editing LPJ Mutasi:', error);
      toast.error('Gagal edit LPJ: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setEditSubmitting(false);
    }
  };

  const openEditModal = (item: AuditMutasiRecord) => {
    setEditingItem(item);
    setEditDescription(item.lpj_description || '');
    setEditFile(null);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditDescription('');
    setEditFile(null);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setSelectedMutasiId('');
    setSelectedDetail(null);
    setDescription('');
    setFile(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">LPJ Audit Mutasi</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload laporan pertanggungjawaban untuk audit mutasi antar cabang.
          </p>
        </div>
        <button
          onClick={() => setShowFormModal(true)}
          className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Input LPJ Mutasi
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Histori LPJ Audit Mutasi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auditor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dari</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ke</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Berangkat</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status LPJ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan & File</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl LPJ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-indigo-500 uppercase tracking-wider">Catatan Finance</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-4 text-center text-sm text-gray-500">Loading data...</td>
                </tr>
              ) : mutasiList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-4 text-center text-sm text-gray-500">Belum ada data audit mutasi</td>
                </tr>
              ) : (
                mutasiList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.auditor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.from_branch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.to_branch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.departure_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-indigo-600">{formatCurrency(item.total)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.lpj_file_url ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.lpj_file_url ? 'Sudah Input' : 'Belum Input'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-words">
                      {item.lpj_file_url ? (
                        <div className="flex flex-col gap-1">
                          <span>{item.lpj_description}</span>
                          <a href={item.lpj_file_url} target="_blank" rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 text-xs">
                            <FileText className="w-3 h-3" /> {item.lpj_file_name || 'Download'}
                          </a>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.lpj_submitted_at ? formatDate(item.lpj_submitted_at) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm max-w-[200px]">
                      {item.finance_comment ? (
                        <div className="flex items-start gap-1.5">
                          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                          <span className="text-indigo-700 break-words leading-relaxed">{item.finance_comment}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {item.lpj_file_url && (
                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                          title="Edit LPJ"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Input LPJ Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4 sm:p-6 flex items-start justify-center">
          <div className="relative w-full max-w-2xl shadow-xl rounded-lg bg-white my-8">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-indigo-600" />
                  Upload LPJ Audit Mutasi
                </h3>
                <button onClick={closeFormModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dari Cabang → Ke Cabang *</label>
                  <select
                    value={selectedMutasiId}
                    onChange={(e) => setSelectedMutasiId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Pilih Data Mutasi --</option>
                    {pendingDocs.map(item => (
                      <option key={item.id} value={String(item.id)}>
                        {item.auditor_name} — {item.from_branch} → {item.to_branch}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Hanya menampilkan data mutasi Approved yang belum ada LPJ</p>
                </div>

                {/* Detail Preview */}
                {selectedDetail && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Detail Mutasi (Crosscheck)</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">Auditor</span><p className="font-medium text-gray-900">{selectedDetail.auditor_name}</p></div>
                      <div><span className="text-gray-500">Tgl Berangkat</span><p className="font-medium text-gray-900">{formatDate(selectedDetail.departure_date)}</p></div>
                      <div><span className="text-gray-500">Dari Cabang/Regional</span><p className="font-medium text-gray-900">{selectedDetail.from_branch}</p></div>
                      <div><span className="text-gray-500">Ke Cabang/Regional</span><p className="font-medium text-gray-900">{selectedDetail.to_branch}</p></div>
                    </div>
                    <div className="border-t border-indigo-200 pt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-gray-500">Transport</span><p className="font-medium text-gray-900">{formatCurrency(selectedDetail.transport)}</p></div>
                        <div><span className="text-gray-500">Konsumsi</span><p className="font-medium text-gray-900">{formatCurrency(selectedDetail.konsumsi)}</p></div>
                        <div><span className="text-gray-500">Lainnya</span><p className="font-medium text-gray-900">{formatCurrency(selectedDetail.lainnya)}</p></div>
                        <div><span className="text-gray-500">Total</span><p className="font-bold text-indigo-600">{formatCurrency(selectedDetail.total)}</p></div>
                      </div>
                    </div>
                    {selectedDetail.notes && (
                      <div className="text-sm"><span className="text-gray-500">Catatan:</span><p className="text-gray-700">{selectedDetail.notes}</p></div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload File Excel *</label>
                  <input
                    type="file" accept=".xlsx, .xls"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Tambahkan keterangan..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={closeFormModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Batal
                  </button>
                  <button type="submit" disabled={submitting || !selectedMutasiId || !file}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? 'Loading...' : <><Save className="w-4 h-4 mr-2" />Submit LPJ</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit LPJ Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4 sm:p-6 flex items-start justify-center">
          <div className="relative w-full max-w-xl shadow-xl rounded-lg bg-white my-8">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Edit2 className="w-5 h-5 mr-2 text-indigo-600" />
                  Edit LPJ Audit Mutasi
                </h3>
                <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Record info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-1">
                <p className="font-semibold text-gray-900">{editingItem.auditor_name}</p>
                <p className="text-gray-600">{editingItem.from_branch} → {editingItem.to_branch}</p>
                <p className="text-gray-500">{formatDate(editingItem.departure_date)} · {formatCurrency(editingItem.total)}</p>
              </div>

              {/* Current file info */}
              {editingItem.lpj_file_url && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div className="text-sm">
                    <p className="text-amber-800 font-medium">File LPJ Saat Ini:</p>
                    <a href={editingItem.lpj_file_url} target="_blank" rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline text-xs flex items-center gap-1 mt-0.5">
                      <FileText className="w-3 h-3" />
                      {editingItem.lpj_file_name || 'Download'}
                    </a>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">Akan ditimpa</span>
                </div>
              )}

              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload File Baru * <span className="text-xs text-gray-400 font-normal">(mengganti file lama)</span>
                  </label>
                  <input
                    type="file" accept=".xlsx, .xls"
                    onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan *</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Tambahkan keterangan..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={closeEditModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Batal
                  </button>
                  <button type="submit" disabled={editSubmitting || !editFile || !editDescription}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {editSubmitting ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" />Simpan Perubahan</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
