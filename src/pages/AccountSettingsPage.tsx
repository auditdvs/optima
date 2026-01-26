                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            import { useEffect, useState } from 'react';
import AuditStats from '../components/account-settings/AuditStats';
import TotalStatsContainer from '../components/account-settings/TotalStatsContainer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// Type for audited branch row
interface AuditedBranch {
  branch_name: string;
  audit_type: string;
  audit_start_date?: string | null;
  audit_end_date?: string | null;
}

// New interface for administration issues
interface AdminIssue {
  id?: string;
  branch_name: string;
  audit_type: string;
  audit_start_date?: string;
  missing_documents: string;
  monitoring?: string; // Optional, only for regular audits
}



const AccountSettingsPage = () => {
  const { user } = useAuth();
  // State for audited branches
  const [auditedBranches, setAuditedBranches] = useState<AuditedBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  
  // New state for administration issues
  const [adminIssues, setAdminIssues] = useState<AdminIssue[]>([]);
  const [loadingAdminIssues, setLoadingAdminIssues] = useState(true);
  
  // State for total statistics
  const [totalRegular, setTotalRegular] = useState(0);
  const [totalFraud, setTotalFraud] = useState(0);
  const [totalAudits, setTotalAudits] = useState(0);
  const [sisaTarget, setSisaTarget] = useState(0);
  const [targetColor, setTargetColor] = useState('#dc2626');
  const [loadingStats, setLoadingStats] = useState(true);
  const [motivationMessage, setMotivationMessage] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userData, setUserData] = useState<any>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'performance' | 'issues'>('performance');

  useEffect(() => {

    
    
    // Unified logic to process admin issues from providing audits
    const fetchAdminIssues = (userAudits: any[]) => {
      if (!userAudits || userAudits.length === 0) {
        setLoadingAdminIssues(false);
        return;
      }
      
      setLoadingAdminIssues(true);
      
      try {
        const isRegular = (type: string) => type?.toLowerCase().includes('regular') || type?.toLowerCase().includes('reguler');
        const isFraud = (type: string) => type?.toLowerCase().includes('fraud') || type?.toLowerCase().includes('investigasi') || type?.toLowerCase().includes('khusus');
        
        // Helper function to get failed checks with aliases for regular audits
        const getFailedChecksWithAliases = (audit: any) => {
          const regularAuditAliases: Record<string, string> = {
            dapa_reg: "DAPA",
            // revised_dapa_reg tidak termasuk karena hanya dibutuhkan jika ada temuan fraud saat audit reguler
            dapa_supporting_data_reg: "Data Dukung DAPA",
            assignment_letter_reg: "Surat Tugas",
            entrance_agenda_reg: "Entrance Agenda",
            entrance_attendance_reg: "Absensi Entrance",
            audit_wp_reg: "KK Pemeriksaan",
            exit_meeting_minutes_reg: "BA Exit Meeting",
            exit_attendance_list_reg: "Absensi Exit",
            audit_result_letter_reg: "LHA",
            rta_reg: "RTA"
          };

          const missingDocs: string[] = [];
          
          // Check each required field directly
          Object.keys(regularAuditAliases).forEach(key => {
            // If value is NOT true (could be false, null, undefined) -> Missing
            if (audit[key] !== true) {
              missingDocs.push(regularAuditAliases[key]);
            }
          });

          return missingDocs.join(', ');
        };

        // Helper function for fraud audit failed checks
        const getFraudFailedChecksWithAliases = (audit: any) => {
          const fraudAuditAliases: Record<string, string> = {
            data_prep: "Data Persiapan",
            assignment_letter_fr: "Surat Tugas",
            audit_wp_fr: "KK Pemeriksaan",
            audit_report_fr: "SHA",
            detailed_findings_fr: "RTA"
          };

          const missingDocs: string[] = [];
          
          Object.keys(fraudAuditAliases).forEach(key => {
            if (audit[key] !== true) {
              missingDocs.push(fraudAuditAliases[key]);
            }
          });
          
          return missingDocs.join(', ');
        };
        
      // Process regular audits - filter by missing documents OR monitoring issue
      // Regular audit: 9 items checked (excluding dapa_reg/dapa perubahan as it is optional)
      const regularDocumentFields = [
        'dapa_supporting_data_reg', 'assignment_letter_reg',
        'entrance_agenda_reg', 'entrance_attendance_reg', 'audit_wp_reg',
        'exit_meeting_minutes_reg', 'exit_attendance_list_reg', 'audit_result_letter_reg', 'rta_reg'
      ];
      
      const regularIssues = userAudits
        .filter(audit => isRegular(audit.audit_type))
        .filter(audit => {
           // Count missing docs (not true)
           const missingCount = regularDocumentFields.filter(field => audit[field] !== true).length;
           
           // Check monitoring
           const monitoringValue = (audit.monitoring_reg || '').toLowerCase().trim();
           const isMonitoringOK = monitoringValue === 'adequate' || monitoringValue === 'memadai';
           const hasMonitoringIssue = !isMonitoringOK; // Only issue if NOT adequate/memadai
           
           return missingCount > 0 || hasMonitoringIssue;
        }) 
        .map(audit => {
          let monitoringStatus = audit.monitoring_reg || 'not yet completed';
          if (!audit.monitoring_reg || audit.monitoring_reg === null || audit.monitoring_reg === '') {
            monitoringStatus = 'not yet completed';
          }
          
          let missingDocsStr = getFailedChecksWithAliases(audit);
          if (!missingDocsStr) {
            missingDocsStr = "Semua dokumen sudah lengkap"; // Should not be reached due to filter, but safe fallback
          }
          
          return {
            id: audit.id, // Added ID
            branch_name: audit.branch_name,
            audit_type: 'regular',
            audit_start_date: audit.audit_start_date,
            missing_documents: missingDocsStr,
            monitoring: monitoringStatus
          };
        });
      
      // Process fraud audits (5 checklist items)
      const fraudAuditAliasesKeys = [
        "data_prep", "assignment_letter_fr", "audit_wp_fr", "audit_report_fr", "detailed_findings_fr"
      ];
      
      const fraudIssues = userAudits
        .filter(audit => isFraud(audit.audit_type))
        .map(audit => {
          let missingDocsStr = getFraudFailedChecksWithAliases(audit);
          if (!missingDocsStr) {
             missingDocsStr = "Semua dokumen sudah lengkap";
          }
          
          return {
            id: audit.id, // Added ID
            branch_name: audit.branch_name,
            audit_type: 'fraud',
            audit_start_date: audit.audit_start_date,
            missing_documents: missingDocsStr
          };
        });
      
      // Combine both types of issues - sort by branch name
      const combinedIssues: AdminIssue[] = [...regularIssues, ...fraudIssues]
        .sort((a, b) => a.branch_name.localeCompare(b.branch_name));
      
      setAdminIssues(combinedIssues);
    } catch (error) {
      console.error('Error processing admin issues:', error);
    } finally {
      setLoadingAdminIssues(false);
    }
  };
    
  const fetchData = async () => {
    if (!user?.id) return;
    
    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      console.error('Error fetching profile:', profileError);
      setLoadingAdminIssues(false);
      setLoadingBranches(false);
      setLoadingStats(false);
      return;
    }
    
    setUserData(profileData);
    
    if (!profileData.full_name) {
      // No full_name found, set default values
      setTotalRegular(0);
      setTotalFraud(0);
      setTotalAudits(0);
      setSisaTarget(24); // Full annual target
      setTargetColor('#dc2626'); // Red since no progress
      setMotivationMessage("Silakan update nama lengkap di profile Anda.");
      setLoadingBranches(false);
      setLoadingStats(false);
      setLoadingAdminIssues(false);
      return;
    }

    // Get audit_master records
    // Get audit_master records
    const { data: auditMaster, error: auditError } = await supabase
      .from('audit_master')
      .select('*');
      
    if (auditError) {
      console.error('Error fetching audit_master:', auditError);
      setLoadingBranches(false);
      setLoadingStats(false);
      setLoadingAdminIssues(false);
      return;
    }

    // Get assignment letters (Surat Tugas)
    const { data: letters, error: letterError } = await supabase
      .from('letter')
      .select('id, branch_name, audit_type, audit_start_date, audit_end_date, team, leader, status')
      .eq('status', 'Approved');

    if (letterError) {
      console.error('Error fetching letters:', letterError);
      // Continue even if letter fetch fails, rely on audit_master
    }

    console.log('Profile full_name:', profileData.full_name);
    console.log('Found audit_master records:', auditMaster?.length || 0);

    // Helper to check if user is in audit team or is leader with Fuzzy Matching
    const isUserInAudit = (record: any, fullName: string) => {
      if (!fullName) return false;
      
      const normalize = (str: string) => str.toLowerCase().replace(/[.,]/g, '').trim();
      const userTokens = normalize(fullName).split(/\s+/);
      const userInitials = userTokens.map(t => t[0]).join(''); 
      
      // Function to check if two name strings are likely the same person
      const isMatch = (dbName: string) => {
        if (!dbName) return false;
        const normDbName = normalize(dbName);
        
        // 1. Exact match or includes
        if (normDbName.includes(normalize(fullName)) || normalize(fullName).includes(normDbName)) return true;
        
        // 2. Initials User vs Initials DB Match (e.g. DFA vs DFA)
        const dbTokens = normDbName.split(/\s+/);
        const dbInitials = dbTokens.map(t => t[0]).join('');
        if (userInitials === dbInitials && userInitials.length >= 2) return true;
        
        // 3. User Initials match DB Name (e.g. User=DFA, DB=Dara Fusvita Adityacakra) -> handled above by dbInitials check? No.
        // If User is "Dara Fusvita A.C", Initials "DFA". DB is "Dara Fusvita Adityacakra", Initials "DFA". Matches!
        
        // 4. Token Intersection (Fuzzy)
        // Check if significant number of tokens match
        let matchCount = 0;
        userTokens.forEach(uToken => {
            // Check if this user token matches any db token (starts with)
            // e.g. User "A.C" (AC) vs DB "Adityacakra" -> "adityacakra" starts with "a" (too weak), but "ac"? No.
            // Better: Check exact matches of major words
            if (dbTokens.some(dToken => dToken === uToken || dToken.startsWith(uToken) || uToken.startsWith(dToken))) {
                matchCount++;
            }
        });
        
        // If 2 or more names match (e.g. Dara + Fusvita), valid.
        if (matchCount >= 2) return true;
        
        // Special case: "A.C" vs "Adityacakra"
        // If User has "Dara Fusvita", and DB has "Dara Fusvita", that's 2 matches.
        
        return false;
      };

      // Check Leader
      if (record.leader && isMatch(record.leader)) return true;
      
      // Check Team
      let teamMembers: string[] = [];
      try {
        if (record.team) {
          if (record.team.startsWith('[') || record.team.startsWith('{')) {
            const parsed = JSON.parse(record.team);
            teamMembers = Array.isArray(parsed) ? parsed : [record.team];
          } else {
            teamMembers = record.team.split(',').map((t: string) => t.trim());
          }
        }
      } catch {
        if (record.team) teamMembers = [record.team];
      }
      
      return teamMembers.some((member: string) => isMatch(member));
    };

      if ((!auditMaster || auditMaster.length === 0) && (!letters || letters.length === 0)) {
        setTotalRegular(0);
        setTotalFraud(0);
        setTotalAudits(0);
        setSisaTarget(24);
        setTargetColor('#dc2626');
        setMotivationMessage("Mari semangat memulai audit pertama tahun ini!");
        setLoadingBranches(false);
        setLoadingStats(false);
        setLoadingAdminIssues(false);

        return;
      }
      
      // Filter audits and letters where user is involved
      const auditMasterRecords = auditMaster || [];
      const letterRecords = letters || [];
      
      const filteredAudits = auditMasterRecords.filter(record => isUserInAudit(record, profileData.full_name));
      const filteredLetters = letterRecords.filter(record => isUserInAudit(record, profileData.full_name));
      
      // Combine records from both sources (Checklist/AuditMaster + Surat Tugas/Letters)
      // This ensures we count audits that are just assigned AND audits that are already in progress/done
      const allRecords = [...filteredAudits, ...filteredLetters];
      
      console.log('Filtered total records:', allRecords.length);
      
      // Unique by branch_name + audit_type + audit_start_date + audit_end_date
      const uniqueMap = new Map();
      allRecords.forEach(a => {
        const key = `${a.branch_name}|${a.audit_type}|${a.audit_start_date}|${a.audit_end_date}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, a);
        }
      });
      const uniqueAudits = Array.from(uniqueMap.values());
      
      // Helper functions for audit type check
      const isRegular = (type: string) => type?.toLowerCase().includes('regular') || type?.toLowerCase().includes('reguler');
      const isFraud = (type: string) => type?.toLowerCase().includes('fraud') || type?.toLowerCase().includes('investigasi') || type?.toLowerCase().includes('khusus');
      
      // Set audited branches
      setAuditedBranches(uniqueAudits);
      setLoadingBranches(false);
      
      // Calculate total statistics
      const regular = uniqueAudits.filter(a => isRegular(a.audit_type)).length;
      const fraud = uniqueAudits.filter(a => isFraud(a.audit_type)).length;
      const total = uniqueAudits.length;
      
      setTotalRegular(regular);
      setTotalFraud(fraud);
      setTotalAudits(total);
      
      // Calculate sisa target based on yearly target
      const targetPerYear = 24; // 2 per month × 12 months = 24 audits per year
      const remaining = targetPerYear - total;
      setSisaTarget(remaining);
      
      // Determine color based on total audits vs expected target for completed months
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11, so add 1
      const targetPerMonth = 2;
      // Target berdasarkan bulan yang sudah selesai (bulan berjalan belum dihitung)
      const completedMonths = currentMonth - 1; // Juli berjalan = 6 bulan selesai
      const expectedTarget = completedMonths * targetPerMonth; // 6 × 2 = 12
      
      let color = '#dc2626'; // red default
      let message = '';
      const shortfall = expectedTarget - total; // Berapa kurang dari target
      
      if (total >= expectedTarget) {
        color = total > expectedTarget ? '#2563eb' : '#16a34a'; // blue if exceeded, green if met
        message = "Target anda terpenuhi, kerja bagus! Tolong dipertahankan";
      } else if (shortfall <= 2) {
        message = "Ayo semangat, sedikit lagi KPI kamu terpenuhi!";
      } else {
        message = "Jika ada yang menghambat dalam pekerjaanmu tolong konsultasikan ya :)";
      }
      
      setTargetColor(color);
      setMotivationMessage(message || "Mari semangat mengejar target audit bulanan!");
      setLoadingStats(false);
      // Deduplicate checklist audits to avoid double records (one empty, one full)
      // PRIORITY: Choose the record that has MORE checklist items filled (true)
      const countChecklistFilled = (audit: any) => {
         let count = 0;
         const allKeys = [
            // Regular keys
            'dapa_supporting_data_reg', 'assignment_letter_reg', 'entrance_agenda_reg', 
            'entrance_attendance_reg', 'audit_wp_reg', 'exit_meeting_minutes_reg', 
            'exit_attendance_list_reg', 'audit_result_letter_reg', 'rta_reg',
            // Fraud keys
            "data_prep", "assignment_letter_fr", "audit_wp_fr", "audit_report_fr", "detailed_findings_fr"
         ];
         allKeys.forEach(k => {
            if (audit[k] === true) count++;
         });
         return count;
      };

      const dedupMap = new Map();
      filteredAudits.forEach(a => {
         // Deduplicate by Month (YYYY-MM) to catch duplicates with slightly different dates
         // Assuming audit_start_date is YYYY-MM-DD
         const monthKey = a.audit_start_date ? a.audit_start_date.substring(0, 7) : 'unknown';
         const key = `${a.branch_name}|${a.audit_type}|${monthKey}`;
         
         if (dedupMap.has(key)) {
            const existing = dedupMap.get(key);
            const existingCount = countChecklistFilled(existing);
            const newCount = countChecklistFilled(a);
            
            // If new record has more completed items, replace the existing one
            // Also if counts are equal, prefer the one with the later ID (assuming newer) or just keep existing?
            // Let's prefer the one with MORE items.
            if (newCount > existingCount) {
               dedupMap.set(key, a);
            } else if (newCount === existingCount) {
                // If equal completeness, pick the one with later end date or just later ID?
                // Let's simply keep existing unless we have reason.
                // Actually, let's compare dates just in case.
            }
         } else {
            dedupMap.set(key, a);
         }
      });
      const uniqueChecklistAudits = Array.from(dedupMap.values());

      // Fetch administration issues (Must use audit_master records for document completeness)
      await fetchAdminIssues(uniqueChecklistAudits);
    };
    
    // Fetch user role
    const fetchUserRole = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserRole(data?.role || '');
    };
    
    fetchData();
    fetchUserRole();

  }, [user?.id]);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Please log in to access account settings</p>
      </div>
    );
  }

  // Only show audit stats, running text, and audited branches for these roles
  const allowedRoles = ['superadmin', 'qa', 'dvs', 'manager', 'user'];
  const showAuditSections = allowedRoles.includes(userRole);

  return (
    <div className="px-1 py-1 w-full">
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-6 py-3 text-sm font-semibold rounded-t-lg transition-all ${
            activeTab === 'performance'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          User Performance
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`px-6 py-3 text-sm font-semibold rounded-t-lg transition-all ${
            activeTab === 'issues'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Administration Issues
        </button>

      </div>

      {/* User Performance Tab */}
      {activeTab === 'performance' && showAuditSections && (
        <>
          {/* Total Statistics - Paling Atas */}
          <TotalStatsContainer
            totalRegular={totalRegular}
            totalFraud={totalFraud}
            totalAudits={totalAudits}
            sisaTarget={sisaTarget}
            targetColor={targetColor}
            loading={loadingStats}
            adminIssuesCount={adminIssues.filter(i => i.missing_documents !== "Semua dokumen sudah lengkap").length}
          />

          {/* Statistik Audit */}
          <div className="mb-6">
            <AuditStats audits={auditedBranches} />
          </div>
        
          {/* Tabel Audited Branches - Grid Layout */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-2">List of Audited Branches</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Regular Audits - Kiri */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-md font-medium mb-3 text-blue-700">Regular Audits</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">NO</TableHead>
                      <TableHead>BRANCH NAME</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBranches ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : auditedBranches.filter(branch => branch.audit_type === 'regular').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center">No regular audits</TableCell>
                      </TableRow>
                    ) : (
                      auditedBranches
                        .filter(branch => branch.audit_type?.toLowerCase().includes('regular') || branch.audit_type?.toLowerCase().includes('reguler'))
                        .sort((a, b) => {
                          const dateA = a.audit_start_date ? new Date(a.audit_start_date).getTime() : 0;
                          const dateB = b.audit_start_date ? new Date(b.audit_start_date).getTime() : 0;
                          return dateA - dateB;
                        })
                        .map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{row.branch_name}</TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Fraud Audits - Kanan */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-md font-medium mb-3 text-red-700">Fraud Audits</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">NO</TableHead>
                      <TableHead>BRANCH NAME</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBranches ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : auditedBranches.filter(branch => 
                        branch.audit_type?.toLowerCase().includes('fraud') || 
                        branch.audit_type?.toLowerCase().includes('investigasi') ||
                        branch.audit_type?.toLowerCase().includes('khusus')
                      ).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center">No fraud audits</TableCell>
                      </TableRow>
                    ) : (
                      auditedBranches
                        .filter(branch => 
                          branch.audit_type?.toLowerCase().includes('fraud') || 
                          branch.audit_type?.toLowerCase().includes('investigasi') ||
                          branch.audit_type?.toLowerCase().includes('khusus')
                        )
                        .sort((a, b) => {
                          const dateA = a.audit_start_date ? new Date(a.audit_start_date).getTime() : 0;
                          const dateB = b.audit_start_date ? new Date(b.audit_start_date).getTime() : 0;
                          return dateA - dateB;
                        })
                        .map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{row.branch_name}</TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Administration Issues Tab */}
      {activeTab === 'issues' && showAuditSections && (
        <div>
          <h3 className="text-sm text-gray-600 mb-4">
            Jika ada data yang tidak sesuai, cek dibagian <span className="font-bold">Kertas Kerja Auditor</span>.
          </h3>
          <div className="bg-white rounded-lg shadow p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">NO</TableHead>
                  <TableHead>BRANCH NAME</TableHead>
                  <TableHead>AUDIT TYPE</TableHead>
                  <TableHead>MISSING DOCUMENTS</TableHead>
                  <TableHead>MONITORING</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAdminIssues ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading issues...</TableCell>
                  </TableRow>
                ) : adminIssues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-green-600 font-medium bg-green-50">
                      Great job! No administration issues found.
                    </TableCell>
                  </TableRow>
                ) : (
                  adminIssues.map((issue, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{issue.branch_name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          issue.audit_type === 'regular' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {issue.audit_type === 'regular' ? 'Regular' : 'Fraud'}
                        </span>
                      </TableCell>
                      <TableCell className={`text-xs font-medium max-w-md ${
                        issue.missing_documents === "Semua dokumen sudah lengkap" 
                          ? "text-emerald-600 font-bold" 
                          : "text-red-600"
                      }`}>
                        {issue.missing_documents}
                      </TableCell>
                      <TableCell>
                        {issue.monitoring && issue.monitoring !== '(No Need Monitoring)' ? (
                          <span className={`${
                            issue.monitoring === 'not yet completed' ? 'text-orange-600' : 
                            issue.monitoring === 'Tidak Memadai' ? 'text-red-600 font-bold' : 'text-green-600'
                          }`}>
                            {issue.monitoring}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">(No Need Monitoring)</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}


    </div>
  );
};

export default AccountSettingsPage;