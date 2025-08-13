import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Komponen untuk menampilkan total statistics
export const AuditTotalStats = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalRegular, setTotalRegular] = useState(0);
  const [totalFraud, setTotalFraud] = useState(0);

  useEffect(() => {
    const fetchTotalStats = async () => {
      if (!user?.id) return;

      // Get user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData?.full_name) {
        setLoading(false);
        return;
      }

      // Get work papers where user's full_name is in the auditor column (comma-delimited)
      const { data: workPapers, error: workPapersError } = await supabase
        .from('work_papers')
        .select('id, branch_name, audit_type, audit_start_date, audit_end_date, auditor')
        .ilike('auditor', `%${profileData.full_name}%`);

      if (workPapersError || !workPapers) {
        setLoading(false);
        return;
      }

      // Filter work papers to ensure user's full_name is actually in the auditor column
      const filteredWorkPapers = workPapers.filter(wp => {
        if (!wp.auditor) return false;
        
        const auditorList = wp.auditor.split(',').map((name: string) => name.trim()) || [];
        
        // Try exact match first
        if (auditorList.includes(profileData.full_name)) {
          return true;
        }
        
        // Try partial matches (in case of slight name variations)
        const userNameParts = profileData.full_name.toLowerCase().split(' ');
        return auditorList.some((auditor: string) => {
          const auditorLower = auditor.toLowerCase();
          const matchingParts = userNameParts.filter((part: string) => auditorLower.includes(part));
          return matchingParts.length >= 2;
        });
      });

      // Unique by branch_name + audit_type + audit_start_date + audit_end_date
      const uniqueMap = new Map();
      filteredWorkPapers.forEach(wp => {
        const key = `${wp.branch_name}|${wp.audit_type}|${wp.audit_start_date}|${wp.audit_end_date}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, wp);
        }
      });
      const uniquePapers = Array.from(uniqueMap.values());

      setTotalRegular(uniquePapers.filter(wp => wp.audit_type === 'regular').length);
      setTotalFraud(uniquePapers.filter(wp => wp.audit_type === 'fraud').length);
      setLoading(false);
    };

    fetchTotalStats();
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
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
  );
};

const AuditStats = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [targetRealizationData, setTargetRealizationData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      // Get user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData?.full_name) {
        setLoading(false);
        return;
      }

      // Get work papers where user's full_name is in the auditor column (comma-delimited)
      const { data: workPapers, error: workPapersError } = await supabase
        .from('work_papers')
        .select('id, branch_name, audit_type, audit_start_date, audit_end_date, auditor')
        .ilike('auditor', `%${profileData.full_name}%`);

      if (workPapersError || !workPapers) {
        setLoading(false);
        return;
      }

      // Filter work papers to ensure user's full_name is actually in the auditor column
      const filteredWorkPapers = workPapers.filter(wp => {
        if (!wp.auditor) return false;
        
        const auditorList = wp.auditor.split(',').map((name: string) => name.trim()) || [];
        
        // Try exact match first
        if (auditorList.includes(profileData.full_name)) {
          return true;
        }
        
        // Try partial matches (in case of slight name variations)
        const userNameParts = profileData.full_name.toLowerCase().split(' ');
        return auditorList.some((auditor: string) => {
          const auditorLower = auditor.toLowerCase();
          const matchingParts = userNameParts.filter((part: string) => auditorLower.includes(part));
          return matchingParts.length >= 2;
        });
      });

      // Unique by branch_name + audit_type + audit_start_date + audit_end_date
      const uniqueMap = new Map();
      filteredWorkPapers.forEach(wp => {
        const key = `${wp.branch_name}|${wp.audit_type}|${wp.audit_start_date}|${wp.audit_end_date}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, wp);
        }
      });
      const uniquePapers = Array.from(uniqueMap.values());

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
      const monthlyArr: any[] = [];
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

      // --- Target Realization Data ---
      const targetRealizationArr: any[] = [];
      yearSet.forEach(year => {
        allMonths.forEach((month, idx) => {
          const ym = `${year}-${month}`;
          const found = monthMap.get(ym);
          const realization = found ? found.regular + found.fraud : 0;
          const target = 2; // Default target per month, bisa disesuaikan
          
          // Tentukan warna berdasarkan realization vs target
          let realizationColor = '#dc2626'; // merah default (red for below target)
          if (realization >= target) {
            realizationColor = realization > target ? '#2563eb' : '#16a34a'; // biru jika melebihi (blue for above target), hijau jika sama (green for exactly meeting target)
          }
          
          targetRealizationArr.push({
            month: ym,
            label: monthNames[idx],
            target: target,
            realization: realization,
            realizationColor: realizationColor,
          });
        });
      });

      setTargetRealizationData(targetRealizationArr);
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
      {/* Bar Chart Multiple ala ManagerDashboard */}
      <Card className="mb-1.5">
        <CardHeader>
          <CardTitle>Audit Per Month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="regular" fill="#16a34a" name="Regular" radius={4} />
              <Bar dataKey="fraud" fill="#dc2626" name="Fraud" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Target vs Realization Chart */}
      <Card className="mb-1">
        <CardHeader>
          <CardTitle>Target vs Realization Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={targetRealizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip 
                formatter={(value, name) => [
                  value, 
                  name === 'Target' ? 'Target' : 'Realization'
                ]}
              />
              <Bar dataKey="target" fill="#6b7280" name="Target" radius={4} />
              <Bar 
                dataKey="realization" 
                name="Realization" 
                radius={4}
                fill="#16a34a" // This default won't be used due to the fill function below
                fillOpacity={1}
              >
                {targetRealizationData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.realizationColor} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* Custom Legend */}
          <div className="mt-2 flex justify-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span className="text-xs text-gray-600">Target</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-600 rounded"></div>
              <span className="text-xs text-gray-600">Below Target</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-600 rounded"></div>
              <span className="text-xs text-gray-600">Target Met</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span className="text-xs text-gray-600">Above Target</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditStats;