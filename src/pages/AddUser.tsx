
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { ChevronDown, ChevronUp, DatabaseBackup, Trash2, UserPen, UserPlus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
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

// Add the convertJsonToCsv utility function
const convertJsonToCsv = (data: any[]): string => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle null/undefined values
      if (value === null || value === undefined) return '';
      // Handle objects and arrays
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
      // Handle strings with commas or quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
};

const toastInfo = (message: string) => {
  toast(message, {
    icon: '🔔',
    style: {
      borderRadius: '10px',
      background: '#3498db',
      color: '#fff',
    },
  });
};

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'superadmin'| 'manager' |'dvs'| 'qa' | 'risk' | 'user';
  last_sign_in_at: string | null;
  status: 'ACTIVE' | 'OFFLINE';
}

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

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, fullName: string, role: string) => Promise<void>;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSubmit: (userId: string, fullName: string, role: string) => Promise<void>;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(email, fullName, role);
      setEmail('');
      setFullName('');
      setRole('user');
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
          <h2 className="text-xl font-semibold">Add New User</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
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
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="user">User</option>
              <option value="qa">QA</option>
              <option value="risk">Risk</option>
              <option value="manager">Manager</option>
              <option value="superadmin">Super Admin</option>
              <option value="dvs">dvs</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add User'}
          </button>
        </form>
      </div>
    </div>
  );
};

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSubmit }) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [role, setRole] = useState(user?.role || 'user');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setRole(user.role);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(user.id, fullName, role);
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
          <h2 className="text-xl font-semibold">Edit User</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
            />
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
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="user">User</option>
              <option value="qa">QA</option>
              <option value="risk">Risk</option>
              <option value="manager">Manager</option>
              <option value="superadmin">Super Admin</option>
              <option value="dvs">DVS</option>
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
  const [status, setStatus] = useState<
    | 'Active'
    | 'Sick'
    | 'On leave'
    | 'On Branch'
    | 'Business Trip'
    | 'Meeting'
    | 'Occupied'
  >(pic?.status || 'Active');
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

// Add this component after your existing modal components and before UserControlPanel

const BackupLoader = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50">
      {/* Orbit Loader */}
      <div className="container-loader">
        <div className="slice"></div>
        <div className="slice"></div>
        <div className="slice"></div>
        <div className="slice"></div>
        <div className="slice"></div>
        <div className="slice"></div>
      </div>
      
      {/* Text Loader with new style */}
      <div className="textWrapper mt-16">
        <p className="text">Creating Backup...</p>
        <div className="invertbox"></div>
      </div>
      
      <style>{`
        .container-loader {
          --uib-size: 150px;
          --uib-speed: 2.5s;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: var(--uib-size);
          width: var(--uib-size);
        }

        .slice {
          position: relative;
          height: calc(var(--uib-size) / 6);
          width: 100%;
        }

        .slice::before,
        .slice::after {
          --uib-a: calc(var(--uib-speed) / -2);
          --uib-b: calc(var(--uib-speed) / -6);
          content: "";
          position: absolute;
          top: 0;
          left: calc(50% - var(--uib-size) / 12);
          height: 100%;
          width: calc(100% / 6);
          border-radius: 50%;
          flex-shrink: 0;
          animation: orbit var(--uib-speed) linear infinite;
          transition: background-color 0.3s ease;
        }

        .slice:nth-child(1)::after {
          animation-delay: var(--uib-a);
        }

        .slice:nth-child(2)::before {
          animation-delay: var(--uib-b);
        }

        .slice:nth-child(2)::after {
          animation-delay: calc(var(--uib-a) + var(--uib-b));
        }

        .slice:nth-child(3)::before {
          animation-delay: calc(var(--uib-b) * 2);
        }

        .slice:nth-child(3)::after {
          animation-delay: calc(var(--uib-a) + var(--uib-b) * 2);
        }

        .slice:nth-child(4)::before {
          animation-delay: calc(var(--uib-b) * 3);
        }

        .slice:nth-child(4)::after {
          animation-delay: calc(var(--uib-a) + var(--uib-b) * 3);
        }

        .slice:nth-child(5)::before {
          animation-delay: calc(var(--uib-b) * 4);
        }

        .slice:nth-child(5)::after {
          animation-delay: calc(var(--uib-a) + var(--uib-b) * 4);
        }

        .slice:nth-child(6)::before {
          animation-delay: calc(var(--uib-b) * 5);
        }

        .slice:nth-child(6)::after {
          animation-delay: calc(var(--uib-a) + var(--uib-b) * 5);
        }

        .slice:nth-child(1)::before,
        .slice:nth-child(1)::after {
          background-color: #334dff;
        }

        .slice:nth-child(2)::before,
        .slice:nth-child(2)::after {
          background-color: #333eff;
        }

        .slice:nth-child(3)::before,
        .slice:nth-child(3)::after {
          background-color: #3334ff;
        }

        .slice:nth-child(4)::before,
        .slice:nth-child(4)::after {
          background-color: #4433ff;
        }

        .slice:nth-child(5)::before,
        .slice:nth-child(5)::after {
          background-color: #6633ff;
        }

        .slice:nth-child(6)::before,
        .slice:nth-child(6)::after {
          background-color: #9933ff;
        }

        @keyframes orbit {
          0% {
            transform: translateX(calc(var(--uib-size) * 0.25)) scale(0.73684);
            opacity: 0.65;
          }
          5% {
            transform: translateX(calc(var(--uib-size) * 0.235)) scale(0.684208);
            opacity: 0.58;
          }
          10% {
            transform: translateX(calc(var(--uib-size) * 0.182)) scale(0.631576);
            opacity: 0.51;
          }
          15% {
            transform: translateX(calc(var(--uib-size) * 0.129)) scale(0.578944);
            opacity: 0.44;
          }
          20% {
            transform: translateX(calc(var(--uib-size) * 0.076)) scale(0.526312);
            opacity: 0.37;
          }
          25% {
            transform: translateX(0%) scale(0.47368);
            opacity: 0.3;
          }
          30% {
            transform: translateX(calc(var(--uib-size) * -0.076)) scale(0.526312);
            opacity: 0.37;
          }
          35% {
            transform: translateX(calc(var(--uib-size) * -0.129)) scale(0.578944);
            opacity: 0.44;
          }
          40% {
            transform: translateX(calc(var(--uib-size) * -0.182)) scale(0.631576);
            opacity: 0.51;
          }
          45% {
            transform: translateX(calc(var(--uib-size) * -0.235)) scale(0.684208);
            opacity: 0.58;
          }
          50% {
            transform: translateX(calc(var(--uib-size) * -0.25)) scale(0.73684);
            opacity: 0.65;
          }
          55% {
            transform: translateX(calc(var(--uib-size) * -0.235)) scale(0.789472);
            opacity: 0.72;
          }
          60% {
            transform: translateX(calc(var(--uib-size) * -0.182)) scale(0.842104);
            opacity: 0.79;
          }
          65% {
            transform: translateX(calc(var(--uib-size) * -0.129)) scale(0.894736);
            opacity: 0.86;
          }
          70% {
            transform: translateX(calc(var(--uib-size) * -0.076)) scale(0.947368);
            opacity: 0.93;
          }
          75% {
            transform: translateX(0%) scale(1);
            opacity: 1;
          }
          80% {
            transform: translateX(calc(var(--uib-size) * 0.076)) scale(0.947368);
            opacity: 0.93;
          }
          85% {
            transform: translateX(calc(var(--uib-size) * 0.129)) scale(0.894736);
            opacity: 0.86;
          }
          90% {
            transform: translateX(calc(var(--uib-size) * 0.182)) scale(0.842104);
            opacity: 0.79;
          }
          95% {
            transform: translateX(calc(var(--uib-size) * 0.235)) scale(0.789472);
            opacity: 0.72;
          }
          100% {
            transform: translateX(calc(var(--uib-size) * 0.25)) scale(0.73684);
            opacity: 0.65;
          }
        }

        .textWrapper {
          height: fit-content;
          min-width: 3rem;
          width: fit-content;
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 0.15ch;
          position: relative;
          z-index: 0;
          color: #6633ff;
        }

        .invertbox {
          position: absolute;
          height: 100%;
          aspect-ratio: 1/1;
          left: 0;
          top: 0;
          border-radius: 20%;
          background-color: rgba(102, 51, 255, 0.2);
          backdrop-filter: invert(100%);
          animation: move 2s ease-in-out infinite;
        }

        @keyframes move {
          50% {
            left: calc(100% - 3rem);
          }
        }
      `}</style>
    </div>
  );
};

function UserControlPanel() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditPICModal, setShowEditPICModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPIC, setSelectedPIC] = useState<PIC | null>(null);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [picSectionExpanded, setPicSectionExpanded] = useState(true);

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('Fetching users...');
      const { data: { users }, error } = await supabaseService.auth.admin.listUsers();
      if (error) throw error;

      console.log('Users fetched:', users);

      const { data: userRoles } = await supabase.from('user_roles').select('*');
      const { data: userProfiles } = await supabase.from('profiles').select('*');

      return users.map(user => ({
        id: user.id,
        email: user.email,
        full_name: userProfiles?.find(p => p.id === user.id)?.full_name || '',
        role: userRoles?.find(r => r.user_id === user.id)?.role || 'user',
        last_sign_in_at: user.last_sign_in_at,
        status: user.last_sign_in_at && 
                new Date(user.last_sign_in_at).getTime() > Date.now() - 1000 * 60 * 15 
                ? 'ACTIVE' 
                : 'OFFLINE'
      }));
    },
    refetchInterval: 30000
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

  const addUserMutation = useMutation({
    mutationFn: async ({ email, fullName, role }: { email: string; fullName: string; role: string }) => {
      const { data: userData, error: signUpError } = await supabaseService.auth.admin.createUser({
        email,
        password: 'auditoptima',
        email_confirm: true
      });

      if (signUpError) throw signUpError;

      if (userData.user) {
        await supabase.from('profiles').insert([
          { id: userData.user.id, full_name: fullName }
        ]);

        await supabase.from('user_roles').insert([
          { user_id: userData.user.id, role }
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
    },
    onError: (error) => {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, fullName, role }: { userId: string; fullName: string; role: string }) => {
      await supabase.from('profiles').upsert([
        { id: userId, full_name: fullName }
      ]);

      await supabase.from('user_roles').upsert([
        { user_id: userId, role }
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
    },
    onError: (error) => {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      await supabaseService.auth.admin.deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
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

  const handleAddUser = async (email: string, fullName: string, role: string) => {
    await addUserMutation.mutateAsync({ email, fullName, role });
  };

  const handleEditUser = async (userId: string, fullName: string, role: string) => {
    await updateUserMutation.mutateAsync({ userId, fullName, role });
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      await deleteUserMutation.mutateAsync(userId);
    }
  };

  const handleEditPIC = async (id: number, nama: string, posisi: string, pic_area: string, status: string) => {
    await updatePICMutation.mutateAsync({ id, nama, posisi, pic_area, status });
  };

  const handleBackupData = async () => {
    try {
      setLoading(true);

      
      const zip = new JSZip();
      
      // Backup all tables
      const tables = [
        'accounts',
        'audit_counts',
        'audit_fraud',
        'audit_regular',
        'audit_schedule',
        'auditor_assignments',
        'auditors',
        'audits',
        'branches',
        'documents',
        'email',
        'fraud_cases',
        'fraud_payments',
        'fraud_payments_audits',
        'grammar_requests',
        'matriks',
        'notification_reads',
        'notifications',
        'pic',
        'profiles',
        'pull_requests',
        'recap',
        'rpm_letters',
        'user_roles',
        'user_status',
        'work_paper_auditors',
        'work_papers'
      ];

      // Create folders for database data
      const dbJsonFolder = zip.folder("database/json");
      const dbCsvFolder = zip.folder("database/csv");
      
      // Backup database tables
      console.log('Starting database backup...');
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*');
          
          if (error) {
            console.error(`Error fetching ${table}:`, error);
            // Create empty files for failed tables
            dbJsonFolder.file(`${table}.json`, JSON.stringify([], null, 2));
            dbCsvFolder.file(`${table}.csv`, '');
            continue;
          }

          if (!data || data.length === 0) {
            dbJsonFolder.file(`${table}.json`, JSON.stringify([], null, 2));
            dbCsvFolder.file(`${table}.csv`, '');
            continue;
          }

          dbJsonFolder.file(`${table}.json`, JSON.stringify(data, null, 2));
          const csvContent = convertJsonToCsv(data);
          dbCsvFolder.file(`${table}.csv`, csvContent);
          console.log(`✓ Backed up table: ${table} (${data.length} records)`);
        } catch (tableError) {
          console.error(`Error processing table ${table}:`, tableError);
          dbJsonFolder.file(`${table}.json`, JSON.stringify([], null, 2));
          dbCsvFolder.file(`${table}.csv`, '');
        }
      }

      // Get users from auth
      try {
        const { data: { users }, error: usersError } = await supabaseService.auth.admin.listUsers();
        if (!usersError && users) {
          dbJsonFolder.file('auth_users.json', JSON.stringify(users, null, 2));
          const csvContent = convertJsonToCsv(users);
          dbCsvFolder.file('auth_users.csv', csvContent);
          console.log(`✓ Backed up auth users: ${users.length} users`);
        }
      } catch (authError) {
        console.error('Error backing up auth users:', authError);
      }
      
      // Backup storage files dengan debugging yang lebih detail
      console.log('Starting storage backup...');
      const storageFolder = zip.folder("storage");
      
      try {
        // Test storage connection first
        console.log('Testing storage connection...');
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error('Error fetching storage buckets:', bucketsError);
          toast.error('Cannot access storage. Backup will continue without files.');
          
          // Create empty storage info file
          storageFolder.file('storage_error.txt', `Storage backup failed: ${bucketsError.message}`);
        } else {
          console.log('Available buckets:', buckets.map(b => b.name));
          
          // Process each bucket
          for (const bucket of buckets) {
            console.log(`\n=== Processing bucket: ${bucket.name} ===`);
            await backupBucket(bucket.name, storageFolder, supabase);
          }
        }
      } catch (storageError) {
        console.error('Storage backup error:', storageError);
        storageFolder.file('storage_error.txt', `Storage backup failed: ${storageError.message}`);
        toast.error('Some storage files may not be included in backup');
      }

      console.log('Generating ZIP file...');
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: "DEFLATE",
        compressionOptions: { level: 5 }
      });
      
      // Format penamaan file: OPTIMA_BACKUP-DDMMYY-HH:MM:SS
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear().toString().slice(-2);
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');

      const filename = `OPTIMA-${day}${month}${year}-${hours}${minutes}${seconds}-BACKUP.zip`;
      saveAs(content, filename);

      toast.success('Backup completed! Data has been downloaded.');
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  // Perbaiki fungsi backupBucket dengan debugging yang lebih detail
  async function backupBucket(bucketName, storageFolder, supabase) {
    try {
      console.log(`📁 Backing up bucket: ${bucketName}`);
      const bucketFolder = storageFolder.folder(bucketName);
      
      // List all files in the bucket root
      const { data: files, error: filesError } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (filesError) {
        console.error(`❌ Error listing files in bucket ${bucketName}:`, filesError);
        bucketFolder.file('error.txt', `Failed to list files: ${filesError.message}`);
        return;
      }
      
      if (!files || files.length === 0) {
        console.log(`📂 No files found in bucket ${bucketName}`);
        bucketFolder.file('empty_bucket.txt', 'This bucket is empty');
        return;
      }
      
      console.log(`📄 Found ${files.length} items in bucket ${bucketName}`);
      
      // Process each file/folder
      let successCount = 0;
      let errorCount = 0;
      
      for (const file of files) {
        if (!file.id) { 
          // It's a folder
          console.log(`📁 Processing folder: ${file.name}`);
          try {
            const subFolder = bucketFolder.folder(file.name);
            await processFolder(supabase, bucketName, file.name, subFolder);
            successCount++;
          } catch (folderError) {
            console.error(`❌ Error processing folder ${file.name}:`, folderError);
            errorCount++;
          }
        } else { 
          // It's a file in root
          console.log(`📄 Processing file: ${file.name} (${file.metadata?.size || 'unknown size'})`);
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(bucketName)
              .download(file.name);
              
            if (downloadError) {
              console.error(`❌ Error downloading file ${file.name}:`, downloadError);
              errorCount++;
              continue;
            }
            
            if (fileData) {
              bucketFolder.file(file.name, fileData);
              console.log(`✅ Successfully backed up: ${file.name}`);
              successCount++;
            }
          } catch (error) {
            console.error(`❌ Error processing file ${file.name}:`, error);
            errorCount++;
          }
        }
      }
      
      console.log(`✅ Bucket ${bucketName} backup complete: ${successCount} success, ${errorCount} errors`);
      
      // Create summary file
      bucketFolder.file('backup_summary.txt', 
        `Backup Summary for ${bucketName}\n` +
        `Total items: ${files.length}\n` +
        `Successful: ${successCount}\n` +
        `Errors: ${errorCount}\n` +
        `Backup time: ${new Date().toISOString()}`
      );
      
    } catch (error) {
      console.error(`❌ Fatal error backing up bucket ${bucketName}:`, error);
      const bucketFolder = storageFolder.folder(bucketName);
      bucketFolder.file('fatal_error.txt', `Fatal backup error: ${error.message}`);
    }
  }

  // Perbaiki fungsi processFolder dengan debugging
  async function processFolder(supabase, bucketName, path, parentFolder) {
    try {
      console.log(`  📁 Processing folder path: ${path}`);
      const { data: files, error } = await supabase.storage.from(bucketName).list(path);
      
      if (error) {
        console.error(`  ❌ Error listing files in path ${path}:`, error);
        parentFolder.file('folder_error.txt', `Error listing folder: ${error.message}`);
        return;
      }
      
      if (!files || files.length === 0) {
        console.log(`  📂 Empty folder: ${path}`);
        parentFolder.file('empty_folder.txt', 'This folder is empty');
        return;
      }
      
      console.log(`  📄 Found ${files.length} items in folder ${path}`);
      
      for (const file of files) {
        const filePath = path ? `${path}/${file.name}` : file.name;
        
        if (!file.id) { 
          // It's a subfolder
          console.log(`    📁 Processing subfolder: ${file.name}`);
          const subFolder = parentFolder.folder(file.name);
          await processFolder(supabase, bucketName, filePath, subFolder);
        } else { 
          // It's a file
          console.log(`    📄 Processing file: ${file.name}`);
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(bucketName)
              .download(filePath);
              
            if (downloadError) {
              console.error(`    ❌ Error downloading file ${filePath}:`, downloadError);
              continue;
            }
            
            if (fileData) {
              parentFolder.file(file.name, fileData);
              console.log(`    ✅ Successfully backed up: ${file.name}`);
            }
          } catch (error) {
            console.error(`    ❌ Error processing file ${filePath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`  ❌ Fatal error in processFolder for ${path}:`, error);
      parentFolder.file('process_error.txt', `Process error: ${error.message}`);
    }
  }

  // Add this state variable for search functionality
  const filteredUsers = users?.filter(user => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) || 
      user.full_name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-0">
      <Toaster position="top-right" />
      
      {/* Main header unchanged */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-sm text-gray-500">Manage users within the application and Person In Charge (PIC) data.</p>
        </div>
        
        {/* Moved backup and refresh buttons next to the main header */}
        <div className="flex gap-2">
          <button
            onClick={handleBackupData}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <DatabaseBackup className="h-5 w-5" />
            {loading ? 'Backing up...' : 'Backup All Data'}
          </button>
        </div>
      </div>
      
      {/* Add this line to show the loader when backup is in progress */}
      {loading && <BackupLoader />}
      
      {/* Change from flex-row to flex-col for stacked layout */}
      <div className="flex flex-col gap-6">
        {/* PIC Management section - collapsible */}
        <div className="w-full bg-white shadow rounded-lg overflow-hidden">
          <div 
            className="flex justify-between items-center p-4 cursor-pointer"
            onClick={() => setPicSectionExpanded(!picSectionExpanded)}
          >
            <h2 className="text-xl font-semibold text-gray-900">Manage PIC</h2>
            <button className="text-gray-500 hover:text-gray-700">
              {picSectionExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
          
          {picSectionExpanded && (
            <div className="overflow-y-auto max-h-[400px] border-t border-gray-200">
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
                  {pics?.map((pic) => (
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
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent toggle when clicking the button
                            setSelectedPIC(pic);
                            setShowEditPICModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit PIC"
                        >
                          <UserPen className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* User List section moved below the PIC section */}
        <div className="w-full">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center flex-grow">
              <h2 className="text-xl font-semibold text-gray-900 mr-4">User List</h2>
              
              {/* Search bar with modern style */}
              <div className="relative w-[300px]">
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="peer w-full pl-10 pr-2 py-2 text-base border-0 border-b-2 border-gray-300 bg-transparent outline-none transition-colors focus:border-indigo-500"
                />
                {/* Underline animation */}
                <div className="absolute bottom-0 left-0 h-0.5 w-full scale-x-0 bg-indigo-500 transition-transform duration-300 peer-focus:scale-x-100"></div>

                {/* Highlight background on focus */}
                <div className="absolute bottom-0 left-0 h-full w-0 bg-indigo-500/10 transition-all duration-300 peer-focus:w-full"></div>

                {/* Search icon */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300 peer-focus:text-indigo-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-5 h-5">
                    <path
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeWidth="2"
                      stroke="currentColor"
                      d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Add User button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <UserPlus className="h-5 w-5" />
              Add User
            </button>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col">
            <div className="overflow-y-auto h-full">
              <Table>
                <TableHeader className="bg-gray-50 sticky top-0">
  <TableRow>
    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider w-10">No.</TableHead>
    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</TableHead>
    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</TableHead>
    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</TableHead>
    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  {filteredUsers
    ?.slice() // copy array agar tidak mutasi
    .sort((a, b) => {
      const roleOrder = ['superadmin', 'manager', 'dvs', 'qa', 'risk', 'user'];
      return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
    })
    .map((user, index) => (
    <TableRow key={user.id}>
      <TableCell className="text-sm text-gray-900">{index + 1}</TableCell>
      <TableCell className="text-sm text-gray-900">{user.email}</TableCell>
      <TableCell className="text-sm text-gray-900">{user.full_name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'dvs' ? 'bg-cyan-100 text-cyan-800' :
                          user.role === 'qa' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'risk' ? 'bg-teal-100 text-teal-800' :
                          user.role === 'superadmin' ? 'bg-sky-100 text-sky-800' :
                          user.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                          'bg-pink-100 text-pink-800'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`h-2.5 w-2.5 rounded-full mr-2 ${
                            user.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`} />
                          <span className="text-sm text-gray-500">
                            {user.status === 'ACTIVE' ? 'Active' : 
                              user.last_sign_in_at ? 
                                `Log in, ${formatDistanceToNow(new Date(user.last_sign_in_at))} ago` : 
                                'Never logged in'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit user"
                          >
                            <UserPen className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Modals stay unchanged at the bottom */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddUser}
      />

      <EditUserModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={selectedUser}
        onSubmit={handleEditUser}
      />

      <EditPICModal
        isOpen={showEditPICModal}
        onClose={() => setShowEditPICModal(false)}
        pic={selectedPIC}
        onSubmit={handleEditPIC}
      />
    </div>
  );
}

export default UserControlPanel;