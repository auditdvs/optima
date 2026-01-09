import { Edit, Plus, RefreshCcw, Search, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify'; // Ganti ke react-toastify
import EChartComponent from '../components/common/EChartComponent';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useMapCache } from '../contexts/MapCacheContext';
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
  // Use cached map data from context
  const { branchesGeo: cachedBranchesGeo } = useMapCache();
  
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
  // Use cached branchesGeo from context
  const branchesGeo = cachedBranchesGeo;
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Search state specifically for map view
  const [mapSearchTerm, setMapSearchTerm] = useState('');

  // Filter map points based on search
  const filteredMapBranches = React.useMemo(() => {
    if (!mapSearchTerm) return branchesGeo;
    const term = mapSearchTerm.toLowerCase();
    return branchesGeo.filter(b => 
      b.name?.toLowerCase().includes(term) || 
      b.region?.toLowerCase().includes(term)
    );
  }, [branchesGeo, mapSearchTerm]); // Fetch branch data from database (for table display)
  useEffect(() => {
    const fetchBranchData = async () => {
      const { data } = await supabase.from('branches_info').select('*');
      setBranches(data || []);
    };
    fetchBranchData();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;
        
        const { data, error } = await supabase
          .from('user_roles')
          .select('user_role')
          .eq('user_id', userId)
          .single();
        
        if (error) {
          // If error (like 400 or RLS policy), silently set default role
          console.log('Could not fetch user role, using default');
          setUserRole('user'); // Set default role
          return;
        }
        
        if (data?.user_role) setUserRole(data.user_role);
      } catch (err) {
        // Suppress error and use default role
        console.log('Error fetching user role, using default');
        setUserRole('user');
      }
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
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.region || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.email || '').toLowerCase().includes(searchTerm.toLowerCase());

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

    const requiredPassword = 'auditoptima';
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

  // Tab state: 'map' or 'table'
  const [currentView, setCurrentView] = useState<'map' | 'table'>('map');

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-900">
          Branch Directory
        </h1>
        <p className="text-sm md:text-base text-gray-500 mt-1">Manage and visualize branch locations across Indonesia.</p>
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setCurrentView('map')}
            className={`px-4 md:px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap flex-shrink-0 ${
              currentView === 'map'
                ? 'text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${currentView === 'map' ? 'bg-indigo-600' : 'bg-transparent'}`}></span>
              Branch Locations Map
            </div>
            {currentView === 'map' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>
            )}
          </button>
          
          <button
            onClick={() => setCurrentView('table')}
            className={`px-4 md:px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap flex-shrink-0 ${
              currentView === 'table'
                ? 'text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${currentView === 'table' ? 'bg-indigo-600' : 'bg-transparent'}`}></span>
              Branch Data & List
            </div>
            {currentView === 'table' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in zoom-in-95 duration-300">
        
        {/* VIEW 1: MAP */}
        {currentView === 'map' && (
          <Card className="shadow-lg border-indigo-100 bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex flex-wrap gap-2 text-sm font-medium text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 inline-flex">
                    {/* Special Categories Only */}
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-100"></span>
                      <span>Head Office</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-100"></span>
                      <span>Regional</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-500 ring-2 ring-yellow-100"></span>
                      <span>Komida</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-500 ring-2 ring-purple-100"></span>
                      <span>Yamida</span>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                  Total: {filteredMapBranches.length} Locations Mapped
                </span>
              </div>
              
              <div className="h-[calc(100vh-280px)] min-h-[500px] w-full rounded-xl border border-indigo-50 bg-gradient-to-br from-slate-50 to-indigo-50/50 overflow-hidden relative group">
                {/* Floating Search Bar */}
                <div className="absolute top-4 left-4 z-10 w-full max-w-xs transition-opacity duration-300 opacity-90 hover:opacity-100 focus-within:opacity-100">
                  <div className="relative shadow-lg rounded-xl">
                    <input
                      type="text"
                      value={mapSearchTerm}
                      onChange={(e) => setMapSearchTerm(e.target.value)}
                      placeholder="Cari cabang di peta..."
                      className="w-full pl-10 pr-4 py-3 bg-white/95 backdrop-blur-sm border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm font-medium text-gray-700 placeholder-gray-400"
                    />
                    <div className="absolute left-3 top-3 text-indigo-500">
                      <Search className="w-5 h-5" />
                    </div>
                    {mapSearchTerm && (
                      <button 
                        onClick={() => setMapSearchTerm('')}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <EChartComponent
                  option={{
                    backgroundColor: 'transparent',
                    tooltip: {
                      trigger: 'item',
                      triggerOn: 'click', // UBAH KE CLICK: Biar mantap gak ilang-ilang kecuali klik tempat lain
                      enterable: true,
                      hideDelay: 1000, 
                      position: 'top', // PENTING: Tooltip DIAM di atas pin, gak lari ngikutin mouse
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    borderColor: '#EEF2FF',
                    textStyle: { color: '#1E293B' },
                    extraCssText: 'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); border-radius: 12px; padding: 0;', // Padding 0 untuk kontrol penuh layout
                    formatter: (params: any) => {
                      const data = params.data;
                      if (!data) return '';
                      const isRegional = data.name.startsWith('REGIONAL');
                      const isHeadOffice = data.name.includes('KANTOR PUSAT');
                      const isKomida = data.name.includes('KOMIDA PRINTING');
                      const isYamida = data.name.includes('YAMIDA');
                      const lat = data.value?.[1];
                      const lng = data.value?.[0];
                      const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                      
                      // Determine colors and label based on type
                      let pinColor = '#3b82f6'; // blue default
                      let bgColor = '#eff6ff';
                      let borderColor = '#bfdbfe';
                      let textColor = '#1e40af';
                      let label = 'BRANCH';
                      
                      if (isKomida) {
                        pinColor = '#eab308'; // yellow
                        bgColor = '#fefce8';
                        borderColor = '#fde047';
                        textColor = '#854d0e';
                        label = 'KOMIDA PRINTING';
                      } else if (isYamida) {
                        pinColor = '#a855f7'; // purple
                        bgColor = '#faf5ff';
                        borderColor = '#e9d5ff';
                        textColor = '#6b21a8';
                        label = 'YAMIDA';
                      } else if (isHeadOffice) {
                        pinColor = '#10b981'; // green
                        bgColor = '#f0fdf4';
                        borderColor = '#bbf7d0';
                        textColor = '#065f46';
                        label = 'HEAD OFFICE';
                      } else if (isRegional) {
                        pinColor = '#ef4444'; // red
                        bgColor = '#fef2f2';
                        borderColor = '#fca5a5';
                        textColor = '#b91c1c';
                        label = 'REGIONAL';
                      }
                      
                      return `
                        <div style="padding: 12px; font-family: sans-serif; min-width: 200px;">
                          <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                            <strong style="font-size: 15px; color: ${pinColor};">${data.name || 'Unknown'}</strong>
                            <span style="font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 600; border: 1px solid ${borderColor}; color: ${textColor}; background: ${bgColor};">
                              ${label}
                            </span>
                          </div>
                          
                          <div style="margin-bottom: 12px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                            <span style="color: #94a3b8;">Region:</span> <span style="font-weight: 600; color: #334155;">${data.region || '-'}</span>
                          </div>

                          <a href="${gmapsUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 6px; background-color: #3b82f6; color: white; text-decoration: none; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; transition: background 0.2s;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            Open in Google Maps
                          </a>
                        </div>
                      `;
                    }
                  },
                    geo: {
                      map: 'indonesia',
                      roam: true,
                      zoom: 1.25,
                      center: [118, -2],
                      itemStyle: {
                        areaColor: '#e0e7ff',
                        borderColor: '#818cf8',
                        borderWidth: 0.5
                      },
                      emphasis: {
                        itemStyle: {
                          areaColor: '#c7d2fe',
                          shadowBlur: 10,
                          shadowColor: 'rgba(99, 102, 241, 0.2)'
                        }
                      },
                      label: { show: false }
                    },
                    series: [{
                      name: 'Branches',
                      type: 'scatter',
                      coordinateSystem: 'geo',
                      data: filteredMapBranches.map(branch => {
                        const isRegional = branch.name.startsWith('REGIONAL');
                        const isHeadOffice = branch.name.includes('KANTOR PUSAT');
                        const isKomida = branch.name.includes('KOMIDA PRINTING');
                        const isYamida = branch.name.includes('YAMIDA');
                        
                        // Region color mapping
                        const regionColors: { [key: string]: string } = {
                          'A': '#3b82f6',
                          'B': '#06b6d4',
                          'C': '#8b5cf6',
                          'D': '#ec4899',
                          'E': '#f97316',
                          'F': '#14b8a6',
                          'G': '#6366f1',
                          'H': '#0ea5e9',
                          'I': '#84cc16',
                          'J': '#f59e0b',
                          'K': '#22c55e',
                          'L': '#a78bfa',
                          'M': '#fb923c',
                          'N': '#2dd4bf',
                          'O': '#94a3b8',
                          'P': '#f472b6',
                          'Q': '#facc15',
                          'R': '#4ade80',
                          'S': '#c084fc',
                        };
                        
                        let pinColor = '#3b82f6'; // blue default
                        let pinSize = 20;
                        
                        if (isKomida) {
                          pinColor = '#eab308'; // yellow
                          pinSize = 28;
                        } else if (isYamida) {
                          pinColor = '#a855f7'; // purple
                          pinSize = 28;
                        } else if (isHeadOffice) {
                          pinColor = '#10b981'; // green
                          pinSize = 35; // biggest
                        } else if (isRegional) {
                          pinColor = '#ef4444'; // red
                          pinSize = 30;
                        } else {
                          // Standard branch - use region color
                          pinColor = regionColors[branch.region] || '#3b82f6';
                          pinSize = 20;
                        }
                        
                        return {
                          name: branch.name,
                          value: [...branch.coordinates],
                          region: branch.region,
                          symbol: 'pin',
                          symbolSize: pinSize,
                          itemStyle: {
                            color: pinColor,
                            shadowBlur: 2,
                            shadowColor: 'rgba(0,0,0,0.2)'
                          }
                        };
                      }),
                      label: {
                        show: true,
                        formatter: '{b}',
                        position: 'right',
                        fontSize: 10,
                        color: '#1e293b',
                        fontWeight: 600,
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        padding: [2, 4],
                        borderRadius: 3,
                        distance: 5
                      },
                      emphasis: {
                        scale: 1.5,
                        label: {
                          show: false // Jangan munculkan label lagi saat hover
                        }
                      }
                    }]
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* VIEW 2: TABLE DATA */}
        {currentView === 'table' && (
          <div className="flex flex-col gap-6">
            
            {/* Control Panel */}
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="relative w-full md:w-auto md:flex-1 md:max-w-xl">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search branch name, region, or email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                      />
                      <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="flex w-full md:w-auto gap-3">
                      <button
                        className="flex-1 md:flex-none justify-center px-4 py-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center gap-2 transition hover:shadow-sm text-sm font-medium"
                        title="Refresh Data"
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                      >
                        <RefreshCcw
                          size={18}
                          className={`transition-transform ${isRefreshing ? "animate-spin text-indigo-600" : ""}`}
                        />
                        <span className="hidden sm:inline">Refresh</span>
                      </button>
                      <button
                        className="flex-1 md:flex-none justify-center px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-md shadow-indigo-200 transition-all font-medium text-sm"
                        onClick={() => setShowAddModal(true)}
                      >
                        <Plus size={18} />
                        Add Branch
                      </button>
                    </div>
                  </div>

                  {/* Region Filters */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                      <div className="flex-none text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2 sticky left-0 bg-white z-10 pr-2">
                         Filter Region:
                      </div>
                      <button
                        className={`flex-none px-3 py-1 text-xs rounded-full transition border whitespace-nowrap ${
                          regionFilter === '' 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => setRegionFilter('')}
                      >
                        All
                      </button>
                      {Array.from({ length: 19 }, (_, i) => String.fromCharCode(65 + i)).map(region => (
                        <button
                          key={region}
                          className={`flex-none px-3 py-1 text-xs rounded-full transition border whitespace-nowrap ${
                            regionFilter === region
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={() => setRegionFilter(region)}
                        >
                          {region}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Cards View (Visible on small screens) */}
            <div className="block md:hidden space-y-4">
              {filtered.length > 0 ? (
                filtered.map((branch) => (
                  <Card key={branch.id} className="border-gray-200 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                          <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            Region {branch.region}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-lg"
                            onClick={() => openEditModal(branch)}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"
                            onClick={() => openDeleteModal(branch)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {branch.email && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md break-all">
                           {branch.email}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                         {branch.coordinates ? (
                            <a
                              href={`https://www.google.com/maps?q=${getCoordinatesText(branch.coordinates)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 text-xs font-medium flex items-center gap-1 hover:underline"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              View Location
                            </a>
                         ) : (
                           <span className="text-gray-400 text-xs italic">No location set</span>
                         )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                  No branches found
                </div>
              )}
            </div>

            {/* Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden bg-white hidden md:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/80">
                    <TableRow>
                      <TableHead className="w-16 font-semibold text-gray-700 text-center">No.</TableHead>
                      <TableHead className="font-semibold text-gray-700">Branch Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Region</TableHead>
                      <TableHead className="font-semibold text-gray-700">Email Contact</TableHead>
                      <TableHead className="font-semibold text-gray-700">Location</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700 pr-8">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length > 0 ? (
                      filtered.map((branch, idx) => (
                        <TableRow key={branch.id} className="hover:bg-indigo-50/30 transition-colors">
                          <TableCell className="font-medium text-gray-500 text-center">{idx + 1}</TableCell>
                          <TableCell>
                            <span className="font-medium text-gray-900 block">{branch.name}</span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              Reg {branch.region}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs">
                             {branch.email ? (
                               <div className="text-sm text-gray-600">
                                 {branch.email.split(',').map((e, i) => (
                                   <div key={i} className="truncate">{e.trim()}</div>
                                 ))}
                               </div>
                             ) : (
                               <span className="text-gray-400 text-xs italic">No email</span>
                             )}
                          </TableCell>
                          <TableCell>
                            {branch.coordinates ? (
                              <a
                                href={`https://www.google.com/maps?q=${getCoordinatesText(branch.coordinates)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                View Map
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                              <button
                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Edit Branch"
                                onClick={() => openEditModal(branch)}
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Branch"
                                onClick={() => openDeleteModal(branch)}
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                             <div className="p-3 bg-gray-50 rounded-full mb-2">
                               <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                               </svg>
                             </div>
                             <p>No branches found matching your search.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 text-center font-medium">
                Showing {filtered.length} branches
              </div>
            </Card>
          </div>
        )}
      </div>

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