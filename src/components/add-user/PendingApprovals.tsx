import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Play, RefreshCw, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export interface ReprocessItem {
  id: string;
  type: 'addendum' | 'letter';
  label: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
}

interface PendingApprovalsProps {
  onReprocess: () => void;
  isReprocessing: boolean;
  reprocessItems: ReprocessItem[];
}

export default function PendingApprovals({ onReprocess, isReprocessing, reprocessItems }: PendingApprovalsProps) {
  const { data: pendingItems, isLoading, refetch } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const { data: addendums } = await supabase
        .from('addendum')
        .select('*')
        .or('and(status.eq.approved,um_locked.is.null),and(status.eq.approved,um_locked.eq.false)');

      const { data: letters } = await supabase
        .from('letter')
        .select('*')
        .or('and(status.eq.approved,um_locked.is.null),and(status.eq.approved,um_locked.eq.false)');

      const formattedAddendums = (addendums || []).map(a => ({
        id: a.id,
        type: 'addendum',
        number: a.assigment_letter,
        branch: a.branch_name,
        date: a.created_at,
        url: a.excel_file_url || a.link_file
      }));

      const formattedLetters = (letters || []).map(l => ({
        id: l.id,
        type: 'letter',
        number: l.letter_number,
        branch: l.branch_name,
        date: l.created_at,
        url: l.file_url
      }));

      return [...formattedAddendums, ...formattedLetters].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
  });

  return (
    <Card className="mb-0 border-gray-200 shadow-sm bg-white">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
               <h2 className="text-xl font-bold text-gray-900 tracking-tight">Reprocess Queue</h2>
               {pendingItems && pendingItems.length > 0 ? (
                 <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                   {pendingItems.length} Needs Action
                 </span>
               ) : (
                 <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                   <CheckCircle2 className="w-3 h-3" /> All Synced
                 </span>
               )}
            </div>
            <p className="text-gray-500 mt-1 text-sm">
              Daftar dokumen yang sudah disetujui namun file Excel belum terlindungi atau path belum sesuai.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={() => refetch()} 
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors border border-gray-200"
              title="Refresh List"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={onReprocess}
              disabled={isReprocessing || isLoading}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-all shadow-sm ${
                isReprocessing || isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
              }`}
            >
              <Play className={`w-4 h-4 ${isReprocessing ? 'hidden' : 'fill-current'}`} />
              <RefreshCw className={`w-4 h-4 animate-spin ${isReprocessing ? '' : 'hidden'}`} />
              {isReprocessing ? 'Processing...' : 'Run Reprocess'}
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
          <div className="max-h-[calc(100vh-400px)] overflow-y-auto relative custom-scrollbar">
            <Table>
              <TableHeader className="bg-gray-50/50 sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <TableRow>
                  <TableHead className="w-16 font-semibold text-gray-600 pl-6">No.</TableHead>
                  <TableHead className="font-semibold text-gray-600">Type</TableHead>
                  <TableHead className="font-semibold text-gray-600">Reference Number</TableHead>
                  <TableHead className="font-semibold text-gray-600">Branch</TableHead>
                  <TableHead className="font-semibold text-gray-600 text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col justify-center items-center gap-3">
                         <div className="p-3 bg-indigo-50 rounded-full">
                           <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                         </div>
                         <span className="text-gray-500 font-medium text-sm">Scanning database...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pendingItems?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-1">
                          <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <div>
                          <p className="text-gray-900 font-semibold text-lg">Semua Bersih!</p>
                          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                            Semua dokumen approved sudah terproteksi dan terupload dengan benar.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingItems?.map((item, idx) => {
                    const processStatus = reprocessItems.find(
                      ri => ri.id === String(item.id) && ri.type === item.type
                    );

                    return (
                      <TableRow key={`${item.type}-${item.id}`} className="hover:bg-gray-50/50 transition-colors group">
                        <TableCell className="text-gray-500 font-medium pl-6">{idx + 1}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                            item.type === 'addendum' 
                              ? 'bg-purple-50 text-purple-700 border-purple-100' 
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                            {item.type === 'addendum' ? 'Addendum' : 'Surat Tugas'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{item.number || '—'}</TableCell>
                        <TableCell className="text-gray-600">{item.branch || '—'}</TableCell>
                        <TableCell className="text-right pr-6">
                          {processStatus?.status === 'processing' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Processing...
                            </span>
                          ) : processStatus?.status === 'success' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" />
                              Success
                            </span>
                          ) : processStatus?.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100" title={processStatus.error}>
                              <XCircle className="w-3 h-3" />
                              Failed
                            </span>
                          ) : processStatus?.status === 'pending' ? (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                               Queued
                             </span>
                          ) : item.url ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                              Pending Process
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                              File Missing
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
