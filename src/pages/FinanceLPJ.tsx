import { ArrowDown, ArrowUp, ArrowUpDown, Download, FileText, LogOut, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface LpjRecord {
  id: string;
  letter_number: string;
  branch_name: string;
  inputter_name: string;
  status: 'Sudah Input' | 'Belum Input';
  audit_status: 'Sedang Audit' | 'Selesai';
  file_url?: string;
  type: 'Surat Tugas' | 'Addendum';
  doc_created_at: string;
  audit_end_date?: string;
}


export default function FinanceLPJ() {
  const [records, setRecords] = useState<LpjRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');  
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    fetchLPJData();
  }, []);

  const fetchLPJData = async () => {
    setLoading(true);
    try {
      // 1. Fetch ALL approved letters
      const { data: letters, error: lettersError } = await supabase
        .from('letter')
        .select('id, assigment_letter, branch_name, created_by, tanggal_input, audit_end_date')
        .eq('status', 'approved')
        .order('id', { ascending: false });

      if (lettersError) throw lettersError;

      // 2. Fetch ALL approved addendums
      const { data: addendums, error: addendumsError } = await supabase
        .from('addendum')
        .select('id, assigment_letter, branch_name, created_by, tanggal_input, end_date')
        .eq('status', 'approved')
        .order('id', { ascending: false });

      if (addendumsError) throw addendumsError;

      // 3. Get all user IDs for inputter name lookup
      const allUserIds = new Set<string>();
      letters?.forEach(l => { if (l.created_by) allUserIds.add(l.created_by); });
      addendums?.forEach(a => { if (a.created_by) allUserIds.add(a.created_by); });

      // 4. Fetch names from auditor_aliases
      const userIdArray = Array.from(allUserIds);
      let accountMap = new Map<string, string>();

      if (userIdArray.length > 0) {
        const { data: aliases } = await supabase
          .from('auditor_aliases')
          .select('profile_id, full_name')
          .in('profile_id', userIdArray);

        aliases?.forEach(a => {
          accountMap.set(a.profile_id, a.full_name);
        });

        // Fallback to profiles table for missing names
        const missingIds = userIdArray.filter(id => !accountMap.has(id));
        if (missingIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', missingIds);

          profiles?.forEach(p => {
            accountMap.set(p.id, p.full_name);
          });
        }
      }

      // 5. Fetch all LPJ submissions
      const letterIds = letters?.map(l => l.id) || [];
      const addendumIds = addendums?.map(a => a.id) || [];

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

      // 6. Build the records
      const allRecords: LpjRecord[] = [];

      letters?.forEach((l: any) => {
        const sub = submissions.find((s: any) => s.letter_id === l.id);
        const endDate = l.audit_end_date ? new Date(l.audit_end_date) : null;
        const isOngoing = endDate ? endDate >= new Date() : false;
        allRecords.push({
          id: `letter-${l.id}`,
          letter_number: l.assigment_letter || '-',
          branch_name: l.branch_name || '-',
          inputter_name: accountMap.get(l.created_by) || 'Unknown',
          status: sub ? 'Sudah Input' : 'Belum Input',
          audit_status: isOngoing ? 'Sedang Audit' : 'Selesai',
          file_url: sub?.file_url,
          type: 'Surat Tugas',
          doc_created_at: l.tanggal_input,
          audit_end_date: l.audit_end_date
        });
      });

      addendums?.forEach((a: any) => {
        const sub = submissions.find((s: any) => s.addendum_id === a.id);
        const endDate = a.end_date ? new Date(a.end_date) : null;
        const isOngoing = endDate ? endDate >= new Date() : false;
        allRecords.push({
          id: `addendum-${a.id}`,
          letter_number: a.assigment_letter || '-',
          branch_name: a.branch_name || '-',
          inputter_name: accountMap.get(a.created_by) || 'Unknown',
          status: sub ? 'Sudah Input' : 'Belum Input',
          audit_status: isOngoing ? 'Sedang Audit' : 'Selesai',
          file_url: sub?.file_url,
          type: 'Addendum',
          doc_created_at: a.tanggal_input,
          audit_end_date: a.end_date
        });
      });

      // Sort by date descending
      allRecords.sort((a, b) => {
        const dateA = a.doc_created_at ? new Date(a.doc_created_at).getTime() : 0;
        const dateB = b.doc_created_at ? new Date(b.doc_created_at).getTime() : 0;
        return dateB - dateA;
      });

      setRecords(allRecords);
    } catch (error) {
      console.error('Error fetching LPJ data:', error);
      toast.error('Gagal mengambil data LPJ');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-indigo-600" />
      : <ArrowDown className="w-3 h-3 text-indigo-600" />;
  };

  // Filter records
  const filteredRecords = records
    .filter(record => {
      if (searchQuery === '') return true;
      const q = searchQuery.toLowerCase();
      return (
        record.letter_number.toLowerCase().includes(q) ||
        record.branch_name.toLowerCase().includes(q) ||
        record.inputter_name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      const dir = sortDirection === 'asc' ? 1 : -1;
      const valA = (a as any)[sortColumn]?.toString().toLowerCase() || '';
      const valB = (b as any)[sortColumn]?.toString().toLowerCase() || '';
      return valA.localeCompare(valB) * dir;
    });

  const totalSudah = records.filter(r => r.status === 'Sudah Input').length;
  const totalBelum = records.filter(r => r.status === 'Belum Input').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Top Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0">
                <span className="font-bold text-gray-900 tracking-tight text-lg">OPTIMA</span>
                <span className="text-[10px] text-gray-500 font-medium -mt-1">Finance Portal</span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200/50 transition-all hover:border-red-300 active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Laporan Pertanggungjawaban
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Monitor status LPJ seluruh Surat Tugas dan Addendum yang telah disetujui.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nomor surat, cabang, inputter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-gray-50 focus:bg-white w-[280px]"
              />
            </div>
            <button
              onClick={fetchLPJData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Total Dokumen</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight text-gray-900">{records.length}</p>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50/50 flex items-center justify-center border border-indigo-100/50 shadow-sm">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-emerald-100/50 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.1)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.08)] transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Sudah Input LPJ</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight text-emerald-600">{totalSudah}</p>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50/50 flex items-center justify-center border border-emerald-100/50 shadow-sm">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-amber-100/50 shadow-[0_2px_10px_-3px_rgba(245,158,11,0.1)] hover:shadow-[0_8px_30px_rgb(245,158,11,0.08)] transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Belum Input LPJ</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight text-amber-600">{totalBelum}</p>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 flex items-center justify-center border border-amber-100/50 shadow-sm">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">
                    No
                  </th>
                  <th
                    onClick={() => handleSort('letter_number')}
                    className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Nomor Surat
                      {getSortIcon('letter_number')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('branch_name')}
                    className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Cabang
                      {getSortIcon('branch_name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('inputter_name')}
                    className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Inputter
                      {getSortIcon('inputter_name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('audit_status')}
                    className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Status Audit
                      {getSortIcon('audit_status')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Status LPJ
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-500 font-medium">Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-12 h-12 text-gray-300" />
                        <span className="text-sm text-gray-500 font-medium">
                          {searchQuery
                            ? 'Tidak ada data yang sesuai pencarian'
                            : 'Belum ada data LPJ'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-slate-50/80 transition-all duration-200 group"
                    >
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-[13.5px] font-bold text-gray-800 font-mono tracking-tight group-hover:text-indigo-600 transition-colors">
                            {record.letter_number}
                          </span>
                          <span className={`w-fit px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            record.type === 'Surat Tugas' 
                              ? 'bg-blue-50 text-blue-600' 
                              : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {record.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-[13.5px] font-medium text-gray-700">
                          {record.branch_name}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-[13.5px] font-medium text-gray-700">
                          {record.inputter_name}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[13px] font-semibold ${
                            record.audit_status === 'Sedang Audit' ? 'text-indigo-600' : 'text-gray-500'
                          }`}>
                            {record.audit_status}
                          </span>
                          {record.audit_end_date && (
                            <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md w-fit inline-flex">
                              s.d. {new Date(record.audit_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold ${
                          record.status === 'Sudah Input' 
                            ? 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/50 shadow-[0_1px_2px_rgba(16,185,129,0.05)]' 
                            : 'bg-amber-50/80 text-amber-700 border border-amber-200/50 shadow-[0_1px_2px_rgba(245,158,11,0.05)]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            record.status === 'Sudah Input' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                          }`} />
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {record.file_url ? (
                          <a
                            href={record.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-700 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 transition-all duration-200 shadow-sm hover:shadow"
                          >
                            <Download className="w-3.5 h-3.5" />
                            File LPJ
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-gray-300 ml-4">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {!loading && filteredRecords.length > 0 && (
            <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Menampilkan <span className="font-semibold text-gray-700">{filteredRecords.length}</span> dari <span className="font-semibold text-gray-700">{records.length}</span> data
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-100 shadow-inner">
                <LogOut className="w-8 h-8 text-red-500 ml-1" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">Konfirmasi Logout</h3>
              <p className="text-sm text-gray-500">
                Apakah Anda yakin ingin keluar dari OPTIMA Portal?
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex items-center gap-3 border-t border-slate-100">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm active:scale-[0.98]"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.98]"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
