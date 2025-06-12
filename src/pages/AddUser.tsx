import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { ChevronDown, ChevronUp, Database, RefreshCw, Trash2, UserPen, UserPlus, X } from 'lucide-react';
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
  status: 'Active' | 'Sick' | 'On leave' | 'On Branch';
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
  const [status, setStatus] = useState<'Active' | 'Sick' | 'On leave' | 'On Branch'>(pic?.status || 'Active');
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
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Sick' | 'On leave' | 'On Branch')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="Active">Active</option>
              <option value="Sick">Sick</option>
              <option value="On leave">On Leave</option>
              <option value="On Branch">On Branch</option>
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
      <div className="loader"></div>
      <p className="text-white mt-4 font-medium">Creating Backup...</p>
      <style jsx>{`
        .loader {
          height: 15px;
          aspect-ratio: 4;
          --_g: no-repeat radial-gradient(farthest-side, #4319ec 90%, #3604ff);
          background:
            var(--_g) left,
            var(--_g) right;
          background-size: 25% 100%;
          display: grid;
        }
        .loader:before,
        .loader:after {
          content: "";
          height: inherit;
          aspect-ratio: 1;
          grid-area: 1/1;
          margin: auto;
          border-radius: 50%;
          transform-origin: -100% 50%;
          background: #2600fff8;
          animation: l49 1s infinite linear;
        }
        .loader:after {
          transform-origin: 200% 50%;
          --s: -1;
          animation-delay: -0.5s;
        }

        @keyframes l49 {
          58%,
          100% {
            transform: rotate(calc(var(--s, 1) * 1turn));
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
      // We won't show toasts during the process since we have the visual loader now
      
      const zip = new JSZip();
      
      // Backup all tables
      const tables = [
        'audit_fraud',
        'audit_regular',
        'audit_schedule',
        'auditor_assignments',
        'auditors',
        'audits',
        'branches',
        'fraud_cases',
        'fraud_payments',
        'fraud_payments_auditors',
        'fraud_payments_audits',
        'matriks',
        'matriks_table_names',
        'notification_reads',
        'notifications',
        'pic',
        'profiles',
        'rpm_letters',
        'user_roles',
        'user_status',
        'work_paper_auditors',
        'work_papers'
      ];

      // Create folders for database data
      const dbJsonFolder = zip.folder("database/json");
      const dbCsvFolder = zip.folder("database/csv");
      
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*');
        
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          continue;
        }

        if (!data || data.length === 0) {
          // Create empty files for empty tables
          dbJsonFolder.file(`${table}.json`, JSON.stringify([], null, 2));
          dbCsvFolder.file(`${table}.csv`, '');
          continue;
        }

        // Save as JSON
        dbJsonFolder.file(`${table}.json`, JSON.stringify(data, null, 2));
        
        // Convert to CSV and save
        const csvContent = convertJsonToCsv(data);
        dbCsvFolder.file(`${table}.csv`, csvContent);
      }

      // Get users from auth
      const { data: { users }, error: usersError } = await supabaseService.auth.admin.listUsers();
      if (!usersError && users) {
        dbJsonFolder.file('auth_users.json', JSON.stringify(users, null, 2));
        const csvContent = convertJsonToCsv(users);
        dbCsvFolder.file('auth_users.csv', csvContent);
      }
      
      // Backup storage files
      const storageFolder = zip.folder("storage");
      
      // Get all buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error fetching storage buckets:', bucketsError);
      } else {
        // Process each bucket
        for (const bucket of buckets) {
          const bucketFolder = storageFolder.folder(bucket.name);
          
          // List all files in the bucket
          const { data: files, error: filesError } = await supabase.storage.from(bucket.name).list();
          
          if (filesError) {
            console.error(`Error listing files in bucket ${bucket.name}:`, filesError);
            continue;
          }
          
          // Download each file and add to zip
          for (const file of files) {
            if (!file.id) { // It's a folder
              await processFolder(supabase, bucket.name, file.name, bucketFolder);
            } else { // It's a file
              try {
                // Download file
                const { data: fileData, error: downloadError } = await supabase.storage
                  .from(bucket.name)
                  .download(file.name);
                  
                if (downloadError) {
                  console.error(`Error downloading file ${file.name}:`, downloadError);
                  continue;
                }
                
                // Add file to zip
                bucketFolder.file(file.name, fileData);
              } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
              }
            }
          }
        }
      }

      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: "DEFLATE",
        compressionOptions: { level: 5 }
      });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      saveAs(content, `optima_full_backup_${timestamp}.zip`);

      toast.success('Backup completed! Data has been downloaded.');
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  // Add this helper function to convert JSON to CSV
  function convertJsonToCsv(jsonData) {
    if (!jsonData || jsonData.length === 0) {
      return '';
    }

    // Get headers from the first object
    const headers = Object.keys(jsonData[0]);
    
    // Create CSV header row
    const headerRow = headers.join(',');
    
    // Create content rows
    const rows = jsonData.map(item => {
      return headers.map(header => {
        const value = item[header];
        
        // Handle null, undefined, or empty values
        if (value === null || value === undefined) {
          return '';
        }
        
        // Handle objects and arrays by stringifying them
        if (typeof value === 'object') {
          // Escape quotes and format as a proper CSV string
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        
        // Handle strings with commas or quotes
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        }
        
        // Return other values as-is
        return value;
      }).join(',');
    });
    
    // Combine header and rows
    return [headerRow, ...rows].join('\n');
  }

  async function processFolder(supabase, bucketName, path, parentFolder) {
    const { data: files, error } = await supabase.storage.from(bucketName).list(path);
    
    if (error) {
      console.error(`Error listing files in path ${path}:`, error);
      return;
    }
    
    if (!files || files.length === 0) return;
    
    const folderName = path.split('/').pop();
    const folder = parentFolder.folder(folderName);
    
    for (const file of files) {
      const filePath = `${path}/${file.name}`;
      
      if (!file.id) { // It's a subfolder
        await processFolder(supabase, bucketName, filePath, folder);
      } else { // It's a file
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(filePath);
            
          if (downloadError) {
            console.error(`Error downloading file ${filePath}:`, downloadError);
            continue;
          }
          
          folder.file(file.name, fileData);
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error);
        }
      }
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
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Database className="h-5 w-5" />
            {loading ? 'Backing up...' : 'Backup All Data'}
          </button>
          <button
            onClick={() => refetch()}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
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
                          pic.status === 'Active' ? 'bg-green-100 text-green-800' :
                          pic.status === 'Sick' ? 'bg-red-100 text-red-800' :
                          pic.status === 'On leave' ? 'bg-yellow-100 text-yellow-800' :
                          pic.status === 'On Branch' ? 'bg-blue-100 text-blue-800' :
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
            <div className="overflow-y-auto max-h-[500px]">
              <Table>
                <TableHeader className="bg-gray-50 sticky top-0">
                  <TableRow>
                    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
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