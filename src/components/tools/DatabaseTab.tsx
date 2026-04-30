import { AlertTriangle, Archive, Calendar, CheckCircle, Clock, Database, Loader2, Play, Plus, RefreshCw, ScrollText, Trash2, XCircle, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type RequestType = 'THC' | 'TAK' | 'TLP' | 'KDP';
type RequestStatus = 'pending' | 'running' | 'done' | 'error' | 'moved';

interface RequestOptima {
  id: number;
  inputter: string;
  request_type: RequestType;
  branch_code: string;
  start_date: string;
  end_date: string;
  link: string | null;
  status: RequestStatus;
  log: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Clock size={12} className="inline mr-1" />,
  },
  running: {
    label: 'Running',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <Loader2 size={12} className="inline mr-1 animate-spin" />,
  },
  done: {
    label: 'Done',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle size={12} className="inline mr-1" />,
  },
  error: {
    label: 'Error',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle size={12} className="inline mr-1" />,
  },
  moved: {
    label: 'Moved',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <Archive size={12} className="inline mr-1" />,
  },
};

const REQUEST_TYPE_COLOR: Record<RequestType, string> = {
  THC: 'bg-indigo-100 text-indigo-700',
  TAK: 'bg-violet-100 text-violet-700',
  TLP: 'bg-teal-100 text-teal-700',
  KDP: 'bg-orange-100 text-orange-700',
};

function DeleteConfirmModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      >
        <div 
          className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
        >
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Hapus Request?</h3>
            <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan. Request akan dihapus secara permanen.</p>
          </div>
          <div className="flex border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              {loading ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
}

function ExecuteConfirmModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      >
        <div 
          className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
        >
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <Zap size={28} className="text-emerald-600" fill="currentColor" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Jalankan Sekarang?</h3>
            <p className="text-sm text-gray-500">Semua request yang tertunda akan langsung diproses oleh server tanpa menunggu jadwal malam.</p>
          </div>
          <div className="flex border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} fill="currentColor" />}
              Ya, Jalankan
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
}

function LogModal({
  log,
  onClose,
}: {
  log: string | null;
  onClose: () => void;
}) {
    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      >
        <div 
          className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ScrollText size={18} className="text-gray-500" />
              <h3 className="text-base font-semibold text-gray-900">Log Request</h3>
            </div>
          </div>
          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1">
            {log ? (
              <pre className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap break-words border border-gray-200">
                {log}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <ScrollText size={32} className="mb-2 text-gray-300" />
                <p className="text-sm">Tidak ada log untuk request ini.</p>
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
}

function AddRequestModal({
  onClose,
  onSuccess,
  userUUID,
  userName,
  branchMap,
}: {
  onClose: () => void;
  onSuccess: () => void;
  userUUID: string;
  userName: string;
  branchMap?: Record<string, string>;
}) {
  const [requestTypes, setRequestTypes] = useState<RequestType[]>(['THC']);
  const [branchCode, setBranchCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentBranchName = branchMap ? (branchMap[branchCode.padStart(3, '0')] || branchMap[branchCode]) : null;

  // Pad branch code to 3 digits on blur
  const handleBranchCodeBlur = () => {
    if (branchCode) setBranchCode(branchCode.padStart(3, '0'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError('Start date dan end date wajib diisi.');
      return;
    }
    if (!branchCode || branchCode.length > 3) {
      setError('Kode cabang wajib diisi (maks. 3 digit).');
      return;
    }
    if (startDate > endDate) {
      setError('Start date tidak boleh lebih besar dari end date.');
      return;
    }

    setSubmitting(true);
    try {
      const payloads = requestTypes.map((type) => ({
        inputter: userUUID,
        request_type: type,
        branch_code: branchCode.padStart(3, '0'),
        start_date: startDate,
        end_date: endDate,
      }));

      const { error: insertError } = await supabase.from('request_optima').insert(payloads);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim request.');
    } finally {
      setSubmitting(false);
    }
  };

    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      >
        <div 
          className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={20} className="text-white" />
              <h3 className="text-lg font-semibold text-white">Add Request</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors text-xl leading-none"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
  
          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* INPUTTER (readonly) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Inputter
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
                <span className="truncate font-medium">{userName}</span>
                <span className="shrink-0 text-[10px] bg-gray-200 text-gray-600 rounded px-1.5 py-0.5">auto</span>
              </div>
            </div>
  
            {/* REQUEST TYPE */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Request Type
                </label>
                <span className="text-[10px] text-gray-400 font-medium">Bisa pilih lebih dari satu</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['THC', 'TAK', 'TLP', 'KDP'] as RequestType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (requestTypes.includes(t)) {
                        if (requestTypes.length > 1) {
                          setRequestTypes(requestTypes.filter(type => type !== t));
                        }
                      } else {
                        setRequestTypes([...requestTypes, t]);
                      }
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                      requestTypes.includes(t)
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
  
            {/* BRANCH CODE */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <label htmlFor="branch-code" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Kode Cabang
                </label>
                {currentBranchName && (
                  <span className="text-[10px] font-bold text-indigo-600 animate-in fade-in slide-in-from-right-1">
                    {currentBranchName}
                  </span>
                )}
              </div>
              <input
                id="branch-code"
                type="text"
                inputMode="numeric"
                maxLength={3}
                placeholder="mis. 012"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value.replace(/\D/g, ''))}
                onBlur={handleBranchCodeBlur}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
  
            {/* START DATE */}
            <div>
              <label htmlFor="start-date" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
  
            {/* END DATE */}
            <div>
              <label htmlFor="end-date" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                End Date
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  min={startDate || undefined}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
  
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
  
            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium hover:opacity-90 active:opacity-80 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 size={15} className="animate-spin" /> Mengirim...</>
                ) : (
                  'Kirim Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
}

export default function DatabaseTab() {
  const { user, userRole } = useAuth();
  const isSuperAdmin = userRole === 'superadmin';
  const [requests, setRequests] = useState<RequestOptima[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState<string>('');
  const [profileMap, setProfileMap] = useState<Record<string, string>>({}); // uuid → full_name
  const [branchMap, setBranchMap] = useState<Record<string, string>>({}); // code → name
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [viewLogReq, setViewLogReq] = useState<RequestOptima | null>(null);
  const [executingNow, setExecutingNow] = useState(false);
  const [showExecModal, setShowExecModal] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('request_optima')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const rows = data as RequestOptima[];
      setRequests(rows);

      // Resolve unique inputter UUIDs → names
      const uniqueIds = [...new Set(rows.map((r) => r.inputter))];
      if (uniqueIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', uniqueIds);
        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach((p: any) => { map[p.id] = p.full_name || p.id; });
          setProfileMap(map);
        }
      }

      fetchBranches();
    }
    setLoading(false);
  };

  const fetchBranches = async () => {
    try {
      const { data: branchData } = await supabase.from('branches_info').select('code, name');
      if (branchData) {
        const bMap: Record<string, string> = {};
        branchData.forEach((b: any) => {
          const rawCode = b.code ? String(b.code).trim() : '';
          const nameVal = b.name ? String(b.name).trim() : '';
          
          if (rawCode && nameVal) {
            // Padded version (003)
            const padded = rawCode.padStart(3, '0');
            bMap[padded] = nameVal;
            
            // Raw version (3)
            bMap[rawCode] = nameVal;
            
            // Pure numeric version if any
            const numeric = rawCode.replace(/\D/g, '');
            if (numeric) {
              bMap[numeric] = nameVal;
              bMap[numeric.padStart(3, '0')] = nameVal;
            }
          }
        });
        setBranchMap(bMap);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
      });
  }, [user]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return '-';
    return new Date(dtStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    const { error } = await supabase.from('request_optima').delete().eq('id', id);
    if (!error) setRequests((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const handleExecuteNow = async () => {
    setExecutingNow(true);
    try {
      // Set trigger true di tabel system_settings
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'optima_trigger_now', value: 'true' }, { onConflict: 'key' });

      if (error) throw error;
      setShowExecModal(false);
      alert('Sinyal eksekusi terkirim! Scheduler akan memproses dalam maksimal 10 detik.');
    } catch (err: any) {
      alert('Gagal mengirim sinyal: ' + err.message);
    } finally {
      setExecutingNow(false);
    }
  };

  return (
    <div className="mt-6 bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Database size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Database Request</h2>
            <p className="text-sm text-gray-500">Kelola request pengambilan data dari server MDIS</p>
            <p className="text-xs text-red-500 italic font-semibold"> *) Request akan dieksekusi setelah jam kerja 19.00 s.d. 06.00</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRequests}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowExecModal(true)}
              disabled={executingNow}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 shadow-sm disabled:opacity-50"
              title="Eksekusi semua request sekarang"
            >
              {executingNow ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              Execute Now
            </button>
          )}

          <button
            type="button"
            id="add-request-btn"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium hover:opacity-90 shadow-sm"
          >
            <Plus size={16} />
            Add Request
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 size={32} className="animate-spin mb-3 text-indigo-400" />
            <p className="text-sm">Memuat data...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Database size={36} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium">Belum ada request</p>
            <p className="text-xs mt-1">Klik "+ Add Request" untuk menambah request baru</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inputter</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cabang</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Periode</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Link</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dibuat</th>
                {isSuperAdmin && <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((req, idx) => {
                const statusCfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
                return (
                  <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-gray-400 text-center">{idx + 1}</td>
                    <td className="px-5 py-3.5 text-gray-700 text-sm font-medium whitespace-nowrap">
                      {profileMap[req.inputter] || <span className="text-gray-400 font-mono text-xs">{req.inputter.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${REQUEST_TYPE_COLOR[req.request_type]}`}>
                        {req.request_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 whitespace-nowrap">
                      <span className="font-mono font-semibold">{req.branch_code || '—'}</span>
                      {(() => {
                        const code = req.branch_code?.toString().trim() || '';
                        const name = branchMap[code.padStart(3, '0')] || branchMap[code] || branchMap[code.replace(/\D/g, '')];
                        if (name) {
                          return (
                            <span className="text-gray-400 font-medium ml-1.5 text-xs">
                              — {name}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      <span>{formatDate(req.start_date)}</span>
                      <span className="text-gray-400 mx-1">→</span>
                      <span>{formatDate(req.end_date)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                        {statusCfg.icon}{statusCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {req.status === 'moved' ? (
                        <span className="text-gray-400 text-xs italic flex items-center gap-1">
                          <XCircle size={12} className="text-gray-300" /> Unavailable
                        </span>
                      ) : req.link ? (
                        <a
                          href={req.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline text-xs truncate max-w-[160px] block"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                      {formatDateTime(req.created_at)}
                    </td>
                    {/* Aksi: Log + Delete — superadmin only */}
                    {isSuperAdmin && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          {/* Log viewer */}
                          <button
                            type="button"
                            onClick={() => setViewLogReq(req)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Lihat log"
                          >
                            <ScrollText size={14} />
                          </button>
                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(req.id)}
                            disabled={deletingId === req.id}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            title="Hapus request"
                          >
                            {deletingId === req.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && user && (
        <AddRequestModal
          userUUID={user.id}
          userName={fullName || user.email || user.id}
          onClose={() => setShowModal(false)}
          onSuccess={fetchRequests}
          branchMap={branchMap}
        />
      )}
      {/* Custom Delete Confirmation */}
      {confirmDeleteId !== null && (
        <DeleteConfirmModal
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
          loading={deletingId === confirmDeleteId}
        />
      )}

      {showExecModal && (
        <ExecuteConfirmModal
          onConfirm={handleExecuteNow}
          onCancel={() => setShowExecModal(false)}
          loading={executingNow}
        />
      )}
      {/* Log Viewer */}
      {viewLogReq !== null && (
        <LogModal
          log={viewLogReq.log}
          onClose={() => setViewLogReq(null)}
        />
      )}
    </div>
  );
}
