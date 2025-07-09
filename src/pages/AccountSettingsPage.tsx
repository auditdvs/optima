import { useEffect, useState } from 'react';
import AccountSettings from '../components/AccountSettings';
import AuditStats from '../components/AuditStats';
import SimpleMarquee from '../components/SimpleMarquee';
import TotalStatsContainer from '../components/TotalStatsContainer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// Type for audited branch row
interface AuditedBranch {
  branch_name: string;
  audit_type: string;
}

const AccountSettingsPage = () => {
  const { user } = useAuth();
  // State for audited branches
  const [auditedBranches, setAuditedBranches] = useState<AuditedBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  
  // State for total statistics
  const [totalRegular, setTotalRegular] = useState(0);
  const [totalFraud, setTotalFraud] = useState(0);
  const [totalAudits, setTotalAudits] = useState(0);
  const [sisaTarget, setSisaTarget] = useState(0);
  const [targetColor, setTargetColor] = useState('#dc2626');
  const [loadingStats, setLoadingStats] = useState(true);
  const [motivationMessage, setMotivationMessage] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      // 1. Get auditor alias
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
      {/* Running Text Motivasi dengan Simple Marquee */}
      {showAuditSections && !loadingStats && motivationMessage && (
        <SimpleMarquee 
          text={motivationMessage}
          speed={50}
          className="mb-4"
        />
      )}
      {/* Total Statistics dengan 4 kolom */}
      {showAuditSections && (
        <TotalStatsContainer
          totalRegular={totalRegular}
          totalFraud={totalFraud}
          totalAudits={totalAudits}
          sisaTarget={sisaTarget}
          targetColor={targetColor}
          loading={loadingStats}
        />
      )}
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
      {/* Tabel Audited Branches */}
      {showAuditSections && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-2">List of Audited Branches</h2>
          <div className="bg-white rounded-lg shadow p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">NO</TableHead>
                  <TableHead>BRANCH NAME</TableHead>
                  <TableHead>TYPE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingBranches ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : auditedBranches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">No data</TableCell>
                  </TableRow>
                ) : (
                  auditedBranches.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{row.branch_name}</TableCell>
                      <TableCell className="capitalize">{row.audit_type}</TableCell>
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