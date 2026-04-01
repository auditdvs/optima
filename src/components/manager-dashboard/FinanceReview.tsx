import { Check, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

interface FinanceReviewItem {
  no: number;
  ref_type: 'letter' | 'addendum' | 'mutasi';
  ref_id: string;
  no_surat: string;
  branch_name: string;
  region: string;
  inputter: string;
  checklist: boolean;
  comment: string | null;
}

export default function FinanceReview() {
  const [list, setList] = useState<FinanceReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch hanya yang checklist = true
      const { data: reviews, error: reviewError } = await supabase
        .from('finance_lpj_review')
        .select('ref_type, ref_id, checklist, comment')
        .eq('checklist', true);

      if (reviewError) throw reviewError;
      if (!reviews || reviews.length === 0) {
        setList([]);
        return;
      }

      // Pisahkan per tipe
      const letterIds = reviews.filter(r => r.ref_type === 'letter').map(r => r.ref_id);
      const addendumIds = reviews.filter(r => r.ref_type === 'addendum').map(r => r.ref_id);
      const mutasiIds = reviews.filter(r => r.ref_type === 'mutasi').map(r => r.ref_id);

      // 2. Fetch dokumen sesuai IDs
      const [lettersRes, addendumsRes, mutasiRes] = await Promise.all([
        letterIds.length > 0
          ? supabase.from('letter').select('id, assigment_letter, branch_name, region, created_by').in('id', letterIds)
          : Promise.resolve({ data: [] }),
        addendumIds.length > 0
          ? supabase.from('addendum').select('id, assigment_letter, branch_name, region, created_by').in('id', addendumIds)
          : Promise.resolve({ data: [] }),
        mutasiIds.length > 0
          ? supabase.from('audit_mutasi').select('id, to_branch, created_by, auditor_name').in('id', mutasiIds)
          : Promise.resolve({ data: [] }),
      ]);

      // 3. Kumpulkan semua created_by untuk lookup nama
      const allUserIds = new Set<string>();
      lettersRes.data?.forEach((l: any) => { if (l.created_by) allUserIds.add(l.created_by); });
      addendumsRes.data?.forEach((a: any) => { if (a.created_by) allUserIds.add(a.created_by); });
      mutasiRes.data?.forEach((m: any) => { if (m.created_by) allUserIds.add(m.created_by); });

      const nameMap = new Map<string, string>();
      if (allUserIds.size > 0) {
        const { data: aliases } = await supabase
          .from('auditor_aliases')
          .select('profile_id, full_name')
          .in('profile_id', Array.from(allUserIds));
        aliases?.forEach((a: any) => nameMap.set(a.profile_id, a.full_name));

        const missing = Array.from(allUserIds).filter(id => !nameMap.has(id));
        if (missing.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', missing);
          profiles?.forEach((p: any) => nameMap.set(p.id, p.full_name));
        }
      }

      // 4. Buat review map
      const reviewMap = new Map<string, { checklist: boolean; comment: string | null }>();
      reviews.forEach(r => reviewMap.set(`${r.ref_type}:${r.ref_id}`, { checklist: r.checklist, comment: r.comment }));

      // 5. Build list
      const items: FinanceReviewItem[] = [];

      lettersRes.data?.forEach((l: any) => {
        const rev = reviewMap.get(`letter:${l.id}`);
        if (!rev) return;
        items.push({
          no: 0,
          ref_type: 'letter',
          ref_id: String(l.id),
          no_surat: l.assigment_letter || '-',
          branch_name: l.branch_name || '-',
          region: l.region || '-',
          inputter: nameMap.get(l.created_by) || 'Unknown',
          checklist: rev.checklist,
          comment: rev.comment,
        });
      });

      addendumsRes.data?.forEach((a: any) => {
        const rev = reviewMap.get(`addendum:${a.id}`);
        if (!rev) return;
        items.push({
          no: 0,
          ref_type: 'addendum',
          ref_id: String(a.id),
          no_surat: a.assigment_letter || '-',
          branch_name: a.branch_name || '-',
          region: a.region || '-',
          inputter: nameMap.get(a.created_by) || 'Unknown',
          checklist: rev.checklist,
          comment: rev.comment,
        });
      });

      mutasiRes.data?.forEach((m: any) => {
        const rev = reviewMap.get(`mutasi:${m.id}`);
        if (!rev) return;
        items.push({
          no: 0,
          ref_type: 'mutasi',
          ref_id: String(m.id),
          no_surat: 'Mutasi',
          branch_name: m.to_branch || '-',
          region: '-',
          inputter: m.auditor_name || nameMap.get(m.created_by) || 'Unknown',
          checklist: rev.checklist,
          comment: rev.comment,
        });
      });

      items.forEach((item, i) => { item.no = i + 1; });
      setList(items);
    } catch (error) {
      console.error('Error fetching finance review:', error);
      toast.error('Gagal mengambil data Finance Review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Finance Review</h3>
          <p className="text-xs text-gray-500 mt-0.5">Dokumen LPJ yang sudah dicek oleh Finance</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No Surat</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cabang</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inputter</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Check className="w-10 h-10 text-gray-200" />
                    <span className="text-sm text-gray-500">Belum ada dokumen yang sudah dicek Finance</span>
                  </div>
                </td>
              </tr>
            ) : (
              list.map(item => (
                <tr key={`${item.ref_type}-${item.ref_id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{item.no}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-mono font-semibold text-gray-800">
                        {item.no_surat}
                      </span>
                      <span className={`w-fit text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        item.ref_type === 'letter'
                          ? 'bg-blue-50 text-blue-600'
                          : item.ref_type === 'addendum'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-orange-50 text-orange-600'
                      }`}>
                        {item.ref_type === 'letter' ? 'Surat Tugas' : item.ref_type === 'addendum' ? 'Addendum' : 'Mutasi'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.branch_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.region}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.inputter}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Check className="w-3 h-3" />
                      Sudah Dicek
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-[240px]">
                    {item.comment ? (
                      <div className="flex items-start gap-1.5">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                        <span className="text-indigo-700 break-words leading-relaxed">{item.comment}</span>
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      {!loading && list.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-4">
          <span><span className="font-semibold text-gray-700">{list.length}</span> dokumen sudah dicek</span>
          <span>·</span>
          <span><span className="font-semibold text-gray-700">{list.filter(i => i.comment).length}</span> ada catatan</span>
        </div>
      )}
    </div>
  );
}
