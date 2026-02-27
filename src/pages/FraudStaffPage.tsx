import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Search,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface FraudStaffRow {
  id: string;
  fraud_staff: string;
  region: string;
  branch_name: string;
  fraud_amount: number;
  payment_fraud: number;
}

type SortKey = 'fraud_staff' | 'region' | 'branch_name' | 'fraud_amount';
type SortDir = 'asc' | 'desc';

const FraudStaffPage = () => {
  const [data, setData] = useState<FraudStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fraud_amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    document.title = 'Informasi Fraud Staf — OPTIMA';
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('work_paper_persons')
        .select(`
          id,
          fraud_staff,
          fraud_amount,
          payment_fraud,
          audit_master:audit_master_id (
            branch_name,
            region
          )
        `)
        .not('fraud_staff', 'is', null)
        .neq('fraud_staff', '');

      if (error) throw error;

      const mapped: FraudStaffRow[] = (rows || [])
        .filter((p: any) => p.fraud_staff?.trim())
        .map((p: any) => ({
          id: p.id,
          fraud_staff: p.fraud_staff,
          region: (p.audit_master as any)?.region || 'Unknown',
          branch_name: (p.audit_master as any)?.branch_name || 'Unknown',
          fraud_amount: p.fraud_amount || 0,
          payment_fraud: p.payment_fraud ?? 0,
        }));

      setData(mapped);
    } catch (err) {
      console.error('Error fetching fraud staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'fraud_amount' ? 'desc' : 'asc');
    }
  };

  const filtered = data
    .filter(
      r =>
        r.fraud_staff.toLowerCase().includes(search.toLowerCase()) ||
        r.branch_name.toLowerCase().includes(search.toLowerCase()) ||
        r.region.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === 'number'
          ? av - (bv as number)
          : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalAmount = filtered.reduce((s, r) => s + r.fraud_amount, 0);
  const totalOutstanding = filtered.reduce(
    (s, r) => s + Math.max(0, r.fraud_amount - r.payment_fraud),
    0
  );

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k)
      return <ArrowUpDown className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-rose-500 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 text-rose-500 inline ml-1" />
    );
  };

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          {/* Brand + Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                Informasi Fraud Staf
              </h1>
              <p className="text-xs text-gray-400">OPTIMA Internal Audit</p>
            </div>
          </div>

          {/* Summary chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-semibold px-3 py-1.5 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" />
              {filtered.length} staf
            </span>
            <span className="inline-flex items-center bg-rose-50 text-rose-700 border border-rose-100 text-xs font-semibold px-3 py-1.5 rounded-full">
              Total: {fmt(totalAmount)}
            </span>
            {totalOutstanding > 0 && (
              <span className="inline-flex items-center bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold px-3 py-1.5 rounded-full">
                Sisa: {fmt(totalOutstanding)}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, cabang, atau region..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent w-64 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Memuat data fraud staf...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3.5 w-12">
                      No.
                    </th>
                    <th
                      className="text-left text-xs font-semibold text-gray-500 px-4 py-3.5 cursor-pointer hover:text-gray-800 select-none"
                      onClick={() => handleSort('fraud_staff')}
                    >
                      Fraud Staf <SortIcon k="fraud_staff" />
                    </th>
                    <th
                      className="text-left text-xs font-semibold text-gray-500 px-4 py-3.5 cursor-pointer hover:text-gray-800 select-none"
                      onClick={() => handleSort('region')}
                    >
                      Region <SortIcon k="region" />
                    </th>
                    <th
                      className="text-left text-xs font-semibold text-gray-500 px-4 py-3.5 cursor-pointer hover:text-gray-800 select-none"
                      onClick={() => handleSort('branch_name')}
                    >
                      Branch Name <SortIcon k="branch_name" />
                    </th>
                    <th
                      className="text-right text-xs font-semibold text-gray-500 px-5 py-3.5 cursor-pointer hover:text-gray-800 select-none"
                      onClick={() => handleSort('fraud_amount')}
                    >
                      Amount <SortIcon k="fraud_amount" />
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3.5">
                      Sisa
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3.5">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-16 text-gray-400 text-sm"
                      >
                        {search
                          ? 'Tidak ada hasil untuk pencarian ini'
                          : 'Tidak ada data fraud staf'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row, idx) => {
                      const outstanding = Math.max(
                        0,
                        row.fraud_amount - row.payment_fraud
                      );
                      const isFullyPaid =
                        outstanding === 0 && (row.fraud_amount > 0 || row.payment_fraud >= 0);
                      const pct =
                        row.fraud_amount > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (row.payment_fraud / row.fraud_amount) * 100
                              )
                            )
                          : 0;

                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-rose-50/20 transition-colors"
                        >
                          <td className="px-5 py-4 text-xs text-gray-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-semibold text-gray-800">
                              {row.fraud_staff}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                              {row.region}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700 max-w-[220px]">
                            <span
                              className="truncate block"
                              title={row.branch_name}
                            >
                              {row.branch_name}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-sm font-bold text-rose-600">
                              {fmt(row.fraud_amount)}
                            </span>
                            {row.fraud_amount > 0 && (
                              <div className="mt-1 h-1 w-20 bg-gray-100 rounded-full ml-auto overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isFullyPaid ? 'bg-emerald-400' : 'bg-rose-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right text-sm">
                            {outstanding > 0 ? (
                              <span className="text-amber-600 font-semibold">
                                {fmt(outstanding)}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {isFullyPaid ? (
                              <span className="inline-flex items-center bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                Lunas
                              </span>
                            ) : row.payment_fraud > 0 ? (
                              <span className="inline-flex items-center bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                Sebagian
                              </span>
                            ) : (
                              <span className="inline-flex items-center bg-rose-100 text-rose-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                Belum
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {filtered.length > 0 && (
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-3.5 text-xs font-bold text-gray-600"
                      >
                        TOTAL ({filtered.length} staf)
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-bold text-rose-700">
                        {fmt(totalAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-bold text-amber-600">
                        {totalOutstanding > 0 ? fmt(totalOutstanding) : '—'}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Klik header kolom untuk mengurutkan &bull; Data bersumber dari Work Paper Persons
        </p>
      </div>
    </div>
  );
};

export default FraudStaffPage;
