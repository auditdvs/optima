import { CheckCircle2, Clock, MessageSquare, RefreshCw, Search, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";

interface RequestHistoryItem {
  id: number;
  phone_number: string;
  branch_code: string | null;
  request_year: string | null;
  status: string | null;
  created_at: string | null;
}

const PAGE_SIZE = 20;

const RequestHistory: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'SUCCESS' | 'NOT_FOUND' | 'other'>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<RequestHistoryItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({}); // Mapping phone -> name
  const [total, setTotal] = useState(0);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Fetch Profiles for lookup first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone_number, full_name')
        .not('phone_number', 'is', null);
      
      const profileMap: Record<string, string> = {};
      profileData?.forEach(p => {
        if (p.phone_number) profileMap[p.phone_number] = p.full_name;
      });
      setProfiles(profileMap);

      let query = supabase
        .from('request_history')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter === 'SUCCESS') {
        query = query.eq('status', 'SUCCESS');
      } else if (statusFilter === 'NOT_FOUND') {
        query = query.eq('status', 'NOT_FOUND');
      } else if (statusFilter === 'other') {
        query = query.not('status', 'in', '("SUCCESS","NOT_FOUND")');
      }

      if (search.trim()) {
        query = query.or(
          `phone_number.ilike.%${search.trim()}%,branch_code.ilike.%${search.trim()}%,request_year.ilike.%${search.trim()}%,status.ilike.%${search.trim()}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setRecords(data as RequestHistoryItem[]);
      setTotal(count ?? 0);
    } catch (err) {
      console.error('Error fetching request history:', err);
      toast.error('Gagal memuat request history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchRecords();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZoneName: 'short',
    });
  };

  const formatPhoneNumber = (phone: string) => {
    // Strip @s.whatsapp.net suffix if present
    const num = phone.replace(/@s\.whatsapp\.net$/, '');
    return num;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />
            Success
          </span>
        );
      case 'NOT_FOUND':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <XCircle className="w-3 h-3" />
            Not Found
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  // Stats counts
  const successCount = records.filter(r => r.status === 'SUCCESS').length;
  const notFoundCount = records.filter(r => r.status === 'NOT_FOUND').length;

  return (
    <Card className="mb-0 border-gray-200 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Request History</h2>
            <p className="text-sm text-gray-500 mt-1">Log permintaan data GL Biaya via WhatsApp &mdash; {total} record</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50 text-xs font-medium">
              {([
                { key: 'all', label: 'Semua' },
                { key: 'SUCCESS', label: 'Success' },
                { key: 'NOT_FOUND', label: 'Not Found' },
                { key: 'other', label: 'Lainnya' },
              ] as const).map(s => (
                <button
                  key={s.key}
                  onClick={() => { setStatusFilter(s.key); setPage(0); }}
                  className={`px-3 py-1.5 transition-colors ${
                    statusFilter === s.key
                      ? s.key === 'SUCCESS'
                        ? 'bg-emerald-500 text-white'
                        : s.key === 'NOT_FOUND'
                        ? 'bg-amber-500 text-white'
                        : s.key === 'other'
                        ? 'bg-rose-500 text-white'
                        : 'bg-indigo-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {/* Refresh */}
            <button
              onClick={() => { setPage(0); fetchRecords(); }}
              disabled={loading}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-3 border border-indigo-100">
            <p className="text-xs font-medium text-indigo-500">Total Requests</p>
            <p className="text-2xl font-bold text-indigo-700">{total.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 border border-emerald-100">
            <p className="text-xs font-medium text-emerald-500">Success (halaman ini)</p>
            <p className="text-2xl font-bold text-emerald-700">{successCount}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-3 border border-amber-100">
            <p className="text-xs font-medium text-amber-500">Not Found (halaman ini)</p>
            <p className="text-2xl font-bold text-amber-700">{notFoundCount}</p>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-3 border border-violet-100">
            <p className="text-xs font-medium text-violet-500">Halaman</p>
            <p className="text-2xl font-bold text-violet-700">{totalPages > 0 ? `${page + 1} / ${totalPages}` : '—'}</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-grow md:flex-grow-0 md:w-[300px]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nomor HP, branch, tahun..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-4 h-4" />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Cari
          </button>
        </form>

        {/* Table */}
        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50 sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <TableRow>
                  <TableHead className="font-semibold text-gray-600 whitespace-nowrap w-12">No.</TableHead>
                  <TableHead className="font-semibold text-gray-600 whitespace-nowrap">Nama</TableHead>
                  <TableHead className="font-semibold text-gray-600 whitespace-nowrap">Nomor HP</TableHead>
                  <TableHead className="font-semibold text-gray-600 whitespace-nowrap">Kode Cabang</TableHead>
                  <TableHead className="font-semibold text-gray-600 whitespace-nowrap">Tahun Request</TableHead>
                  <TableHead className="font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="font-semibold text-gray-600 whitespace-nowrap">Waktu Request</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                        <span className="text-sm">Memuat data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <MessageSquare className="w-6 h-6" />
                        <span className="text-sm">Tidak ada request ditemukan</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow key={record.id} className="hover:bg-gray-50/50">
                      <TableCell className="text-xs text-gray-400 font-mono">
                        {(page * PAGE_SIZE) + index + 1}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        {profiles[formatPhoneNumber(record.phone_number)] || (
                          <span className="text-gray-400 italic text-xs">Unknown / Guest</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 font-mono whitespace-nowrap">
                        {formatPhoneNumber(record.phone_number)}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {record.branch_code ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {record.branch_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-gray-700">
                        {record.request_year ?? <span className="text-gray-400">&mdash;</span>}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap font-mono">
                        {formatDate(record.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">
                Halaman {page + 1} dari {totalPages} &nbsp;·&nbsp; {total} total record
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        p === page
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestHistory;
