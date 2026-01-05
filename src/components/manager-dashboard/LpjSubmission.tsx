import { FileText, PlusIcon, Save, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

interface PendingDocument {
  id: string;
  type: 'letter' | 'addendum';
  number: string;
  display: string;
}


interface LpjHistoryItem {
  id: string; // unique key prefix
  doc_id: string; // real id
  type: 'Surat Tugas' | 'Addendum';
  number: string;
  branch_name: string;
  status: 'Sudah Input' | 'Belum Input';
  description: string;
  doc_created_at: string;
  lpj_created_at?: string;
  file_url?: string;
}

export default function LpjSubmission() {
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
  const [historyList, setHistoryList] = useState<LpjHistoryItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Approved Letters (Created by ME)
      const { data: letters } = await supabase
        .from('letter')
        .select('id, assigment_letter, branch_name, tanggal_input')
        .eq('status', 'approved')
        .eq('created_by', user.id)
        .order('id', { ascending: false });

      // 2. Fetch Approved Addendums (Created by ME) - Independent of whether I created the letter
      const { data: myAddendums } = await supabase
        .from('addendum')
        .select('id, assigment_letter, branch_name, letter_id, tanggal_input')
        .eq('status', 'approved')
        .eq('created_by', user.id)
        .order('id', { ascending: false });

      const letterIds = letters?.map(l => l.id) || [];
      const addendumIds = myAddendums?.map(a => a.id) || [];

      let submissions: any[] = [];
      
      if (letterIds.length > 0) {
        const { data: s1 } = await supabase
          .from('lpj_submissions')
          .select('*')
          .in('letter_id', letterIds);
        if (s1) submissions = [...submissions, ...s1];
      }
      
      if (addendumIds.length > 0) {
        const { data: s2 } = await supabase
          .from('lpj_submissions')
          .select('*')
          .in('addendum_id', addendumIds);
        if (s2) submissions = [...submissions, ...s2];
      }

      // 4. Construct History List & Pending Docs
      const newHistory: LpjHistoryItem[] = [];
      const newPending: PendingDocument[] = [];

      // Process Letters
      letters?.forEach((l: any) => {
        const sub = submissions.find((s: any) => s.letter_id === l.id);
        
        const item: LpjHistoryItem = {
          id: `letter-${l.id}`,
          doc_id: String(l.id),
          type: 'Surat Tugas',
          number: l.assigment_letter,
          branch_name: l.branch_name,
          status: sub ? 'Sudah Input' : 'Belum Input',
          description: sub ? sub.description : '-',
          doc_created_at: l.tanggal_input, 
          lpj_created_at: sub ? sub.created_at : undefined,
          file_url: sub ? sub.file_url : undefined
        };
        newHistory.push(item);

        if (!sub) {
          newPending.push({
            id: String(l.id),
            type: 'letter',
            number: l.assigment_letter,
            display: `ST: ${l.assigment_letter} - ${l.branch_name}`
          });
        }
      });

      // Process Addendums
      myAddendums?.forEach((a: any) => {
        const sub = submissions.find((s: any) => s.addendum_id === a.id);
        
        const item: LpjHistoryItem = {
          id: `addendum-${a.id}`,
          doc_id: String(a.id),
          type: 'Addendum',
          number: a.assigment_letter,
          branch_name: a.branch_name,
          status: sub ? 'Sudah Input' : 'Belum Input',
          description: sub ? sub.description : '-',
          doc_created_at: a.tanggal_input,
          lpj_created_at: sub ? sub.created_at : undefined,
          file_url: sub ? sub.file_url : undefined
        };
        newHistory.push(item);

        if (!sub) {
          newPending.push({
            id: String(a.id),
            type: 'addendum',
            number: a.assigment_letter,
            display: `ADD: ${a.assigment_letter} - ${a.branch_name}`
          });
        }
      });

      // Sort by Document Date Descending
      newHistory.sort((a, b) => {
        const dateA = a.doc_created_at ? new Date(a.doc_created_at).getTime() : 0;
        const dateB = b.doc_created_at ? new Date(b.doc_created_at).getTime() : 0;
        return dateB - dateA;
      });

      setHistoryList(newHistory);
      setPendingDocs(newPending);

    } catch (error) {
      console.error('Error fetching LPJ data:', error);
      toast.error('Gagal mengambil data LPJ');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !file || !description) {
      toast.error('Mohon lengkapi semua field');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const selectedDoc = pendingDocs.find(d => d.id === selectedDocId);
      if (!selectedDoc) throw new Error('Dokumen tidak ditemukan');

      // 1. Upload File
      const fileExt = file.name.split('.').pop();
      const timestamp = new Date().getTime();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filePath = `${user.id}/${timestamp}_${safeFileName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('lpj-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('lpj-documents')
        .getPublicUrl(filePath);

      // 2. Insert Record
      // Note: Supabase JS client handles string "123" to integer 123 conversion automatically for INT columns
      const { error: insertError } = await supabase
        .from('lpj_submissions')
        .insert({
          created_by: user.id,
          letter_id: selectedDoc.type === 'letter' ? Number(selectedDoc.id) : null,
          addendum_id: selectedDoc.type === 'addendum' ? Number(selectedDoc.id) : null,
          letter_number: selectedDoc.number,
          description: description,
          file_url: publicUrl,
          file_path: filePath,
          file_name: file.name
        });

      if (insertError) throw insertError;

      toast.success('LPJ berhasil disubmit!');
      
      // Reset Form & Close Modal
      setSelectedDocId('');
      setDescription('');
      setFile(null);
      setShowFormModal(false);
      
      // Refresh Data
      fetchData();

    } catch (error) {
      console.error('Error submitting LPJ:', error);
      toast.error('Gagal submit LPJ: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Laporan Pertanggungjawaban</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-red-700">Ketentuan Upload LPJ:</p>
            <ol className="list-decimal list-inside text-s space-y-0.5 text-gray-500">
              <li>Tambahkan sheet 'Bukti' dan isi dengan gambar/foto bukti pengeluaran.</li>
              <li>LPJ wajib menggunakan file yang diunduh melalui menu Surat Tugas atau Addendum.</li>
              <li>File LPJ tidak diperkenankan menggunakan template UM atau template lain di luar sistem.</li>
              <li>Sistem akan melakukan validasi sumber file LPJ secara otomatis.</li>
              <li>Apabila pengguna mengunggah file LPJ yang bukan berasal dari Surat Tugas atau Addendum, maka file tersebut akan terdeteksi sebagai tidak sesuai.</li>
              <li>LPJ yang terdeteksi tidak sesuai berpotensi tidak dapat diproses lebih lanjut.</li>
            </ol>
          </div>
        </div>
        <button
          onClick={() => setShowFormModal(true)}
          className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Input LPJ
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Histori Pelaporan Pertanggungjawaban</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nomor Surat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Cabang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Surat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl LPJ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                 <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">Loading data...</td>
                </tr>
              ) : historyList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">Belum ada data surat tugas/addendum</td>
                </tr>
              ) : (
                historyList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {item.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.branch_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.type === 'Surat Tugas' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.status === 'Sudah Input' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-words">
                      {item.file_url ? (
                        <div className="flex flex-col gap-1">
                          <span>{item.description}</span>
                          <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 text-xs">
                             <FileText className="w-3 h-3" /> Download
                          </a>
                        </div>
                      ) : (
                        item.description
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.doc_created_at).toLocaleDateString('id-ID', {
                         day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.lpj_created_at ? new Date(item.lpj_created_at).toLocaleDateString('id-ID', {
                         day: 'numeric', month: 'short', year: 'numeric'
                      }) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showFormModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4 sm:p-6 flex items-start justify-center">
          <div className="relative w-full max-w-2xl shadow-xl rounded-lg bg-white my-8">
            <div className="p-4 md:p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-indigo-600" />
                  Upload Laporan Pertanggungjawaban
                </h3>
                <button
                  onClick={() => {
                    setShowFormModal(false);
                    setSelectedDocId('');
                    setDescription('');
                    setFile(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Document Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor Surat Tugas / Addendum *
                  </label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Pilih Surat --</option>
                    {pendingDocs.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.display}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Hanya menampilkan surat Approved yang belum ada LPJ
                  </p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload File Excel *
                  </label>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Tambahkan keterangan..."
                    required
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFormModal(false);
                      setSelectedDocId('');
                      setDescription('');
                      setFile(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedDocId || !file}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>Loading...</>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Submit LPJ
                      </>
                    )}
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

