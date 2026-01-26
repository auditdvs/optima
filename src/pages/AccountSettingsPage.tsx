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
  branch_name: string;
  audit_type: string;
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

    
    
    const fetchAdminIssues = async (profileData: any) => {
      if (!profileData?.full_name) return;
      
      setLoadingAdminIssues(true);
      
      try {
        // Get audit_master data where user is involved
        const { data: auditMaster, error: auditError } = await supabase
          .from('audit_master')
          .select('*');
        
        if (auditError) {
          console.error('Error fetching audit_master for admin issues:', auditError);
          setLoadingAdminIssues(false);
          return;
        }

        // Helper to check if user is in audit team or is leader
        const isUserInAudit = (record: any, fullName: string) => {
          if (record.leader?.toLowerCase().includes(fullName.toLowerCase())) return true;
          
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
          
          return teamMembers.some((member: string) => 
            member.toLowerCase().includes(fullName.toLowerCase()) || 
            fullName.toLowerCase().includes(member.toLowerCase())
          );
        };

        // Filter by user
        const userAudits = auditMaster?.filter(record => isUserInAudit(record, profileData.full_name)) || [];
        
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

          return Object.entries(audit)
            .filter(([key, value]) =>
              typeof value === 'boolean' &&
              !value &&
              regularAuditAliases[key]
            )
            .map(([key]) => regularAuditAliases[key])
            .join(', ');
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

          return Object.entries(audit)
            .filter(([key, value]) =>
              typeof value === 'boolean' &&
              !value &&
              fraudAuditAliases[key]
            )
            .map(([key]) => fraudAuditAliases[key])
            .join(', ');
        };
        
        // Process regular audits - filter by missing documents OR monitoring issue
        // Note: revised_dapa_reg is excluded from counting as it's optional (only needed if fraud found during regular audit)
        const regularDocumentFields = [
          'dapa_reg', 'dapa_supporting_data_reg', 'assignment_letter_reg',
          'entrance_agenda_reg', 'entrance_attendance_reg', 'audit_wp_reg',
          'exit_meeting_minutes_reg', 'exit_attendance_list_reg', 'audit_result_letter_reg', 'rta_reg'
        ];
        
        const regularIssues = userAudits
          .filter(audit => isRegular(audit.audit_type))
          .filter(audit => {
            // Count false values only for relevant document fields (excluding revised_dapa_reg)
            const falseCount = regularDocumentFields.filter(field => audit[field] === false).length;
            
            // Check monitoring - both 'adequate' and 'memadai' are valid
            const monitoringValue = (audit.monitoring_reg || '').toLowerCase().trim();
            const isMonitoringOK = monitoringValue === 'adequate' || monitoringValue === 'memadai';
            const hasMonitoringIssue = !isMonitoringOK;
            
            // Show in issues if: has 2+ missing documents OR has monitoring issue
            return falseCount >= 2 || hasMonitoringIssue;
          })
          .map(audit => {
            let monitoringStatus = audit.monitoring_reg || 'not yet completed';
            if (!audit.monitoring_reg || audit.monitoring_reg === null || audit.monitoring_reg === '') {
              monitoringStatus = 'not yet completed';
            }
            
            return {
              branch_name: audit.branch_name,
              audit_type: 'regular',
              missing_documents: getFailedChecksWithAliases(audit),
              monitoring: monitoringStatus
            };
          });
        
        // Process fraud audits
        const fraudIssues = userAudits
          .filter(audit => isFraud(audit.audit_type))
          .filter(audit => {
            const falseCount = Object.values(audit).filter(v => v === false).length;
            return falseCount >= 1;
          })
          .map(audit => {
            return {
              branch_name: audit.branch_name,
              audit_type: 'fraud',
              missing_documents: getFraudFailedChecksWithAliases(audit)
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
      const { data: auditMaster, error: auditError } = await supabase
        .from('audit_master')
        .select('id, branch_name, audit_type, audit_start_date, audit_end_date, rating, team, leader');
        
      if (auditError) {
        console.error('Error fetching audit_master:', auditError);
        setLoadingBranches(false);
        setLoadingStats(false);
        setLoadingAdminIssues(false);
        return;
      }

      console.log('Profile full_name:', profileData.full_name);
      console.log('Found audit_master records:', auditMaster?.length || 0);

      // Helper to check if user is in audit team or is leader
      const isUserInAudit = (record: any, fullName: string) => {
        if (record.leader?.toLowerCase().includes(fullName.toLowerCase())) return true;
        
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
        
        return teamMembers.some((member: string) => 
          member.toLowerCase().includes(fullName.toLowerCase()) || 
          fullName.toLowerCase().includes(member.toLowerCase())
        );
      };

      if (!auditMaster || auditMaster.length === 0) {
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
      
      // Filter audits where user is involved
      const filteredAudits = auditMaster.filter(record => isUserInAudit(record, profileData.full_name));
      
      console.log('Filtered audits:', filteredAudits.length);
      
      // Unique by branch_name + audit_type + audit_start_date + audit_end_date
      const uniqueMap = new Map();
      filteredAudits.forEach(a => {
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
      
      // Fetch administration issues
      await fetchAdminIssues(profileData);
    };
    
    // Fetch user role
    const fetchUserRole = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('=== USER ROLE DEBUG ===');
      console.log('User ID:', user.id);
      console.log('Role data from DB:', data);
      console.log('Role value:', data?.role);
      console.log('========================');
      
      setUserRole(data?.role || '');
    };
    
    fetchData();
    fetchUserRole();

  }, [user]);

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
  
  console.log('=== AUDIT SECTIONS DEBUG ===');
  console.log('Current userRole:', userRole);
  console.log('Allowed roles:', allowedRoles);
  console.log('Show audit sections:', showAuditSections);
  console.log('=============================');

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
            adminIssuesCount={adminIssues.length}
          />

          {/* Statistik Audit */}
          <div className="mb-6">
            <AuditStats />
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
            For any data mismatch, contact <span className="font-bold">QA.</span>
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
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : adminIssues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No administration issues found</TableCell>
                  </TableRow>
                ) : (
                  adminIssues.map((issue, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{issue.branch_name}</TableCell>
                      <TableCell className="capitalize">{issue.audit_type}</TableCell>
                      <TableCell className="whitespace-pre-wrap break-words max-w-xs">
                        {issue.missing_documents ? (
                          issue.missing_documents
                        ) : (
                          <span className="text-gray-400 italic">All documents are complete</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {issue.audit_type === 'regular' ? (
                          issue.monitoring
                        ) : (
                          <span className="text-red-500 italic">(No Need Monitoring)</span>
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