import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CartesianGrid, Label, Line, LineChart, PolarRadiusAxis, RadialBar, RadialBarChart, XAxis } from 'recharts';
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
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";
import PasswordModal from '../components/ui/PasswordModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';
import { supabase } from '../lib/supabaseClient';

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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [workPapers, setWorkPapers] = useState<WorkPaper[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthlyData, setMonthlyData] = useState<Array<{
    month: string;
    fraudAudits: number;
    annualAudits: number;
  }>>([]);
  const [fraudAuditCount, setFraudAuditCount] = useState(0);
  const [isFraudAmountCensored, setIsFraudAmountCensored] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  

  const [auditorCounts, setAuditorCounts] = useState<Array<{
  auditor_id: string; // Tambahkan auditor_id yang akan digunakan untuk key
  auditor_name: string;
  regular: number;
  fraud: number;
  total: number;
}>>([]);

  // Add this new state for the administration section
  const [activeSection, setActiveSection] = useState<'main' | 'administration'>('main');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [adminRegularAudits, setAdminRegularAudits] = useState<any[]>([]);
  const [uniqueRegions, setUniqueRegions] = useState<string[]>([]);
  const [adminAuditType, setAdminAuditType] = useState<'annual' | 'fraud' | 'schedule'>('annual');
  const [adminFraudAudits, setAdminFraudAudits] = useState<any[]>([]);
  const [auditScheduleData, setAuditScheduleData] = useState<any[]>([]);
  
  // Add these state variables near your other state declarations
  const [isAdminSectionLocked, setIsAdminSectionLocked] = useState(true);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState(false);
  
  const [months] = useState(['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

  const fetchData = async () => {
    try {
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*');

      if (branchesError) throw branchesError;
      if (branchesData) {
        setBranches(branchesData);
      }

      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear - 1, 11, 1).toISOString();
      const endOfYear = new Date(currentYear, 11, 31).toISOString();

      const { data: workPapersData, error: workPapersError } = await supabase
        .from('work_papers')
        .select('*, work_paper_auditors(auditor_name)')
        .gte('audit_start_date', startOfYear)
        .lte('audit_start_date', endOfYear);

      const { count: auditFraudCount, error: auditFraudError } = await supabase
        .from('audit_fraud')
        .select('branch_name', { count: 'exact', head: true });

      if (auditFraudError) throw auditFraudError;
      setFraudAuditCount(auditFraudCount || 0);

      if (workPapersError) throw workPapersError;
      if (workPapersData) {
        setWorkPapers(workPapersData);
        const processedMonthlyData = getMonthlyAuditData(workPapersData);
        setMonthlyData(processedMonthlyData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Add this function to fetch the audit_regular data
  const fetchAdminRegularAudits = async () => {
    try {
      // Fetch all audit_regular entries
      const { data: regularData, error: regularError } = await supabase
        .from('audit_regular')
        .select('*, pic');

      if (regularError) throw regularError;
      
      // Get unique regions from the branches
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('name, region');
        
      if (branchError) throw branchError;
      
      // Create a map of branch names to regions
      const branchRegionMap = {};
      branchData?.forEach(branch => {
        branchRegionMap[branch.name] = branch.region;
      });
      
      // Add regions to the audit data
      const auditsWithRegion = regularData?.map(audit => ({
        ...audit,
        region: branchRegionMap[audit.branch_name] || 'Unknown'
      })) || [];
      
      // Extract unique regions for the filter dropdown
      const regions = [...new Set(branchData?.map(branch => branch.region))].sort();
      setUniqueRegions(regions);
      
      setAdminRegularAudits(auditsWithRegion);
    } catch (error) {
      console.error('Error fetching administrative data:', error);
    }
  };
  
  // Add this function to fetch the audit_fraud data
  const fetchAdminFraudAudits = async () => {
    try {
      // Fetch all audit_fraud entries with region included
      const { data: fraudData, error: fraudError } = await supabase
        .from('audit_fraud')
        .select('*, region, pic');

      if (fraudError) throw fraudError;
      
      // No need to map regions since they're already in the fraud data
      setAdminFraudAudits(fraudData || []);
      
      // Optionally, update uniqueRegions if needed
      if (fraudData && fraudData.length > 0) {
        // Combine regions from both regular and fraud audits
        const fraudRegions = [...new Set(fraudData.map(audit => audit.region))];
        
        // Make sure we don't duplicate regions already in uniqueRegions
        const allRegions = [...new Set([...uniqueRegions, ...fraudRegions])].sort();
        setUniqueRegions(allRegions);
      }
    } catch (error) {
      console.error('Error fetching fraud administrative data:', error);
    }
  };

  // Add this function to fetch audit schedule data
  const fetchAuditScheduleData = async () => {
    try {
      // Ambil data audit_schedule (hanya berisi no, branch_name, region)
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('audit_schedule')
        .select('no, branch_name, region');

      if (scheduleError) throw scheduleError;

      // Ambil data audit_regular dengan created_at untuk menentukan execution order
      const { data: auditedBranches, error: auditedError } = await supabase
        .from('audit_regular')
        .select('branch_name, audit_period_start, audit_period_end, created_at');

      if (auditedError) throw auditedError;

      // Ambil data branch untuk mendapatkan region
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('name, region');

      if (branchError) throw branchError;

      // Buat map branch ke region
      const branchRegionMap = {};
      branchData?.forEach(branch => {
        branchRegionMap[branch.name] = branch.region;
      });

      // Mengelompokkan audit berdasarkan region
      const auditsByRegion = {};
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

      // Untuk setiap region, urutkan berdasarkan created_at dan beri execution_order
      const auditedBranchMap = {};
      Object.keys(auditsByRegion).forEach(region => {
        // Urutkan dari created_at terlama (ascending)
        const sortedAudits = auditsByRegion[region].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Beri execution_order untuk setiap audit dalam region
        sortedAudits.forEach((audit, index) => {
          auditedBranchMap[audit.branch_name] = {
            isAudited: true,
            audit_period_start: audit.audit_period_start,
            audit_period_end: audit.audit_period_end,
            execution_order: index + 1,
            region: audit.region
          };
        });
      });

      // Gabungkan status ke data schedule
      const scheduleWithStatus = scheduleData?.map(item => ({
        ...item,
        isAudited: !!auditedBranchMap[item.branch_name],
        audit_period_start: auditedBranchMap[item.branch_name]?.audit_period_start || null,
        audit_period_end: auditedBranchMap[item.branch_name]?.audit_period_end || null,
        execution_order: auditedBranchMap[item.branch_name]?.execution_order || null
      })) || [];

      setAuditScheduleData(scheduleWithStatus);
    } catch (error) {
      console.error('Error fetching audit schedule data:', error);
    }
  };

  // Ganti fungsi fetchAuditorCounts dengan fungsi baru ini:

  const fetchAuditorCounts = async () => {
    try {
      // Ambil semua data audit_counts
      const { data: auditCounts, error } = await supabase
        .from('audit_counts')
        .select('auditor_name, branch_name, audit_end_date, audit_type');
        
      if (error) throw error;
      
      // Buat kamus untuk memetakan nama auditor ke format standar
      const auditorNameMap = {};
      const auditorIdMap = {};
      
      // Inisialisasi pemetaan
      auditorMapping.forEach(auditor => {
        // Nama lengkap sebagai key
        auditorNameMap[auditor.label.toLowerCase()] = auditor.label;
        auditorIdMap[auditor.label.toLowerCase()] = auditor.value;
        
        // Value/id sebagai key
        auditorNameMap[auditor.value.toLowerCase()] = auditor.label;
        auditorIdMap[auditor.value.toLowerCase()] = auditor.value;
        
        // First name sebagai key (untuk nama seperti "yogi")
        const firstName = auditor.label.split(' ')[0].toLowerCase();
        if (!auditorNameMap[firstName]) {
          auditorNameMap[firstName] = auditor.label;
          auditorIdMap[firstName] = auditor.value;
        }
      });
      
      // Struktur untuk menghitung jumlah audit unik per auditor
      const uniqueAudits = new Map(); // Map(auditorId -> { name, regularSet, fraudSet })
      
      // Proses data audit_counts
      auditCounts?.forEach(record => {
        const auditorName = record.auditor_name?.toLowerCase();
        if (!auditorName) return;
        
        // Cari id dan nama standar auditor
        const auditorId = auditorIdMap[auditorName];
        const standardName = auditorNameMap[auditorName];

        if (!auditorId || !standardName) return;
        
        // Buat kunci unik audit
        const uniqueKey = `${record.branch_name}|${record.audit_end_date}`;
        
        // Buat atau update data auditor
        if (!uniqueAudits.has(auditorId)) {
          uniqueAudits.set(auditorId, {
            auditor_id: auditorId,
            auditor_name: standardName,
            regular: new Set(),
            fraud: new Set()
          });
        }
        
        const auditorData = uniqueAudits.get(auditorId);
        
        // Tambahkan audit ke set yang sesuai
        if (record.audit_type === 'regular') {
          auditorData.regular.add(uniqueKey);
        } else if (record.audit_type === 'fraud') {
          auditorData.fraud.add(uniqueKey);
        }
      });
      
      // Konversi ke array dan hitung total
      const countsArray = Array.from(uniqueAudits.values())
        .map(auditor => ({
          auditor_id: auditor.auditor_id,
          auditor_name: auditor.auditor_name, // Nama lengkap
          regular: auditor.regular.size,
          fraud: auditor.fraud.size,
          total: auditor.regular.size + auditor.fraud.size
        }))
        .filter(auditor => auditor.total > 0)
        .sort((a, b) => b.total - a.total);
    
      // Simpan hasil ke state
      setAuditorCounts(countsArray);
    
    } catch (error) {
      console.error('Error fetching auditor counts:', error);
    }
  };

  // Tambahkan fungsi fetchAuditorAuditCounts
  const fetchAuditorAuditCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_counts')
        .select('auditor_name, branch_name, audit_end_date, audit_type');

      if (error) throw error;

      // Struktur untuk melacak audit unik per auditor
      const auditorMap = {};
      
      // Process all audit counts
      data?.forEach(record => {
        const auditor = record.auditor_name;
        if (!auditor) return;
        
        // Buat kunci unik dari branch_name dan audit_end_date
        const uniqueKey = `${record.branch_name}|${record.audit_end_date}`;
        
        if (!auditorMap[auditor]) {
          auditorMap[auditor] = { 
            auditor_name: auditor, 
            regular: new Set(), 
            fraud: new Set() 
          };
        }
        
        // Kategorikan berdasarkan audit_type
        if (record.audit_type === 'regular') {
          auditorMap[auditor].regular.add(uniqueKey);
        } else if (record.audit_type === 'fraud') {
          auditorMap[auditor].fraud.add(uniqueKey);
        }
      });

      // Convert ke array dan hitung total
      const result = Object.values(auditorMap).map(auditor => ({
        auditor_name: auditor.auditor_name,
        regular: auditor.regular.size,
        fraud: auditor.fraud.size,
        total: auditor.regular.size + auditor.fraud.size,
      })).sort((a, b) => b.total - a.total);

      setAuditorCounts(result);
    } catch (err) {
      console.error('Error fetching auditor counts:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAdminRegularAudits();
    fetchAdminFraudAudits();
    fetchAuditScheduleData();
    fetchAuditorCounts();
  }, []);

  // Update the handleUncensorFraud function to accept the password
  const handleUncensorFraud = (password: string) => {
    if (password === 'optima') {
      setIsFraudAmountCensored(false);
      setPasswordError(false);
      setIsPasswordModalOpen(false);
    } else {
      setPasswordError(true);
    }
  };

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
    totalFraud: workPapers.reduce((sum, wp) => sum + (wp.fraud_amount || 0), 0),
    totalFraudCases: new Set(
      workPapers
        .filter(wp => wp.audit_type === 'fraud' && wp.fraud_staff)
        .map(wp => wp.fraud_staff)  // ← Ini menghitung unique staff names
    ).size,
    totalFraudulentBranches: new Set(workPapers.filter(wp => wp.audit_type === 'fraud').map(wp => wp.branch_name)).size
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

  // Update the handleAdminPasswordVerification function to accept the password
  const handleAdminPasswordVerification = (password: string) => {
    if (password === 'auditkomida') {
      setIsAdminSectionLocked(false);
      setAdminPasswordError(false);
      setIsAdminPasswordModalOpen(false);
      setActiveSection('administration');
    } else {
      setAdminPasswordError(true);
    }
    setAdminPasswordInput('');
  };

  // State to manage selected month for the pie chart
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [activeIndex, setActiveIndex] = useState(0);

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

  return (
    <div className="space-y-4 p-0">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Summary Audits Branches</h1>
        
        {/* Move radio buttons next to heading */}
        <div className="radio-inputs py-2">
          <label className="radio">
            <input
              type="radio"
              name="dashboard-section"
              checked={activeSection === 'main'}
              onChange={() => setActiveSection('main')}
            />
            <span className="name">Main Dashboard</span>
          </label>
          <label className="radio">
            <input
              type="radio"
              name="dashboard-section"
              checked={activeSection === 'administration'}
              onChange={() => {
                if (isAdminSectionLocked) {
                  setIsAdminPasswordModalOpen(true);
                } else {
                  setActiveSection('administration');
                }
              }}
            />
            <span className="name">Administration</span>
          </label>
        </div>
      </div>
      
      {/* Only show stats cards in main section */}
      {activeSection === 'main' && (
        <DashboardStats 
          stats={stats} 
          isFraudAmountCensored={isFraudAmountCensored}
          onFraudSectionClick={() => setIsPasswordModalOpen(true)}
        />
      )}
      
      {/* Password Modal for Fraud Section */}
      <PasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordError(false);
        }}
        onSubmit={handleUncensorFraud}
        passwordError={passwordError}
        title="Verify Access"
        description="Enter password to view fraud details"
      />

      {/* Password Modal for Administration Section */}
      <PasswordModal 
        isOpen={isAdminPasswordModalOpen}
        onClose={() => {
          setIsAdminPasswordModalOpen(false);
          setAdminPasswordError(false);
        }}
        onSubmit={handleAdminPasswordVerification}
        passwordError={adminPasswordError}
        title="Administration Access"
        description="Please enter the password to access the Administration section."
      />

      {/* Main Dashboard Content */}
      {activeSection === 'main' && (
        // Changed from grid to a single card with full width
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold pt-1 mb-4">Audit Performance Summary</h2>
            
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
                                <span
                                  className="flex h-3 w-3 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: month === 'All' ? '#0284c7' : `var(--color-${month.toLowerCase()})`
                                  }}
                                />
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
                          <Label
                            content={({ viewBox }) => {
                              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                const data = getFilteredRadialData()[0];
                                const totalAudits = data.annualAudits + data.fraudAudits;
                                return (
                                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                                    <tspan
                                      x={viewBox.cx}
                                      y={(viewBox.cy || 0) - 16}
                                      className="fill-foreground text-2xl font-bold"
                                    >
                                      {totalAudits.toLocaleString()}
                                    </tspan>
                                    <tspan
                                      x={viewBox.cx}
                                      y={(viewBox.cy || 0) + 4}
                                      className="fill-muted-foreground"
                                    >
                                      Total Audits
                                    </tspan>
                                  </text>
                                );
                              }
                            }}
                          />
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
                  </CardContent>
                  <CardFooter className="flex-col gap-2 text-sm">
                    <div className="flex items-center justify-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#50C878]"></div>
                        <span>Annual: {getFilteredRadialData()[0]?.annualAudits || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#e74c3c]"></div>
                        <span>Special: {getFilteredRadialData()[0]?.fraudAudits || 0}</span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>

                {/* RIGHT: Monthly Audit Trends (Line Chart) */}
                <Card className="flex flex-col bg-white shadow-sm border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-700">Monthly Audit Trends</CardTitle>
                    <CardDescription className="text-sm text-gray-500">Annual and Special Audits</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    <ChartContainer 
                      config={barChartConfig}
                      className="mx-auto h-[300px] w-full" // Tinggi ditambah dari 200px ke 300px
                    >
                      <LineChart
                        accessibilityLayer
                        data={monthlyData}
                        margin={{
                          top: 20,
                          left: 20, // Tambahkan margin kiri
                          right: 20,
                          bottom: 40, // Tambahkan space di bawah untuk label
                        }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10} // Tambah margin untuk label
                          height={40} // Tambahkan height untuk XAxis
                          tick={{ fontSize: 12 }} // Pastikan ukuran font sesuai
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Line
                          dataKey="annualAudits"
                          type="monotone"
                          stroke="var(--color-annualAudits)"
                          strokeWidth={2}
                          dot={true} // Tambahkan dot untuk melihat data points
                        />
                        <Line
                          dataKey="fraudAudits"
                          type="monotone"
                          stroke="var(--color-fraudAudits)"
                          strokeWidth={2}
                          dot={true} // Tambahkan dot untuk melihat data points
                        />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* BOTTOM ROW: Both tables side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {/* LEFT: Audit Count per Auditor */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Audit Count per Auditor</h3>
                  
                  <div className="overflow-x-auto h-full">
                    <div className="overflow-y-auto max-h-[300px] border rounded h-full">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white shadow-sm">
                          <TableRow className="border-b">
                            <TableHead className="text-left py-1 px-2 font-medium w-12">No.</TableHead>
                            <TableHead className="text-left py-1 px-2 font-medium">Auditor Name</TableHead>
                            <TableHead className="text-right py-1 px-2 font-medium text-green-600">Regular</TableHead>
                            <TableHead className="text-right py-1 px-2 font-medium text-red-600">Special</TableHead>
                            <TableHead className="text-right py-1 px-2 font-medium text-blue-600">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditorCounts
                            .filter(auditor => 
                              !['lise', 'ganjar', 'dede', 'eri'].includes(auditor.auditor_id)
                            )
                            .map((auditor, idx) => (
                              <TableRow key={`auditor-${auditor.auditor_id || idx}`}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{auditor.auditor_name}</TableCell>
                                <TableCell className="text-right">{auditor.regular}</TableCell>
                                <TableCell className="text-right">{auditor.fraud}</TableCell>
                                <TableCell className="text-right">{auditor.total}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Audit Summary by Region */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Audit Summary by Region</h3>
                  
                  {/* Desktop View: Shadcn table for region summary */}
                  <div className="overflow-x-auto hidden lg:block h-full">
                    <div className="overflow-y-auto max-h-[300px] border rounded h-full">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white shadow-sm">
                          <TableRow className="border-b">
                            <TableHead className="text-left py-1 px-2 font-medium">Region</TableHead>
                            <TableHead className="text-right py-1 px-2 font-medium text-green-600">Regular</TableHead>
                            <TableHead className="text-right py-1 px-2 font-medium text-red-600">Special</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getRegionAuditData().map((item, index) => (
                            <TableRow key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <TableCell className="py-1 px-2 font-medium">{item.region}</TableCell>
                              <TableCell className="text-right py-1 px-2">
                                <span className="text-green-600">{item.regular}</span>
                              </TableCell>
                              <TableCell className="text-right py-1 px-2">
                                <span className="text-red-600">{item.fraud}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Mobile & Tablet View */}
                  <div className="overflow-y-auto max-h-[300px] border rounded block lg:hidden">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white shadow-sm">
                        <TableRow className="text-gray-500 border-b">
                          <TableHead className="text-left py-1 px-2 font-medium">Region</TableHead>
                          <TableHead className="text-right py-1 px-2 font-medium text-green-600">Regular</TableHead>
                          <TableHead className="text-right py-1 px-2 font-medium text-red-600">Special</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getRegionAuditData().map((item, index) => (
                          <TableRow key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <TableCell className="py-1 px-2 font-medium">{item.region}</TableCell>
                            <TableCell className="text-right py-1 px-2">
                              <span className="text-green-600">{item.regular}</span>
                            </TableCell>
                            <TableCell className="text-right py-1 px-2">
                              <span className="text-red-600">{item.fraud}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>

            
          </CardContent>
        </Card>
      )}

      {/* Administration Section - Full width/page when active */}
      {activeSection === 'administration' && (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-1">Administrative Deficiencies</h2>
            <p className="text-sm text-gray-600 mb-3">Summary of Auditor Oversights and Documentation Gaps</p>
            
            {/* Replace the radio-inputs with a better styled version */}
            <div className="flex space-x-4 mb-6 border-b pb-3">
              <button 
                onClick={() => setAdminAuditType('annual')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  adminAuditType === 'annual' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Annual Audit
              </button>
              <button 
                onClick={() => setAdminAuditType('fraud')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  adminAuditType === 'fraud' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Special Audit
              </button>
              <button 
                onClick={() => setAdminAuditType('schedule')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  adminAuditType === 'schedule' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Audit Schedule
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <div className="flex items-center w-full sm:w-auto">
                <label htmlFor="region-filter" className="mr-2 text-sm font-medium whitespace-nowrap">
                  Filter by Region:
                </label>
                <select
                  id="region-filter"
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="text-sm border rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
                >
                  <option value="all">All Regions</option>
                  {uniqueRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search branch name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border rounded-md w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Annual Audit Deficiencies */}
            {adminAuditType === 'annual' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Region
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Failed Checks
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monitoring
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PIC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adminRegularAudits
                      .filter(audit => 
                        (regionFilter === 'all' || audit.region === regionFilter) &&
                        audit.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((audit, index) => {
                        const failedChecks = getFailedChecksWithAliases(audit);
                        if (!failedChecks && audit.monitoring === 'Adequate') return null;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {audit.branch_name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {audit.region}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900">
                              {failedChecks || 'Complete'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                                audit.monitoring === 'Adequate' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {audit.monitoring || 'Not Set'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {audit.pic || 'N/A'}
                            </td>
                          </tr>
                        );
                      })
                      .filter(Boolean)
                    }
                    {adminRegularAudits
                      .filter(audit => 
                        (regionFilter === 'all' || audit.region === regionFilter) &&
                        audit.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .filter(audit => 
                        getFailedChecksWithAliases(audit) || 
                        audit.monitoring !== 'Adequate'
                      )
                      .length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                          No annual audit deficiencies found matching your criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Fraud Audit Deficiencies */}
            {adminAuditType === 'fraud' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Region
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Failed Checks
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Review Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PIC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adminFraudAudits
                      .filter(audit => 
                        (regionFilter === 'all' || audit.region === regionFilter) &&
                        audit.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((audit, index) => {
                        const failedChecks = getFraudFailedChecksWithAliases(audit);
                        // For fraud audits, we'll show all entries with failed checks
                        if (!failedChecks) return null;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {audit.branch_name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {audit.region}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900">
                              {failedChecks}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                                audit.review === 'Completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {audit.review || 'Not Reviewed'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {audit.pic || 'N/A'}
                            </td>
                          </tr>
                        );
                      })
                      .filter(Boolean)
                    }
                    {adminFraudAudits
                      .filter(audit => 
                        (regionFilter === 'all' || audit.region === regionFilter) &&
                        audit.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .filter(audit => getFraudFailedChecksWithAliases(audit))
                      .length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                          No fraud audit deficiencies found matching your criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Audit Schedule Table */}
            {adminAuditType === 'schedule' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Execution Order
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Region
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditScheduleData
                      .filter(item => 
                        (regionFilter === 'all' || item.region === regionFilter) &&
                        item.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((item, index) => {
                        let periodText = '';
                        if (item.isAudited && item.audit_period_start && item.audit_period_end) {
                          const startDate = new Date(item.audit_period_start);
                          const endDate = new Date(item.audit_period_end);
                          const formattedStartDate = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                          const formattedEndDate = endDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                          periodText = `${formattedStartDate} s.d. ${formattedEndDate}`;
                        }
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {item.no}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {item.execution_order || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {item.branch_name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {item.region}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <div className="flex flex-col">
                                <span className={`px-2 py-1 inline-block rounded-full text-[10px] font-medium ${
                                  item.isAudited 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {item.isAudited ? 'Audited' : 'Unaudited'}
                                </span>
                                {periodText && <span className="text-xs text-gray-500 mt-1">{periodText}</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    }
                    {auditScheduleData
                      .filter(item => 
                        (regionFilter === 'all' || item.region === regionFilter) &&
                        item.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
                      ).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                          No audit schedule data found matching your criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;