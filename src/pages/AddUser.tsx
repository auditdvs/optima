import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Database, FileText, LayoutDashboard, MapPin, MessageSquare, Search, UserCheck, Users, X } from 'lucide-react';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import AuditorManagement from '../components/add-user/AuditorManagement';
import AuditorTracking from '../components/add-user/AuditorTracking';
import Changelog from '../components/add-user/Changelog';
import MSSQLConnectionLog from '../components/add-user/MSSQLConnectionLog';
import RequestHistory from '../components/add-user/RequestHistory';
import OverviewStats from '../components/add-user/OverviewStats';
import { AddAuditorModal, EditPICModal, ManagePICModal, PIC } from '../components/add-user/PICModals';
import PendingApprovals, { ReprocessItem } from '../components/add-user/PendingApprovals';
import UserManagement from '../components/add-user/UserManagement';
import { supabase } from '../lib/supabase';

export default function UserControlPanel() {

  const [showEditPICModal, setShowEditPICModal] = useState(false);
  const [showManagePICModal, setShowManagePICModal] = useState(false);
  const [selectedPIC, setSelectedPIC] = useState<PIC | null>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'auditors' | 'queue' | 'tracking' | 'mssql_log' | 'request_history' | 'changelog'>('overview');
  const queryClient = useQueryClient();

  // Reprocess State
  const [reprocessItems, setReprocessItems] = useState<ReprocessItem[]>([]);
  const [isReprocessing, setIsReprocessing] = useState(false);

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

      {/* GitHub Style Tab Navigation */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto custom-scrollbar">
        <nav className="-mb-px flex space-x-6 px-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#fd8c73] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <LayoutDashboard className="w-[18px] h-[18px]" />
            Overview
          </button>

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
            onClick={() => setActiveTab('request_history')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'request_history'
                ? 'border-[#fd8c73] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MessageSquare className="w-[18px] h-[18px]" />
            Request Data
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
      {activeTab === 'overview' && (
        <OverviewStats />
      )}

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

      {activeTab === 'request_history' && (
        <RequestHistory />
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
    </div>
  );
}