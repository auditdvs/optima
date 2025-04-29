import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Trash2, UserPen, UserPlus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { supabaseService } from '../lib/supabaseService';

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

function UserControlPanel() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditPICModal, setShowEditPICModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPIC, setSelectedPIC] = useState<PIC | null>(null);
  const queryClient = useQueryClient();

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
    refetchInterval: 30000 // Auto refresh every 30 seconds
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
      // Delete user roles first
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // Delete user profile
      await supabase.from('profiles').delete().eq('id', userId);
      
      // Delete the user from auth
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

  return (
    <div className="p-0">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-sm text-gray-500">Manage users within the application, including viewing active status, adding new users, editing user information, and deleting unnecessary accounts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Add User
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="max-h-[320px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users?.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'qa' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'risk' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`h-2.5 w-2.5 rounded-full mr-2 ${
                        user.status === 'ACTIVE' ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                      <span className="text-sm text-gray-500">
                        {user.status === 'ACTIVE' ? 'Active' : 
                          user.last_sign_in_at ? 
                            `Online ${formatDistanceToNow(new Date(user.last_sign_in_at))} ago` : 
                            'Never logged in'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

      <div className="mt-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Manage PIC</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="max-h-[630px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posisi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PIC Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pics?.map((pic) => (
                  <tr key={pic.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pic.nama}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pic.posisi}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pic.pic_area}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        pic.status === 'Active' ? 'bg-green-100 text-green-800' :
                        pic.status === 'Sick' ? 'bg-red-100 text-red-800' :
                        pic.status === 'On leave' ? 'bg-yellow-100 text-yellow-800' :
                        pic.status === 'On Branch' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pic.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => {
                          setSelectedPIC(pic);
                          setShowEditPICModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit PIC"
                      >
                        <UserPen className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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