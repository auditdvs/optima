import { AlertTriangle, Calendar, FileText, MapPin, Upload, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

interface Branch {
  id: string;
  name: string;
  region: string;
}

interface Auditor {
  id: string;
  name: string;
}

interface AssignmentLetterFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AssignmentLetterForm({ onSuccess, onCancel }: AssignmentLetterFormProps) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewLetterNumber, setPreviewLetterNumber] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [formData, setFormData] = useState({
    branch_name: '',
    region: '',
    audit_type: '', // Empty by default, not auto-select reguler
    audit_period_start: '',
    audit_period_end: '',
    audit_start_date: '',
    audit_end_date: '',
    team: [] as string[],
    leader: '', // Ketua Tim - mandatory single choice
    risk: 'Low', // Changed to string for dropdown
    priority: 1 as number | string, // Number for reguler, string for khusus
    transport: 0,
    konsumsi: 0,
    etc: 0
  });

  useEffect(() => {
    fetchBranches();
    fetchAuditors();
    fetchPreviewLetterNumber();
  }, []);

  const fetchPreviewLetterNumber = async () => {
    setLoadingPreview(true);
    try {
      const letterNumber = await generateLetterNumber();
      setPreviewLetterNumber(letterNumber);
    } catch (error) {
      console.error('Error fetching preview letter number:', error);
      setPreviewLetterNumber('Error generating preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches_info')
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
      console.log('Auditors fetched:', data); // Debug log
      console.log('Total auditors:', data?.length); // Debug count
      
      // Filter di frontend untuk memastikan name tidak null/kosong
      const filteredAuditors = data?.filter(auditor => auditor.name) || [];
      console.log('Filtered auditors:', filteredAuditors); // Debug filtered
    
      setAuditors(filteredAuditors);
    } catch (error) {
      console.error('Error fetching auditors:', error);
      toast.error('Gagal mengambil data auditor');
    }
  };

  const generateLetterNumber = async () => {
    try {
      // Query database untuk mendapatkan semua surat di tahun ini
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      const romanMonth = romanMonths[currentMonth - 1];

      // Get semua surat di tahun ini
      const { data: lettersThisYear, error } = await supabase
        .from('letter')
        .select('assigment_letter')
        .gte('tanggal_input', `${currentYear}-01-01`)
        .lte('tanggal_input', `${currentYear}-12-31`);

      if (error) {
        console.error('Error querying letters:', error);
        throw error;
      }

      // Parse nomor dari semua surat yang ada, cari yang terbesar
      let maxNumber = 0;
      lettersThisYear?.forEach(letter => {
        if (letter.assigment_letter) {
          // Extract nomor dari format "060/KMD-AUDIT/II/2026"
          const match = letter.assigment_letter.match(/^(\d+)\//);
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

      // Format: 061/KMD-AUDIT/II/2026 (tanpa QA karena ini surat tugas, bukan RPM)
      return `${paddedNumber}/KMD-AUDIT/${romanMonth}/${currentYear}`;
    } catch (error) {
      console.error('Error generating letter number:', error);
      // Fallback jika query gagal
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      const romanMonth = romanMonths[currentMonth - 1];
      return `001/KMD-AUDIT/${romanMonth}/${currentYear}`;
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

  // Format for display preview
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

  // Check if leader is also in team members
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
          ? Number(value) // Priority as number for reguler
          : value
      };

      // Auto-set risk and priority when audit_type is 'khusus'
      if (name === 'audit_type' && value === 'khusus') {
        newData.risk = 'High';
        newData.priority = 'Khusus';
        // Reset periode audit untuk audit khusus
        newData.audit_period_start = '';
        newData.audit_period_end = '';
      } else if (name === 'audit_type' && value === 'reguler') {
        // Reset to default when switching back to reguler
        newData.risk = 'Low';
        newData.priority = 1; // Number for reguler
      }

      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validasi wajib Excel file
      if (!selectedFile) {
        toast.error('File Excel wajib diupload');
        setLoading(false);
        return;
      }

      const letterNumber = await generateLetterNumber();
      let fileUrl = null;
      
      // Upload file Excel (WAJIB)
      try {
        // Buat path: perdin/{nama_cabang}/{nomor_surat}.{extension}
        const cleanBranchName = formData.branch_name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const cleanLetterNumber = letterNumber.replace(/[^a-zA-Z0-9]/g, '-');
        const fileExtension = selectedFile.name.split('.').pop();
        const fileName = `${cleanLetterNumber}.${fileExtension}`;
        const filePath = `${cleanBranchName}/${fileName}`;
        
        setUploadProgress(20);
        toast.loading('Mengupload file...', { id: 'upload' });
        
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

        // Get public URL
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
      
      // Convert month format (YYYY-MM) to date format (YYYY-MM-01) for database
      const convertMonthToDate = (monthStr: string) => {
        if (!monthStr) return null;
        return `${monthStr}-01`; // Add day 01 to make it a valid date
      };
      
      
      // Retry logic untuk handle concurrent submission
      let insertSuccess = false;
      let attempts = 0;
      const maxAttempts = 3;
      let finalLetterNumber = letterNumber;

      while (!insertSuccess && attempts < maxAttempts) {
        attempts++;
        
        try {
          // Generate nomor baru di setiap retry (kecuali attempt pertama)
          if (attempts > 1) {
            console.log(`Attempt ${attempts}: Generating new letter number...`);
            finalLetterNumber = await generateLetterNumber();
          }

          const { error } = await supabase
            .from('letter')
            .insert({
                assigment_letter: finalLetterNumber,
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
                status: 'pending'
            });

          if (error) {
            // Check duplicate key error
            if (error.code === '23505' || error.message?.toLowerCase().includes('duplicate')) {
              console.warn(`Attempt ${attempts}: Duplicate detected, retrying...`);
              
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


      setUploadProgress(100);
      toast.success('Assignment Letter berhasil dibuat');
      onSuccess();
    } catch (error) {
      console.error('Error creating assignment letter:', error);
      toast.error('Gagal membuat Assignment Letter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Isi form surat tugas</h2>
      </div>

      {/* Preview Nomor Surat */}
      <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Preview Nomor Surat</p>
            {loadingPreview ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Generating...</p>
              </div>
            ) : (
              <p className="text-lg font-bold text-gray-900 mt-1">{previewLetterNumber}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2 ml-13">Nomor ini akan otomatis di-generate saat form disimpan</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Ketua Tim | Tim */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ketua Tim - Single Select - MANDATORY */}
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

          {/* Tim - Multi Select - OPTIONAL */}
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
                            onChange={() => {}} // Handled by onClick
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
          {/* Nama Cabang */}
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

          {/* Regional */}
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
                <DatePicker
                  selected={formData.audit_period_start ? new Date(`${formData.audit_period_start}-01`) : null}
                  onChange={(date: Date | null) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      setFormData({ ...formData, audit_period_start: `${year}-${month}` });
                    } else {
                      setFormData({ ...formData, audit_period_start: '' });
                    }
                  }}
                  showMonthYearPicker
                  dateFormat="MM/yyyy"
                  placeholderText="Pilih bulan dan tahun"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Periode Selesai</label>
                <DatePicker
                  selected={formData.audit_period_end ? new Date(`${formData.audit_period_end}-01`) : null}
                  onChange={(date: Date | null) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      setFormData({ ...formData, audit_period_end: `${year}-${month}` });
                    } else {
                      setFormData({ ...formData, audit_period_end: '' });
                    }
                  }}
                  showMonthYearPicker
                  dateFormat="MM/yyyy"
                  placeholderText="Pilih bulan dan tahun"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
            {/* Display preview */}
            {(formData.audit_period_start || formData.audit_period_end) && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Preview:</strong> {getDisplayPeriod() || 'Lengkapi periode audit'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Row 4: Tanggal [mulai] - [selesai] */}
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
          {/* Risiko */}
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
              disabled={formData.audit_type === 'khusus'} // Disabled when audit type is khusus
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            {formData.audit_type === 'khusus' && (
              <p className="text-xs text-blue-600 mt-1">Otomatis diatur ke High untuk audit khusus</p>
            )}
          </div>

          {/* Prioritas */}
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

        {/* Row 6: Transportasi | Konsumsi | Lain-lain */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transportasi */}
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

          {/* Konsumsi */}
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

          {/* Lain-lain */}
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

        {/* File Upload - WAJIB with better animation and minimalist style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <FileText className="w-4 h-4 inline mr-1" />
            Upload File Excel <span className="text-red-500">*</span>
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
                  // Validasi ukuran file (maksimal 10MB)
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
              required
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
                      Pilih file Excel atau drag & drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      XLS, XLSX • Maksimal 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress Bar - More elegant */}
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
            {loading ? 'Menyimpan...' : 'Simpan'}
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
  );
}
