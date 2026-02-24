import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Search, ShieldBan, ShieldCheck, Trash2, UserPen, UserPlus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usePresence } from '../../contexts/PresenceContext';
import { supabase } from '../../lib/supabase';
import { supabaseService } from '../../lib/supabaseService';
import { Card, CardContent } from '../ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'superadmin'| 'manager' |'dvs'| 'qa' | 'risk' | 'user';
  last_sign_in_at: string | null;
  banned_until: string | null;
  status: 'ACTIVE' | 'OFFLINE';
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

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  userEmail: string;
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
              onChange={(e) => setRole(e.target.value as any)}
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

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  userName, 
  userEmail 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100">
        <div className="px-6 pt-8 pb-2 text-center">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center ring-8 ring-red-50 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Delete User
          </h3>
          
          <p className="text-gray-600 leading-relaxed">
            Are you sure you want to delete this user? This action cannot be undone.
          </p>
        </div>
        
        <div className="px-6 py-4">
          <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 border border-red-100">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-12 h-12 bg-red-200/70 rounded-full flex items-center justify-center border-2 border-red-300">
                <span className="text-red-700 font-bold text-sm">
                  {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-base">{userName}</p>
                <p className="text-sm text-gray-600 truncate">{userEmail}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 pb-8 pt-2">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-red-600 border-2 border-red-600 rounded-xl hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200"
            >
              {isDeleting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Delete User</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const { onlineUserIds } = usePresence();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Ban modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [banDuration, setBanDuration] = useState('876000h');
  const [banning, setBanning] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('Fetching users...');
      const { data: { users }, error } = await supabaseService.auth.admin.listUsers();
      if (error) throw error;

      console.log('Users fetched:', users);

      const { data: userRoles } = await supabase.from('user_roles').select('*');
      const { data: userProfiles } = await supabase.from('profiles').select('*');

      return users.map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: userProfiles?.find(p => p.id === user.id)?.full_name || '',
        role: userRoles?.find(r => r.user_id === user.id)?.role || 'user',
        last_sign_in_at: user.last_sign_in_at,
        banned_until: (user as any).banned_until || null,
        status: 'OFFLINE' as const // Will be overridden by presence
      }));
    },
    refetchInterval: 30000
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

  const handleAddUser = async (email: string, fullName: string, role: string) => {
    await addUserMutation.mutateAsync({ email, fullName, role });
  };

  const handleEditUser = async (userId: string, fullName: string, role: string) => {
    await updateUserMutation.mutateAsync({ userId, fullName, role });
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      await deleteUserMutation.mutateAsync(userToDelete.id);
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleBanUser = async () => {
    if (!userToBan) return;
    setBanning(true);
    try {
      const { error } = await supabaseService.auth.admin.updateUserById(userToBan.id, {
        ban_duration: banDuration
      });
      if (error) throw error;
      toast.success(`${userToBan.full_name || userToBan.email} berhasil di-ban`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowBanModal(false);
      setUserToBan(null);
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Gagal mem-ban user');
    } finally {
      setBanning(false);
    }
  };

  const handleUnbanUser = async (user: User) => {
    try {
      const { error } = await supabaseService.auth.admin.updateUserById(user.id, {
        ban_duration: 'none'
      });
      if (error) throw error;
      toast.success(`${user.full_name || user.email} berhasil di-unban`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Gagal meng-unban user');
    }
  };

  const filteredUsers = users?.filter((user: User) => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) || 
      user.full_name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className="mb-0 border-gray-200 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">User List</h2>
            <p className="text-sm text-gray-500 mt-1">Manage system users, roles, and access.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0 md:w-[300px]">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
          <div className="max-h-[calc(100vh-400px)] overflow-y-auto relative custom-scrollbar">
            <Table>
              <TableHeader className="bg-gray-50/50 sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <TableRow>
                <TableHead className="w-16 font-semibold text-gray-600 pl-6">No.</TableHead>
                <TableHead className="font-semibold text-gray-600">Email</TableHead>
                <TableHead className="font-semibold text-gray-600">Name</TableHead>
                <TableHead className="font-semibold text-gray-600">Role</TableHead>
                <TableHead className="font-semibold text-gray-600">Status</TableHead>
                <TableHead className="font-semibold text-gray-600 text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers
                ?.slice()
                .sort((a: any, b: any) => {
                  const roleOrder = ['superadmin', 'manager', 'dvs', 'qa', 'risk', 'user'];
                  const roleCompare = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
                  if (roleCompare !== 0) return roleCompare;
                  if (a.role === 'user') {
                    const aOnline = onlineUserIds.has(a.id);
                    const bOnline = onlineUserIds.has(b.id);
                    
                    if (aOnline && !bOnline) return -1;
                    if (!aOnline && bOnline) return 1;

                    const aTime = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
                    const bTime = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
                    return bTime - aTime;
                  }
                  return 0;
                })
                .map((user: any, index: number) => (
                <TableRow key={user.id} className={`transition-colors ${user.banned_until && new Date(user.banned_until) > new Date() ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50/50'}`}>
                  <TableCell className="text-sm text-gray-500 pl-6 font-medium">{index + 1}</TableCell>
                  <TableCell className="text-sm text-gray-900 font-medium">{user.email}</TableCell>
                  <TableCell className="text-sm text-gray-600">{user.full_name}</TableCell>
                  <TableCell>
                    <div className="relative group inline-block">
                      <span 
                        className={`px-2.5 py-0.5 text-xs font-medium rounded-full cursor-default border ${
                          user.banned_until && new Date(user.banned_until) > new Date()
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : user.role === 'dvs' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                              user.role === 'qa' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              user.role === 'risk' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                              user.role === 'superadmin' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                              user.role === 'manager' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                              'bg-pink-50 text-pink-700 border-pink-100'
                        }`}
                      >
                        {user.role.toUpperCase()}
                      </span>
                      {user.banned_until && new Date(user.banned_until) > new Date() && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-150">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                            <div className="flex items-center gap-1.5">
                              <ShieldBan className="w-3 h-3 text-red-400" />
                              <span className="font-semibold text-red-400">BANNED</span>
                            </div>
                            <div className="mt-1 text-gray-300">
                              Until {new Date(user.banned_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                            <div className="w-2 h-2 bg-gray-900 rotate-45" />
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className={`h-2 w-2 rounded-full mr-2 ${onlineUserIds.has(user.id) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-gray-300'}`} />
                      <span className="text-xs text-gray-500 font-medium">
                        {onlineUserIds.has(user.id) ? 'Online' : 
                          user.last_sign_in_at ? 
                            formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true }) : 
                            'Never logged in'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="text-gray-400 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                        title="Edit user"
                      >
                        <UserPen className="h-4 w-4" />
                      </button>
                      {user.banned_until && new Date(user.banned_until) > new Date() ? (
                        <button
                          onClick={() => handleUnbanUser(user)}
                          className="text-emerald-500 hover:text-emerald-700 transition-colors p-1 rounded-md hover:bg-emerald-50"
                          title="Unban user"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setUserToBan(user);
                            setBanDuration('876000h');
                            setShowBanModal(true);
                          }}
                          className="text-gray-400 hover:text-amber-600 transition-colors p-1 rounded-md hover:bg-amber-50"
                          title="Ban user"
                        >
                          <ShieldBan className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
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

        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          userName={userToDelete?.full_name || ''}
          userEmail={userToDelete?.email || ''}
        />

        {showBanModal && userToBan && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100">
              <div className="px-6 pt-8 pb-2 text-center">
                <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center ring-8 ring-amber-50 mb-4">
                  <ShieldBan className="w-8 h-8 text-amber-500" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Ban User
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  User ini tidak akan bisa login selama durasi ban berlaku.
                </p>
              </div>
              
              <div className="px-6 py-3">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center border border-amber-200">
                      <span className="text-amber-700 font-bold text-xs">
                        {(userToBan.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm">{userToBan.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{userToBan.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3">
                <p className="text-sm font-medium text-gray-700 mb-3">Durasi Ban</p>
                <div className="space-y-2">
                  {[
                    { value: '1h', label: '1 Jam' },
                    { value: '24h', label: '24 Jam' },
                    { value: '168h', label: '7 Hari' },
                    { value: '720h', label: '30 Hari' },
                    { value: '876000h', label: 'Permanen' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        banDuration === opt.value
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="banDuration"
                        value={opt.value}
                        checked={banDuration === opt.value}
                        onChange={(e) => setBanDuration(e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                        banDuration === opt.value ? 'border-amber-500' : 'border-gray-300'
                      }`}>
                        {banDuration === opt.value && (
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <span className={`text-sm font-medium ${
                        banDuration === opt.value ? 'text-amber-800' : 'text-gray-700'
                      }`}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="px-6 pb-8 pt-4">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => { setShowBanModal(false); setUserToBan(null); }}
                    disabled={banning}
                    className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleBanUser}
                    disabled={banning}
                    className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-amber-500 border-2 border-amber-500 rounded-xl hover:bg-amber-600 hover:border-amber-600 disabled:opacity-50 flex items-center justify-center transition-all"
                  >
                    {banning ? 'Banning...' : 'Ban User'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
