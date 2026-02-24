import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Search, UserCheck, UserPen, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import AuditorManagement from '../components/add-user/AuditorManagement';
import PendingApprovals, { ReprocessItem } from '../components/add-user/PendingApprovals';
import UserManagement from '../components/add-user/UserManagement';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import { supabase } from '../lib/supabase';
import { supabaseService } from '../lib/supabaseService';

interface PIC {
  id: number;
  nama: string;
  posisi: string;
  pic_area: string;
  status: 
    | 'Active'
    | 'Sick'
    | 'On leave'
    | 'On Branch'
    | 'Business Trip'
    | 'Meeting'
    | 'Occupied';
}

interface AddAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userId: string, fullName: string, nik: string, auditorId: string) => Promise<void>;
}

const AddAuditorModal: React.FC<AddAuditorModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [nik, setNik] = useState('');
  const [auditorId, setAuditorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        const { data: { users }, error: authError } = await supabaseService.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id');
        if (profilesError) throw profilesError;

        const profileIds = profiles?.map(p => p.id) || [];
        const usersNotInProfiles = users?.filter(user => !profileIds.includes(user.id)) || [];
        
        setAvailableUsers(usersNotInProfiles);
      } catch (error) {
        console.error('Error fetching available users:', error);
      }
    };

    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const selectedUser = availableUsers.find((user: any) => user.id === userId);
    if (selectedUser) {
      setFullName(selectedUser.user_metadata?.full_name || selectedUser.email.split('@')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(selectedUserId, fullName, nik, auditorId);
      setSelectedUserId('');
      setFullName('');
      setNik('');
      setAuditorId('');
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Auditor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select User</label>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserSelect(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="">Choose a user...</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.email} - {user.user_metadata?.full_name || 'No name'}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Users that exist in authentication but not in profiles
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">NIK</label>
            <input
              type="text"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ID Auditor</label>
            <input
              type="text"
              value={auditorId}
              onChange={(e) => setAuditorId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !selectedUserId}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Auditor'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface EditPICModalProps {
  isOpen: boolean;
  onClose: () => void;
  pic: PIC | null;
  onSubmit: (id: number, nama: string, posisi: string, pic_area: string, status: string) => Promise<void>;
}

const EditPICModal: React.FC<EditPICModalProps> = ({ isOpen, onClose, pic, onSubmit }) => {
  const [nama, setNama] = useState(pic?.nama || '');
  const [posisi, setPosisi] = useState(pic?.posisi || '');
  const [picArea, setPicArea] = useState(pic?.pic_area || '');
  const [status, setStatus] = useState<PIC['status']>(pic?.status || 'Active');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pic) {
      setNama(pic.nama);
      setPosisi(pic.posisi);
      setPicArea(pic.pic_area);
      setStatus(pic.status);
    }
  }, [pic]);

  if (!isOpen || !pic) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(pic.id, nama, posisi, picArea, status);
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit PIC</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Posisi</label>
            <input
              type="text"
              value={posisi}
              onChange={(e) => setPosisi(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">PIC Area</label>
            <input
              type="text"
              value={picArea}
              onChange={(e) => setPicArea(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PIC['status'])}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="Active">Active</option>
              <option value="Sick">Sick</option>
              <option value="On leave">On Leave</option>
              <option value="On Branch">On Branch</option>
              <option value="Business Trip">Business Trip</option>
              <option value="Meeting">Meeting</option>
              <option value="Occupied">Occupied</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface ManagePICModalProps {
  isOpen: boolean;
  onClose: () => void;
  pics: PIC[] | undefined;
  isLoading: boolean;
  onEditPIC: (pic: PIC) => void;
}

const ManagePICModal: React.FC<ManagePICModalProps> = ({ 
  isOpen, 
  onClose, 
  pics, 
  isLoading, 
  onEditPIC 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Manage PIC</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh]">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0">
              <TableRow>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Posisi</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">PIC Area</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                pics?.map((pic) => (
                  <TableRow key={pic.id}>
                    <TableCell className="text-sm text-gray-900">{pic.nama}</TableCell>
                    <TableCell className="text-sm text-gray-900">{pic.posisi}</TableCell>
                    <TableCell className="text-sm text-gray-500">{pic.pic_area}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        pic.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                        pic.status === 'Sick' ? 'bg-rose-100 text-rose-800' :
                        pic.status === 'On leave' ? 'bg-amber-100 text-amber-800' :
                        pic.status === 'On Branch' ? 'bg-cyan-100 text-cyan-800' :
                        pic.status === 'Business Trip' ? 'bg-sky-100 text-sky-800' :
                        pic.status === 'Meeting' ? 'bg-fuchsia-100 text-fuchsia-800' :
                        pic.status === 'Occupied' ? 'bg-zinc-300 text-zinc-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pic.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      <button
                        onClick={() => onEditPIC(pic)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit PIC"
                      >
                        <UserPen className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default function UserControlPanel() {
  const [showEditPICModal, setShowEditPICModal] = useState(false);
  const [showManagePICModal, setShowManagePICModal] = useState(false);
  const [selectedPIC, setSelectedPIC] = useState<PIC | null>(null);
  
  // Unused but kept for potential future use or consistency
  // const [showAddAuditorModal, setShowAddAuditorModal] = useState(false); 

  const [activeTab, setActiveTab] = useState<'users' | 'auditors' | 'queue'>('users');
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Menu</h1>
          <p className="text-sm text-gray-500">Manage users, backup data, and more.</p>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="bg-gray-100/50 p-1 rounded-xl inline-flex gap-1 border border-gray-200">
            {/* Users Tab */}
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <Users className="w-4 h-4" />
              User Management
            </button>
            
            {/* Auditors Tab */}
            <button
              onClick={() => setActiveTab('auditors')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'auditors'
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Auditor Management
            </button>
            
            {/* Reprocess Queue Tab */}
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'queue'
                  ? 'bg-white text-amber-600 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Reprocess Queue
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