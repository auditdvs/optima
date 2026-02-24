import {
  Calendar,
  CheckCircle,
  ClipboardCopy,
  Clock,
  Download,
  Eye,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SurveyToken {
  id: string;
  token: string;
  branch_name: string;
  branch_code: string | null;
  created_by: string;
  creator_name: string;
  created_at: string;
  is_active: boolean;
  response_count: number;
}

interface SurveyResponse {
  id: string;
  token_id: string;
  submitted_at: string;
  a1: number; a2: number; a3: number; a4: number; a5: number; a6: number;
  b1: number; b2: number; b3: number;
  c1: number; c2: number; c3: number; c4: number; c5: number; c6: number; c7: number;
  d1: number; d2: number; d3: number; d4: number;
  s2a: boolean; s2b: boolean; s2c: boolean; s2d: boolean; s2e: boolean;
  s2f: boolean; s2g: boolean; s2h: boolean; s2i: boolean;
  s3a: boolean; s3b: boolean; s3c: boolean; s3d: boolean; s3e: boolean;
  s3f: boolean; s3g: boolean; s3h: boolean; s3i: boolean; s3j: boolean;
  s3k: boolean; s3l: boolean;
  harapan: string | null;
  kritik_saran: string | null;
}

interface AuditBranch {
  id: string;
  branch_name: string;
}

function SurveyTokenManager() {
  const { user, userRole } = useAuth();
  const [tokens, setTokens] = useState<SurveyToken[]>([]);
  const [auditBranches, setAuditBranches] = useState<AuditBranch[]>([]);
  const [availableBranches, setAvailableBranches] = useState<AuditBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'inactive'>('all');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<SurveyToken | null>(null);
  const [tokenResponses, setTokenResponses] = useState<SurveyResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  
  // Form state
  const [selectedBranchCode, setSelectedBranchCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // QR Code modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrToken, setQrToken] = useState<SurveyToken | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);

  // Generate random token
  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  // Fetch branches from letter (regular audits with approved status only)
  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('letter')
        .select('id, branch_name')
        .ilike('audit_type', '%reguler%')
        .eq('status', 'approved')
        .order('branch_name');

      if (error) throw error;
      setAuditBranches(data || []);
    } catch (error) {
      console.error('Error fetching audit branches:', error);
    }
  };

  // Fetch tokens with accurate response counts
  const fetchTokens = async () => {
    try {
      setLoading(true);
      
      // Check if user is admin (superadmin, manager, or dvs) using role from context
      const isAdmin = ['superadmin', 'manager', 'dvs'].includes(userRole?.toLowerCase() || '');
      
      // Build query based on user role
      let query = supabase
        .from('survey_tokens')
        .select('*')
        .order('created_at', { ascending: false });
      
      // If not admin, only show tokens created by the user
      if (!isAdmin && user?.id) {
        query = query.eq('created_by', user.id);
      }
      
      const { data: tokensData, error: tokensError } = await query;

      if (tokensError) throw tokensError;
      
      // Use creator_name directly from survey_tokens table (auto-filled by trigger)
      // No need to query profiles anymore!


      
      // Fetch response counts for each token
      if (tokensData && tokensData.length > 0) {
        const tokenIds = tokensData.map(t => t.id);
        const { data: responseCounts, error: countError } = await supabase
          .from('survey_responses')
          .select('token_id')
          .in('token_id', tokenIds);
        
        if (countError) throw countError;
        
        // Calculate counts
        const countMap: Record<string, number> = {};
        responseCounts?.forEach(r => {
          countMap[r.token_id] = (countMap[r.token_id] || 0) + 1;
        });
        
        // Update tokens with actual counts (creator_name already in token from DB)
        const tokensWithCounts = tokensData.map(token => ({
          ...token,
          response_count: countMap[token.id] || 0,
          creator_name: token.creator_name || 'Unknown User'
        }));
        
        setTokens(tokensWithCounts);
      } else {
        setTokens([]);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast.error('Gagal memuat data token');
    } finally {
      setLoading(false);
    }
  };

  // Fetch responses for a specific token
  const fetchTokenResponses = async (tokenId: string) => {
    try {
      setLoadingResponses(true);
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('token_id', tokenId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setTokenResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast.error('Gagal memuat data respon');
    } finally {
      setLoadingResponses(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBranches();
      fetchTokens();
    }
  }, [user]);

  // Filter available branches (exclude those with active tokens)
  useEffect(() => {
    const existingBranchNames = tokens.map(t => t.branch_name);
    const available = auditBranches.filter(
      branch => !existingBranchNames.includes(branch.branch_name)
    );
    setAvailableBranches(available);
  }, [auditBranches, tokens]);

  // Create new token
  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBranchCode) {
      toast.error('Pilih cabang terlebih dahulu');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const branch = availableBranches.find((b: AuditBranch) => String(b.id) === String(selectedBranchCode));
      
      if (!branch) {
        toast.error('Data cabang tidak valid');
        setIsSubmitting(false);
        return;
      }

      // Lookup true branch code from branches table
      let trueBranchCode = '';
      try {
        const { data: branchData } = await supabase
          .from('branches')
          .select('code')
          .eq('name', branch.branch_name)
          .single();
        
        if (branchData && branchData.code) {
          trueBranchCode = String(branchData.code);
        }
      } catch (err) {
        console.warn('Could not find branch code for:', branch.branch_name);
      }

      const token = generateToken();

      const { error } = await supabase
        .from('survey_tokens')
        .insert({
          token,
          branch_name: branch.branch_name,
          branch_code: trueBranchCode,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success('Token berhasil dibuat!');
      setSelectedBranchCode('');
      setIsCreateModalOpen(false);
      fetchTokens();
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('Gagal membuat token');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete token
  // Delete token
  const handleDeleteToken = (tokenId: string) => {
    setTokenToDelete(tokenId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteToken = async () => {
    if (!tokenToDelete) return;

    try {
      const { error } = await supabase
        .from('survey_tokens')
        .delete()
        .eq('id', tokenToDelete);

      if (error) throw error;
      toast.success('Token berhasil dihapus');
      fetchTokens();
    } catch (error) {
      console.error('Error deleting token:', error);
      toast.error('Gagal menghapus token');
    } finally {
      setIsDeleteModalOpen(false);
      setTokenToDelete(null);
    }
  };

  // Copy token to clipboard
  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success('Token disalin ke clipboard');
  };

  // Copy survey link
  const copySurveyLink = (token: string) => {
    const link = `${window.location.origin}/survey/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link survei disalin ke clipboard');
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status info
  const getStatusInfo = (token: SurveyToken) => {
    if (token.response_count >= 5) {
      return { label: 'Closed', color: 'bg-gray-100 text-gray-700 border border-gray-200', icon: CheckCircle };
    }
    if (token.is_active) {
      return { label: 'Aktif', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    }
    return { label: 'Nonaktif', color: 'bg-gray-100 text-gray-600', icon: Clock };
  };

  // Filter tokens
  const filteredTokens = tokens.filter((token) => {
    // Search filter
    const matchesSearch = token.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.token.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = token.is_active && token.response_count < 5;
    } else if (statusFilter === 'closed') {
      matchesStatus = token.response_count >= 5;
    } else if (statusFilter === 'inactive') {
      matchesStatus = !token.is_active && token.response_count < 5;
    }
    
    return matchesSearch && matchesStatus;
  });

  // View token details
  const handleViewDetails = (token: SurveyToken) => {
    setSelectedToken(token);
    setIsDetailModalOpen(true);
    fetchTokenResponses(token.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Survei Kepuasan Auditee
            </h1>
            <p className="text-gray-500 mt-1">
              Kelola token survei untuk staf cabang
            </p>
          </div>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Buat Token Baru
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan cabang atau token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium text-gray-700 cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="closed">Closed (5/5)</option>
            <option value="inactive">Nonaktif</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchTokens}
            disabled={loading}
            className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Summary Stats */}
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{tokens.length}</p>
            <p className="text-sm font-medium text-gray-500">Total Token</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-green-600">
              {tokens.filter(t => t.is_active && t.response_count < 5).length}
            </p>
            <p className="text-sm font-medium text-gray-500">Token Aktif</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-gray-600">
              {tokens.filter(t => t.response_count >= 5).length}
            </p>
            <p className="text-sm font-medium text-gray-500">Closed (5/5)</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-indigo-600">
              {tokens.reduce((sum, t) => sum + t.response_count, 0)}
            </p>
            <p className="text-sm font-medium text-gray-500">Total Responden</p>
          </div>
        </div>

        {/* Tokens Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Ticket className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Belum ada token</p>
              <p className="text-gray-400 text-sm mt-1">Buat token baru untuk memulai survei</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Token
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Cabang
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Dibuat Oleh
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tanggal Dibuat
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Responden
                    </th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTokens.map((token) => {
                    const status = getStatusInfo(token);
                    const StatusIcon = status.icon;
                    return (
                      <tr key={token.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600 text-lg">
                              {token.token}
                            </span>
                            <button
                              onClick={() => copyToClipboard(token.token)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Salin token"
                            >
                              <ClipboardCopy className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{token.branch_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{token.creator_name}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(token.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${status.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            token.response_count >= 5 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'text-gray-900'
                          }`}>
                            <Users className={`w-3.5 h-3.5 ${token.response_count >= 5 ? 'text-green-600' : 'text-gray-400'}`} />
                            <span>{token.response_count}</span>
                            {token.response_count >= 5 && <span className="uppercase tracking-wider ml-0.5">(FULL)</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewDetails(token)}
                              className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                              title="Lihat detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setQrToken(token);
                                setIsQrModalOpen(true);
                              }}
                              className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors"
                              title="Tampilkan QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => copySurveyLink(token.token)}
                              className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                              title="Salin link survei"
                            >
                              <ClipboardCopy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteToken(token.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                              title="Hapus token"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Token Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Buat Token Survei</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateToken} className="space-y-5">
              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nama Cabang <span className="text-red-500">*</span>
                </label>
                <Select 
                  value={selectedBranchCode} 
                  onValueChange={setSelectedBranchCode}
                >
                  <SelectTrigger className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all h-[50px] text-base">
                    <SelectValue placeholder="Pilih Cabang..." />
                  </SelectTrigger>
                  <SelectContent className="z-[200] max-h-[300px]">
                    {availableBranches.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500 text-center">
                        Semua cabang sudah memiliki token
                      </div>
                    ) : (
                      availableBranches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.branch_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Tanggal Pengisian</p>
                    <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Batas Responden</p>
                    <p className="text-sm text-gray-500">Maks 5 responden, link otomatis tutup setelah penuh</p>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Membuat Token...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Buat Token</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detail Token</h2>
                <p className="text-gray-500 mt-0.5">
                  Token: <span className="font-mono font-bold text-indigo-600">{selectedToken.token}</span>
                  {' • '}Cabang: {selectedToken.branch_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedToken(null);
                  setTokenResponses([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Token Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-indigo-600">{tokenResponses.length}</p>
                  <p className="text-sm font-medium text-indigo-600/70">Total Responden</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-gray-700">{formatDate(selectedToken.created_at)}</p>
                  <p className="text-xs font-medium text-gray-500">Dibuat</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-gray-700">{selectedToken.response_count} / 5</p>
                  <p className="text-xs font-medium text-gray-500">Responden</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  {(() => {
                    const status = getStatusInfo(selectedToken);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${status.color}`}>
                        {status.label}
                      </span>
                    );
                  })()}
                  <p className="text-xs font-medium text-gray-500 mt-1">Status</p>
                </div>
              </div>

              {/* Responses List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daftar Responden</h3>
                
                {loadingResponses ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                ) : tokenResponses.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Belum ada responden</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tokenResponses.map((response, index) => (
                      <div key={response.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-bold">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Responden #{index + 1}</p>
                            <p className="text-sm text-gray-500">{formatDate(response.submitted_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && qrToken && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">QR Code Survei</h3>
                <p className="text-sm text-gray-500">{qrToken.branch_name}</p>
              </div>
              <button
                onClick={() => {
                  setIsQrModalOpen(false);
                  setQrToken(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* QR Code Content */}
            <div className="p-6">
              <div className="flex flex-col items-center">
                {/* QR Code */}
                <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-inner" id="qr-code-container">
                  <QRCodeSVG
                    value={`${window.location.origin}/survey/${qrToken.token}`}
                    size={200}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#4f46e5"
                  />
                </div>

                {/* Token Display */}
                <div className="mt-4 bg-indigo-50 px-6 py-3 rounded-xl">
                  <p className="text-center">
                    <span className="text-xs text-gray-500 block">Token</span>
                    <span className="font-mono font-bold text-2xl text-indigo-600 tracking-wider">{qrToken.token}</span>
                  </p>
                </div>

                {/* Link Display */}
                <div className="mt-4 w-full">
                  <p className="text-xs text-gray-500 text-center mb-2">Link Survei</p>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <input
                      type="text"
                      value={`${window.location.origin}/survey/${qrToken.token}`}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-600 outline-none font-mono"
                    />
                    <button
                      onClick={() => copySurveyLink(qrToken.token)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Salin link"
                    >
                      <ClipboardCopy className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  // Download QR Code as PNG
                  const svg = document.querySelector('#qr-code-container svg');
                  if (svg) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const img = new Image();
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx?.drawImage(img, 0, 0);
                      const a = document.createElement('a');
                      a.download = `QR-Survei-${qrToken.branch_name}-${qrToken.token}.png`;
                      a.href = canvas.toDataURL('image/png');
                      a.click();
                      toast.success('QR Code berhasil diunduh!');
                    };
                    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                Unduh QR Code
              </button>
              <button
                onClick={() => {
                  setIsQrModalOpen(false);
                  setQrToken(null);
                }}
                className="px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
              Hapus Token?
            </h3>
            <p className="text-center text-gray-500 mb-8">
              Apakah Anda yakin ingin menghapus token ini? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setTokenToDelete(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteToken}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-red-600/20"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SurveyTokenManager;
