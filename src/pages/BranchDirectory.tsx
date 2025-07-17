import { Edit, RefreshCcw, Trash2, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify'; // Ganti ke react-toastify
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { supabase } from '../lib/supabaseClient';

// Modal sederhana
const Modal: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode }> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow-lg p-6 min-w-[320px] relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
};

interface BranchData {
  id: string;
  name: string;
  region: string;
  coordinates: string;
  email: string;
}

interface ActivityLog {
  id: string;
  branch_id: string;
  branch_name: string; // Tambahkan field ini
  action: 'edit' | 'delete' | 'add';
  user_email: string;
  timestamp: string;
}

// Fungsi ekstrak lat,lng dari berbagai format Google Maps
function extractLatLng(input: string): { lat: number, lng: number } | null {
  // 1. Format @lat,lng
  const atMatch = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }
  // 2. Format !3dLAT!4dLNG
  const dMatch = input.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dMatch) {
    return { lat: parseFloat(dMatch[1]), lng: parseFloat(dMatch[2]) };
  }
  // 3. Format q=lat,lng
  const qMatch = input.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }
  // 4. Manual lat,lng
  const manualMatch = input.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (manualMatch) {
    return { lat: parseFloat(manualMatch[1]), lng: parseFloat(manualMatch[2]) };
  }
  return null;
}

const BranchDirectory: React.FC = () => {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const [activeTab, setActiveTab] = useState<'directory' | 'activity'>('directory');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
  const [editForm, setEditForm] = useState<Partial<BranchData>>({});
  const [addForm, setAddForm] = useState<Partial<BranchData>>({ name: '', region: '', email: '', coordinates: '' });
  const [showSuccessPopup, setShowSuccessPopup] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('branches_info').select('*');
      setBranches(data || []);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from('user_roles')
        .select('user_role')
        .eq('user_id', userId)
        .single();
      if (data?.user_role) setUserRole(data.user_role);
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email || '');
    };
    fetchUserEmail();
  }, []);

  useEffect(() => {
    const fetchActivityLogs = async () => {
      const { data, error } = await supabase.from('branch_activity').select('*').order('timestamp', { ascending: false });
      if (error) {
        console.error('Error fetch activity:', error);
      }
      console.log('activityLogs:', data);
      setActivityLogs(data || []);
    };
    fetchActivityLogs();
  }, []);

  // Sorting function
  const sortedBranches = React.useMemo(() => {
    if (regionFilter) return branches;
    return [...branches].sort((a, b) => {
      // Urutkan region A-Z, lalu nama cabang A-Z
      if (a.region === b.region) {
        return a.name.localeCompare(b.name);
      }
      return a.region.localeCompare(b.region);
    });
  }, [branches, regionFilter]);

  const filtered = sortedBranches.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRegion = regionFilter ? item.region === regionFilter : true;

    return matchesSearch && matchesRegion;
  });

  // Fungsi untuk Google Maps link
  function getCoordinatesText(coordinates: any) {
    if (!coordinates) return '';
    // Cek format (lng,lat)
    const match = coordinates.match(/\(?\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\)?/);
    if (match) {
      // match[1] = lng, match[2] = lat
      return `${match[2]},${match[1]}`; // lat,lng
    }
    return coordinates;
  }

  // Edit Modal logic
  const openEditModal = (branch: BranchData) => {
    setSelectedBranch(branch);
    setEditForm(branch);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    let coordinates = null;
    let input = editForm.coordinates?.trim() || '';
    const latlng = extractLatLng(input);
    if (latlng) {
      coordinates = `(${latlng.lng},${latlng.lat})`;
    }

    const { error: updateError } = await supabase.from('branches_info').update({
      ...editForm,
      coordinates: coordinates,
    }).eq('id', selectedBranch.id);

    if (updateError) {
      toast.error("Gagal update branch: " + updateError.message);
      return;
    }

    await supabase.from('branch_activity').insert({
      branch_id: selectedBranch.id,
      branch_name: editForm.name || selectedBranch.name,
      action: 'edit',
      user_email: userEmail,
      timestamp: new Date().toISOString(),
    });

    setShowEditModal(false);
    toast.success("Branch berhasil diupdate!");

    const { data } = await supabase.from('branches_info').select('*');
    setBranches(data || []);
  };

  // Delete Modal logic
  const openDeleteModal = (branch: BranchData) => {
    setSelectedBranch(branch);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleteError('');
    if (!selectedBranch) return;

    const requiredPassword = '17727721dhe';
    if (deletePassword !== requiredPassword) {
      setDeleteError('Password salah!');
      toast.error("Password salah!");
      return;
    }

    await supabase.from('branch_activity').insert({
      branch_id: selectedBranch.id,
      branch_name: selectedBranch.name,
      action: 'delete',
      user_email: userEmail,
      timestamp: new Date().toISOString(),
    });

    const { error: deleteErrorSupabase } = await supabase.from('branches_info').delete().eq('id', selectedBranch.id);
    if (deleteErrorSupabase) {
      toast.error("Gagal hapus branch: " + deleteErrorSupabase.message);
      return;
    }

    setShowDeleteModal(false);
    toast.success("Branch berhasil dihapus!");

    const { data } = await supabase.from('branches_info').select('*');
    setBranches(data || []);
    setDeletePassword('');
  };

  // Add Modal logic
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let coordinates = null;
    let input = addForm.coordinates?.trim() || '';
    const latlng = extractLatLng(input);
    if (latlng) {
      coordinates = `(${latlng.lng},${latlng.lat})`;
    }
    const payload = {
      name: addForm.name?.trim() || null,
      region: addForm.region?.trim() || null,
      email: addForm.email?.trim() || null,
      coordinates: coordinates,
    };
    if (!payload.name || !payload.region) {
      toast.error("Name dan Region wajib diisi!");
      return;
    }
    const { data, error } = await supabase.from('branches_info').insert([payload]).select();
    if (!error && data && data[0]) {
      setBranches(prev => [...prev, data[0]]);
      setShowAddModal(false);
      setAddForm({ name: '', region: '', email: '', coordinates: '' });

      await supabase.from('branch_activity').insert({
        branch_id: data[0].id,
        branch_name: data[0].name,
        action: 'add',
        user_email: userEmail,
        timestamp: new Date().toISOString(),
      });

      toast.success("Branch berhasil ditambahkan!");
    } else {
      toast.error(error?.message || "Gagal menambah branch");
    }
  };

  // Refresh button handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    const { data } = await supabase.from('branches_info').select('*');
    setBranches(data || []);
    setTimeout(() => setIsRefreshing(false), 600); // animasi tetap terlihat walau data cepat
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Branch Directory</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Tombol Refresh dengan animasi */}
            <button
              className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 shadow hover:bg-indigo-50 text-indigo-500 flex items-center gap-2 transition font-medium"
              title="Refresh"
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCcw
                size={18}
                className={`inline-block align-middle transition-transform ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="text-sm">Refresh</span>
            </button>
<button
  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
  onClick={() => setShowAddModal(true)}
>
  <Plus size={18} /> {/* Icon dengan ukuran sama seperti Refresh */}
  <span className="text-sm font-medium">Add Branch</span>
</button>
          </div>
        </div>

        {/* Search dan filter region */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 19 }, (_, i) => String.fromCharCode(65 + i)).map(region => (
              <button
                key={region}
                className={`px-3 py-1 rounded transition ${
                  regionFilter === region
                    ? 'bg-indigo-400 text-white'
                    : 'bg-gray-200 hover:bg-indigo-400 hover:text-white'
                }`}
                onClick={() => setRegionFilter(region)}
              >
                {region}
              </button>
            ))}
            <button
              className={`px-3 py-1 rounded transition ${
                regionFilter === '' ? 'bg-gray-400' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => setRegionFilter('')}
            >
              All
            </button>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search branch, region, or email..."
            className="pl-3 pr-3 py-2 h-10 w-64 rounded-md border border-gray-300"
          />
        </div>
      </div>

      {/* Table Container */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No.</TableHead>
                <TableHead>Branch Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((branch, idx) => (
                <TableRow key={branch.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.region}</TableCell>
                  <TableCell>
                    {branch.email
                      ? branch.email
                          .split(',')
                          .map((email, i, arr) => (
                            <React.Fragment key={i}>
                              <span>{email.trim()}</span>
                              {i < arr.length - 1 && <br />}
                            </React.Fragment>
                          ))
                      : <span className="text-gray-400">No email</span>
                    }
                  </TableCell>
                  <TableCell>
                    {branch.coordinates ? (
                      <a
                        href={`https://www.google.com/maps?q=${getCoordinatesText(branch.coordinates)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View on Maps
                      </a>
                    ) : (
                      <span className="text-gray-400">No location</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-indigo-600 hover:text-indigo-900 mr-2"
                      title="Edit"
                      onClick={() => openEditModal(branch)}
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                      onClick={() => openDeleteModal(branch)}
                    >
                      <Trash2 size={20} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Edit */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}>
        <h2 className="text-lg font-bold mb-4">Edit Branch</h2>
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Branch Name</label>
              <input
                className="border-b focus:border-indigo-500 outline-none px-2 py-1 bg-gray-50 rounded-t transition-all"
                placeholder="Branch Name"
                value={editForm.name || ''}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Region</label>
              <input
                className="border-b focus:border-indigo-500 outline-none px-2 py-1 bg-gray-50 rounded-t transition-all"
                placeholder="Region"
                value={editForm.region || ''}
                onChange={e => setEditForm(f => ({ ...f, region: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Email</label>
              <input
                className="border-b focus:border-indigo-500 outline-none px-2 py-1 bg-gray-50 rounded-t transition-all"
                placeholder="Email"
                value={editForm.email || ''}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Coordinates</label>
              <input
                className="border-b focus:border-indigo-500 outline-none px-2 py-1 bg-gray-50 rounded-t transition-all"
                placeholder="Coordinates"
                value={editForm.coordinates || ''}
                onChange={e => setEditForm(f => ({ ...f, coordinates: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <button type="button" className="px-4 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" className="px-4 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-600 shadow transition">Save</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Delete - UI lebih estetik */}
      <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError(''); }}>
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-red-100 p-3 mb-3">
            <Trash2 size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-red-700">Hapus Branch</h2>
          <p className="text-center text-gray-700 mb-4">
            Anda yakin ingin menghapus <b>{selectedBranch?.name}</b>?<br />
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="w-full mb-2">
            <label className="block text-sm text-gray-600 mb-1">Konfirmasi Password</label>
            <input
              type="password"
              className="border-b-2 border-gray-300 focus:border-red-500 outline-none px-3 py-2 bg-gray-50 rounded transition-all w-full"
              placeholder="Masukkan password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
            />
            {deleteError && <div className="text-red-500 text-sm mt-1">{deleteError}</div>}
          </div>
          <div className="flex gap-2 justify-end mt-4 w-full">
            <button
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-medium"
              onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError(''); }}
            >
              Batal
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium shadow transition"
              onClick={handleDeleteConfirm}
            >
              Hapus
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Add */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)}>
        <h2 className="text-lg font-bold mb-4">Add Branch</h2>
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-3">
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Branch Name</label>
              <input
                className="border-b focus:border-green-500 outline-none px-2 py-1 bg-gray-50 rounded-t transition-all"
                placeholder="Branch Name"
                value={addForm.name || ''}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Region</label>
              <input
                className="border-b focus:border-green-500 outline-none px-2 py-1 bg-gray-50 rounded-t transition-all"
                placeholder="Region"
                value={addForm.region || ''}
                onChange={e => setAddForm(f => ({ ...f, region: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Email</label>
              <input
                className="border-b focus:border-green-500 outline-none px-2 py-1 bg-gray-50 rounded-t transition-all"
                placeholder="Email"
                value={addForm.email || ''}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Coordinates (*or gmaps link)</label>
              <input
                className="border-b focus:border-green-500 outline-none px-2 py-1 bg-gray-50 rounded-t transition-all"
                placeholder="Coordinates"
                value={addForm.coordinates || ''}
                onChange={e => setAddForm(f => ({ ...f, coordinates: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <button type="button" className="px-4 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="px-4 py-1 rounded bg-green-500 text-white hover:bg-green-600 shadow transition">Add</button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BranchDirectory;