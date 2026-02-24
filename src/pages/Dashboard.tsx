import { useEffect, useState } from 'react';
import { Bar, BarChart, PolarRadiusAxis, RadialBar, RadialBarChart, XAxis } from 'recharts';
import CountUp from '../components/common/CountUp';
import { BranchRow } from "../components/dashboard/BranchLocationTable";
import DashboardStats from '../components/dashboard/DashboardStats';
import { FraudRow } from "../components/dashboard/TopFraudTable";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '../components/ui/card';

import html2canvas from 'html2canvas';
import LazyEChart from '../components/common/LazyEChart';
import AuditSchedule from '../components/dashboard/AuditSchedule';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "../components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useDashboardCache } from '../contexts/DashboardCacheContext';
import { useMapCache } from '../contexts/MapCacheContext';
import { supabase } from '../lib/supabase';

// sesuaikan path jika berbeda
const auditorMapping = [
  { label: 'Andre Perkasa Ginting', value: 'andre' },
  { label: 'Sanjung', value: 'sanjung' },
  { label: 'Abduloh', value: 'abduloh' },
  { label: 'Fatir Anis Sabir', value: 'fatir' },
  { label: 'Anwar Sadat, S.E', value: 'anwar' },
  { label: 'Antoni', value: 'antoni' },
  { label: 'Maya Lestari, S.E', value: 'maya' },
  { label: 'Indah Marsita', value: 'indah' },
  { label: 'Aditya Dwi Susanto', value: 'aditya' },
  { label: 'Achmad Miftachul Huda, S.E', value: 'miftach' },
  { label: 'Heri Hermawan', value: 'heri' },
  { label: 'Aris Munandar', value: 'aris' },
  { label: 'Sandi Mulyadi', value: 'sandi' },
  { label: 'Ahmad', value: 'ahmad' },
  { label: 'Widya Lestari', value: 'widya' },
  { label: 'Retno Istiyanto, A.Md', value: 'retno' },
  { label: 'Ade Yadi Heryadi', value: 'ade' },
  { label: 'Muhamad Yunus', value: 'yunus' },
  { label: 'Dara Fusvita Adityacakra, S.Tr.Akun', value: 'dara' },
  { label: 'Lukman Yasir', value: 'lukman' },
  { label: 'Ngadiman', value: 'ngadiman' },
  { label: 'Solikhin, A.Md', value: 'solikhin' },
  { label: 'Amriani', value: 'amriani' },
  { label: 'Maria Sulistya Wati', value: 'maria' },
  { label: "Muhammad Rifa'i", value: 'rifai' },
  { label: 'Buldani', value: 'buldani' },
  { label: 'Imam Kristiawan', value: 'imam' },
  { label: 'Darmayani', value: 'darmayani' },
  { label: 'Novi Dwi Juanda', value: 'novi' },
  { label: 'Afdal Juanda', value: 'afdal' },
  { label: 'Kandidus Yosef Banu', value: 'kandidus' },
  { label: 'Muhammad Alfian Sidiq', value: 'alfian' },
  { label: 'Fadhlika Sugeng Achmadani, S.E', value: 'fadhlika' },
  { label: 'Hendra Hermawan', value: 'hendra' },
  { label: 'Dadang Supriatna', value: 'dadang' },
  { label: 'Yogi Nugraha', value: 'yogi' },
  { label: 'Iqbal Darmazi', value: 'iqbal' },
  { label: 'Ganjar Raharja', value: 'ganjar' },
  { label: 'Dede Yudha Nersanto', value: 'dede' },
  { label: 'Ayu Sri Erian Agustin', value: 'eri' },
  { label: 'Lise Roswati Rochendi MP', value: 'lise' },
];

// Buat fungsi helper untuk mengambil label/nama lengkap dari value
const getAuditorName = (value) => {
  const auditor = auditorMapping.find(a => a.value === value);
  return auditor ? auditor.label : value;
};

interface WorkPaper {
  id: string;
  branch_name: string;
  audit_type: 'regular' | 'fraud';
  fraud_amount?: number;
  fraud_staff?: string;
  audit_start_date: string;
  audit_end_date: string;
  rating: 'high' | 'medium' | 'low';
  inputted_by: string;
  auditors: string[];
  work_paper_auditors?: { auditor_name: string }[];
}

interface Branch {
  id: string;
  name: string;
  region: string;
  coordinates: any;
}

const getMonthlyAuditData = (workPapers: WorkPaper[]) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = months.map(month => ({
    month,
    fraudAudits: 0,
    annualAudits: 0
  }));

  // Pastikan semua data dipetakan dengan benar
  workPapers.forEach(wp => {
    const startDate = new Date(wp.audit_start_date);
    const monthIndex = startDate.getMonth();
    
    if (wp.audit_type === 'fraud') {
      monthlyData[monthIndex].fraudAudits++;
    } else {
      monthlyData[monthIndex].annualAudits++;
    }
  });

  return monthlyData;
};

// Update your barChartConfig to include colors for the line chart
const barChartConfig = {
  annualAudits: {
    label: "Annual Audits",
    color: "#50C878",
  },
  fraudAudits: {
    label: "Special Audits",
    color: "#e74c3c",
  },
} satisfies ChartConfig;

// Add this after your other chart configs
const auditorChartConfig = {
  regular: {
    label: "Regular Audits",
    color: "#50C878",  // Same green as used elsewhere
  },
  fraud: {
    label: "Special Audits",
    color: "#e74c3c",  // Same red as used elsewhere
  },
} satisfies ChartConfig;

const Dashboard = () => {
  // Use cached map data from context
  const { auditedBranchesGeo: cachedAuditedBranchesGeo } = useMapCache();
  
  // Use cached dashboard data from context
  const { 
    branches: cachedBranches, 
    workPapers: cachedWorkPapers, 
    monthlyData: cachedMonthlyData,
    dashboardStats: cachedStats,
    isLoaded: dashboardDataLoaded 
  } = useDashboardCache();
  
  // Use cached data if available, otherwise use local state
  const branches = cachedBranches;
  const workPapers = cachedWorkPapers;
  const monthlyData = cachedMonthlyData;
  const totalFraudAmount = cachedStats.totalFraudAmount;
  const totalFraudStaffCount = cachedStats.totalFraudStaffCount;

  // Only keep state that is not cached
  const [searchTerm] = useState('');
  const [activeSection] = useState<'main'>('main');
  const [dashboardTab, setDashboardTab] = useState<'performance' | 'mapping' | 'schedule'>('performance');


  // Use cached audited branches geo data - transform to match local interface
  const auditedBranchesGeo = cachedAuditedBranchesGeo.map(branch => ({
    ...branch,
    auditHistory: branch.auditHistory.map(h => ({
      date: h.date,
      type: h.type as 'regular' | 'fraud'
    }))
  }));
  
  const [months] = useState(['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

  // Survey Stats State
  const [surveyStats, setSurveyStats] = useState({
    avgScore: 0,
    totalRespondents: 0,
    totalBranches: 0
  });

  useEffect(() => {
    const fetchSurveyStats = async () => {
      try {
        const { data: responses, error } = await supabase
          .from('survey_responses')
          .select('*');
        
        if (error) throw error;
        
        if (responses && responses.length > 0) {
          const totalRespondents = responses.length;
          
          // Get unique branches
          const tokenIds = [...new Set(responses.map(r => r.token_id))];
          let totalBranches = 0;
          
          if (tokenIds.length > 0) {
            const { data: tokens } = await supabase
              .from('survey_tokens')
              .select('branch_name')
              .in('id', tokenIds);
            
            if (tokens) {
              totalBranches = new Set(tokens.map(t => t.branch_name)).size;
            }
          }

          // Calculate average score (Only Sections A, B, C, D which are numeric 1-5 scales)
          let totalAvgSum = 0;
          
          responses.forEach(r => {
            let sum = 0;
            let count = 0;
            // Helper to sum scale values
            const add = (val: any) => {
              if (typeof val === 'number') {
                sum += val;
                count++;
              }
            };
            
            // Section A
            add(r.a1); add(r.a2); add(r.a3); add(r.a4); add(r.a5); add(r.a6);
            // Section B
            add(r.b1); add(r.b2); add(r.b3);
            // Section C
            add(r.c1); add(r.c2); add(r.c3); add(r.c4); add(r.c5); add(r.c6); add(r.c7);
            // Section D
            add(r.d1); add(r.d2); add(r.d3); add(r.d4);
            
            if (count > 0) {
              totalAvgSum += (sum / count);
            }
          });
          
          const avgScore = totalAvgSum / totalRespondents;
          
          setSurveyStats({
            avgScore,
            totalRespondents,
            totalBranches
          });
        }
      } catch (err) {
        console.error('Error fetching survey stats:', err);
      }
    };
    
    fetchSurveyStats();
  }, []);

  // NOTE: All dashboard data fetching has been moved to DashboardCacheContext
  // Data is now automatically cached and shared across navigations
  
  useEffect(() => {
    if (!dashboardDataLoaded) {
      console.log('📊 Waiting for dashboard data from cache...');
    } else {
      console.log('📊 Dashboard data loaded from cache!');
    }
  }, [dashboardDataLoaded]);

  // NOTE: All data fetching has been moved to DashboardCacheContext and MapCacheContext
  // Data is now automatically cached and shared across navigations

  // Calculate statistics
  const regularAuditedBranches = new Set(
    workPapers.filter(wp => wp.audit_type === 'regular').map(wp => wp.branch_name)
  );

  // Update this section to use workPapers instead of fraudAuditCount
  const uniqueFraudAudits = new Set<string>();
  workPapers.forEach(wp => {
    if (wp.audit_type === 'fraud') {
      const uniqueKey = `${wp.branch_name}|${wp.audit_start_date}|${wp.audit_end_date}`;
      uniqueFraudAudits.add(uniqueKey);
    }
  });

  const stats = {
    totalBranches: branches.length,
    auditedBranches: regularAuditedBranches.size,
    unauditedBranches: branches.length - regularAuditedBranches.size,
    fraudAudits: uniqueFraudAudits.size,
    annualAudits: workPapers.filter(wp => wp.audit_type === 'regular').length,
    totalAudits: workPapers.length,
    totalFraud: totalFraudAmount, // From work_paper_persons
    totalFraudCases: totalFraudStaffCount, // From work_paper_persons (unique fraud_staff count)
    totalFraudulentBranches: new Set(workPapers.filter(wp => wp.audit_type === 'fraud').map(wp => wp.branch_name)).size,
    // Add survey stats
    surveyAvgScore: surveyStats.avgScore,
    surveyTotalRespondents: surveyStats.totalRespondents,
    surveyTotalBranches: surveyStats.totalBranches
  };

  // Filter branches based on search term
  const filteredBranches = branches.filter(branch => 
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format coordinates for Google Maps link
  const getCoordinatesText = (coordinates: any) => {
    if (!coordinates) return '';
    try {
      if (typeof coordinates === 'string' && coordinates.toLowerCase().includes('point')) {
        const match = coordinates.match(/point\(\s*([^,\s]+)\s+([^,\s]+)\s*\)/i);
        if (match) {
          const [_, lng, lat] = match;
          return `${lat},${lng}`;
        }
      }
      return coordinates;
    } catch (error) {
      console.error('Error parsing coordinates:', error);
      return '';
    }
  };

  // Siapkan data untuk BranchLocationTable
  const branchTableData: BranchRow[] = filteredBranches.map(branch => ({
    name: branch.name,
    region: branch.region,
    location: (
      <a
        href={`https://www.google.com/maps?q=${getCoordinatesText(branch.coordinates)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800"
      >
        View on Maps
      </a>
    ),
  }));

  // Get top 5 fraud cases
  const topFraudCases = workPapers
    .filter(wp => wp.audit_type === 'fraud' && wp.fraud_amount && wp.fraud_staff)
    .sort((a, b) => (b.fraud_amount || 0) - (a.fraud_amount || 0))
    .slice(0, 5);

  // Siapkan data untuk TopFraudTable
  const topFraudTableData: FraudRow[] = topFraudCases.map(fraud => ({
    branch_name: fraud.branch_name,
    fraud_staff: fraud.fraud_staff,
    fraud_amount: fraud.fraud_amount || 0,
    auditors: fraud.work_paper_auditors?.map(a => a.auditor_name).join(', ') || '',
  }));

  // Format currency
  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // Pie chart data & config
  const pieData = [
    { name: "Annual Audits", value: stats.annualAudits, fill: "#50C878" }, // biru
    { name: "Fraud Audits", value: stats.fraudAudits, fill: "#e74c3c" },   // merah
  ];

  const chartConfig = {
    value: { label: "Audits" },
    annualAudits: { 
      label: "Annual Audits", 
      color: "#50C878" 
    },
    fraudAudits: { 
      label: "Special Audits", 
      color: "#e74c3c" 
    },
    // Keep month colors for select dropdown
    "all": { color: "#6b7280" },
    "jan": { color: "#3b82f6" },
    "feb": { color: "#06b6d4" },
    "mar": { color: "#10b981" },
    "apr": { color: "#84cc16" },
    "may": { color: "#eab308" },
    "jun": { color: "#f97316" },
    "jul": { color: "#f97316" },
    "aug": { color: "#ec4899" },
    "sep": { color: "#8b5cf6" },
    "oct": { color: "#6366f1" },
    "nov": { color: "#0ea5e9" },
    "dec": { color: "#14b8a6" },
  } satisfies ChartConfig;

  // Update the getFilteredRadialData function
  const getFilteredRadialData = () => {
    if (selectedMonth === 'All') {
      return [{
        month: "all",
        annualAudits: stats.annualAudits,
        fraudAudits: stats.fraudAudits
      }];
    }
    
    const monthIndex = months.indexOf(selectedMonth) - 1;
    if (monthIndex < 0) return [{ month: "all", annualAudits: 0, fraudAudits: 0 }];
    
    const filteredData = workPapers.filter(wp => {
      const endDate = new Date(wp.audit_end_date);
      return endDate.getMonth() === monthIndex;
    });
    
    const annualCount = filteredData.filter(wp => wp.audit_type === 'regular').length;
    const fraudCount = filteredData.filter(wp => wp.audit_type === 'fraud').length;
    
    return [{
      month: selectedMonth.toLowerCase(),
      annualAudits: annualCount,
      fraudAudits: fraudCount
    }];
  };

  // State to manage selected month for the pie chart
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [activeIndex, setActiveIndex] = useState(0);
  const [chartInView, setChartInView] = useState(false);

  // Add this function to filter data by selected month
  const getFilteredPieData = () => {
    if (selectedMonth === 'All') {
      return [
        { name: "Annual Audits", value: stats.annualAudits, fill: "#50C878" },
        { name: "Special Audits", value: stats.fraudAudits, fill: "#e74c3c" },
      ];
    }
    
    const monthIndex = months.indexOf(selectedMonth) - 1; // -1 because 'All' is at index 0
    if (monthIndex < 0) return [];
    
    const filteredData = workPapers.filter(wp => {
      const endDate = new Date(wp.audit_end_date);
      return endDate.getMonth() === monthIndex;
    });
    
    const annualCount = filteredData.filter(wp => wp.audit_type === 'regular').length;
    const fraudCount = filteredData.filter(wp => wp.audit_type === 'fraud').length;
    
    return [
      { name: "Annual Audits", value: annualCount, fill: "#50C878" },
      { name: "Special Audits", value: fraudCount, fill: "#e74c3c" },
    ];
  };

  // Add variable to store the filtered data
  const filteredPieData = getFilteredPieData();

  // Add effect to reset activeIndex when the filtered data changes
  useEffect(() => {
    if (filteredPieData.length > 0) {
      setActiveIndex(0);
    }
  }, [selectedMonth]);

  // Add this function before the return statement in Dashboard component
  const getRegionAuditData = () => {
    // Create a map to store region data
    const regionMap: Record<string, { regular: number; fraud: number }> = {};
    
    // Initialize regions from branches
    branches.forEach(branch => {
      regionMap[branch.region] = { regular: 0, fraud: 0 };
    });

    // Create sets to track unique audits
    const uniqueRegularAudits = new Set<string>();
    const uniqueFraudAudits = new Set<string>();

    // Count audits by region
    workPapers.forEach(wp => {
      // Find the branch to get its region
      const branch = branches.find(b => b.name === wp.branch_name);
      if (!branch) return;

      const region = branch.region;
      if (!regionMap[region]) {
        regionMap[region] = { regular: 0, fraud: 0 };
      }

      // Create unique key using branch_name, audit_start_date, and audit_end_date
      const uniqueKey = `${wp.branch_name}|${wp.audit_start_date}|${wp.audit_end_date}`;

      if (wp.audit_type === 'regular') {
        const regionalUniqueKey = `${region}|${uniqueKey}`;
        if (!uniqueRegularAudits.has(regionalUniqueKey)) {
          uniqueRegularAudits.add(regionalUniqueKey);
          regionMap[region].regular += 1;
        }
      } else if (wp.audit_type === 'fraud') {
        const regionalUniqueKey = `${region}|${uniqueKey}`;
        if (!uniqueFraudAudits.has(regionalUniqueKey)) {
          uniqueFraudAudits.add(regionalUniqueKey);
          regionMap[region].fraud += 1;
        }
      }
    });

    // Convert map to array and sort by region name
    return Object.entries(regionMap)
      .map(([region, counts]) => ({
        region,
        regular: counts.regular,
        fraud: counts.fraud
      }))
      .sort((a, b) => a.region.localeCompare(b.region));
  };

  // Tambahkan sebelum deklarasi komponen Dashboard
  function getFailedChecksWithAliases(audit: any) {
    const regularAuditAliases = {
      dapa: "DAPA",
      revised_dapa: "DAPA Perubahan", // Akan di-exclude
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
        regularAuditAliases[key] &&
        key !== 'revised_dapa' // Exclude DAPA Perubahan
      )
      .map(([key]) => regularAuditAliases[key])
      .join(', ');
  }

  // Jika Anda juga butuh untuk audit fraud:
  function getFraudFailedChecksWithAliases(audit: any) {
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
        fraudAuditAliases[key]
      )
      .map(([key]) => fraudAuditAliases[key])
      .join(', ');
  }


  // State for selected region (pisahkan)
  const [selectedBarometerRegion, setSelectedBarometerRegion] = useState('All');
  const [selectedTrendsRegion, setSelectedTrendsRegion] = useState('All');
  // Get unique region list
  const regionList = ['All', ...Array.from(new Set(branches.map(b => b.region)).values())];

  // Monthly Audit Trends data filtered by region
  const getMonthlyDataByRegion = () => {
    let filteredBranches = branches;
    let filteredWorkPapers = workPapers;
    if (selectedTrendsRegion !== 'All') {
      filteredBranches = branches.filter(b => b.region === selectedTrendsRegion);
      filteredWorkPapers = workPapers.filter(wp => {
        const branch = branches.find(b => b.name === wp.branch_name);
        return branch && branch.region === selectedTrendsRegion;
      });
    }
    return getMonthlyAuditData(filteredWorkPapers);
  };

  // Calculate Audit Barometer data per region
  const getAuditBarometerData = () => {
    let filteredBranches = branches;
    let filteredWorkPapers = workPapers;
    if (selectedBarometerRegion !== 'All') {
      filteredBranches = branches.filter(b => b.region === selectedBarometerRegion);
      filteredWorkPapers = workPapers.filter(wp => {
        const branch = branches.find(b => b.name === wp.branch_name);
        return branch && branch.region === selectedBarometerRegion;
      });
    }
    const totalScheduled = filteredBranches.length;
    const specialTarget = totalScheduled / 2;
    const regularAudited = new Set(
      filteredWorkPapers.filter(wp => wp.audit_type === 'regular').map(wp => wp.branch_name)
    ).size;
    const specialAudited = new Set(
      filteredWorkPapers.filter(wp => wp.audit_type === 'fraud').map(wp => wp.branch_name)
    ).size;
    return [
      {
        id: 'Regular',
        label: 'Regular Audit %',
        value: totalScheduled === 0 ? 0 : Math.round((regularAudited / totalScheduled) * 100),
        color: '#50C878',
      },
      {
        id: 'Special',
        label: 'Special Audit %',
        value: specialTarget === 0 ? 0 : Math.round((specialAudited / specialTarget) * 100),
        color: '#e74c3c',
      },
    ];
  };

  // Tambahkan state untuk filter bulan BarChart region
const [selectedRegionMonth, setSelectedRegionMonth] = useState('All');
const regionMonths = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Fungsi untuk filter data region berdasarkan bulan
const getRegionAuditDataByMonth = () => {
  if (selectedRegionMonth === 'All') return getRegionAuditData();

  const monthIndex = regionMonths.indexOf(selectedRegionMonth) - 1;
  if (monthIndex < 0) return getRegionAuditData();

  // Filter workPapers berdasarkan bulan
  const filteredWorkPapers = workPapers.filter(wp => {
    const startDate = new Date(wp.audit_start_date);
    return startDate.getMonth() === monthIndex;
  });

  // Gunakan region dari branches yang ada
  const regionMap: Record<string, { regular: number; fraud: number }> = {};
  branches.forEach(branch => {
    regionMap[branch.region] = { regular: 0, fraud: 0 };
  });

  const uniqueRegularAudits = new Set<string>();
  const uniqueFraudAudits = new Set<string>();

  filteredWorkPapers.forEach(wp => {
    const branch = branches.find(b => b.name === wp.branch_name);
    if (!branch) return;
    const region = branch.region;
    if (!regionMap[region]) regionMap[region] = { regular: 0, fraud: 0 };
    const uniqueKey = `${wp.branch_name}|${wp.audit_start_date}|${wp.audit_end_date}`;
    if (wp.audit_type === 'regular') {
      const regionalUniqueKey = `${region}|${uniqueKey}`;
      if (!uniqueRegularAudits.has(regionalUniqueKey)) {
        uniqueRegularAudits.add(regionalUniqueKey);
        regionMap[region].regular += 1;
      }
    } else if (wp.audit_type === 'fraud') {
      const regionalUniqueKey = `${region}|${uniqueKey}`;
      if (!uniqueFraudAudits.has(regionalUniqueKey)) {
        uniqueFraudAudits.add(regionalUniqueKey);
        regionMap[region].fraud += 1;
      }
    }
  });

  return Object.entries(regionMap)
    .map(([region, counts]) => ({
      region,
      regular: counts.regular,
      fraud: counts.fraud
    }))
    .sort((a, b) => a.region.localeCompare(b.region));
};

  const downloadMultipleCharts = async () => {
    const charts = [
      { id: 'chart-audit-composition', filename: 'audit-composition.png' },
      { id: 'chart-monthly-trends', filename: 'monthly-audit-trends.png' },
      { id: 'chart-barometer', filename: 'audit-barometer.png' },
      { id: 'chart-summary-region', filename: 'audit-summary-region.png' },
    ];
    for (const chart of charts) {
      const el = document.getElementById(chart.id);
      if (el) {
        const canvas = await html2canvas(el, { backgroundColor: "#fff" });
        const link = document.createElement('a');
        link.download = chart.filename;
        link.href = canvas.toDataURL();
        link.click();
        await new Promise(r => setTimeout(r, 500)); // beri jeda agar download tidak bentrok
      }
    }
  };

  return (
    <div className="space-y-4 p-0">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Summary Audits Branches</h1>
        
        {/* Radio buttons removed - only main dashboard is available */}
      </div>
      
      {/* Only show stats cards in main section */}
      {activeSection === 'main' && (
        <DashboardStats stats={stats} skipAnimation={dashboardDataLoaded} />
      )}
      


      {/* Main Dashboard Content */}
      {activeSection === 'main' && (
        // Changed from grid to a single card with full width
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setDashboardTab('performance')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  dashboardTab === 'performance'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Audit Performance Summary
              </button>
              <button
                onClick={() => setDashboardTab('mapping')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  dashboardTab === 'mapping'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Audit Mapping
              </button>
              <button
                onClick={() => setDashboardTab('schedule')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  dashboardTab === 'schedule'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Audit Schedule
              </button>
            </div>

            {/* Audit Schedule Content */}
            {dashboardTab === 'schedule' && (
              <AuditSchedule />
            )}

            {/* Audit Mapping Content */}
            {dashboardTab === 'mapping' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      Regular Audit
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                      Fraud Audit
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Total: {auditedBranchesGeo.length} audited branches
                  </span>
                </div>

                {/* ECharts scatter map using geo coordinates */}
                <div className="h-[600px] w-full border rounded-lg bg-gradient-to-br from-sky-50 to-indigo-50 overflow-hidden">
                  <LazyEChart
                    option={{
                      backgroundColor: 'transparent',
                      tooltip: {
                        trigger: 'item',
                        triggerOn: 'click',
                        enterable: true,
                        hideDelay: 1000,
                        position: 'top',
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        borderColor: '#e2e8f0',
                        textStyle: { color: '#1e293b' },
                        extraCssText: 'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); border-radius: 12px; padding: 0; max-height: 300px; overflow-y: auto;',
                        formatter: (params: any) => {
                          const data = params.data;
                          if (!data) return '';
                          
                          // Format audit history list
                          const historyHtml = data.auditHistory && data.auditHistory.length > 0
                            ? data.auditHistory.map((audit: { date: string; type: string }) => {
                                const dateStr = new Date(audit.date).toLocaleDateString('id-ID', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: '2-digit' 
                                });
                                const typeLabel = audit.type === 'fraud' ? 'Fraud' : 'Regular';
                                const typeColor = audit.type === 'fraud' ? '#ef4444' : '#10b981';
                                return `<div style="display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                                  <span style="color: #64748b;">${dateStr}</span>
                                  <span style="color: ${typeColor}; font-weight: 600;">${typeLabel}</span>
                                </div>`;
                              }).join('')
                            : '<div style="color: #94a3b8; padding: 4px 0;">No audit history</div>';
                          
                          return `
                            <div style="padding: 12px; font-family: sans-serif; min-width: 200px;">
                              <div style="margin-bottom: 4px;">
                                <strong style="font-size: 15px; color: ${data.hasFraud ? '#ef4444' : '#10b981'};">${data.name || 'Unknown'}</strong>
                              </div>
                              <div style="margin-bottom: 8px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                                Regional ${data.region || '-'}
                              </div>
                              <div style="font-size: 12px;">
                                ${historyHtml}
                              </div>
                            </div>
                          `;
                        }
                      },
                      geo: {
                        map: 'indonesia',
                        roam: true,
                        zoom: 1.2,
                        center: [118, -2],
                        itemStyle: {
                          areaColor: '#e0e7ff',
                          borderColor: '#6366f1',
                          borderWidth: 0.5
                        },
                        emphasis: {
                          itemStyle: {
                            areaColor: '#c7d2fe'
                          }
                        },
                        label: {
                          show: false
                        }
                      },
                      series: [{
                        name: 'Audited Branches',
                        type: 'scatter',
                        coordinateSystem: 'geo',
                        data: auditedBranchesGeo.map(branch => ({
                          name: branch.name,
                          value: [...branch.coordinates],
                          region: branch.region,
                          auditHistory: branch.auditHistory,
                          hasFraud: branch.hasFraud,
                          symbol: 'pin',
                          symbolSize: branch.hasFraud ? 25 : 20,
                          itemStyle: {
                            color: branch.hasFraud ? '#ef4444' : '#10b981',
                            shadowBlur: 2,
                            shadowColor: 'rgba(0,0,0,0.2)'
                          }
                        })),
                        label: {
                          show: false
                        },
                        emphasis: {
                          scale: 1.5
                        }
                      }]
                    }}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            )}
            
            {/* Audit Performance Summary Content */}
            {dashboardTab === 'performance' && (
            <>
            {/* Charts and tables layout - updated to place charts at top */}
            <div className="flex flex-col gap-2 mb-2">
              {/* TOP ROW: Both charts side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* LEFT: Audit Composition (Radial Bar Chart) */}
                <Card className="flex flex-col bg-white shadow-sm border">
                  <CardHeader className="items-center pb-2">
                    <div className="flex flex-row items-center justify-between w-full">
                      <CardTitle className="text-lg font-semibold text-gray-700">Audit Composition</CardTitle>
                      <Select 
                        value={selectedMonth} 
                        onValueChange={setSelectedMonth}
                      >
                        <SelectTrigger
                          className="h-8 w-[150px] rounded-lg pl-2.5"
                          aria-label="Select month"
                        >
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent align="end" className="rounded-xl">
                          {months.map((month) => (
  <SelectItem key={month} value={month} className="rounded-lg">
    <div className="flex items-center gap-2 text-xs">
      {month !== 'All' && (
        <span
          className="flex h-3 w-3 shrink-0 rounded-full"
          style={{
            backgroundColor:`var(--color-${month.toLowerCase()})`
          }}
        />
      )}
      {month}
    </div>
  </SelectItem>
))}
                        </SelectContent>
                      </Select>
                    </div>
                    <CardDescription className="text-sm text-slate-500">
                      {selectedMonth === 'All' ? 'All Months' : `${selectedMonth} 2025`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 items-center pb-0 pt-0">
                    <div className="relative mx-auto my-auto aspect-square w-full max-w-[250px]">
                      <ChartContainer
                        config={chartConfig}
                        className="mx-auto my-auto aspect-square w-full max-w-[250px]"
                      >
                        <RadialBarChart
                          data={getFilteredRadialData()}
                          endAngle={180}
                          innerRadius={80}
                          outerRadius={130}
                        >
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                          />
                          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                            {/* Remove the SVG label since we're using React overlay */}
                          </PolarRadiusAxis>
                          <RadialBar
                            dataKey="annualAudits"
                            stackId="a"
                            cornerRadius={5}
                            fill="var(--color-annualAudits)"
                            className="stroke-transparent stroke-2"
                          />
                          <RadialBar
                            dataKey="fraudAudits"
                            fill="var(--color-fraudAudits)"
                            stackId="a"
                            cornerRadius={5}
                            className="stroke-transparent stroke-2"
                          />
                        </RadialBarChart>
                      </ChartContainer>
                      
                      {/* CountUp overlay positioned over the chart */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center" style={{ marginTop: '-20px' }}>
                          <CountUp 
                            to={getFilteredRadialData()[0]?.annualAudits + getFilteredRadialData()[0]?.fraudAudits || 0}
                            className="text-2xl font-bold"
                            duration={2}
                            separator=","
                            skipAnimation={dashboardDataLoaded}
                          />
                          <div className="text-xs text-gray-500 mt-1">Total Audits</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-2 text-sm">
                    <div className="flex items-center justify-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#50C878]"></div>
                        <span className="flex items-center gap-1">
                          Annual: <CountUp to={getFilteredRadialData()[0]?.annualAudits || 0} duration={1.5} delay={0.5} skipAnimation={dashboardDataLoaded} />
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#e74c3c]"></div>
                        <span className="flex items-center gap-1">
                          Special: <CountUp to={getFilteredRadialData()[0]?.fraudAudits || 0} duration={1.5} delay={0.7} skipAnimation={dashboardDataLoaded} />
                        </span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>

                {/* RIGHT: Monthly Audit Trends (Line Chart) */}
                <Card className="flex flex-col bg-white shadow-sm border">
                  <CardHeader className="pb-2">
                    <div className="flex flex-row items-center justify-between w-full">
                      <CardTitle className="text-lg font-semibold text-gray-700">Monthly Audit Trends</CardTitle>
                      <Select value={selectedTrendsRegion} onValueChange={setSelectedTrendsRegion}>
        <SelectTrigger className="h-8 w-[150px] rounded-lg pl-2.5" aria-label="Select region for trends">
          <SelectValue placeholder="Select region" />
        </SelectTrigger>
        <SelectContent align="end" className="rounded-xl">
          {regionList.map(region => (
            <SelectItem key={region} value={region} className="rounded-lg">
              <div className="flex items-center gap-2 text-xs">
                {region}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    <LazyEChart 
                      option={{
                        tooltip: { trigger: 'axis' },
                        legend: { data: ['Annual Audits', 'Special Audits'], bottom: 0 },
                        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
                        xAxis: { type: 'category', boundaryGap: false, data: getMonthlyDataByRegion().map(item => item.month) },
                        yAxis: { type: 'value' },
                        series: [
                          {
                            name: 'Annual Audits',
                            type: 'line',
                            smooth: true,
                            itemStyle: { color: '#50C878' },
                            areaStyle: {
                              opacity: 0.2,
                              color: {
                                type: 'linear',
                                x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [{ offset: 0, color: '#50C878' }, { offset: 1, color: '#ffffff' }]
                              }
                            },
                            data: getMonthlyDataByRegion().map(item => item.annualAudits)
                          },
                          {
                            name: 'Special Audits',
                            type: 'line',
                            smooth: true,
                            itemStyle: { color: '#e74c3c' },
                             areaStyle: {
                              opacity: 0.2,
                              color: {
                                type: 'linear',
                                x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [{ offset: 0, color: '#e74c3c' }, { offset: 1, color: '#ffffff' }]
                              }
                            },
                            data: getMonthlyDataByRegion().map(item => item.fraudAudits)
                          }
                        ]
                      }}
                      style={{ height: '300px', width: '100%' }}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* BOTTOM ROW: Both tables side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {/* LEFT: Audit Barometer Progress Bars */}
                <Card className="flex flex-col bg-white shadow-sm border">
                  <CardHeader className="pb-2">
                    <div className="flex flex-row items-center justify-between w-full">
                      <CardTitle className="text-lg font-semibold">Audit Barometer</CardTitle>
                      <Select value={selectedBarometerRegion} onValueChange={setSelectedBarometerRegion}>
        <SelectTrigger className="h-8 w-[150px] rounded-lg pl-2.5" aria-label="Select region">
          <SelectValue placeholder="Select region" />
        </SelectTrigger>
        <SelectContent align="end" className="rounded-xl">
          {regionList.map(region => (
            <SelectItem key={region} value={region} className="rounded-lg">
              <div className="flex items-center gap-2 text-xs">
                {region}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    <div className="flex flex-col gap-6 py-4">
                      {/* Regular Audit Progress */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#50C878]"></div>
                            <span className="font-medium text-gray-700">Regular Audit</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-[#50C878]">
                              <CountUp to={getAuditBarometerData()[0].value} duration={1.5} skipAnimation={dashboardDataLoaded} />%
                            </span>
                          </div>
                        </div>
                        <div className="relative h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#50C878] to-[#86efac] rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(getAuditBarometerData()[0].value, 100)}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0%</span>
                          <span className="text-gray-600">
                            {new Set(workPapers.filter(wp => {
                              if (selectedBarometerRegion === 'All') return wp.audit_type === 'regular';
                              const branch = branches.find(b => b.name === wp.branch_name);
                              return branch && branch.region === selectedBarometerRegion && wp.audit_type === 'regular';
                            }).map(wp => wp.branch_name)).size} dari {selectedBarometerRegion === 'All' ? branches.length : branches.filter(b => b.region === selectedBarometerRegion).length} cabang
                          </span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-100"></div>

                      {/* Special Audit Progress */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#e74c3c]"></div>
                            <span className="font-medium text-gray-700">Special Audit</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-[#e74c3c]">
                              <CountUp to={getAuditBarometerData()[1].value} duration={1.5} skipAnimation={dashboardDataLoaded} />%
                            </span>
                          </div>
                        </div>
                        <div className="relative h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#e74c3c] to-[#f87171] rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(getAuditBarometerData()[1].value, 100)}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0%</span>
                          <span className="text-gray-600">
                            {new Set(workPapers.filter(wp => {
                              if (selectedBarometerRegion === 'All') return wp.audit_type === 'fraud';
                              const branch = branches.find(b => b.name === wp.branch_name);
                              return branch && branch.region === selectedBarometerRegion && wp.audit_type === 'fraud';
                            }).map(wp => wp.branch_name)).size} dari {selectedBarometerRegion === 'All' ? Math.round(branches.length / 2) : Math.round(branches.filter(b => b.region === selectedBarometerRegion).length / 2)} target
                          </span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-1 text-xs text-gray-400 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Target Special Audit: 50% dari total cabang</span>
                    </div>
                  </CardFooter>
                </Card>

                {/* BarChart Audit Summary by Region */}
<Card className="flex flex-col bg-white shadow-sm border">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-lg font-semibold">Audit Summary by Region</CardTitle>
    <Select value={selectedRegionMonth} onValueChange={setSelectedRegionMonth}>
      <SelectTrigger className="h-8 w-[150px] rounded-lg pl-2.5" aria-label="Filter bulan region">
        <SelectValue placeholder="Pilih Bulan" />
      </SelectTrigger>
      <SelectContent align="end" className="rounded-xl">
{regionMonths.map((month) => (
  <SelectItem key={month} value={month} className="rounded-lg">
    <div className="flex items-center gap-2 text-xs">
      {month !== 'All' && (
        <span className="flex h-3 w-3 shrink-0 rounded-full"
          style={{
            backgroundColor: `var(--color-${month.toLowerCase()})`
          }}
        />
      )}
      {month}
    </div>
  </SelectItem>
))}
      </SelectContent>
    </Select>
  </CardHeader>
  <CardContent>
    <div className="h-[300px] w-full">
      <ChartContainer
        config={{
          regular: { label: "Regular", color: "#50C878" },
          fraud: { label: "Special", color: "#e74c3c" },
        }}
        className="h-full w-full"
      >
        <BarChart
          data={getRegionAuditDataByMonth()}
          margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
        >
          <XAxis
            dataKey="region"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <Bar
            dataKey="regular"
            stackId="a"
            fill="#50C878"
            radius={[0, 0, 4, 4]}
          />
          <Bar
            dataKey="fraud"
            stackId="a"
            fill="#e74c3c"
            radius={[4, 4, 0, 0]}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                className="w-[180px]"
                formatter={(value, name, item, index) => (
                  <>
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px] mr-2"
                      style={{
                        background: name === "regular" ? "#50C878" : "#e74c3c",
                      }}
                    />
                    {name === "regular" ? "Regular" : "Special"}
                    <div className="text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
                      {value}
                    </div>
                    {/* Show total after last item */}
                    {index === 1 && (
                      <div className="text-foreground mt-1.5 flex basis-full items-center border-t pt-1.5 text-xs font-medium">
                        Total
                        <div className="text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
                          {item.payload.regular + item.payload.fraud}
                        </div>
                      </div>
                    )}
                  </>
                )}
              />
            }
            cursor={false}
          />
        </BarChart>
        <CardFooter className="flex items-center justify-center text-xs text-gray-500 text-center w-full font-semibold">
          <div>
            All Audit regular and special
          </div>
        </CardFooter>
      </ChartContainer>
    </div>
  </CardContent>
</Card>
              </div>
            </div>
            </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;