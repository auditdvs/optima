import { useEffect, useState } from 'react';
import AccountSettings from '../components/AccountSettings';
import AuditStats from '../components/AuditStats';
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
  const [accountUpdated, setAccountUpdated] = useState(false);
  // State for audited branches
  const [auditedBranches, setAuditedBranches] = useState<AuditedBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const handleAccountUpdate = () => {
    setAccountUpdated(true);
    setTimeout(() => setAccountUpdated(false), 3000);
  };

  useEffect(() => {
    const fetchAuditedBranches = async () => {
      if (!user?.id) return;
      // 1. Get auditor alias
      const { data: aliasData, error: aliasError } = await supabase
        .from('auditor_aliases')
        .select('alias')
        .eq('profile_id', user.id)
        .maybeSingle();
      if (aliasError || !aliasData?.alias) {
        setLoadingBranches(false);
        return;
      }
      // 2. Get all work_paper_id from work_paper_auditors
      const { data: auditorRows, error: auditorError } = await supabase
        .from('work_paper_auditors')
        .select('work_paper_id')
        .eq('auditor_name', aliasData.alias);
      if (auditorError) {
        setLoadingBranches(false);
        return;
      }
      const workPaperIds = auditorRows?.map(row => row.work_paper_id) || [];
      if (workPaperIds.length === 0) {
        setLoadingBranches(false);
        return;
      }
      // 3. Get work_papers
      const { data: papers, error: papersError } = await supabase
        .from('work_papers')
        .select('id,branch_name,audit_type,audit_start_date,audit_end_date')
        .in('id', workPaperIds);
      if (papersError) {
        setLoadingBranches(false);
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
      setAuditedBranches(uniquePapers);
      setLoadingBranches(false);
    };
    fetchAuditedBranches();
  }, [user]);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Please log in to access account settings</p>
      </div>
    );
  }

  return (
    <div className="px-1 py-1 w-full">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Profile and Total Recap Data Audits</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Kiri: Profile */}
        <div className="col-span-1 flex">
          <AccountSettings
            isOpen={true}
            onClose={() => {}}
            onAccountUpdate={handleAccountUpdate}
            isStandalone={true}
          />
        </div>
        {/* Kanan: Statistik */}
        <div className="col-span-2 flex flex-col gap-6">
          <AuditStats />
        </div>
      </div>
      {/* Tabel Audited Branches */}
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
    </div>
  );
};

export default AccountSettingsPage;