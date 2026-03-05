import { CheckCircle2, Database, RefreshCw, Search, ServerCrash } from 'lucide-react';
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

interface DbConnectionLog {
  id: number;
  checked_at: string;
  status: 'success' | 'failed';
  latency_ms: number | null;
  error_message: string | null;
  server_info: string | null;
  mssql_server: string | null;
  mssql_database: string | null;
}

const PAGE_SIZE = 20;

const MSSQLConnectionLog: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<DbConnectionLog[]>([]);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('db_connection_log')
        .select('*', { count: 'exact' })
        .order('checked_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (search.trim()) {
        query = query.or(
          `mssql_server.ilike.%${search.trim()}%,mssql_database.ilike.%${search.trim()}%,error_message.ilike.%${search.trim()}%,server_info.ilike.%${search.trim()}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setLogs(data as DbConnectionLog[]);
      setTotal(count ?? 0);
    } catch (err) {
      console.error('Error fetching MSSQL logs:', err);
      toast.error('Gagal memuat log koneksi MSSQL');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <Card className="mb-0 border-gray-200 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">MSSQL Connection Log</h2>
            <p className="text-sm text-gray-500 mt-1">Log hasil pengecekan koneksi harian ke MSSQL Server &mdash; {total} record</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50 text-xs font-medium">
              {(['all', 'success', 'failed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(0); }}
                  className={`px-3 py-1.5 transition-colors ${
                    statusFilter === s
                      ? s === 'success'
                        ? 'bg-emerald-500 text-white'
                        : s === 'failed'
                        ? 'bg-rose-500 text-white'
                        : 'bg-indigo-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s === 'all' ? 'Semua' : s === 'success' ? 'Success' : 'Failed'}
                </button>
              ))}
            </div>
            {/* Refresh */}
            <button
              onClick={() => { setPage(0); fetchLogs(); }}
              disabled={loading}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-grow md:flex-grow-0 md:w-[300px]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari server, database, error..."
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
                  <TableHead className="font-semibold text-gray-600 whitespace-nowrap">Waktu Cek</TableHead>
                  <TableHead className="font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="font-semibold text-gray-600 whitespace-nowrap">Latency (ms)</TableHead>
                  <TableHead className="font-semibold text-gray-600">Server</TableHead>
                  <TableHead className="font-semibold text-gray-600">Database</TableHead>
                  <TableHead className="font-semibold text-gray-600">Server Info / Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                        <span className="text-sm">Memuat log...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Database className="w-6 h-6" />
                        <span className="text-sm">Tidak ada log ditemukan</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map(log => (
                    <TableRow key={log.id} className="hover:bg-gray-50/50">
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap font-mono">
                        {formatDate(log.checked_at)}
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                            <ServerCrash className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {log.latency_ms != null ? (
                          <span className={`font-semibold ${log.latency_ms > 2000 ? 'text-amber-600' : 'text-gray-700'}`}>
                            {log.latency_ms.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">
                        {log.mssql_server ?? <span className="text-gray-400">&mdash;</span>}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">
                        {log.mssql_database ?? <span className="text-gray-400">&mdash;</span>}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs">
                        {log.status === 'success' ? (
                          <span className="text-gray-500 truncate block" title={log.server_info ?? ''}>
                            {log.server_info ?? '—'}
                          </span>
                        ) : (
                          <span className="text-rose-600 truncate block" title={log.error_message ?? ''}>
                            {log.error_message ?? '—'}
                          </span>
                        )}
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

export default MSSQLConnectionLog;
