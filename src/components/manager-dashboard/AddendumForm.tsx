import { Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveAuditors } from '../../lib/auditorService';
import { supabase } from '../../lib/supabaseClient';

interface AssignmentLetter {
  id: number | string; // Fleksibel untuk menangani tipe data dari database
  assigment_letter: string; // Sesuai database (tanpa 'n')
  branch_name: string;
  region: string;
  audit_type: string;
  audit_period_start: string;
  audit_period_end: string;
  audit_start_date: string;
  audit_end_date: string;
  team: string;
  leader: string; // Team Leader
  risk: number;
  priority: number;
  transport: number;
  konsumsi: number;
  etc: number;
}

interface Auditor {
  id: string;
  name: string;
}

interface AddendumFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddendumForm({ onSuccess, onCancel }: AddendumFormProps) {
  const [loading, setLoading] = useState(false);
  const [letters, setLetters] = useState<AssignmentLetter[]>([]);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [excelUploadProgress, setExcelUploadProgress] = useState(0);
  const [showNewTeamDropdown, setShowNewTeamDropdown] = useState(false);
  const [showNewLeaderDropdown, setShowNewLeaderDropdown] = useState(false);
  const [showLetterDropdown, setShowLetterDropdown] = useState(false);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    letter_id: '',
    assignment_letter_before: '', // Tambahkan field ini
    addendum_types: [] as string[], // Changed to array for multiple selections
    transport: 0,
    konsumsi: 0,
    etc: 0,
    keterangan: '', // Untuk perubahan
    link_file: '', // Tambahkan field untuk link file pada perubahan sampel DAPA
    tanggal_perpanjangan_dari: '', // Untuk perpanjangan
    tanggal_perpanjangan_sampai: '', // Untuk perpanjangan
    new_leader: '', // Ketua Tim baru
    new_team: [] as string[] // Anggota Tim baru
  });
  const [selectedLetter, setSelectedLetter] = useState<AssignmentLetter | null>(null);

  useEffect(() => {
    if (user) {
      fetchLetters();
      fetchAuditors();
    }
  }, [user]);

  const fetchLetters = async () => {
    try {
      if (!user) {
        setLetters([]);
        return;
      }

      const { data, error } = await supabase
        .from('letter')
        .select('id, assigment_letter, branch_name, region, audit_type, audit_period_start, audit_period_end, audit_start_date, audit_end_date, team, leader, risk, priority, transport, konsumsi, etc')
        .eq('status', 'approved') // Hanya tampilkan surat tugas yang sudah diapprove
        .eq('created_by', user.id) // Hanya tampilkan surat tugas yang dibuat oleh user yang login
        .order('id', { ascending: false });

      if (error) throw error;
      setLetters(data || []);
    } catch (error) {
      console.error('Error fetching letters:', error);
      toast.error('Gagal mengambil data assignment letters');
    }
  };

  const fetchAuditors = async () => {
    try {
      const data = await getActiveAuditors();

      console.log('Auditors fetched:', data); // Debug log
      
      // Filter di frontend untuk memastikan name tidak null/kosong
      const filteredAuditors = data?.filter(auditor => auditor.name) || [];
      setAuditors(filteredAuditors);
    } catch (error) {
      console.error('Error fetching auditors:', error);
      toast.error('Gagal mengambil data auditor');
    }
  };

  const handleLetterChange = (letterId: string) => {
    console.log('Selected letter ID:', letterId, typeof letterId);
    const letter = letters.find(l => l.id.toString() === letterId.toString());
    setSelectedLetter(letter || null);
    setFormData(prev => ({ 
      ...prev, 
      letter_id: letterId,
      assignment_letter_before: letter?.assigment_letter || '', // Auto-fill dari letter yang dipilih
      tanggal_perpanjangan_dari: letter?.audit_start_date || '' // Auto-fill dari audit_start_date
      // Note: leader will be taken from selectedLetter.leader, not formData.leader
    }));
  };

  const handleNewTeamSelect = (teamMember: string) => {
    setFormData(prev => ({
      ...prev,
      new_team: prev.new_team.includes(teamMember)
        ? prev.new_team.filter(t => t !== teamMember)
        : [...prev.new_team, teamMember]
    }));
  };

  const removeNewTeamMember = (teamMember: string) => {
    setFormData(prev => ({
      ...prev,
      new_team: prev.new_team.filter(t => t !== teamMember)
    }));
  };

  const handleLinkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim();
    
    // Jika input kosong, biarkan kosong
    if (!value) {
      setFormData(prev => ({ 
        ...prev, 
        link_file: '' 
      }));
      return;
    }
    
    // Auto-prefix dengan https:// jika user tidak memasukkan protocol
    if (!value.match(/^https?:\/\//i)) {
      value = `https://${value}`;
    }
    
    setFormData(prev => ({ 
      ...prev, 
      link_file: value 
    }));
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi ukuran file (max 10MB untuk Excel)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file Excel maksimal 10MB');
        return;
      }
      
      // Validasi tipe file Excel
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Format file harus Excel (.xls atau .xlsx)');
        return;
      }
      
      setSelectedExcelFile(file);
    }
  };

  const uploadExcelFile = async (file: File, addendumNumber: string, branchName: string): Promise<string | null> => {
    try {
      setExcelUploadProgress(0);
      
      // Buat nama folder berdasarkan branch (sama dengan format AssignmentLetterForm)
      const folderName = branchName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      
      // Buat nama file Excel berdasarkan nomor addendum
      const fileExtension = file.name.split('.').pop();
      const fileName = `${addendumNumber.replace(/\//g, '_')}_excel.${fileExtension}`;
      const filePath = `${folderName}/${fileName}`;
      
      // Upload file ke Supabase Storage
      const { error } = await supabase.storage
        .from('perdin')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Excel storage upload error:', error);
        throw error;
      }

      // Dapatkan public URL
      const { data: { publicUrl } } = supabase.storage
        .from('perdin')
        .getPublicUrl(filePath);
        
      setExcelUploadProgress(100);
      return publicUrl;
      
    } catch (error) {
      console.error('Error uploading Excel file:', error);
      toast.error('Gagal mengupload file Excel');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!formData.letter_id) {
      toast.error('Pilih assignment letter terlebih dahulu');
      return;
    }

    if (formData.addendum_types.length === 0) {
      toast.error('Pilih minimal satu jenis addendum');
      return;
    }

    // Validasi field yang diperlukan berdasarkan jenis addendum
    if (formData.addendum_types.includes('Perubahan Sampel DAPA')) {
      if (!formData.keterangan.trim()) {
        toast.error('Keterangan perubahan sampel DAPA wajib diisi');
        return;
      }
      if (!formData.link_file.trim()) {
        toast.error('Link file untuk perubahan sampel DAPA wajib diisi');
        return;
      }
    }

    if (formData.addendum_types.includes('Perpanjangan Waktu')) {
      if (!formData.tanggal_perpanjangan_dari || !formData.tanggal_perpanjangan_sampai) {
        toast.error('Tanggal perpanjangan wajib diisi');
        return;
      }
    }

    if (formData.addendum_types.includes('Perubahan Tim')) {
      if (!formData.new_leader.trim()) {
        toast.error('Ketua Tim baru wajib dipilih');
        return;
      }
      if (!formData.tanggal_perpanjangan_dari || !formData.tanggal_perpanjangan_sampai) {
        toast.error('Tanggal perpanjangan wajib diisi untuk perubahan tim');
        return;
      }
    }

    if (!selectedLetter?.leader) {
      toast.error('Assignment letter yang dipilih tidak memiliki ketua tim');
      return;
    }

    setLoading(true);
    try {
      // Debug logging
      console.log('Form letter_id:', formData.letter_id, typeof formData.letter_id);
      console.log('Available letters:', letters.map(l => ({ id: l.id, type: typeof l.id })));
      
      // Generate nomor addendum dengan suffix huruf
      const selectedLetterData = letters.find(l => l.id.toString() === formData.letter_id.toString());
      if (!selectedLetterData) {
        console.error('Letter not found. Searched ID:', formData.letter_id);
        console.error('Available letter IDs:', letters.map(l => l.id));
        toast.error('Assignment letter tidak ditemukan');
        return;
      }

      // Cek berapa banyak addendum yang sudah ada untuk letter ini
      const { data: existingAddendums, error: countError } = await supabase
        .from('addendum')
        .select('id')
        .eq('letter_id', formData.letter_id);

      if (countError) throw countError;

      // Generate suffix huruf (a, b, c, dst)
      const addendumCount = existingAddendums?.length || 0;
      const suffixLetter = String.fromCharCode(97 + addendumCount); // 97 = 'a'
      
      // Generate nomor addendum: 003a/KMD-AUDIT/VIII/2025
      const originalLetterNumber = selectedLetterData.assigment_letter;
      const addendumNumber = originalLetterNumber.replace(/^(\d+)/, `$1${suffixLetter}`);

      // Validasi wajib Excel file untuk tipe perpanjangan dan perubahan tim
      let excelFileUrl: string | null = null;
      if (formData.addendum_types.includes('Perpanjangan Waktu') || formData.addendum_types.includes('Perubahan Tim')) {
        if (!selectedExcelFile) {
          toast.error('File Excel wajib diupload untuk perpanjangan waktu atau perubahan tim');
          setLoading(false);
          return;
        }
        
        excelFileUrl = await uploadExcelFile(selectedExcelFile, addendumNumber, selectedLetterData.branch_name);
        if (!excelFileUrl) {
          setLoading(false);
          return; // Berhenti jika upload Excel gagal
        }
      }

      // Prepare data berdasarkan tipe addendum
      const insertData: any = {
        letter_id: formData.letter_id,
        assigment_letter: addendumNumber,
        assignment_letter_before: formData.assignment_letter_before, // Simpan nomor surat sebelumnya
        addendum_type: formData.addendum_types.join(', '), // Convert array to string
        branch_name: selectedLetterData.branch_name,
        region: selectedLetterData.region,
        audit_type: selectedLetterData.audit_type, // Tambahkan audit_type dari letter
        team: selectedLetterData.team, // Auto input from selected letter
        leader: selectedLetterData.leader, // Auto input from selected letter
        excel_file_url: excelFileUrl // File Excel untuk tipe tertentu
      };

      // Tambahkan field biaya hanya untuk perpanjangan waktu atau perubahan tim
      if (formData.addendum_types.includes('Perpanjangan Waktu') || formData.addendum_types.includes('Perubahan Tim')) {
        insertData.transport = formData.transport;
        insertData.konsumsi = formData.konsumsi;
        insertData.etc = formData.etc;
      } else {
        // Untuk tipe perubahan, set biaya ke 0
        insertData.transport = 0;
        insertData.konsumsi = 0;
        insertData.etc = 0;
      }

      // Tambahkan field sesuai tipe addendum
      if (formData.addendum_types.includes('Perubahan Sampel DAPA')) {
        if (formData.keterangan) {
          insertData.keterangan = formData.keterangan;
        }
        if (formData.link_file) {
          insertData.link_file = formData.link_file;
        }
      }

      if (formData.addendum_types.includes('Perpanjangan Waktu') || formData.addendum_types.includes('Perubahan Tim')) {
        // start_date = audit_start_date dari letter, end_date = input user
        insertData.start_date = selectedLetterData.audit_start_date;
        if (formData.tanggal_perpanjangan_sampai) {
          insertData.end_date = formData.tanggal_perpanjangan_sampai;
        }
      }

      // Tambahkan field untuk perubahan tim
      if (formData.addendum_types.includes('Perubahan Tim')) {
        insertData.new_leader = formData.new_leader;
        insertData.new_team = formData.new_team.join(',');
      }

      const { error } = await supabase
        .from('addendum')
        .insert(insertData);

      if (error) throw error;

      toast.success('Addendum berhasil dibuat');
      onSuccess();
    } catch (error) {
      console.error('Error creating addendum:', error);
      toast.error('Gagal membuat Addendum');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pilih Assignment Letter */}
          <div className="md:col-span-2 relative z-[60]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Surat Tugas *
            </label>
            <div className="relative">
              <div
                onClick={() => setShowLetterDropdown(!showLetterDropdown)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-h-[42px] flex items-center justify-between"
              >
                <span className={formData.letter_id ? 'text-gray-900' : 'text-gray-500 line-clamp-1 text-left'}>
                  {formData.letter_id && letters.find(l => l.id.toString() === formData.letter_id.toString()) 
                    ? `${letters.find(l => l.id.toString() === formData.letter_id.toString())?.assigment_letter} - ${letters.find(l => l.id.toString() === formData.letter_id.toString())?.branch_name} (${letters.find(l => l.id.toString() === formData.letter_id.toString())?.audit_type})`
                    : 'Pilih Surat Tugas'}
                </span>
                <svg className="h-4 w-4 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              
              {showLetterDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {letters.length === 0 ? (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      Tidak ada surat tugas yang tersedia
                    </div>
                  ) : (
                    letters.map((letter) => (
                      <div
                        key={`letter-${letter.id}`}
                        onClick={() => {
                          handleLetterChange(letter.id.toString());
                          setShowLetterDropdown(false);
                        }}
                        className={`px-3 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-50 last:border-0 ${
                          formData.letter_id === letter.id.toString()
                            ? 'bg-indigo-50 text-indigo-900'
                            : 'text-gray-900'
                        }`}
                      >
                        <div className="font-medium">{letter.assigment_letter}</div>
                        <div className="text-xs mt-1 text-gray-500">{letter.branch_name} ({letter.audit_type})</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Preview Assignment Letter Before - Tampilkan di atas form */}
          {formData.assignment_letter_before && (
            <div className="md:col-span-2 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Nomor Surat Tugas yang akan di-Addendum</h4>
                <div className="bg-white border border-blue-300 rounded px-3 py-2">
                  <p className="text-sm text-gray-700 font-mono">
                    {formData.assignment_letter_before}
                  </p>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  * Preview - Nomor surat tugas sebelumnya yang akan diubah
                </p>
              </div>
            </div>
          )}

          {/* Info Letter yang dipilih */}
          {selectedLetter && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={selectedLetter.branch_name}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region
                </label>
                <input
                  type="text"
                  value={selectedLetter.region}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tim
                </label>
                <input
                  type="text"
                  value={selectedLetter.team}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ketua Tim
                </label>
                <input
                  type="text"
                  value={selectedLetter?.leader || '-'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                />
              </div>

              {/* Tipe Addendum */}
              <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipe Addendum *
              </label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="Perubahan Sampel DAPA"
                  type="checkbox"
                  checked={formData.addendum_types.includes('Perubahan Sampel DAPA')}
                  onChange={(e) => {
                    const value = 'Perubahan Sampel DAPA';
                    setFormData(prev => ({
                      ...prev,
                      addendum_types: e.target.checked
                        ? [...prev.addendum_types, value]
                        : prev.addendum_types.filter(type => type !== value)
                    }));
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="Perubahan Sampel DAPA" className="ml-2 text-sm text-gray-900">
                  Perubahan Sampel DAPA
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="Perpanjangan Waktu"
                  type="checkbox"
                  checked={formData.addendum_types.includes('Perpanjangan Waktu')}
                  onChange={(e) => {
                    const value = 'Perpanjangan Waktu';
                    setFormData(prev => ({
                      ...prev,
                      addendum_types: e.target.checked
                        ? [...prev.addendum_types, value]
                        : prev.addendum_types.filter(type => type !== value)
                    }));
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="Perpanjangan Waktu" className="ml-2 text-sm text-gray-900">
                  Perpanjangan Waktu
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="Perubahan Tim"
                  type="checkbox"
                  checked={formData.addendum_types.includes('Perubahan Tim')}
                  onChange={(e) => {
                    const value = 'Perubahan Tim';
                    setFormData(prev => ({
                      ...prev,
                      addendum_types: e.target.checked
                        ? [...prev.addendum_types, value]
                        : prev.addendum_types.filter(type => type !== value)
                    }));
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="Perubahan Tim" className="ml-2 text-sm text-gray-900">
                  Penambahan/Perubahan Tim
                </label>
              </div>
            </div>
            {formData.addendum_types.length === 0 && (
              <p className="text-xs text-red-500 mt-2">Pilih minimal satu jenis addendum</p>
            )}
          </div>

          {/* Field Conditional untuk Perubahan */}
          {formData.addendum_types.includes('Perubahan Sampel DAPA') && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keterangan Perubahan Sampel DAPA *
                </label>
                <textarea
                  required
                  value={formData.keterangan}
                  onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                  placeholder="Jelaskan perubahan yang dilakukan..."
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link File *
                </label>
                <input
                  type="text"
                  required
                  value={formData.link_file}
                  onChange={handleLinkFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="example.com/file.pdf atau drive.google.com/file/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tip: Cukup ketik domain tanpa https://, akan otomatis ditambahkan
                </p>
              </div>
            </>
          )}

          {/* Field Conditional untuk Perpanjangan & Perubahan Tim - Tanggal */}
          {(formData.addendum_types.includes('Perpanjangan Waktu') || formData.addendum_types.includes('Perubahan Tim')) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perpanjangan Dari Tanggal *
                </label>
                <input
                  type="date"
                  required
                  value={formData.tanggal_perpanjangan_dari}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">* Auto-fill dari tanggal mulai audit</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perpanjangan Sampai Tanggal *
                </label>
                <input
                  type="date"
                  required
                  value={formData.tanggal_perpanjangan_sampai}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal_perpanjangan_sampai: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {/* Biaya - Untuk perpanjangan waktu dan perubahan tim - 3 kolom sejajar */}
          {(formData.addendum_types.includes('Perpanjangan Waktu') || formData.addendum_types.includes('Perubahan Tim')) && (
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transportasi (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.transport}
                    onChange={(e) => setFormData(prev => ({ ...prev, transport: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formatCurrency(formData.transport)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Konsumsi (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.konsumsi}
                    onChange={(e) => setFormData(prev => ({ ...prev, konsumsi: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formatCurrency(formData.konsumsi)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lain-lain (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.etc}
                    onChange={(e) => setFormData(prev => ({ ...prev, etc: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formatCurrency(formData.etc)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Fields untuk Penambahan/Perubahan Tim - 2 kolom sejajar */}
          {formData.addendum_types.includes('Perubahan Tim') && (
            <>
              {/* Tim Comparison Section */}
              <div className="md:col-span-2 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Perbandingan Tim</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Tim Sebelumnya */}
                    <div className="bg-red-50 p-3 rounded border border-red-300">
                      <h5 className="text-xs font-semibold text-red-800 mb-2">Tim Sebelumnya</h5>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-red-700">Ketua Tim</label>
                          <p className="text-sm bg-white p-2 rounded border text-gray-900">{selectedLetter?.leader || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-xs text-red-700">Anggota Tim</label>
                          <p className="text-sm bg-white p-2 rounded border text-gray-900">{selectedLetter?.team || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Tim Baru */}
                    <div className="bg-green-50 p-3 rounded border border-green-300">
                      <h5 className="text-xs font-semibold text-green-800 mb-2">Tim Baru</h5>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-green-700">Ketua Tim Baru</label>
                          <p className="text-sm bg-white p-2 rounded border text-gray-900">{formData.new_leader || 'Belum dipilih'}</p>
                        </div>
                        <div>
                          <label className="block text-xs text-green-700">Anggota Tim Baru</label>
                          <p className="text-sm bg-white p-2 rounded border text-gray-900">
                            {formData.new_team.length > 0 ? formData.new_team.join(', ') : 'Belum ada anggota'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ketua Tim (Baru) *
                </label>
                <div className="relative">
                  <div
                    onClick={() => setShowNewLeaderDropdown(!showNewLeaderDropdown)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-h-[42px] flex items-center justify-between"
                  >
                    <span className={formData.new_leader ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.new_leader || 'Pilih Ketua Tim Baru'}
                    </span>
                    <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  {showNewLeaderDropdown && (
                    <div className="absolute z-10 w-full mb-1 bottom-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto overflow-x-hidden">
                      {auditors.length === 0 ? (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          Tidak ada data auditor
                        </div>
                      ) : (
                        auditors.map((auditor) => (
                          <div
                            key={`leader-${auditor.id}`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, new_leader: auditor.name }));
                              setShowNewLeaderDropdown(false);
                            }}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                              formData.new_leader === auditor.name
                                ? 'bg-indigo-50 text-indigo-900'
                                : 'text-gray-900'
                            }`}
                          >
                            {auditor.name}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {!formData.new_leader && (
                  <p className="text-xs text-red-500 mt-1">Ketua Tim baru wajib dipilih</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anggota Tim (Baru)
                </label>
                <div className="relative">
                  <div
                    onClick={() => setShowNewTeamDropdown(!showNewTeamDropdown)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-h-[42px] flex flex-wrap items-center gap-1"
                  >
                    {formData.new_team.length === 0 ? (
                      <span className="text-gray-500">Pilih Anggota Tim Baru (Opsional)</span>
                    ) : (
                      formData.new_team.map((member) => (
                        <span
                          key={member}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800"
                        >
                          {member}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNewTeamMember(member);
                            }}
                            className="ml-1 text-green-600 hover:text-green-800"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  
                  {showNewTeamDropdown && (
                    <div className="absolute z-10 w-full mb-1 bottom-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto overflow-x-hidden">
                      {auditors.length === 0 ? (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          Tidak ada data auditor
                        </div>
                      ) : (
                        auditors.map((auditor) => (
                          <div
                            key={auditor.id}
                            onClick={() => handleNewTeamSelect(auditor.name)}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                              formData.new_team.includes(auditor.name)
                                ? 'bg-green-50 text-green-900'
                                : 'text-gray-900'
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.new_team.includes(auditor.name)}
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
            </>
          )}
            </>
          )}
        </div>

        {/* File Upload Section - Excel wajib untuk perpanjangan waktu dan perubahan tim */}
        {(formData.addendum_types.includes('Perpanjangan Waktu') || formData.addendum_types.includes('Perubahan Tim')) && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Upload Dokumen</h3>

            {/* Upload Excel File - WAJIB */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File Excel (XLS/XLSX - Maks. 10MB) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-green-300 border-dashed rounded-md hover:border-green-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-green-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="excel-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
                    >
                      <span>Upload file Excel</span>
                      <input
                        id="excel-upload"
                        name="excel-upload"
                        type="file"
                        accept=".xls,.xlsx"
                        onChange={handleExcelFileChange}
                        className="sr-only"
                        required
                      />
                    </label>
                    <p className="pl-1">atau drag dan drop</p>
                  </div>
                  <p className="text-xs text-gray-500">XLS, XLSX hingga 10MB - WAJIB diupload</p>
                </div>
              </div>
              
              {selectedExcelFile && (
                <div className="mt-2 p-2 bg-green-50 rounded-md">
                  <p className="text-sm text-green-800">
                    File Excel terpilih: {selectedExcelFile.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedExcelFile(null)}
                    className="text-xs text-red-600 hover:text-red-800 mt-1"
                  >
                    Hapus file Excel
                  </button>
                </div>
              )}
              
              {excelUploadProgress > 0 && excelUploadProgress < 100 && (
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${excelUploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload Excel: {excelUploadProgress}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        {selectedLetter && (
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Addendum'}
            </button>
          </div>
        )}
      </form>

      {/* Click outside to close dropdowns */}
      {(showNewTeamDropdown || showNewLeaderDropdown || showLetterDropdown) && (
        <div 
          className="fixed inset-0 z-[5]" 
          onClick={() => {
            setShowNewTeamDropdown(false);
            setShowNewLeaderDropdown(false);
            setShowLetterDropdown(false);
          }}
        />
      )}
    </div>
  );
}
