import { useEffect, useState } from 'react';
import AccountSettings from '../components/AccountSettings';
import AuditStats from '../components/AuditStats';
import TotalStatsContainer from '../components/TotalStatsContainer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// Type for audited branch row
interface AuditedBranch {
  branch_name: string;
  audit_type: string;
}

// New interface for administration issues
interface AdminIssue {
  branch_name: string;
  audit_type: string;
  missing_documents: string;
  monitoring?: string; // Optional, only for regular audits
}

// Interface for audit schedule data
interface AuditSchedule {
  no?: number;
  branch_name: string;
  region?: string;
  isAudited?: boolean;
  audit_period_start?: string | null;
  audit_period_end?: string | null;
  execution_order?: number;
  priority?: number;
  status?: string;
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
  
  // State for audit schedule data
  const [auditScheduleData, setAuditScheduleData] = useState<AuditSchedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('A');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      // 1. Get user data and auditor alias
      const { data: userData, error: userError } = await supabase
        .from('account')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (userError || !userData) {
        setLoadingAdminIssues(false);
        setLoadingBranches(false);
        setLoadingStats(false);
        return;
      }
      
      setUserData(userData);
      
      const { data: aliasData, error: aliasError } = await supabase
        .from('auditor_aliases')
        .select('alias')
        .eq('profile_id', user.id)
        .maybeSingle();
      if (aliasError || !aliasData?.alias) {
        // No alias found, set default values
        setTotalRegular(0);
        setTotalFraud(0);
        setTotalAudits(0);
        setSisaTarget(24); // Full annual target
        setTargetColor('#dc2626'); // Red since no progress
        setMotivationMessage("Silakan hubungi admin untuk setup alias auditor Anda.");
        setLoadingBranches(false);
        setLoadingStats(false);
        setLoadingAdminIssues(false);
        return;
      }
      
      // 2. Get all work_paper_id from work_paper_auditors
      const { data: auditorRows, error: auditorError } = await supabase
        .from('work_paper_auditors')
        .select('work_paper_id')
        .eq('auditor_name', aliasData.alias);
      if (auditorError) {
        setLoadingBranches(false);
        setLoadingStats(false);
        return;
      }
      const workPaperIds = auditorRows?.map(row => row.work_paper_id) || [];
      if (workPaperIds.length === 0) {
        // No audit data found, set default values
        setTotalRegular(0);
        setTotalFraud(0);
        setTotalAudits(0);
        setSisaTarget(24); // Full annual target
        setTargetColor('#dc2626'); // Red since no progress
        setMotivationMessage("Mari semangat memulai audit pertama tahun ini!");
        setLoadingBranches(false);
        setLoadingStats(false);
        return;
      }
      
      // 3. Get work_papers
      const { data: papers, error: papersError } = await supabase
        .from('work_papers')
        .select('id,branch_name,audit_type,audit_start_date,audit_end_date')
        .in('id', workPaperIds);
      if (papersError) {
        // Error fetching papers, set default values
        setTotalRegular(0);
        setTotalFraud(0);
        setTotalAudits(0);
        setSisaTarget(24); // Full annual target
        setTargetColor('#dc2626'); // Red since no progress
        setMotivationMessage("Terjadi kesalahan saat mengambil data audit. Silakan refresh halaman.");
        setLoadingBranches(false);
        setLoadingStats(false);
        return;
      }
      
      // 4. Unique by branch_name + audit_type + audit_start_date + audit_end_date
      const uniqueMap = new Map();
      papers.forEach(wp => {
        const key = `${wp.branch_name}|${wp.audit_type}|${wp.audit_start_date}|${wp.audit_end_date}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, wp);
        }
      });
      const uniquePapers = Array.from(uniqueMap.values());
      
      // Set audited branches
      setAuditedBranches(uniquePapers);
      setLoadingBranches(false);
      
      // Calculate total statistics
      const regular = uniquePapers.filter(wp => wp.audit_type === 'regular').length;
      const fraud = uniquePapers.filter(wp => wp.audit_type === 'fraud').length;
      const total = uniquePapers.length;
      
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
      await fetchAdminIssues(userData);
      
      // Fetch audit schedule data
      await fetchAuditScheduleData();
    };
    
    // Function to fetch audit schedule data
    const fetchAuditScheduleData = async () => {
      try {
        setLoadingSchedule(true);
        
        // Get audit_schedule data (contains no, branch_name, region)
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('audit_schedule')
          .select('no, branch_name, region') as { 
            data: Array<{ no: number; branch_name: string; region: string }> | null; 
            error: any;
          };

        if (scheduleError) {
          console.error("Error fetching audit_schedule:", scheduleError);
          setLoadingSchedule(false);
          return;
        }

        // Get audit_regular data with created_at to determine execution order
        let auditedBranches: Array<{
          branch_name: string;
          audit_period_start: string | null;
          audit_period_end: string | null;
          created_at: string;
        }> = [];
        
        try {
          // Explicitly specify fields to avoid any unexpected fields like 'status'
          const { data, error } = await supabase
            .from('audit_regular')
            .select('branch_name, audit_period_start, audit_period_end, created_at');
            
          if (error) {
            console.error("Error fetching audit_regular:", error);
          } else {
            auditedBranches = data || [];
          }
        } catch (error) {
          console.error("Exception fetching audit_regular:", error);
        }

        // Get branch data to get region information
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('name, region');

        if (branchError) throw branchError;

        // Create branch to region map
        const branchRegionMap: Record<string, string> = {};
        branchData?.forEach(branch => {
          branchRegionMap[branch.name] = branch.region;
        });

        // Group audits by region
        const auditsByRegion: Record<string, Array<{
          branch_name: string;
          audit_period_start: string | null;
          audit_period_end: string | null;
          created_at: string;
          region: string;
        }>> = {};
        
        auditedBranches?.forEach(item => {
          const region = branchRegionMap[item.branch_name] || 'Unknown';
          if (!auditsByRegion[region]) {
            auditsByRegion[region] = [];
          }
          auditsByRegion[region].push({
            ...item,
            region
          });
        });

        // For each region, sort by created_at and assign execution_order
        const auditedBranchMap: Record<string, {
          isAudited: boolean;
          audit_period_start: string | null;
          audit_period_end: string | null;
          execution_order: number;
          region: string;
          status: string;
        }> = {};
        Object.keys(auditsByRegion).forEach(region => {
          // Sort by oldest created_at (ascending)
          const sortedAudits = auditsByRegion[region].sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Assign execution_order for each audit in the region
          sortedAudits.forEach((audit: any, index: number) => {
            auditedBranchMap[audit.branch_name] = {
              isAudited: true,
              audit_period_start: audit.audit_period_start,
              audit_period_end: audit.audit_period_end,
              execution_order: index + 1,
              region: audit.region,
              status: 'Completed'
            };
          });
        });

        // Combine all data with schedule
        const scheduleWithStatus = scheduleData?.map((item: any) => {          
          return {
            ...item,
            isAudited: !!auditedBranchMap[item.branch_name],
            audit_period_start: auditedBranchMap[item.branch_name]?.audit_period_start || null,
            audit_period_end: auditedBranchMap[item.branch_name]?.audit_period_end || null,
            execution_order: auditedBranchMap[item.branch_name]?.execution_order || null,
            priority: item.no, // Use raw no value without conversion
            status: auditedBranchMap[item.branch_name]?.status || 'Scheduled'
          };
        }) || [];
        
        setAuditScheduleData(scheduleWithStatus);
      } catch (error) {
        console.error('Error fetching audit schedule data:', error);
      } finally {
        setLoadingSchedule(false);
      }
    };
    
    const fetchAdminIssues = async (userData: any) => {
      if (!userData) return;
      
      setLoadingAdminIssues(true);
      
      try {
        // Try multiple search patterns for regular audits
        // 1. Search by full_name_2 (exact match)
        const { data: regularData1 } = await supabase
          .from('audit_regular')
          .select('*')
          .eq('pic', userData.full_name_2);
        
        // 2. Search by full_name_2 (case insensitive like)
        const { data: regularData2 } = await supabase
          .from('audit_regular')
          .select('*')
          .ilike('pic', userData.full_name_2);
        
        // 3. Search by auditor_id in pic field
        const { data: regularData3 } = await supabase
          .from('audit_regular')
          .select('*')
          .ilike('pic', `%${userData.auditor_id}%`);
        
        // 4. Search by first name + last name parts
        const nameParts = userData.full_name_2?.split(' ') || [];
        const firstName = nameParts[0];
        let regularData4 = [];
        if (firstName) {
          const { data } = await supabase
            .from('audit_regular')
            .select('*')
            .ilike('pic', `%${firstName}%`);
          regularData4 = data || [];
        }
        
        // Get issues for fraud audits based on auditor_id from audit_fraud table
        const { data: fraudData, error: fraudError } = await supabase
          .from('audit_fraud')
          .select('*')
          .ilike('pic', `%${userData.auditor_id}%`);
        
        if (fraudError) {
          console.error('Error fetching fraud audit issues:', fraudError);
        }
        
        // Helper function to get failed checks with aliases for regular audits
        const getFailedChecksWithAliases = (audit: any) => {
          const regularAuditAliases = {
            dapa: "DAPA",
            revised_dapa: "DAPA Perubahan",
            dapa_supporting_data: "Data Dukung DAPA",
            assignment_letter: "Surat Tugas",
            entrance_agenda: "Entrance Agenda",
            entrance_attendance: "Absensi Entrance",
            audit_working_papers: "KK Pemeriksaan",
            exit_meeting_minutes: "BA Exit Meeting",
            exit_attendance_list: "Absensi Exit",
            audit_result_letter: "LHA",
            rta: "RTA"
          };

          return Object.entries(audit)
            .filter(([key, value]) =>
              typeof value === 'boolean' &&
              !value &&
              regularAuditAliases[key as keyof typeof regularAuditAliases] &&
              key !== 'revised_dapa'
            )
            .map(([key]) => regularAuditAliases[key as keyof typeof regularAuditAliases])
            .join(', ');
        };

        // Helper function for fraud audit failed checks
        const getFraudFailedChecksWithAliases = (audit: any) => {
          const fraudAuditAliases = {
            data_preparation: "Data Persiapan",
            assignment_letter: "Surat Tugas",
            audit_working_papers: "KK Pemeriksaan",
            audit_report: "SHA",
            detailed_findings: "RTA"
          };

          return Object.entries(audit)
            .filter(([key, value]) =>
              typeof value === 'boolean' &&
              !value &&
              fraudAuditAliases[key as keyof typeof fraudAuditAliases]
            )
            .map(([key]) => fraudAuditAliases[key as keyof typeof fraudAuditAliases])
            .join(', ');
        };
        
        // Combine regular audit data from all queries (remove duplicates)
        const allRegularData = [
          ...(regularData1 || []), 
          ...(regularData2 || []), 
          ...(regularData3 || []), 
          ...(regularData4 || [])
        ];
        const uniqueRegularData = allRegularData.filter((audit, index, self) =>
          index === self.findIndex(a => a.id === audit.id)
        );
        
        // Process regular audits - filter by false count >= 2 OR monitoring issue
        const regularIssues = uniqueRegularData
          ?.filter(audit => {
            // Count false values for each audit
            const falseCount = Object.values(audit).filter(v => v === false).length;
            // Check if monitoring is not 'adequate' (including null, empty, or any other value)
            const hasMonitoringIssue = !audit.monitoring || audit.monitoring === null || audit.monitoring === '' || audit.monitoring.toLowerCase() !== 'adequate';
            
            // Include if there are 2+ false values OR if monitoring is not adequate
            return falseCount >= 2 || hasMonitoringIssue;
          })
          .map(audit => {
            // Get monitoring status
            let monitoringStatus = audit.monitoring || 'not yet completed';
            if (!audit.monitoring || audit.monitoring === null || audit.monitoring === '') {
              monitoringStatus = 'not yet completed';
            }
            
            return {
              branch_name: audit.branch_name,
              audit_type: 'regular',
              missing_documents: getFailedChecksWithAliases(audit),
              monitoring: monitoringStatus
            };
          }) || [];
        
        // Process fraud audits - filter by false count >= 2 only (no monitoring for fraud)
        const fraudIssues = fraudData
          ?.filter(audit => {
            // Count false values for each audit
            const falseCount = Object.values(audit).filter(v => v === false).length;
            
            // Include only if there are 2+ false values (no monitoring check for fraud)
            return falseCount >= 1;
          })
          .map(audit => {
            return {
              branch_name: audit.branch_name,
              audit_type: 'fraud',
              missing_documents: getFraudFailedChecksWithAliases(audit)
            };
          }) || [];
        
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
  }, [user]);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Please log in to access account settings</p>
      </div>
    );
  }

  // Only show audit stats, running text, and audited branches for these roles
  const allowedRoles = ['superadmin', 'QA', 'DVS', 'manager', 'user'];
  const showAuditSections = allowedRoles.includes(userRole);

  return (
    <div className="px-1 py-1 w-full">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Profile and Total Recap Data Audits</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Kiri: Profile */}
        <div className="col-span-1 flex">
          <AccountSettings
            isOpen={true}
            onClose={() => {}}
            onAccountUpdate={() => {}}
            isStandalone={true}
          />
        </div>
        {/* Kanan: Statistik */}
        {showAuditSections && (
          <div className="col-span-2 flex flex-col gap-6">
            <AuditStats />
          </div>
        )}
      </div>

      {/* Moved Total Statistics */}
      {showAuditSections && (
        <div className="mt-6 mb-6">
          <TotalStatsContainer
            totalRegular={totalRegular}
            totalFraud={totalFraud}
            totalAudits={totalAudits}
            sisaTarget={sisaTarget}
            targetColor={targetColor}
            loading={loadingStats}
          />
        </div>
      )}

      {/* NEW: Administration Issues Table */}
      {showAuditSections && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-2">Administration Issues</h2>
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
                      <TableCell className="whitespace-pre-wrap break-words max-w-xs">{issue.missing_documents}</TableCell>
                      <TableCell>{issue.audit_type === 'regular' ? issue.monitoring : '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      {/* Tabel Audited Branches - Grid Layout */}
      {showAuditSections && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-2">List of Audited Branches</h2>
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
                      .filter(branch => branch.audit_type === 'regular')
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
                  ) : auditedBranches.filter(branch => branch.audit_type === 'fraud').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">No fraud audits</TableCell>
                    </TableRow>
                  ) : (
                    auditedBranches
                      .filter(branch => branch.audit_type === 'fraud')
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
      )}

      {/* Audit Schedule Section - New */}
      {showAuditSections && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Audit Schedule</h2>
          
          {/* Region Tabs */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 border-b border-gray-200">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'].map((region) => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    selectedRegion === region
                      ? 'text-blue-600 border-blue-600 bg-blue-50'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">PRIORITY</TableHead>
                  <TableHead className="w-20 whitespace-nowrap">EXE ORDER</TableHead>
                  <TableHead>BRANCH NAME</TableHead>
                  <TableHead>AUDIT PERIOD</TableHead>
                  <TableHead>STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSchedule ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : auditScheduleData.filter(schedule => 
                    schedule.region === selectedRegion
                  ).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No audit schedule found for Region {selectedRegion}</TableCell>
                  </TableRow>
                ) : (
                  auditScheduleData
                    .filter(schedule => schedule.region === selectedRegion)
                    .map((schedule, idx) => {
                      // Determine row color based on execution_order and priority comparison
                      let rowColorClass = '';
                      
                      if (schedule.execution_order !== null && schedule.execution_order !== undefined) {
                        // Convert both values to numbers for proper comparison
                        const executionOrder = Number(schedule.execution_order);
                        const priority = Number(schedule.no);
                        
                        // If execution_order exists, compare with priority (no)
                        if (executionOrder === priority) {
                          rowColorClass = 'bg-green-100'; // Green background if they match
                        } else {
                          rowColorClass = 'bg-red-100'; // Red background if they don't match
                        }
                        
                        // Debug logging to see actual values
                        console.log(`Branch: ${schedule.branch_name}, Execution Order: ${executionOrder}, Priority: ${priority}, Match: ${executionOrder === priority}`);
                      }
                      
                      return (
                        <TableRow key={idx} className={rowColorClass}>
                          <TableCell>
                            {/* Display raw priority value */}
                            {schedule.no || '-'}
                          </TableCell>
                          <TableCell>
                            {schedule.execution_order || '-'}
                          </TableCell>
                          <TableCell>{schedule.branch_name}</TableCell>
                          <TableCell>
                            {schedule.audit_period_start && schedule.audit_period_end 
                              ? `${new Date(schedule.audit_period_start).toLocaleString('en-US', { month: 'long', year: 'numeric' })} - ${new Date(schedule.audit_period_end).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
                              : 'To Be Discussed'}
                          </TableCell>
                          <TableCell>{schedule.status || (schedule.isAudited ? 'Completed' : 'Scheduled')}</TableCell>
                        </TableRow>
                      );
                    })
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