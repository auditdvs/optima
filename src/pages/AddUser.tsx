import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, Database, FileText, MapPin, Search, Server, UserCheck, Users, X, Wrench, Palette, Rocket, Tag, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import AuditorManagement from '../components/add-user/AuditorManagement';
import AuditorTracking from '../components/add-user/AuditorTracking';
import Changelog from '../components/add-user/Changelog';
import MSSQLConnectionLog from '../components/add-user/MSSQLConnectionLog';
import { AddAuditorModal, EditPICModal, ManagePICModal, PIC } from '../components/add-user/PICModals';
import PendingApprovals, { ReprocessItem } from '../components/add-user/PendingApprovals';
import UserManagement from '../components/add-user/UserManagement';
import { usePresence } from '../contexts/PresenceContext';
import { supabase } from '../lib/supabase';
import { supabaseService } from '../lib/supabaseService';

export default function UserControlPanel() {

  const [showEditPICModal, setShowEditPICModal] = useState(false);
  const [showManagePICModal, setShowManagePICModal] = useState(false);
  const [selectedPIC, setSelectedPIC] = useState<PIC | null>(null);
  
  const [activeTab, setActiveTab] = useState<'users' | 'auditors' | 'queue' | 'tracking' | 'mssql_log' | 'changelog'>('users');
  const queryClient = useQueryClient();

  const { onlineUserIds } = usePresence();
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  // Reprocess State
  const [reprocessItems, setReprocessItems] = useState<ReprocessItem[]>([]);
  const [isReprocessing, setIsReprocessing] = useState(false);

  // Overview Stats Logic
  const { data: overviewStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin_overview_stats'],
    queryFn: async () => {
      // 1. Total users
      let totalUsers = 0;
      try {
        const { data: { users } } = await supabaseService.auth.admin.listUsers();
        totalUsers = users ? users.length : 0;
      } catch (err) { console.error(err); }

      // 2. Latest MSSQL status
      const { data: mssqlLog } = await supabase
        .from('db_connection_log')
        .select('status, checked_at')
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      // 3. Total Reprocess Queue
      let totalQueue = 0;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reprocess-approvals`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ type: 'check' }),
          });
          const checkData = await res.json();
          totalQueue = checkData.pending ? checkData.pending.length : 0;
        }
      } catch (err) {
        console.error("Failed to fetch reprocess queue", err);
      }

      // 4. Total Releases
      const { data: releases } = await supabase
        .from('system_changelog')
        .select('release_date, icon');
      
      const totalReleases = releases ? releases.length : 0;

      // Group releases per month
      const releasesPerMonth: Record<string, { total: number, label: string, breakdown: Record<string, number> }> = {};
      if (releases) {
        releases.forEach(r => {
          const dateObj = new Date(r.release_date);
          const sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
          const monthYear = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
          
          if (!releasesPerMonth[sortKey]) {
            releasesPerMonth[sortKey] = { total: 0, label: monthYear, breakdown: { Wrench: 0, Palette: 0, Rocket: 0, Tag: 0, Other: 0 } };
          }
          
          releasesPerMonth[sortKey].total += 1;
          
          if (r.icon === 'Wrench' || r.icon === 'Palette' || r.icon === 'Rocket' || r.icon === 'Tag') {
             releasesPerMonth[sortKey].breakdown[r.icon] += 1;
          } else {
             releasesPerMonth[sortKey].breakdown['Other'] += 1;
          }
        });
      }

      return {
        totalUsers,
        latestMssqlStatus: mssqlLog?.status || 'unknown',
        latestMssqlTime: mssqlLog?.checked_at ? new Date(mssqlLog.checked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
        totalQueue,
        totalReleases,
        releasesPerMonth
      };
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: pics, isLoading: isLoadingPics } = useQuery({
    queryKey: ['pics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pic')
        .select('*');
      if (error) throw error;
      return data as PIC[];
    }
  });

  const updatePICMutation = useMutation({
    mutationFn: async ({ id, nama, posisi, pic_area, status }: 
      { id: number; nama: string; posisi: string; pic_area: string; status: string }) => {
      const { error } = await supabase
        .from('pic')
        .update({ nama, posisi, pic_area, status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pics'] });
      toast.success('PIC updated successfully');
    },
    onError: (error) => {
      console.error('Error updating PIC:', error);
      toast.error('Failed to update PIC');
    }
  });

  const handleEditPIC = async (id: number, nama: string, posisi: string, pic_area: string, status: string) => {
    await updatePICMutation.mutateAsync({ id, nama, posisi, pic_area, status });
  };

  const handleReprocessApprovals = async () => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No active session');
        return;
      }

      setIsReprocessing(true);
      toast('Mengecek record yang perlu diproses...', { 
        icon: <Search className="w-5 h-5 text-blue-500" />, 
        id: 'reprocess' 
      });

      // Step 1: Check what needs reprocessing
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };

      const checkRes = await fetch(`${SUPABASE_URL}/functions/v1/reprocess-approvals`, {
        method: 'POST', headers,
        body: JSON.stringify({ type: 'check' }),
      });

      if (!checkRes.ok) {
        toast.error('Gagal mengecek data', { id: 'reprocess' });
        setIsReprocessing(false);
        return;
      }

      const checkData = await checkRes.json();
      const pending: any[] = checkData.pending || [];

      if (pending.length === 0) {
        toast.success(`Semua approval sudah up to date!${checkData.skipped > 0 ? ` (${checkData.skipped} tanpa file)` : ''}`, { id: 'reprocess' });
        setIsReprocessing(false);
        return;
      }

      // Populate Modal State
      const items: ReprocessItem[] = pending.map(item => ({
        id: item.id,
        type: item.type,
        label: item.label || `${item.type === 'addendum' ? 'Addendum' : 'Surat Tugas'} #${item.id}`,
        status: 'pending'
      }));

      setReprocessItems(items);
      toast.dismiss('reprocess');

      // Step 2: Process one by one
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < items.length; i++) {
        setReprocessItems(prev => prev.map((item, idx) => 
            idx === i ? { ...item, status: 'processing' } : item
        ));
        
        await new Promise(r => setTimeout(r, 100));

        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/reprocess-approvals`, {
            method: 'POST', headers,
            body: JSON.stringify({ type: items[i].type, id: items[i].id }),
          });

          const result = await res.json();
          
          if (result.success) {
            successCount++;
            setReprocessItems(prev => prev.map((item, idx) => 
                idx === i ? { ...item, status: 'success' } : item
            ));
          } else {
            failedCount++;
            setReprocessItems(prev => prev.map((item, idx) => 
                idx === i ? { ...item, status: 'failed', error: result.error } : item
            ));
          }
        } catch (err) {
          failedCount++;
          setReprocessItems(prev => prev.map((item, idx) => 
              idx === i ? { ...item, status: 'failed', error: String(err) } : item
          ));
        }

        if (i < items.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      setIsReprocessing(false);
      if (failedCount === 0) {
        toast.success(`Reprocess selesai! ${successCount} berhasil${checkData.skipped > 0 ? `, ${checkData.skipped} skipped` : ''}`);
      } else {
        toast.error(`Reprocess selesai: ${failedCount} gagal`);
      }

    } catch (error) {
      console.error('Error reprocessing:', error);
      toast.error('Gagal menjalankan reprocess');
      setIsReprocessing(false);
    }
  };

  return (
    <div className="p-0">
      <Toaster position="top-right" />
      
      {/* Main header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">System Administration</h1>
        <p className="text-sm text-gray-500 mt-1">Manage users, system parameters, and track application releases.</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 px-1">
        
        {/* Active / Total Users */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
           <div className="flex justify-between items-start mb-2">
             <span className="text-sm font-medium text-gray-500">Active / Total Users</span>
             <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
               <Users className="w-4 h-4 text-indigo-600" />
             </div>
           </div>
           <div className="flex items-baseline gap-2 mt-auto">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               <span className="text-2xl font-bold text-gray-900">{onlineUserIds.size}</span>
             </div>
             <span className="text-sm font-medium text-gray-400">/ {statsLoading ? '-' : overviewStats?.totalUsers}</span>
           </div>
        </div>

        {/* MSSQL Status */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
           <div className="flex justify-between items-start mb-2">
             <span className="text-sm font-medium text-gray-500">Database Status</span>
             <div className={`p-2 rounded-lg border ${overviewStats?.latestMssqlStatus === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
               <Server className={`w-4 h-4 ${overviewStats?.latestMssqlStatus === 'success' ? 'text-emerald-600' : 'text-red-600'}`} />
             </div>
           </div>
           <div className="flex flex-col mt-auto">
             <span className="text-xl font-bold text-gray-900 capitalize leading-tight">
               {statsLoading ? 'Checking...' : overviewStats?.latestMssqlStatus === 'success' ? 'Connected' : overviewStats?.latestMssqlStatus === 'failed' ? 'Failed' : 'Unknown'}
             </span>
             <span className="text-[11px] text-gray-400 font-medium">Last check: {statsLoading ? '-' : overviewStats?.latestMssqlTime}</span>
           </div>
        </div>

        {/* Reprocess Queue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
           <div className="flex justify-between items-start mb-2">
             <span className="text-sm font-medium text-gray-500">Reprocess Queue</span>
             <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
               <AlertTriangle className="w-4 h-4 text-amber-600" />
             </div>
           </div>
           <div className="flex items-baseline gap-2 mt-auto">
             <span className="text-2xl font-bold text-gray-900">{statsLoading ? '-' : overviewStats?.totalQueue}</span>
             <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Pending</span>
           </div>
        </div>

        {/* Total Releases */}
        <div 
          onClick={() => setShowReleaseModal(true)}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col cursor-pointer hover:border-[#fd8c73] hover:shadow-md transition-all group relative"
        >
           <div className="flex justify-between items-start mb-2">
             <span className="text-sm font-medium text-gray-500 group-hover:text-[#fd8c73] transition-colors">Total Releases</span>
             <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 group-hover:bg-[#fd8c73]/10 group-hover:border-[#fd8c73]/20 transition-colors">
               <FileText className="w-4 h-4 text-gray-500 group-hover:text-[#fd8c73] transition-colors" />
             </div>
           </div>
           <div className="flex items-center justify-between mt-auto">
             <div className="flex items-baseline gap-1.5">
               <span className="text-2xl font-bold text-gray-900 group-hover:text-[#fd8c73] transition-colors">{statsLoading ? '-' : overviewStats?.totalReleases}</span>
               <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Updates</span>
             </div>
             <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#fd8c73] transition-colors transform group-hover:translate-x-1" />
           </div>
        </div>

      </div>

      {/* GitHub Style Tab Navigation */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto custom-scrollbar">
        <nav className="-mb-px flex space-x-6 px-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('users')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'users'
                ? 'border-[#fd8c73] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-[18px] h-[18px]" />
            Users
          </button>
          
          <button
            onClick={() => setActiveTab('auditors')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'auditors'
                ? 'border-[#fd8c73] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserCheck className="w-[18px] h-[18px]" />
            Auditors
          </button>
          
          <button
            onClick={() => setActiveTab('queue')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'queue'
                ? 'border-[#fd8c73] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertTriangle className="w-[18px] h-[18px]" />
            Reprocess
          </button>
          
          <button
            onClick={() => setActiveTab('tracking')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'tracking'
                ? 'border-[#fd8c73] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MapPin className="w-[18px] h-[18px]" />
            Tracking
          </button>
          
          <button
            onClick={() => setActiveTab('mssql_log')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'mssql_log'
                ? 'border-[#fd8c73] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Database className="w-[18px] h-[18px]" />
            MSSQL
          </button>
          
          <button
            onClick={() => setActiveTab('changelog')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'changelog'
                ? 'border-[#fd8c73] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-[18px] h-[18px]" />
            Releases
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <UserManagement />
      )}

      {activeTab === 'auditors' && (
        <AuditorManagement />
      )}

      {activeTab === 'queue' && (
        <PendingApprovals 
          onReprocess={handleReprocessApprovals}
          isReprocessing={isReprocessing}
          reprocessItems={reprocessItems}
        />
      )}

      {activeTab === 'tracking' && (
        <AuditorTracking />
      )}

      {activeTab === 'mssql_log' && (
        <MSSQLConnectionLog />
      )}

      {activeTab === 'changelog' && (
        <Changelog />
      )}

      {/* PIC Modals */}
      <EditPICModal
        isOpen={showEditPICModal}
        onClose={() => setShowEditPICModal(false)}
        pic={selectedPIC}
        onSubmit={handleEditPIC}
      />

      <ManagePICModal
        isOpen={showManagePICModal}
        onClose={() => setShowManagePICModal(false)}
        pics={pics}
        isLoading={isLoadingPics}
        onEditPIC={(pic) => {
          setSelectedPIC(pic);
          setShowEditPICModal(true);
        }}
      />
      
      {/* Unused AddAuditorModal kept for future reference */}
      <AddAuditorModal 
         isOpen={false} 
         onClose={() => {}} 
         onSubmit={async () => {}} 
      />

      {/* Release Stats Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex justify-center items-center z-[100] backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full sm:max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 fade-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Releases per Month
              </h3>
              <button onClick={() => setShowReleaseModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-50/30">
              {!overviewStats?.releasesPerMonth || Object.keys(overviewStats.releasesPerMonth).length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Belum ada data rilis.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.entries(overviewStats.releasesPerMonth)
                    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                    .map(([sortKey, data], i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] hover:shadow-md hover:border-[#fd8c73]/40 transition-all flex flex-col">
                      <div className="border-b border-gray-100 pb-3 mb-3 flex justify-between items-center text-sm">
                        <span className="font-bold text-gray-800">{data.label}</span>
                        <span className="bg-[#fd8c73]/10 border border-[#fd8c73]/20 text-[#e95a3a] text-xs font-bold px-2 py-0.5 rounded-md">
                          {data.total}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mt-auto">
                         {data.breakdown.Wrench > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-amber-50">
                              <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                                <Wrench className="w-3.5 h-3.5"/> Fixes
                              </span>
                              <span className="font-bold text-gray-700">{data.breakdown.Wrench}</span>
                            </div>
                         )}
                         {data.breakdown.Palette > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-purple-50">
                              <span className="flex items-center gap-1.5 text-purple-700 font-medium">
                                <Palette className="w-3.5 h-3.5"/> Design
                              </span>
                              <span className="font-bold text-gray-700">{data.breakdown.Palette}</span>
                            </div>
                         )}
                         {data.breakdown.Rocket > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-blue-50">
                              <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                                <Rocket className="w-3.5 h-3.5"/> Feature
                              </span>
                              <span className="font-bold text-gray-700">{data.breakdown.Rocket}</span>
                            </div>
                         )}
                         {data.breakdown.Tag > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-gray-100">
                              <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                                <Tag className="w-3.5 h-3.5"/> Misc
                              </span>
                              <span className="font-bold text-gray-700">{data.breakdown.Tag}</span>
                            </div>
                         )}
                         {data.breakdown.Other > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-emerald-50">
                              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5"/> Update
                              </span>
                              <span className="font-bold text-gray-700">{data.breakdown.Other}</span>
                            </div>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Total keseluruhan pembaharuan sistem</span>
              <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded shadow-sm border border-gray-100 text-base">{overviewStats?.totalReleases || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}