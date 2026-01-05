import ReactECharts from 'echarts-for-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

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

      // Get audit_master records where user's full_name is in team or leader
      const { data: auditMaster, error: auditError } = await supabase
        .from('audit_master')
        .select('id, branch_name, audit_type, audit_start_date, audit_end_date, team, leader');

      if (auditError || !auditMaster) {
        setLoading(false);
        return;
      }

      // Helper to check if user is in audit team or is leader
      const isUserInAudit = (record: any, fullName: string) => {
        // Check leader
        if (record.leader?.toLowerCase().includes(fullName.toLowerCase())) return true;
        
        // Parse team
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

      // Filter audits where user is involved
      const filteredAudits = auditMaster.filter(record => isUserInAudit(record, profileData.full_name));

      // Unique by branch_name + audit_type + audit_start_date + audit_end_date
      const uniqueMap = new Map();
      filteredAudits.forEach(a => {
        const key = `${a.branch_name}|${a.audit_type}|${a.audit_start_date}|${a.audit_end_date}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, a);
        }
      });
      const uniqueAudits = Array.from(uniqueMap.values());

      const isRegular = (type: string) => type?.toLowerCase().includes('regular') || type?.toLowerCase().includes('reguler');
      const isFraud = (type: string) => type?.toLowerCase().includes('fraud') || type?.toLowerCase().includes('investigasi') || type?.toLowerCase().includes('khusus');

      setTotalRegular(uniqueAudits.filter(a => isRegular(a.audit_type)).length);
      setTotalFraud(uniqueAudits.filter(a => isFraud(a.audit_type)).length);
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
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');

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

      // Get audit_master records where user's full_name is in team or leader
      const { data: auditMaster, error: auditError } = await supabase
        .from('audit_master')
        .select('id, branch_name, audit_type, audit_start_date, audit_end_date, team, leader');

      if (auditError || !auditMaster) {
        setLoading(false);
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

      // Filter audits where user is involved
      const filteredAudits = auditMaster.filter(record => isUserInAudit(record, profileData.full_name));

      // Unique by branch_name + audit_type + audit_start_date + audit_end_date
      const uniqueMap = new Map();
      filteredAudits.forEach(a => {
        const key = `${a.branch_name}|${a.audit_type}|${a.audit_start_date}|${a.audit_end_date}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, a);
        }
      });
      const uniqueAudits = Array.from(uniqueMap.values());

      const isRegular = (type: string) => type?.toLowerCase().includes('regular') || type?.toLowerCase().includes('reguler');
      const isFraud = (type: string) => type?.toLowerCase().includes('fraud') || type?.toLowerCase().includes('investigasi') || type?.toLowerCase().includes('khusus');

      // Get all years from data
      const yearSet = new Set(uniqueAudits.map(a => a.audit_start_date?.slice(0,4)).filter(Boolean));
      const yearsArr = Array.from(yearSet).sort((a, b) => b.localeCompare(a)); // Sort descending
      setAvailableYears(yearsArr);
      
      // Set default year to current year or latest year
      const currentYear = new Date().getFullYear().toString();
      const defaultYear = yearsArr.includes(currentYear) ? currentYear : yearsArr[0] || currentYear;
      setSelectedYear(defaultYear);

      // --- Bar Chart Data ---
      const allMonths = ['01','02','03','04','05','06','07','08','09','10','11','12'];
      const monthMap = new Map();
      uniqueAudits.forEach(a => {
        const month = a.audit_start_date?.slice(0, 7); // "YYYY-MM"
        if (!month) return;
        if (!monthMap.has(month)) {
          monthMap.set(month, { month, regular: 0, fraud: 0 });
        }
        if (isRegular(a.audit_type)) monthMap.get(month).regular += 1;
        if (isFraud(a.audit_type)) monthMap.get(month).fraud += 1;
      });

      // Store all monthly data (keyed by year)
      const allMonthlyData: any[] = [];
      const allTargetRealizationData: any[] = [];
      
      yearSet.forEach(year => {
        allMonths.forEach((month, idx) => {
          const ym = `${year}-${month}`;
          const found = monthMap.get(ym);
          allMonthlyData.push({
            year,
            month: ym,
            label: monthNames[idx],
            regular: found ? found.regular : 0,
            fraud: found ? found.fraud : 0,
          });
          
          const realization = found ? found.regular + found.fraud : 0;
          const target = 2;
          let realizationColor = '#dc2626'; // red - below target
          if (realization >= target) {
            realizationColor = realization > target ? '#2563eb' : '#16a34a'; // blue if above, green if met
          }
          
          allTargetRealizationData.push({
            year,
            month: ym,
            label: monthNames[idx],
            target: target,
            realization: realization,
            realizationColor: realizationColor,
          });
        });
      });

      setMonthlyData(allMonthlyData);
      setTargetRealizationData(allTargetRealizationData);
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  // Filter data by selected year
  const filteredMonthlyData = monthlyData.filter(d => d.year === selectedYear);
  const filteredTargetData = targetRealizationData.filter(d => d.year === selectedYear);

  // ECharts option for Audit Per Month
  const auditPerMonthOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['Regular', 'Fraud'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: filteredMonthlyData.map(d => d.label),
      axisLabel: {
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        name: 'Regular',
        type: 'bar',
        data: filteredMonthlyData.map(d => d.regular),
        itemStyle: { color: '#16a34a', borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: 'insideBottom',
          distance: 15,
          align: 'left',
          verticalAlign: 'middle',
          rotate: 90,
          formatter: (params: any) => params.value > 0 ? `${params.value} Regular` : '',
          fontSize: 10,
          color: '#fff',
          fontWeight: 500
        }
      },
      {
        name: 'Fraud',
        type: 'bar',
        data: filteredMonthlyData.map(d => d.fraud),
        itemStyle: { color: '#dc2626', borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: 'insideBottom',
          distance: 15,
          align: 'left',
          verticalAlign: 'middle',
          rotate: 90,
          formatter: (params: any) => params.value > 0 ? `${params.value} Fraud` : '',
          fontSize: 10,
          color: '#fff',
          fontWeight: 500
        }
      }
    ]
  };

  // ECharts option for Target vs Realization
  const targetRealizationOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['Target', 'Realization'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: filteredTargetData.map(d => d.label),
      axisLabel: {
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        name: 'Target',
        type: 'bar',
        data: filteredTargetData.map(d => d.target),
        itemStyle: { color: '#6b7280', borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: 'insideBottom',
          distance: 15,
          align: 'left',
          verticalAlign: 'middle',
          rotate: 90,
          formatter: (params: any) => params.value > 0 ? `${params.value} Target` : '',
          fontSize: 10,
          color: '#fff',
          fontWeight: 500
        }
      },
      {
        name: 'Realization',
        type: 'bar',
        data: filteredTargetData.map(d => ({
          value: d.realization,
          itemStyle: { color: d.realizationColor, borderRadius: [4, 4, 0, 0] }
        })),
        label: {
          show: true,
          position: 'insideBottom',
          distance: 15,
          align: 'left',
          verticalAlign: 'middle',
          rotate: 90,
          formatter: (params: any) => params.value > 0 ? `${params.value} Real` : '',
          fontSize: 10,
          color: '#fff',
          fontWeight: 500
        }
      }
    ]
  };

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
      {/* Year Filter */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700">Year:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Charts in Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Audit Per Month Chart */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Audit Per Month</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <ReactECharts 
              option={auditPerMonthOption} 
              style={{ height: '220px' }}
              opts={{ renderer: 'svg' }}
            />
          </CardContent>
        </Card>

        {/* Target vs Realization Chart */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Target vs Realization</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <ReactECharts 
              option={targetRealizationOption} 
              style={{ height: '220px' }}
              opts={{ renderer: 'svg' }}
            />
            
            {/* Custom Legend for colors */}
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-gray-500 rounded"></div>
                <span className="text-xs text-gray-600">Target</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-red-600 rounded"></div>
                <span className="text-xs text-gray-600">Below</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">Met</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded"></div>
                <span className="text-xs text-gray-600">Above</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuditStats;