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
    X,
    Loader2,
    Sparkles
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
import { supabaseService } from '../lib/supabaseService';

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

interface RecapData {
  auditorName: string;
  totalRating: number;
  responseCount: number;
  feedbacks: { harapan: string; kritik_saran: string }[];
  aiConclusion?: string;
  isGenerating?: boolean;
  hasAttemptedAI?: boolean;
}

function SurveyTokenManager() {
  const { user, userRole } = useAuth();
  const [tokens, setTokens] = useState<SurveyToken[]>([]);
  const [auditBranches, setAuditBranches] = useState<AuditBranch[]>([]);
  const [availableBranches, setAvailableBranches] = useState<AuditBranch[]>([]);
  const [usedBranches, setUsedBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'inactive'>('all');
  
  // Recap tab state
  const [activeTab, setActiveTab] = useState<'tokens' | 'recap'>('tokens');
  const [recapData, setRecapData] = useState<RecapData[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  
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
          .select('*')
          .in('token_id', tokenIds);
        
        if (countError) throw countError;
        
        // Calculate counts
        const countMap: Record<string, number> = {};
        responseCounts?.forEach(r => {
          countMap[r.token_id] = (countMap[r.token_id] || 0) + 1;
        });

        // Generate Recap Data for Superadmin
        if (isAdmin) {
          // Ambil data dari audit_master untuk memetakan cabang ke auditor aslinya (Leader & Team)
          const { data: audits } = await supabaseService
            .from('audit_master')
            .select('branch_name, leader, team, created_at')
            .or('audit_type.ilike.%reguler%,audit_type.ilike.%regular%')
            .order('created_at', { ascending: false });

          const branchAuditorsMap: Record<string, string[]> = {};
          if (audits) {
            audits.forEach((l: any) => {
              // Pakai data yang paling terbaru jika ada duplikat cabang
              if (!branchAuditorsMap[l.branch_name]) {
                const auditors = new Set<string>();
                if (l.leader) auditors.add(l.leader.trim());
                if (l.team) {
                  const parts = l.team.split(',').map((p: string) => p.trim());
                  const teamMembers: string[] = [];
                  for (let i = 0; i < parts.length; i++) {
                    const current = parts[i];
                    // Deteksi gelar akademik (biasanya mengandung titik atau singkatan umum 2-3 huruf)
                    const isTitle = current.includes('.') || ['SE','SH','ST','SP','MM','MSI','SPD','MPD'].includes(current.toUpperCase().replace(/\./g, ''));
                    
                    if (i > 0 && isTitle) {
                      teamMembers[teamMembers.length - 1] += ', ' + current;
                    } else {
                      if (current) teamMembers.push(current);
                    }
                  }
                  teamMembers.forEach(m => auditors.add(m));
                }
                branchAuditorsMap[l.branch_name] = Array.from(auditors);
              }
            });
          }

          const recapMap = new Map<string, RecapData>();
          tokensData.forEach(t => {
            const actualAuditors = branchAuditorsMap[t.branch_name] || [];
            const auditorsToProcess = actualAuditors.length > 0 ? actualAuditors : [`(Belum Ada di Audit Master) - ${t.branch_name}`];

            auditorsToProcess.forEach(auditor => {
              if (!recapMap.has(auditor)) {
                recapMap.set(auditor, { auditorName: auditor, totalRating: 0, feedbacks: [], responseCount: 0 });
              }
              const auditorData = recapMap.get(auditor)!;
              const tResponses = responseCounts?.filter((r: any) => r.token_id === t.id) || [];
              
              tResponses.forEach((r: any) => {
                auditorData.responseCount++;
                
                let totalScore = 0;
                let questionCount = 0;
                const questions = [
                  'a1','a2','a3','a4','a5','a6',
                  'b1','b2','b3',
                  'c1','c2','c3','c4','c5','c6','c7',
                  'd1','d2','d3'
                ];
                
                questions.forEach(q => {
                  if (r[q] !== null && r[q] !== undefined) {
                    totalScore += Number(r[q]);
                    questionCount++;
                  }
                });
                
                const avgScore = questionCount > 0 ? totalScore / questionCount : 0;
                auditorData.totalRating += avgScore;
                
                if (r.harapan || r.kritik_saran) {
                  auditorData.feedbacks.push({
                    harapan: r.harapan || '',
                    kritik_saran: r.kritik_saran || ''
                  });
                }
              });
            });
          });

          const cachedConclusionsStr = localStorage.getItem('ai_recap_conclusions');
          const cachedConclusions = cachedConclusionsStr ? JSON.parse(cachedConclusionsStr) : {};

          const finalRecap = Array.from(recapMap.values()).map(data => {
            const calculatedTotal = data.responseCount > 0 ? (data.totalRating / data.responseCount) : 0;
            
            let cachedAi = undefined;
            const cacheEntry = cachedConclusions[data.auditorName];
            // Gunakan cache hanya jika jumlah respondennya masih persis sama (belum ada survei baru masuk)
            if (cacheEntry && cacheEntry.responseCount === data.responseCount) {
              cachedAi = cacheEntry.conclusion;
            }
            
            return {
              ...data,
              totalRating: calculatedTotal,
              aiConclusion: cachedAi
            };
          }).filter(d => d.responseCount > 0).sort((a, b) => {
            if (b.responseCount !== a.responseCount) return b.responseCount - a.responseCount;
            return b.totalRating - a.totalRating;
          });
          
          setRecapData(finalRecap);
        }
        
        // Update tokens with actual counts (creator_name already in token from DB)
        const tokensWithCounts = tokensData.map(token => ({
          ...token,
          response_count: countMap[token.id] || 0,
          creator_name: token.creator_name || 'Unknown User'
        }));
        
        setTokens(tokensWithCounts);
        setTokens(tokensWithCounts);
      } else {
        setTokens([]);
      }

      // Selalu ambil seluruh cabang yang sudah memiliki token (lintas auditor) menggunakan supabaseService
      // untuk mem-filter dropdown agar cabang yang sudah dikerjakan auditor lain tidak muncul lagi
      try {
        const { data: allUsedData } = await supabaseService
          .from('survey_tokens')
          .select('branch_name');
        if (allUsedData) {
          setUsedBranches(allUsedData.map((t: any) => t.branch_name));
        }
      } catch (err) {
        console.error('Failed to fetch global used branches', err);
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
    const existingBranchNames = [...new Set([...tokens.map(t => t.branch_name), ...usedBranches])];
    const available = auditBranches.filter(
      branch => !existingBranchNames.includes(branch.branch_name)
    );
    setAvailableBranches(available);
  }, [auditBranches, tokens, usedBranches]);

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

      // Pengecekan ekstra: Pastikan cabang ini belum dibuat tokennya oleh auditor lain di waktu yang sama
      const { data: existingToken } = await supabaseService
        .from('survey_tokens')
        .select('id')
        .eq('branch_name', branch.branch_name)
        .maybeSingle();
      
      if (existingToken) {
        toast.error('Gagal: Token untuk cabang ini baru saja dibuat oleh auditor lain!');
        setIsSubmitting(false);
        fetchTokens();
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
      const isSuperAdmin = userRole?.toLowerCase() === 'superadmin';
      
      const client = isSuperAdmin ? supabaseService : supabase;

      // Hapus semua response yang terhubung terlebih dahulu untuk menghindari Foreign Key Constraint error
      await client
        .from('survey_responses')
        .delete()
        .eq('token_id', tokenToDelete);

      // Kemudian baru hapus tokennya
      const { data, error } = await client
        .from('survey_tokens')
        .delete()
        .eq('id', tokenToDelete)
        .select();

      if (error) throw error;
      
      // Pastikan data benar-benar terhapus (bukan gagal diam-diam karena RLS jika pakai client biasa)
      if (!isSuperAdmin && data && data.length === 0) {
        throw new Error('Anda tidak memiliki akses untuk menghapus token ini');
      }

      toast.success('Token berhasil dihapus');
      fetchTokens();
    } catch (error: any) {
      console.error('Error deleting token:', error);
      toast.error(error.message || 'Gagal menghapus token');
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

  // Helper to get sort priority: Active=0, Inactive=1, Closed(full)=2
  const getStatusPriority = (token: SurveyToken) => {
    if (token.response_count >= 5) return 2; // Closed
    if (token.is_active) return 0; // Active
    return 1; // Inactive
  };

  // Filter and sort tokens
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
  }).sort((a, b) => {
    // 1. Sort by status priority: Active → Inactive → Closed
    const priorityDiff = getStatusPriority(a) - getStatusPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    // 2. Within same status, sort by response_count ascending (fewest first)
    return a.response_count - b.response_count;
  });

  // View token details
  const handleViewDetails = (token: SurveyToken) => {
    setSelectedToken(token);
    setIsDetailModalOpen(true);
    fetchTokenResponses(token.id);
  };

  // Generate AI Recap for an Auditor
  const generateAIRecap = async (auditorName: string) => {
    const dataIndex = recapData.findIndex(d => d.auditorName === auditorName);
    if (dataIndex === -1) return;
    
    const data = recapData[dataIndex];
    
    setRecapData(prev => {
      const next = [...prev];
      next[dataIndex].isGenerating = true;
      next[dataIndex].hasAttemptedAI = true; // Mark as attempted to prevent infinite auto-retry
      return next;
    });

    try {
      const prompt = `Anda adalah Asisten AI untuk mengevaluasi kinerja Auditor berdasarkan hasil survei kepuasan auditee.
Auditor: ${auditorName}
Total Rating Keseluruhan (1-5 Bintang): ${data.totalRating.toFixed(2)}

Kritik & Saran dari Auditee (Sampel Acak):
${data.feedbacks.slice(0, 15).map((f, i) => `${i+1}. Harapan: "${f.harapan}", Saran: "${f.kritik_saran}"`).join('\n')}

Berikan SATU PARAGRAF KESIMPULAN BERBENTUK NARASI/ESSAY yang analitis mengenai kinerja auditor ini.
DILARANG menggunakan poin-poin/bullet points. Gunakan tag HTML <strong> untuk menegaskan kata kunci.`;

      let aiText = '';
      try {
        const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) throw new Error("No OpenRouter Key");
        
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.origin,
          },
          body: JSON.stringify({
            model: 'z-ai/glm-4.5-air:free',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.6
          }),
        });
        if (!resp.ok) throw new Error('OpenRouter API error');
        const result = await resp.json();
        if (result.error) throw new Error(result.error.message);
        aiText = result?.choices?.[0]?.message?.content;
        if (!aiText) throw new Error('Empty AI response');
      } catch (err) {
        console.warn('GLM 4.5 Air failed, falling back to Groq Llama 3.3 70B', err);
        const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
        if (!GROQ_API_KEY) throw new Error("No Groq Key");

        const resp2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.6
          }),
        });
        if (!resp2.ok) throw new Error('Groq API error');
        const result2 = await resp2.json();
        aiText = result2?.choices?.[0]?.message?.content;
        if (!aiText) throw new Error('Empty Groq response');
      }

      // Format markdown ** menjadi <strong> agar rapi dirender React
      if (aiText) {
        aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      }

      // Save to localStorage cache
      const cachedConclusionsStr = localStorage.getItem('ai_recap_conclusions');
      const cachedConclusions = cachedConclusionsStr ? JSON.parse(cachedConclusionsStr) : {};
      
      cachedConclusions[auditorName] = {
        conclusion: aiText,
        responseCount: data.responseCount,
        totalRating: data.totalRating
      };
      
      localStorage.setItem('ai_recap_conclusions', JSON.stringify(cachedConclusions));

      setRecapData(prev => {
        const next = [...prev];
        next[dataIndex].aiConclusion = aiText;
        return next;
      });
      toast.success(`Kesimpulan AI untuk ${auditorName} berhasil dibuat!`);
    } catch (err: any) {
      toast.error('Gagal memuat Kesimpulan AI');
      console.error(err);
    } finally {
      setRecapData(prev => {
        const next = [...prev];
        next[dataIndex].isGenerating = false;
        return next;
      });
    }
  };

  // Generate All AI Conclusions sequentially
  const generateAllAIRecaps = async () => {
    setIsGeneratingAll(true);
    try {
      // Find all auditors that don't have a conclusion yet
      const toGenerate = recapData.filter(d => !d.aiConclusion);
      for (const data of toGenerate) {
        await generateAIRecap(data.auditorName);
      }
    } finally {
      setIsGeneratingAll(false);
    }
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

        {/* Tabs for Superadmin */}
        {userRole?.toLowerCase() === 'superadmin' && (
          <div className="flex gap-4 border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('tokens')}
              className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'tokens' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Manajemen Token
            </button>
            <button
              onClick={() => setActiveTab('recap')}
              className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'recap' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Recap Auditor
            </button>
          </div>
        )}

        {activeTab === 'tokens' ? (
          <>
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
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Rekapitulasi Kinerja Auditor</h2>
                <p className="text-sm text-gray-500 mt-1">Berdasarkan hasil rata-rata survei auditee dan analisis AI (GLM 4.5 Air / Llama 3.3 70B)</p>
              </div>
              <button
                onClick={generateAllAIRecaps}
                disabled={isGeneratingAll || recapData.every(d => d.aiConclusion)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isGeneratingAll ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sedang Memproses AI...
                  </>
                ) : recapData.every(d => d.aiConclusion) ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Selesai
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Kesimpulan AI
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">No.</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[280px] w-1/4">Auditor</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Total Rating</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recapData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        Belum ada data survei untuk direkap
                      </td>
                    </tr>
                  ) : (
                    recapData.map((data, idx) => (
                      <tr key={data.auditorName} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{data.auditorName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{data.responseCount} Responden</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200/60 rounded-xl font-bold">
                            <span className="text-yellow-500 text-lg leading-none">★</span>
                            <span>{data.totalRating.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {data.aiConclusion ? (
                            <div className="text-sm text-gray-700 bg-purple-50/60 rounded-xl p-4 border border-purple-100 leading-relaxed text-justify">
                              <p dangerouslySetInnerHTML={{ __html: data.aiConclusion }} />
                            </div>
                          ) : data.isGenerating ? (
                            <div className="flex items-center gap-2 text-purple-600 text-sm font-medium py-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Menganalisis...
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 italic py-2">
                              Belum ada kesimpulan AI
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
