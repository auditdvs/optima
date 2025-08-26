import { AlertTriangle, Calendar, FileText, MapPin, Upload, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

interface Branch {
  id: string;
  name: string;
  region: string;
}

interface Auditor {
  id: string;
  name: string;
}

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
  risk?: string;
  priority?: string | number;
  file_url?: string;
}

interface AssignmentLetterManagerEditProps {
  letter: AssignmentLetter;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AssignmentLetterManagerEdit({ letter, onSuccess, onCancel }: AssignmentLetterManagerEditProps) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    branch_name: letter.branch_name,
    region: letter.region,
    audit_type: letter.audit_type,
    audit_period_start: letter.audit_period_start ? letter.audit_period_start.substring(0, 7) : '', // Convert YYYY-MM-DD to YYYY-MM
    audit_period_end: letter.audit_period_end ? letter.audit_period_end.substring(0, 7) : '',
    audit_start_date: letter.audit_start_date,
    audit_end_date: letter.audit_end_date,
    team: letter.team ? letter.team.split(',').map(t => t.trim()) : [],
    leader: letter.leader || '',
    risk: letter.risk || 'Low',
    priority: letter.priority || (letter.audit_type === 'reguler' ? 1 : 'Khusus'),
    transport: letter.transport || 0,
    konsumsi: letter.konsumsi || 0,
    etc: letter.etc || 0
  });

  useEffect(() => {
    fetchBranches();
    fetchAuditors();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, region')
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Gagal mengambil data cabang');
    }
  };

  const fetchAuditors = async () => {
    try {
      const { data, error } = await supabase
        .from('auditors')
        .select('id, name')
        .order('name');

      if (error) throw error;
      const filteredAuditors = data?.filter(auditor => auditor.name) || [];
      setAuditors(filteredAuditors);
    } catch (error) {
      console.error('Error fetching auditors:', error);
      toast.error('Gagal mengambil data auditor');
    }
  };

  const formatMonthYear = (monthValue: string) => {
    if (!monthValue) return '';
    const [year, month] = monthValue.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getDisplayPeriod = () => {
    if (!formData.audit_period_start || !formData.audit_period_end) return '';
    return `${formatMonthYear(formData.audit_period_start)} - ${formatMonthYear(formData.audit_period_end)}`;
  };

  const handleBranchChange = (branchName: string) => {
    const selectedBranch = branches.find(branch => branch.name === branchName);
    setFormData(prev => ({
      ...prev,
      branch_name: branchName,
      region: selectedBranch?.region || ''
    }));
  };

  const handleTeamSelect = (teamMember: string) => {
    setFormData(prev => ({
      ...prev,
      team: prev.team.includes(teamMember)
        ? prev.team.filter(t => t !== teamMember)
        : [...prev.team, teamMember]
    }));
  };

  const removeTeamMember = (teamMember: string) => {
    setFormData(prev => ({
      ...prev,
      team: prev.team.filter(t => t !== teamMember)
    }));
  };

  const isLeaderInTeam = () => {
    return formData.leader && formData.team.includes(formData.leader);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: name === 'transport' || name === 'konsumsi' || name === 'etc' 
          ? Number(value) 
          : name === 'priority' && prev.audit_type === 'reguler'
          ? Number(value)
          : value
      };

      if (name === 'audit_type' && value === 'khusus') {
        newData.risk = 'High';
        newData.priority = 'Khusus';
        newData.audit_period_start = '';
        newData.audit_period_end = '';
      } else if (name === 'audit_type' && value === 'reguler') {
        newData.risk = 'Low';
        newData.priority = 1;
      }

      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fileUrl = letter.file_url;
      
      // Upload new file if selected
      if (selectedFile) {
        try {
          const cleanBranchName = formData.branch_name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
          const cleanLetterNumber = letter.assigment_letter.replace(/[^a-zA-Z0-9]/g, '-');
          const fileExtension = selectedFile.name.split('.').pop();
          const fileName = `${cleanLetterNumber}.${fileExtension}`;
          const filePath = `${cleanBranchName}/${fileName}`;
          
          setUploadProgress(20);
          toast.loading('Mengupload file baru...', { id: 'upload' });
          
          const { error: uploadError } = await supabase.storage
            .from('perdin')
            .upload(filePath, selectedFile, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error(`Gagal mengupload file: ${uploadError.message}`, { id: 'upload' });
            throw uploadError;
          }

          setUploadProgress(70);

          const { data: { publicUrl } } = supabase.storage
            .from('perdin')
            .getPublicUrl(filePath);
          
          fileUrl = publicUrl;
          setUploadProgress(90);
          
          toast.success('File berhasil diupload!', { id: 'upload' });
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast.error('Gagal mengupload file', { id: 'upload' });
          setLoading(false);
          setUploadProgress(0);
          return;
        }
      }
      
      const convertMonthToDate = (monthStr: string) => {
        if (!monthStr) return null;
        return `${monthStr}-01`;
      };
      
      const { error } = await supabase
        .from('letter')
        .update({
          branch_name: formData.branch_name,
          region: formData.region,
          audit_type: formData.audit_type,
          audit_period_start: convertMonthToDate(formData.audit_period_start),
          audit_period_end: convertMonthToDate(formData.audit_period_end),
          audit_start_date: formData.audit_start_date,
          audit_end_date: formData.audit_end_date,
          team: formData.team.join(','),
          leader: formData.leader,
          risk: formData.risk,
          priority: formData.priority,
          transport: formData.transport,
          konsumsi: formData.konsumsi,
          etc: formData.etc,
          file_url: fileUrl,
          // Reset status back to pending when edited by manager
          status: 'pending'
        })
        .eq('id', letter.id);

      if (error) throw error;

      setUploadProgress(100);
      toast.success('Assignment Letter berhasil diupdate');
      onSuccess();
    } catch (error) {
      console.error('Error updating assignment letter:', error);
      toast.error('Gagal mengupdate Assignment Letter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Assignment Letter</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                <strong>Info:</strong> Setelah diedit, status assignment letter akan kembali menjadi "Pending" dan perlu persetujuan ulang.
              </p>
            </div>

            {/* Row 1: Ketua Tim | Tim */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Ketua Tim <span className="text-red-500">*</span>
                </label>
                <select
                  name="leader"
                  value={formData.leader}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Pilih Ketua Tim</option>
                  {auditors.map((auditor) => (
                    <option key={auditor.id} value={auditor.name}>
                      {auditor.name}
                    </option>
                  ))}
                </select>
                {!formData.leader && (
                  <p className="text-xs text-red-500 mt-1">Ketua Tim wajib dipilih</p>
                )}
                {isLeaderInTeam() && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Peringatan: Ketua Tim juga terdapat dalam daftar anggota tim
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Tim
                </label>
                <div className="relative">
                  <div
                    onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-h-[42px] flex flex-wrap items-center gap-1"
                  >
                    {formData.team.length === 0 ? (
                      <span className="text-gray-500">Pilih Tim (opsional)</span>
                    ) : (
                      formData.team.map((member) => (
                        <span
                          key={member}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          {member}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTeamMember(member);
                            }}
                            className="ml-1 text-indigo-600 hover:text-indigo-800"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  
                  {showTeamDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {auditors.length === 0 ? (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          Tidak ada data auditor
                        </div>
                      ) : (
                        auditors.map((auditor) => (
                          <div
                            key={auditor.id}
                            onClick={() => handleTeamSelect(auditor.name)}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                              formData.team.includes(auditor.name)
                                ? 'bg-indigo-50 text-indigo-900'
                                : 'text-gray-900'
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.team.includes(auditor.name)}
                                onChange={() => {}}
                                className="mr-2"
                                onClick={(e) => e.stopPropagation()}
                              />
                              {auditor.name}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Nama Cabang | Regional */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Nama Cabang
                </label>
                <select
                  name="branch_name"
                  value={formData.branch_name}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Pilih Cabang</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Regional
                </label>
                <input
                  type="text"
                  name="region"
                  value={formData.region}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
                  placeholder="Otomatis terisi"
                />
              </div>
            </div>

            {/* Row 3: Tipe Audit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Tipe Audit
              </label>
              <select
                name="audit_type"
                value={formData.audit_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Pilih Tipe Audit</option>
                <option value="reguler">Reguler</option>
                <option value="khusus">Khusus</option>
              </select>
            </div>

            {/* Periode Audit - Hanya untuk tipe reguler */}
            {formData.audit_type === 'reguler' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Periode Audit
                </label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Periode Mulai</label>
                    <input
                      type="month"
                      name="audit_period_start"
                      value={formData.audit_period_start}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Periode Selesai</label>
                    <input
                      type="month"
                      name="audit_period_end"
                      value={formData.audit_period_end}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
                {(formData.audit_period_start || formData.audit_period_end) && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>Preview:</strong> {getDisplayPeriod() || 'Lengkapi periode audit'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Row 4: Tanggal Audit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Tanggal Audit
              </label>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Mulai</label>
                  <input
                    type="date"
                    name="audit_start_date"
                    value={formData.audit_start_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Selesai</label>
                  <input
                    type="date"
                    name="audit_end_date"
                    value={formData.audit_end_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 5: Risiko | Prioritas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Risiko
                </label>
                <select
                  name="risk"
                  value={formData.risk}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={formData.audit_type === 'khusus'}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                {formData.audit_type === 'khusus' && (
                  <p className="text-xs text-blue-600 mt-1">Otomatis diatur ke High untuk audit khusus</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Prioritas
                </label>
                {formData.audit_type === 'khusus' ? (
                  <>
                    <input
                      type="text"
                      value="Khusus"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                    />
                    <p className="text-xs text-blue-600 mt-1">Otomatis diatur ke Khusus untuk audit khusus</p>
                  </>
                ) : (
                  <input
                    type="number"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    required
                    placeholder="Masukkan angka prioritas"
                  />
                )}
              </div>
            </div>

            {/* Row 6: Budget */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transportasi (Rp)
                </label>
                <input
                  type="number"
                  name="transport"
                  value={formData.transport}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0
                  }).format(formData.transport)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konsumsi (Rp)
                </label>
                <input
                  type="number"
                  name="konsumsi"
                  value={formData.konsumsi}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0
                  }).format(formData.konsumsi)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lain-lain (Rp)
                </label>
                <input
                  type="number"
                  name="etc"
                  value={formData.etc}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0
                  }).format(formData.etc)}
                </p>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <FileText className="w-4 h-4 inline mr-1" />
                Upload File Excel (Opsional - untuk mengganti file lama)
              </label>
              
              <div className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
                selectedFile 
                  ? 'border-green-400 bg-green-50' 
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
              }`}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error('Ukuran file terlalu besar. Maksimal 10MB.');
                        e.target.value = '';
                        return;
                      }
                      setSelectedFile(file);
                      toast.success(`File ${file.name} dipilih`);
                    } else {
                      setSelectedFile(null);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                <div className="p-8 text-center">
                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800">{selectedFile.name}</p>
                        <p className="text-xs text-green-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          const fileInput = e.currentTarget.parentElement?.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Hapus file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Pilih file Excel baru atau drag & drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          XLS, XLSX • Maksimal 10MB • Kosongkan jika tidak ingin mengganti file
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Mengupload file...</span>
                    <span className="text-sm text-blue-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !formData.leader}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Menyimpan...' : 'Update'}
              </button>
            </div>
          </form>

          {/* Click outside to close dropdown */}
          {showTeamDropdown && (
            <div 
              className="fixed inset-0 z-[5]" 
              onClick={() => setShowTeamDropdown(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
