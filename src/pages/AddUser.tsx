import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Database, MapPin, Search, UserCheck, Users } from 'lucide-react';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import AuditorManagement from '../components/add-user/AuditorManagement';
import AuditorTracking from '../components/add-user/AuditorTracking';
import MSSQLConnectionLog from '../components/add-user/MSSQLConnectionLog';
import { AddAuditorModal, EditPICModal, ManagePICModal, PIC } from '../components/add-user/PICModals';
import PendingApprovals, { ReprocessItem } from '../components/add-user/PendingApprovals';
import UserManagement from '../components/add-user/UserManagement';
import { supabase } from '../lib/supabase';

export default function UserControlPanel() {

  const [showEditPICModal, setShowEditPICModal] = useState(false);
  const [showManagePICModal, setShowManagePICModal] = useState(false);
  const [selectedPIC, setSelectedPIC] = useState<PIC | null>(null);
  
  const [activeTab, setActiveTab] = useState<'users' | 'auditors' | 'queue' | 'tracking' | 'mssql_log'>('users');
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
      
      {/* Main header + Tab Navigation */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Menu</h1>
          <p className="text-sm text-gray-500">Manage users, backup data, and more.</p>
        </div>
        <div className="bg-gray-100/50 p-1 rounded-xl inline-flex gap-1 border border-gray-200 flex-wrap">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('auditors')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'auditors'
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Auditors
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-white text-amber-600 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Reprocess
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'tracking'
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Tracking
          </button>
          <button
            onClick={() => setActiveTab('mssql_log')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'mssql_log'
                ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            MSSQL
          </button>
        </div>
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