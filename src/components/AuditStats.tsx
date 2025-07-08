import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// Optional: custom ChartContainer & Tooltip jika ingin sama persis
// import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/ui/chart";

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const AuditStats = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalRegular, setTotalRegular] = useState(0);
  const [totalFraud, setTotalFraud] = useState(0);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      // 1. Ambil alias auditor
      const { data: aliasData, error: aliasError } = await supabase
        .from('auditor_aliases')
        .select('alias')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (aliasError || !aliasData?.alias) {
        setLoading(false);
        return;
      }

      // 2. Ambil semua work_paper_id dari work_paper_auditors
      const { data: auditorRows, error: auditorError } = await supabase
        .from('work_paper_auditors')
        .select('work_paper_id')
        .eq('auditor_name', aliasData.alias);

      if (auditorError) {
        setLoading(false);
        return;
      }

      const workPaperIds = auditorRows?.map(row => row.work_paper_id) || [];
      if (workPaperIds.length === 0) {
        setLoading(false);
        return;
      }

      // 3. Ambil work_papers lengkap
      const { data: papers, error: papersError } = await supabase
        .from('work_papers')
        .select('id,branch_name,audit_type,audit_start_date,audit_end_date')
        .in('id', workPaperIds);

      if (papersError) {
        setLoading(false);
        return;
      }

      // 4. Unikkan berdasarkan branch_name + audit_type + audit_start_date + audit_end_date
      const uniqueMap = new Map();
      papers.forEach(wp => {
        const key = `${wp.branch_name}|${wp.audit_type}|${wp.audit_start_date}|${wp.audit_end_date}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, wp);
        }
      });
      const uniquePapers = Array.from(uniqueMap.values());

      setTotalRegular(uniquePapers.filter(wp => wp.audit_type === 'regular').length);
      setTotalFraud(uniquePapers.filter(wp => wp.audit_type === 'fraud').length);

      // --- Bar Chart Data ---
      const allMonths = [
        '01','02','03','04','05','06','07','08','09','10','11','12'
      ];
      const monthMap = new Map();
      uniquePapers.forEach(wp => {
        const month = wp.audit_start_date?.slice(0, 7); // "YYYY-MM"
        if (!month) return;
        if (!monthMap.has(month)) {
          monthMap.set(month, { month, regular: 0, fraud: 0 });
        }
        if (wp.audit_type === 'regular') monthMap.get(month).regular += 1;
        if (wp.audit_type === 'fraud') monthMap.get(month).fraud += 1;
      });

      // Ambil semua tahun yang ada di data
      const yearSet = new Set(uniquePapers.map(wp => wp.audit_start_date?.slice(0,4)).filter(Boolean));
      const monthlyArr = [];
      yearSet.forEach(year => {
        allMonths.forEach((month, idx) => {
          const ym = `${year}-${month}`;
          const found = monthMap.get(ym);
          monthlyArr.push({
            month: ym,
            label: monthNames[idx],
            regular: found ? found.regular : 0,
            fraud: found ? found.fraud : 0,
          });
        });
      });

      setMonthlyData(monthlyArr);
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6 border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totalRegular}</div>
          <div className="text-sm text-green-800 font-medium">Total Regular</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{totalFraud}</div>
          <div className="text-sm text-red-800 font-medium">Total Special</div>
        </div>
      </div>

      {/* Bar Chart Multiple ala ManagerDashboard */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Audit Per Month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={485}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="regular" fill="#16a34a" name="Regular" radius={4} />
              <Bar dataKey="fraud" fill="#dc2626" name="Fraud" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditStats;