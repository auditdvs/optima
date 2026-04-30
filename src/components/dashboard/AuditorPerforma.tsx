import { CalendarIcon, ClipboardCheck, Eye, History as HistoryIcon, Search, Star, UsersIcon, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { supabaseService } from '../../lib/supabaseService';
import { Card, CardContent } from '../ui/card';
import ManagerChangelogView from './ManagerChangelogView';
import TimelineView from './TimelineView';

// Interface for monthly breakdown - each cell has regular and fraud count
interface MonthlyCount {
  regular: number;
  fraud: number;
}

// Interface for auditor with monthly breakdown
interface AuditorMonthlyData {
  auditor_id: string;
  name: string;
  months: MonthlyCount[]; // Index 0 = Jan, 1 = Feb, ... 11 = Dec
  total_regular: number;
  total_fraud: number;
  total: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

interface SurveySummary {
  branch_name: string;
  total_responses: number;
  avg_score: number;
  latest_survey_date: string;
  feedbacks: FeedbackDetail[];
  auditor_leader: string;
  auditor_team: string;
}

interface FeedbackDetail {
  harapan: string;
  kritik_saran: string;
  submitted_at: string;
  // Section 1 scores (1-5 scale)
  a1?: number; a2?: number; a3?: number; a4?: number; a5?: number; a6?: number;
  b1?: number; b2?: number; b3?: number;
  c1?: number; c2?: number; c3?: number; c4?: number; c5?: number; c6?: number; c7?: number;
  d1?: number; d2?: number; d3?: number;
}

const AuditorPerforma = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'auditor_counts' | 'timeline' | 'survey' | 'updates'>('auditor_counts');
  
  // State variables for Auditor Counts
  const [auditorMonthlyData, setAuditorMonthlyData] = useState<AuditorMonthlyData[]>([]);
  const [auditorSearchTerm, setAuditorSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Data for Timeline
  const [letters, setLetters] = useState<any[]>([]);
  const [addendums, setAddendums] = useState<any[]>([]);

  // Data for Survey
  const [surveySummary, setSurveySummary] = useState<SurveySummary[]>([]);
  const [surveySearchTerm, setSurveySearchTerm] = useState('');
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<SurveySummary | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // AI States
  const [aiInsights, setAiInsights] = useState<string[] | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const generatePuterAIInsights = async (branchName: string, conclusion: any, feedbacks: any[]) => {
    setIsGeneratingAi(true);
    setAiInsights(null);
    try {
      const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
      if (!GROQ_API_KEY) throw new Error("Groq API Key missing");
      
      const prompt = `Anda adalah Asisten Audit Internal. Analisis hasil survei kepuasan auditee untuk cabang ${branchName}.
Data Skor (1-5):
- Atribut Profesional: ${conclusion.avgA?.toFixed(2) || 'N/A'}
- Ruang Lingkup: ${conclusion.avgB?.toFixed(2) || 'N/A'}
- Kinerja Pelaksanaan: ${conclusion.avgC?.toFixed(2) || 'N/A'}
- Keseluruhan: ${conclusion.avgD?.toFixed(2) || 'N/A'}

Kritik & Saran (Maksimal 10):
${feedbacks.slice(0, 10).map((f: any, idx: number) => `Responden ${idx+1}: Harapan: "${f.harapan}", Kritik: "${f.kritik_saran}"`).join('\n')}

Berdasarkan data di atas, buatlah sebuah KESIMPULAN BERBENTUK ESSAY/NARASI yang mengalir secara alami dalam 1 hingga 2 paragraf saja. 
DILARANG KERAS menggunakan format poin-poin (bullet points, angka, garis strip, dsb) atau membuat daftar berbaris. Teks harus berupa paragraf panjang layaknya cerita atau laporan naratif.
Gunakan tag HTML <strong> untuk menegaskan kata kunci. Jangan beri judul, pengantar, atau penutup. Hanya paragraf essay saja.`;

      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6
        }),
      });

      if (!resp.ok) throw new Error('API error');
      const result = await resp.json();
      const text = result?.choices?.[0]?.message?.content;
      if (!text) throw new Error('Invalid response');
      
      const paragraphs = text.split(/\n+/)
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.startsWith('```'));
      
      if (paragraphs.length > 0) {
        setAiInsights(paragraphs);
      } else {
        throw new Error('No paragraphs found');
      }
    } catch (err) {
      console.error('AI Error:', err);
      // Fallback: Gabungkan insight lokal menjadi satu paragraf narasi/essay panjang
      if (conclusion && conclusion.dimensionInsights) {
        setAiInsights([conclusion.dimensionInsights.join(' ')]);
      } else {
        setAiInsights(["Belum ada data yang cukup untuk ditarik kesimpulan."]);
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    if (showFeedbackModal && selectedBranch) {
      const conclusion = generateSurveyConclusion(selectedBranch.feedbacks);
      if (conclusion) {
        generatePuterAIInsights(selectedBranch.branch_name, conclusion, selectedBranch.feedbacks);
      } else {
        setAiInsights(null);
      }
    } else {
      setAiInsights(null);
    }
  }, [showFeedbackModal, selectedBranch]);


  const fetchAuditorMonthlyData = async () => {
    try {
      // Fetch all auditors from auditors table
      const { data: auditors, error: auditorsError } = await supabase
        .from('auditors')
        .select('id, name, auditor_id');
      
      if (auditorsError) throw auditorsError;

      // IDENTIFY BANNED USERS TO HIDE FROM UI
      let bannedNames = new Set<string>();
      try {
        const { data: { users }, error: userError } = await supabaseService.auth.admin.listUsers();
        if (!userError && users) {
          const bannedUsers = users.filter((u: any) => u.banned_until && new Date(u.banned_until) > new Date());
          if (bannedUsers.length > 0) {
            const bannedIds = bannedUsers.map((u: any) => u.id);
            // Get their profiles to map ids -> full_names
            const { data: profiles } = await supabase.from('profiles').select('full_name').in('id', bannedIds);
            if (profiles) {
              profiles.forEach(p => {
                if (p.full_name) bannedNames.add(p.full_name.toLowerCase().trim());
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching banned users for exclusion:', err);
      }
      
      // Fetch from letter table for selected year (NO status filter for now - testing)
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;
      
      const { data: audits, error } = await supabase
        .from('letter')
        .select('team, leader, audit_type, branch_name, audit_start_date, audit_end_date, status')
        .eq('status', 'approved')
        .gte('audit_end_date', yearStart)
        .lte('audit_end_date', yearEnd);
      
      if (error) throw error;

      // Also fetch approved addendums for the selected year
      const { data: addendumData, error: addendumError } = await supabase
        .from('addendum')
        .select('team, leader, new_team, new_leader, audit_type, branch_name, end_date, status, addendum_type')
        .eq('status', 'approved')
        .gte('end_date', yearStart)
        .lte('end_date', yearEnd);
      
      if (addendumError) {
        console.error('Error fetching addendums for auditor counts:', addendumError);
      }
      
      // Initialize monthly data for all auditors
      const auditorData: Record<string, AuditorMonthlyData> = {};
      
      auditors?.forEach(auditor => {
        if (auditor.name?.trim()) {
          const fullName = auditor.name.trim();

          // SKIP / HIDE auditor if they are banned
          if (bannedNames.has(fullName.toLowerCase())) return;

          auditorData[fullName] = {
            auditor_id: auditor.auditor_id || fullName.toLowerCase().replace(/\s+/g, '_'),
            name: fullName,
            months: Array(12).fill(null).map(() => ({ regular: 0, fraud: 0 })),
            total_regular: 0,
            total_fraud: 0,
            total: 0
          };
        }
      });
      
      // Track unique audits per auditor per month
      const uniqueAudits: Record<string, Record<number, Set<string>>> = {};
      
      // Helper to clean name
      const cleanName = (name: string) => {
          const titlesToIgnore = [
            'S.E', 'S.E.', 'SE', 
            'S.Kom', 'S.Kom.', 'S.Ko', 
            'S.H', 'S.H.', 'SH',
            'S.Ak', 'S.Ak.', 
            'M.M', 'M.M.', 'MM',
            'Ak', 'Ak.', 'CA', 'CPA',
            'S.T', 'S.T.',
            'S.Si', 'S.Si.',
            'A.Md', 'A.Md.'
        ];
        const trimmed = name.trim();
        if (titlesToIgnore.includes(trimmed) || trimmed.length <= 2) return null;
        return trimmed;
      };

      // Fuzzy matching logic (extracted for reuse with addendums)
      const normalize = (str: string) => str.toLowerCase().replace(/[.,]/g, '').trim();
      
      const isMatch = (profileName: string, dbName: string) => {
        if (!dbName || !profileName) return false;
        const normDbName = normalize(dbName);
        const normProfileName = normalize(profileName);
        
        // 0. Exact match
        if (normDbName === normProfileName) return true;
        
        // Filter out short tokens (titles like SE, MM, etc) - only keep meaningful words
        const filterShortTokens = (tokens: string[]) => tokens.filter(t => t.length > 3);
        
        const dbTokens = normDbName.split(/\s+/);
        const profileTokens = normProfileName.split(/\s+/);
        const dbTokensFiltered = filterShortTokens(dbTokens);
        const profileTokensFiltered = filterShortTokens(profileTokens);
        
        // 1. Contains match (min 2 meaningful words)
        if (profileTokensFiltered.length >= 2 && dbTokensFiltered.length >= 2) {
          const profileJoined = profileTokensFiltered.join(' ');
          const dbJoined = dbTokensFiltered.join(' ');
          if (dbJoined.includes(profileJoined) || profileJoined.includes(dbJoined)) return true;
        }
        
        // 2. Initials match (only for meaningful tokens)
        if (dbTokensFiltered.length >= 3 && profileTokensFiltered.length >= 3) {
          const dbInitials = dbTokensFiltered.map(t => t[0]).join('');
          const profileInitials = profileTokensFiltered.map(t => t[0]).join('');
          if (profileInitials === dbInitials) return true;
        }
        
        // 3. Token intersection - only for meaningful tokens
        let exactMatchCount = 0;
        profileTokensFiltered.forEach(pToken => {
          if (dbTokensFiltered.some(dToken => dToken === pToken)) {
            exactMatchCount++;
          }
        });
        if (exactMatchCount >= 2) return true;
        
        return false;
      };

      // Helper to parse team string into array
      const parseTeam = (teamStr: string | null | undefined): string[] => {
        if (!teamStr) return [];
        try {
          if (teamStr.startsWith('[') || teamStr.startsWith('{')) {
            const parsed = JSON.parse(teamStr);
            if (Array.isArray(parsed)) return parsed;
            return [teamStr];
          }
          return teamStr.split(',').map((t: string) => t.trim());
        } catch {
          return [teamStr];
        }
      };

      // Helper to count a team member for an auditor
      const countAuditorAssignment = (
        rawName: string, 
        monthIndex: number, 
        uniqueKey: string, 
        auditType: string
      ) => {
        const singleAuditorName = cleanName(rawName);
        if (!singleAuditorName) return;

        const matchedAuditorName = Object.keys(auditorData).find(profileName => 
          isMatch(profileName, singleAuditorName)
        );
        
        if (matchedAuditorName) {
          if (!uniqueAudits[matchedAuditorName]) {
            uniqueAudits[matchedAuditorName] = {};
          }
          if (!uniqueAudits[matchedAuditorName][monthIndex]) {
            uniqueAudits[matchedAuditorName][monthIndex] = new Set();
          }
          
          if (!uniqueAudits[matchedAuditorName][monthIndex].has(uniqueKey)) {
            uniqueAudits[matchedAuditorName][monthIndex].add(uniqueKey);
            
            const type = auditType?.toLowerCase().trim() || '';
            const isRegularType = type.includes('reguler') || type.includes('regular') || type.includes('general');
            const isFraudType = type.includes('fraud') || type.includes('khusus') || type.includes('special') || type.includes('investigasi');
            
            if (isRegularType) {
              auditorData[matchedAuditorName].months[monthIndex].regular += 1;
              auditorData[matchedAuditorName].total_regular += 1;
            } else if (isFraudType) {
              auditorData[matchedAuditorName].months[monthIndex].fraud += 1;
              auditorData[matchedAuditorName].total_fraud += 1;
            }
            
            auditorData[matchedAuditorName].total = 
              auditorData[matchedAuditorName].total_regular + 
              auditorData[matchedAuditorName].total_fraud;
          }
        }
      };

      // Process letter audits data
      audits?.forEach(record => {
        let teamMembers = parseTeam(record.team);
        if (record.leader) teamMembers.push(record.leader);
        teamMembers = [...new Set(teamMembers)];

        const auditEndDate = record.audit_end_date;
        if (!auditEndDate) return;
        
        const monthIndex = new Date(auditEndDate).getMonth();
        const uniqueKey = `letter|${record.branch_name}|${record.audit_type}`;

        teamMembers.forEach((rawName: string) => {
          countAuditorAssignment(rawName, monthIndex, uniqueKey, record.audit_type);
        });
      });

      // Process addendum data
      addendumData?.forEach(record => {
        const endDate = record.end_date;
        if (!endDate) return;
        
        const monthIndex = new Date(endDate).getMonth();
        const uniqueKey = `addendum|${record.branch_name}|${record.audit_type}|${record.addendum_type}`;

        // Determine which team to use based on addendum type
        const hasTeamChange = record.addendum_type && 
          (record.addendum_type.includes('Perubahan Tim') || record.addendum_type.toLowerCase().includes('perubahan tim'));

        let teamMembers: string[] = [];
        
        if (hasTeamChange) {
          // For team changes, count the NEW team members
          teamMembers = parseTeam(record.new_team);
          if (record.new_leader) teamMembers.push(record.new_leader);
        } else {
          // For other addendum types (Perpanjangan Waktu, etc), count original team
          teamMembers = parseTeam(record.team);
          if (record.leader) teamMembers.push(record.leader);
        }
        
        teamMembers = [...new Set(teamMembers)];

        teamMembers.forEach((rawName: string) => {
          countAuditorAssignment(rawName, monthIndex, uniqueKey, record.audit_type);
        });
      });
      
      // Convert to array and sort
      const dataArray = Object.values(auditorData).sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.name.localeCompare(b.name);
      });
      
      setAuditorMonthlyData(dataArray);
    } catch (error) {
      console.error('Error fetching auditor monthly data:', error);
    }
  };

  const fetchLetters = async () => {
    try {
      const { data, error } = await supabase
        .from('letter')
        .select('*')
        .eq('status', 'approved')
        .order('tanggal_input', { ascending: false });
      if (error) throw error;
      setLetters(data || []);
    } catch (error) {
      console.error('Error fetching letters:', error);
    }
  };

  const fetchAddendums = async () => {
    try {
      const { data, error } = await supabase
        .from('addendum')
        .select('*')
        .eq('status', 'approved')
        .order('tanggal_input', { ascending: false });
      if (error) throw error;
      setAddendums(data || []);
    } catch (error) {
      console.error('Error fetching addendums:', error);
    }
  };

  const fetchSurveySummary = async () => {
    try {
      setLoadingSurvey(true);
      
      // Fetch survey tokens with responses
      const { data: tokens, error: tokensError } = await supabase
        .from('survey_tokens')
        .select('id, branch_name, created_at, creator_name');
      
      if (tokensError) throw tokensError;
      
      // Fetch all survey responses
      const { data: responses, error: responsesError } = await supabase
        .from('survey_responses')
        .select('*');
      
      if (responsesError) throw responsesError;

      // Fetch audit_master data to get leader/team by branch_name
      const { data: auditMasters, error: auditError } = await supabase
        .from('audit_master')
        .select('branch_name, leader, team')
        .order('audit_start_date', { ascending: false });
      
      if (auditError) throw auditError;

      // Build a map: branch_name -> { leader, team } (use latest audit)
      const auditMap: Record<string, { leader: string; team: string }> = {};
      auditMasters?.forEach(am => {
        if (!auditMap[am.branch_name]) {
          auditMap[am.branch_name] = {
            leader: am.leader || '-',
            team: am.team || '-'
          };
        }
      });
      
      // Calculate summary per branch
      const branchSummary: Record<string, SurveySummary> = {};
      
      tokens?.forEach(token => {
        const tokenResponses = responses?.filter(r => r.token_id === token.id) || [];
        
        if (tokenResponses.length > 0) {
          // Calculate average score from all questions (Section 1: a1-a6, b1-b3, c1-c7, d1-d4)
          const questions = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'b3', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'd1', 'd2', 'd3'];
          
          tokenResponses.forEach(response => {
            let totalScore = 0;
            let questionCount = 0;
            
            questions.forEach(q => {
              if (response[q] !== null && response[q] !== undefined) {
                totalScore += Number(response[q]);
                questionCount++;
              }
            });
            
            const avgScore = questionCount > 0 ? totalScore / questionCount : 0;
            
            if (!branchSummary[token.branch_name]) {
              branchSummary[token.branch_name] = {
                branch_name: token.branch_name,
                total_responses: 0,
                avg_score: 0,
                latest_survey_date: token.created_at,
                feedbacks: [],
                auditor_leader: auditMap[token.branch_name]?.leader || '-',
                auditor_team: auditMap[token.branch_name]?.team || '-'
              };
            }
            
            branchSummary[token.branch_name].total_responses++;
            branchSummary[token.branch_name].avg_score += avgScore;
            
            // Add feedback (always include scoring data even if no text)
            if (response.harapan || response.kritik_saran) {
              branchSummary[token.branch_name].feedbacks.push({
                harapan: response.harapan || '-',
                kritik_saran: response.kritik_saran || '-',
                submitted_at: response.created_at,
                // Section 1 scores
                a1: response.a1, a2: response.a2, a3: response.a3,
                a4: response.a4, a5: response.a5, a6: response.a6,
                b1: response.b1, b2: response.b2, b3: response.b3,
                c1: response.c1, c2: response.c2, c3: response.c3,
                c4: response.c4, c5: response.c5, c6: response.c6, c7: response.c7,
                d1: response.d1, d2: response.d2, d3: response.d3,
              });
            }
            
            // Update latest date
            if (new Date(response.created_at) > new Date(branchSummary[token.branch_name].latest_survey_date)) {
              branchSummary[token.branch_name].latest_survey_date = response.created_at;
            }
          });
        }
      });
      
      // Calculate final averages and sort
      const summaryArray = Object.values(branchSummary)
        .map(branch => ({
          ...branch,
          avg_score: branch.total_responses > 0 ? branch.avg_score / branch.total_responses : 0
        }))
        .sort((a, b) => b.avg_score - a.avg_score);
      
      setSurveySummary(summaryArray);
    } catch (error) {
      console.error('Error fetching survey summary:', error);
    } finally {
      setLoadingSurvey(false);
    }
  };

  useEffect(() => {
    fetchLetters();
    fetchAddendums();
  }, []);

  useEffect(() => {
    fetchAuditorMonthlyData();
  }, [selectedYear]);

  useEffect(() => {
    if (activeTab === 'survey') {
      fetchSurveySummary();
    }
  }, [activeTab]);

  // ─────────────────────────────────────────────────
  // Generate survey conclusion from scoring data
  // ─────────────────────────────────────────────────
  const generateSurveyConclusion = (feedbacks: FeedbackDetail[]) => {
    if (!feedbacks || feedbacks.length === 0) return null;

    // Aggregate scores per section across all respondents
    const sectionA = ['a1','a2','a3','a4','a5','a6'];
    const sectionB = ['b1','b2','b3'];
    const sectionC = ['c1','c2','c3','c4','c5','c6','c7'];
    const sectionD = ['d1','d2','d3'];

    const avg = (keys: string[]) => {
      let total = 0, count = 0;
      feedbacks.forEach(fb => {
        keys.forEach(k => {
          const val = (fb as any)[k];
          if (val !== undefined && val !== null) { total += Number(val); count++; }
        });
      });
      return count > 0 ? total / count : null;
    };

    const avgA = avg(sectionA);
    const avgB = avg(sectionB);
    const avgC = avg(sectionC);
    const avgD = avg(sectionD);
    const allAvg = avg([...sectionA, ...sectionB, ...sectionC, ...sectionD]);

    if (allAvg === null) return null;

    const label = (score: number | null) => {
      if (score === null) return { text: 'N/A', color: 'text-gray-400' };
      if (score >= 4.5) return { text: 'Sangat Baik', color: 'text-emerald-600' };
      if (score >= 3.5) return { text: 'Baik', color: 'text-green-600' };
      if (score >= 2.5) return { text: 'Cukup', color: 'text-yellow-600' };
      if (score >= 1.5) return { text: 'Kurang', color: 'text-orange-600' };
      return { text: 'Sangat Kurang', color: 'text-red-600' };
    };

    const overallLabel = label(allAvg);

    // Generate textual conclusion per dimension
    const dimensionInsights: string[] = [];

    // Section A: Atribut Profesional
    if (avgA !== null) {
      if (avgA >= 4.0)
        dimensionInsights.push('Auditor dinilai memiliki <strong>profesionalisme yang tinggi</strong> — objektif, komunikatif, dan dapat dipercaya dalam menangani informasi.');
      else if (avgA >= 3.0)
        dimensionInsights.push('Profesionalisme auditor dinilai <strong>cukup baik</strong>, namun masih ada ruang untuk meningkatkan komunikasi dan keterbukaan kepada auditee.');
      else
        dimensionInsights.push('Terdapat <strong>kelemahan signifikan</strong> pada atribut profesional auditor — perlu peningkatan dalam sikap, komunikasi, dan objektivitas.');
    }

    // Section B: Ruang Lingkup
    if (avgB !== null) {
      if (avgB >= 4.0)
        dimensionInsights.push('Tujuan dan ruang lingkup audit <strong>dikomunikasikan dengan jelas</strong> dan konsisten dengan target kerja cabang.');
      else if (avgB >= 3.0)
        dimensionInsights.push('Ruang lingkup audit <strong>cukup dipahami</strong> auditee, meski komunikasi awal masih bisa lebih ditingkatkan.');
      else
        dimensionInsights.push('Ruang lingkup audit <strong>belum dikomunikasikan dengan baik</strong> — auditee merasa tujuan audit kurang jelas.');
    }

    // Section C: Kinerja Pelaksanaan
    if (avgC !== null) {
      if (avgC >= 4.0)
        dimensionInsights.push('Pelaksanaan audit berjalan <strong>efektif dan profesional</strong> — temuan didiskusikan, didukung bukti kuat, dan laporan ditulis dengan baik.');
      else if (avgC >= 3.0)
        dimensionInsights.push('Kinerja pelaksanaan audit <strong>dinilai memadai</strong>, namun kualitas laporan dan kedalaman temuan masih dapat ditingkatkan.');
      else
        dimensionInsights.push('Kinerja pelaksanaan audit <strong>perlu perbaikan</strong> — temuan kurang didiskusikan, bukti kurang akurat, atau laporan sulit dipahami.');
    }

    // Section D: Keseluruhan
    if (avgD !== null) {
      if (avgD >= 4.0)
        dimensionInsights.push('Secara keseluruhan, auditee <strong>sangat puas</strong> dan audit dinilai memberikan nilai tambah nyata bagi operasional cabang.');
      else if (avgD >= 3.0)
        dimensionInsights.push('Secara keseluruhan, auditee <strong>cukup puas</strong> dengan pelaksanaan audit, meski beberapa aspek masih perlu pembenahan.');
      else
        dimensionInsights.push('Kepuasan keseluruhan auditee <strong>rendah</strong> — audit belum dirasakan memberikan manfaat yang signifikan.');
    }

    return { avgA, avgB, avgC, avgD, allAvg, overallLabel, dimensionInsights, label };
  };

  // Render month cell with regular/fraud breakdown
  const renderMonthCell = (monthData: MonthlyCount) => {
    const total = monthData.regular + monthData.fraud;
    if (total === 0) {
      return <span className="text-gray-300">-</span>;
    }
    
    return (
      <div className="flex flex-col items-center text-xs">
        <div className="flex gap-1">
          {monthData.regular > 0 && (
            <span className="text-blue-600 font-medium">{monthData.regular}</span>
          )}
          {monthData.regular > 0 && monthData.fraud > 0 && (
            <span className="text-gray-400">/</span>
          )}
          {monthData.fraud > 0 && (
            <span className="text-red-600 font-medium">{monthData.fraud}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header with Tabs */}
      <div className="mb-6 w-full overflow-x-auto scrollbar-hide pb-1">
        <div className="inline-flex bg-gray-100/80 p-1.5 rounded-xl gap-1 border border-gray-200/60 shadow-sm shrink-0">
          <button
            onClick={() => setActiveTab('auditor_counts')}
            className={`flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'auditor_counts'
                ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50 ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
            }`}
          >
            <UsersIcon className={`w-4 h-4 mr-2 ${activeTab === 'auditor_counts' ? 'text-indigo-600' : 'text-gray-400'}`} />
            Auditor Performa
          </button>
          
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50 ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
            }`}
          >
            <CalendarIcon className={`w-4 h-4 mr-2 ${activeTab === 'timeline' ? 'text-indigo-600' : 'text-gray-400'}`} />
            Timeline
          </button>
          
          <button
            onClick={() => setActiveTab('survey')}
            className={`flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'survey'
                ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50 ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
            }`}
          >
            <ClipboardCheck className={`w-4 h-4 mr-2 ${activeTab === 'survey' ? 'text-indigo-600' : 'text-gray-400'}`} />
            Survei Kepuasan
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            className={`flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'updates'
                ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50 ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
            }`}
          >
            <HistoryIcon className={`w-4 h-4 mr-2 ${activeTab === 'updates' ? 'text-indigo-600' : 'text-gray-400'}`} />
            System Updates
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'updates' ? (
        <ManagerChangelogView />
      ) : activeTab === 'auditor_counts' ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Audit Counts Per Auditor - Tahun {selectedYear}</h2>
              <div className="flex items-center gap-4">
                {/* Year Selector */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={auditorSearchTerm}
                    onChange={(e) => setAuditorSearchTerm(e.target.value)}
                    placeholder="Search auditor..."
                    className="pl-9 pr-2 py-1.5 text-xs border rounded-md w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-blue-600 font-medium">Biru</span>
                <span className="text-gray-500">= Regular</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-600 font-medium">Merah</span>
                <span className="text-gray-500">= Khusus/Fraud</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 w-10 sticky left-0 z-10">
                      No
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 min-w-[150px] sticky left-10 z-10">
                      Auditor
                    </th>
                    {MONTHS.map((month, idx) => (
                      <th key={idx} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 min-w-[50px]">
                        {month}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-indigo-50 min-w-[60px]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditorMonthlyData.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-3 py-4 text-center text-sm text-gray-500">
                        No data available.
                      </td>
                    </tr>
                  ) : (
                    auditorMonthlyData
                      .filter(auditor => 
                        auditor.name.toLowerCase().includes(auditorSearchTerm.toLowerCase())
                      )
                      .map((auditor, index) => (
                        <tr key={auditor.auditor_id} className="hover:bg-gray-50">
                          <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500 text-center bg-white sticky left-0">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium bg-white sticky left-10">
                            {auditor.name}
                          </td>
                          {auditor.months.map((monthData, monthIdx) => (
                            <td key={monthIdx} className="px-2 py-2 whitespace-nowrap text-center">
                              {renderMonthCell(monthData)}
                            </td>
                          ))}
                          <td className="px-3 py-2 whitespace-nowrap text-center bg-indigo-50">
                            <div className="flex flex-col items-center text-xs">
                              <span className="font-bold text-indigo-700">{auditor.total}</span>
                              <div className="flex gap-1 text-[10px]">
                                <span className="text-blue-500">{auditor.total_regular}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-red-500">{auditor.total_fraud}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : activeTab === 'timeline' ? (
        <TimelineView letters={letters} addendums={addendums} />
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Rekapan Survei Kepuasan Auditee</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Cari cabang..."
                  value={surveySearchTerm}
                  onChange={(e) => setSurveySearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {loadingSurvey ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : surveySummary.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Belum ada data survei kepuasan</p>
              </div>
            ) : (
              <>
                {/* Overall Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {/* Overall Average Score */}
                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium opacity-90">Rata-rata Keseluruhan</span>
                      <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {(surveySummary.reduce((sum, branch) => sum + branch.avg_score, 0) / surveySummary.length).toFixed(2)}
                      </span>
                      <span className="text-sm opacity-75">/ 5.00</span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= Math.round(surveySummary.reduce((sum, branch) => sum + branch.avg_score, 0) / surveySummary.length)
                              ? 'text-yellow-300 fill-yellow-300'
                              : 'text-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Total Branches */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">Total Cabang</span>
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {surveySummary.length}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cabang tersurvei</p>
                  </div>

                  {/* Total Respondents */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">Total Responden</span>
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <UsersIcon className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {surveySummary.reduce((sum, branch) => sum + branch.total_responses, 0)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Total keseluruhan</p>
                  </div>

                  {/* Best Branch */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">Rating Tertinggi</span>
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 truncate">
                      {surveySummary[0]?.branch_name || '-'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Skor: <span className="font-semibold text-yellow-600">{surveySummary[0]?.avg_score.toFixed(2)}</span>
                    </p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cabang
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Responden
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rata-rata Skor
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Auditor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Survei Terakhir
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {surveySummary
                      .filter(branch => 
                        branch.branch_name.toLowerCase().includes(surveySearchTerm.toLowerCase())
                      )
                      .map((branch, index) => {
                        const scorePercentage = (branch.avg_score / 5) * 100;
                        const ratingColor = 
                          scorePercentage >= 80 ? 'text-green-600' :
                          scorePercentage >= 60 ? 'text-yellow-600' :
                          'text-red-600';
                        
                        return (
                          <tr key={branch.branch_name} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {branch.branch_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {branch.total_responses} responden
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-lg font-bold ${ratingColor}`}>
                                  {branch.avg_score.toFixed(2)}
                                </span>
                                <span className="text-xs text-gray-500">dari 5.00</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= Math.round(branch.avg_score)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              <div className="flex flex-col gap-0.5">
                                {branch.auditor_leader !== '-' && (
                                  <span className="font-semibold text-blue-700">{branch.auditor_leader} <span className="text-[10px] text-blue-500">(L)</span></span>
                                )}
                                {branch.auditor_team !== '-' && (
                                  <span className="text-xs text-gray-600">{branch.auditor_team}</span>
                                )}
                                {branch.auditor_leader === '-' && branch.auditor_team === '-' && (
                                  <span className="text-gray-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(branch.latest_survey_date).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => {
                                  setSelectedBranch(branch);
                                  setShowFeedbackModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                                title="Lihat Harapan & Kritik/Saran"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Feedback ({branch.feedbacks.length})
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-indigo-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Harapan & Kritik/Saran
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedBranch.branch_name} • {selectedBranch.feedbacks.length} responden
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setSelectedBranch(null);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedBranch.feedbacks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Belum ada feedback untuk cabang ini</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedBranch.feedbacks.map((feedback, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Responden #{index + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(feedback.submitted_at).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Harapan:
                          </label>
                          <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                            {feedback.harapan}
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Kritik/Saran:
                          </label>
                          <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                            {feedback.kritik_saran}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* ── AI-style Scoring Conclusion ── */}
                  {(() => {
                    const conclusion = generateSurveyConclusion(selectedBranch.feedbacks);
                    if (!conclusion) return null;
                    const { avgA, avgB, avgC, avgD, allAvg, overallLabel, dimensionInsights, label } = conclusion;
                    return (
                      <div className="mt-6 border-t-2 border-indigo-100 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Kesimpulan Analisis AI (Llama 3.3 70B)</h4>
                          <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${
                            allAvg >= 4.5 ? 'bg-emerald-100 text-emerald-700' :
                            allAvg >= 3.5 ? 'bg-green-100 text-green-700' :
                            allAvg >= 2.5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {overallLabel.text} · {allAvg.toFixed(2)}/5.00
                          </span>
                        </div>

                        {/* Score per Section */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {([
                            { key: 'A', title: 'Atribut Profesional', avg: avgA, sub: 'a1–a6' },
                            { key: 'B', title: 'Ruang Lingkup', avg: avgB, sub: 'b1–b3' },
                            { key: 'C', title: 'Kinerja Pelaksanaan', avg: avgC, sub: 'c1–c7' },
                            { key: 'D', title: 'Keseluruhan', avg: avgD, sub: 'd1–d3' },
                          ] as const).map(sec => {
                            const l = label(sec.avg);
                            const pct = sec.avg !== null ? (sec.avg / 5) * 100 : 0;
                            return (
                              <div key={sec.key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bagian {sec.key}</span>
                                  <span className={`text-[10px] font-bold ${l.color}`}>{l.text}</span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{sec.title}</p>
                                <div className="flex items-baseline gap-1">
                                  <span className={`text-xl font-bold ${l.color}`}>
                                    {sec.avg !== null ? sec.avg.toFixed(2) : '-'}
                                  </span>
                                  <span className="text-[10px] text-gray-400">/5.00</span>
                                </div>
                                <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      pct >= 80 ? 'bg-emerald-500' :
                                      pct >= 60 ? 'bg-green-500' :
                                      pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{sec.sub}</p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Textual Insights */}
                        <div className="text-sm text-gray-800 bg-purple-50/40 rounded-xl p-5 border border-purple-100 shadow-sm leading-relaxed text-justify space-y-4">
                          {isGeneratingAi ? (
                            <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
                              <span className="text-sm animate-pulse text-purple-600 font-medium">Menghasilkan narasi cerdas dengan Llama 3.3 70B...</span>
                            </div>
                          ) : (
                            (aiInsights || dimensionInsights).map((insight, i) => (
                              <p key={i} dangerouslySetInnerHTML={{ __html: insight }} />
                            ))
                          )}
                        </div>

                        <p className="mt-3 text-[10px] text-gray-400 italic">
                          * Kesimpulan dianalisis secara otomatis oleh AI (Llama 3.3 70B via Groq) berdasarkan rata-rata skor dan umpan balik responden.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setSelectedBranch(null);
                }}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AuditorPerforma;
