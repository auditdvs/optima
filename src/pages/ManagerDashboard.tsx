import { format, parseISO } from "date-fns";
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { AlertTriangle, ArrowDown, ArrowUpDown, Building2, CalendarIcon, Clock, Pencil, Search, TrendingUp, Users, Wallet } from "lucide-react";
import { useEffect, useState } from 'react';
import { DateRange } from "react-day-picker";
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import CountUp from '../components/CountUp';
import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  auditTrendsConfig,
} from "../components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { supabase } from '../lib/supabaseClient';
import '../styles/download-button.css';
import '../styles/radioButtons.css';

const checkUserAccess = async (supabase: any) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userRoles || !['manager', 'superadmin'].includes(userRoles.role)) {
      throw new Error('Unauthorized access');
    }

    return true;
  } catch (error) {
    console.error('Access check failed:', error);
    return false;
  }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DashboardStats {
  totalBranches: number;
  regularAudits: number;
  fraudAudits: number;
  totalAuditors: number;
  totalFraud: number;
  fraudRecovery: number;
  outstandingFraud: number;
  specialAudits: number;
}

interface AuditTrend {
  month: string;
  regular: number;
  fraud: number;
}

interface Auditor {
  name: string;
  auditor_id: string;
}

interface RegularAudit {
  branch_name: string;
  region: string;
  monitoring: string;
  dapa: boolean;
  revised_dapa: boolean;
  dapa_supporting_data: boolean;
  assignment_letter: boolean;
  entrance_agenda: boolean;
  entrance_attendance: boolean;
  audit_working_papers: boolean;
  exit_meeting_minutes: boolean;
  exit_attendance_list: boolean;
  audit_result_letter: boolean;
  rta: boolean;
}

interface FraudAudit {
  branch_name: string;
  region: string;
  data_preparation: boolean;
  assignment_letter: boolean;
  audit_working_papers: boolean;
  audit_report: boolean;
  detailed_findings: boolean;
  review: string;
}

interface FraudCase {
  id: string;
  branch_name: string;
  region: string; // Added region field
  fraud_amount: number;
  fraud_staff: string;
  fraud_payments_audits?: {
    id: string;
    hkp_amount: number;
    payment_date: string;
    notes?: string;
  }[];
}

interface FraudPayment {
  id: string;
  work_paper_id: string;
  hkp_amount: number;
  payment_date: string;
  from_salary?: boolean;
  notes?: string;
}

interface PaymentFormData {
  amount: number;
  payment_type: 'payment_amount' | 'hkp_amount';
  payment_date: string;
  notes?: string;
}

// Field name to display name mapping
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

const fraudAuditAliases = {
  data_preparation: "Data Persiapan",
  assignment_letter: "Surat Tugas",
  audit_working_papers: "KK Pemeriksaan",
  audit_report: "SHA",
  detailed_findings: "RTA"
};

type SortOrder = 'asc' | 'desc';

interface SortConfig {
  key: string;
  direction: SortOrder;
}

// Add this interface with your other interfaces
interface AuditorAuditCount {
  auditor_id: string;
  name: string;
  regular_count: number;
  fraud_count: number;
}

// Add this interface with your other interfaces
interface FraudDetailByRegion {
  region: string;
  totalFraudAmount: number;
  totalRecoveryAmount: number; // Add this line
  totalRegularAudit: number;
  totalSpecialAudit: number;
  totalFraudStaff: number;
}

const ManagerDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBranches: 0,
    regularAudits: 0,
    fraudAudits: 0,
    totalAuditors: 0,
    totalFraud: 0,
    fraudRecovery: 0,
    outstandingFraud: 0,
    specialAudits: 0
  });

  const [auditTrends, setAuditTrends] = useState<AuditTrend[]>([]);
  const [regularAudits, setRegularAudits] = useState<RegularAudit[]>([]);
  const [fraudAudits, setFraudAudits] = useState<FraudAudit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'regular' | 'fraud'>('regular');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'branch_name', direction: 'asc' });
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [isAuditorListOpen, setIsAuditorListOpen] = useState(false);
  const [fraudCases, setFraudCases] = useState<FraudCase[]>([]);
  const [selectedFraud, setSelectedFraud] = useState<FraudCase | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [fraudSearchTerm, setFraudSearchTerm] = useState('');
  const [fraudSortConfig, setFraudSortConfig] = useState<SortConfig>({ key: 'branch_name', direction: 'asc' });
  const [paymentHistory, setPaymentHistory] = useState<FraudPayment[]>([]);
  const [hkpAmountInput, setHkpAmountInput] = useState<number>(0);
  const [fromSalaryChecked, setFromSalaryChecked] = useState<boolean>(false);

  const [selectedRegionReport, setSelectedRegionReport] = useState<string>('ALL');
  const [reportUndoneOnly, setReportUndoneOnly] = useState(false);

  // Add this state
  const [auditorAuditCounts, setAuditorAuditCounts] = useState<AuditorAuditCount[]>([]);
  const [isAuditorAuditCountOpen, setIsAuditorAuditCountOpen] = useState(false);

  // Add this new state variable with your other state variables
  const [auditorSearchTerm, setAuditorSearchTerm] = useState('');

  // Add this state variable
  const [fraudDetailsByRegion, setFraudDetailsByRegion] = useState<FraudDetailByRegion[]>([]);

  // Add this state variable with your other state variables
  const [activeFraudTab, setActiveFraudTab] = useState<'data' | 'region'>('data');

  // Add this state at the top of your component with other state variables
  const [activeSection, setActiveSection] = useState<'main' | 'auditorCounts' | 'auditSummary' | 'fraudData'>('main');

  // Add this state
  const [supportAuditorSummary, setSupportAuditorSummary] = useState<{ auditor: string, inputAudit: number, supportingData: number }[]>([]);

  // Add these state variables at the top of ManagerDashboard component
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');


  // State Audit Rating Count
  const [auditRatingSummary, setAuditRatingSummary] = useState<{ high: number; medium: number; low: number }>({ high: 0, medium: 0, low: 0 });
  const [auditRatingByRegion, setAuditRatingByRegion] = useState<{ region: string; high: number; medium: number; low: number }[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [regionOptions, setRegionOptions] = useState<string[]>([]);

      // Data chart audit rating
  const getBarChartData = () => {
  if (selectedRegion === 'ALL') {
    return auditRatingByRegion.map(r => ({
      region: r.region,
      high: r.high,
      medium: r.medium,
      low: r.low,
    }));
  }
  const regionData = auditRatingByRegion.find(r => r.region === selectedRegion);
  return regionData ? [regionData] : [];
};

  // Pengambilan data audit rating
  const fetchAuditRatingSummary = async () => {
  try {
    const { data: workPapers } = await supabase
      .from('work_papers')
      .select('region, rating')
      .eq('audit_type', 'regular');

    // Rekap total
    const total = { high: 0, medium: 0, low: 0 };
    const regionMap: Record<string, { high: number; medium: number; low: number }> = {};

    workPapers?.forEach(wp => {
      const rating = wp.rating?.toLowerCase();
      if (rating === 'high' || rating === 'medium' || rating === 'low') {
      total[rating as 'high' | 'medium' | 'low']++;
      const region = wp.region || 'Unknown';
      if (!regionMap[region]) regionMap[region] = { high: 0, medium: 0, low: 0 };
      regionMap[region][rating as 'high' | 'medium' | 'low']++;
      }
      });

    // Sort region alphabetically
    const sortedRegions = Object.keys(regionMap).sort((a, b) => a.localeCompare(b));
    setRegionOptions(['ALL', ...sortedRegions]);
    setAuditRatingByRegion(
    sortedRegions.map(region => ({ region, ...regionMap[region] }))
      );
    setAuditRatingSummary(total);
     } catch (error) {
    console.error('Error fetching audit rating summary:', error);
     }
   };

    useEffect(() => {
    fetchAuditRatingSummary();
    }, []);

const getFilteredRatingSummary = () => {
  if (selectedRegion === 'ALL') {
    return auditRatingSummary;
  }
  const regionData = auditRatingByRegion.find(r => r.region === selectedRegion);
  return regionData
    ? { high: regionData.high, medium: regionData.medium, low: regionData.low }
    : { high: 0, medium: 0, low: 0 };
};

  useEffect(() => {
    const initializeDashboard = async () => {
      const hasAccess = await checkUserAccess(supabase);
      if (!hasAccess) {
        console.error('Unauthorized access to manager dashboard');
        return;
      }

      fetchDashboardData();
      fetchAuditRecapData();
      fetchAuditors();
      fetchFraudCases();
      fetchAuditorAuditCounts();
      fetchFraudDetailsByRegion(); // Add this line
      fetchSupportAuditorSummary();
    };

    initializeDashboard();
  }, []);

  // Tambahkan useEffect ini untuk reset input saat dialog dibuka
  useEffect(() => {
    if (isPaymentDialogOpen) {
      setHkpAmountInput(0);
      setFromSalaryChecked(false);
    }
  }, [isPaymentDialogOpen]);

  // Add this useEffect
  useEffect(() => {
    if (activeSection === 'auditorCounts') {
      fetchAuditorAuditCounts();
    }
  }, [startDate, endDate, activeSection]);

  const fetchSupportAuditorSummary = async () => {
  // Mapping nama lengkap ke alias auditor
  const ALIASES: Record<string, string> = {
    'Joey': 'Dede',
    'Ganjar Raharja': 'Ganjar',
    'Lise Roswati R.': 'Lise',
    'Lise Roswati Rochendi MP': 'Lise',
    'Ayu Sri Erian Agustin': 'Ayu',
    'Ayusri Erian Agustin': 'Ayu',
  };
  const AUDITORS = ['Ganjar', 'Dede', 'Lise', 'Ayu'];



  // 1. Ambil data input audit dari work_papers.inputted_by
  const { data: workPapers } = await supabase
    .from('work_papers')
    .select('inputted_by');

  // Hitung jumlah input audit per auditor
  const inputAuditCount: Record<string, number> = {};
  AUDITORS.forEach(auditor => inputAuditCount[auditor] = 0);
  workPapers?.forEach(wp => {
    if (AUDITORS.includes(wp.inputted_by)) {
      inputAuditCount[wp.inputted_by]++;
    }
  });

  // 2. Ambil data supporting dari pull_requests.uploader
  const { data: pullRequests } = await supabase
    .from('pull_requests')
    .select('uploader');

  // Hitung jumlah supporting data per auditor (mapping alias)
  const supportingDataCount: Record<string, number> = {};
  AUDITORS.forEach(auditor => supportingDataCount[auditor] = 0);
  pullRequests?.forEach(pr => {
    let mapped = pr.uploader;
    if (ALIASES[mapped]) mapped = ALIASES[mapped];
    if (AUDITORS.includes(mapped)) {
      supportingDataCount[mapped]++;
    }
  });

  // Gabungkan ke summary
  const summary = AUDITORS.map(auditor => ({
    auditor,
    inputAudit: inputAuditCount[auditor] || 0,
    supportingData: supportingDataCount[auditor] || 0,
  }));

  setSupportAuditorSummary(summary);
};

  const fetchDashboardData = async () => {
    try {
      const { data: branchesData } = await supabase
        .from('branches')
        .select('name', { count: 'exact' });

      // Fetch all work papers for counting
      const { data: workPapersData } = await supabase
        .from('work_papers')
        .select(`
          id,
          branch_name,
          audit_start_date,
          audit_end_date,
          audit_type,
          fraud_amount,
          fraud_staff,
          fraud_payments_audits (
            hkp_amount
          )
        `);

      // Count regular audits
      const regularAudits = workPapersData?.filter(wp => wp.audit_type === 'regular').length || 0;

      // Count unique fraud staff (removing duplicates)
      const uniqueFraudStaffSet = new Set();
      workPapersData?.forEach(wp => {
        if (wp.fraud_staff && wp.fraud_staff.trim() !== '') {
          uniqueFraudStaffSet.add(wp.fraud_staff.trim().toLowerCase());
        }
      });
      
      const fraudCases = uniqueFraudStaffSet.size;

      // Fetch special audits from audit_fraud table where pic is not empty
      const { data: specialAuditsData } = await supabase
        .from('audit_fraud')
        .select('id')
        .not('pic', 'is', null)
        .neq('pic', '');

      const specialAudits = specialAuditsData?.length || 0;

      // Fetch total auditors
      const { data: auditorsData } = await supabase
        .from('auditors')
        .select('name', { count: 'exact' });

      // Calculate fraud amounts
      const totalFraud = workPapersData?.reduce((sum, wp) => 
        wp.audit_type === 'fraud' ? sum + (wp.fraud_amount || 0) : sum, 0
      ) || 0;

      const fraudRecovery = workPapersData?.reduce((sum, wp) => {
        if (wp.audit_type === 'fraud') {
          const hkpAmount = wp.fraud_payments_audits?.[0]?.hkp_amount || 0;
          return sum + hkpAmount;
        }
        return sum;
      }, 0) || 0;

      const outstandingFraud = totalFraud - fraudRecovery;

      setStats({
        totalBranches: branchesData?.length || 0,
        regularAudits,
        specialAudits,
        fraudAudits: fraudCases, // This is the count of unique fraud staff
        totalAuditors: auditorsData?.length || 0,
        totalFraud, // This is the fraud amount in currency
        fraudRecovery,
        outstandingFraud
      });

      // Fetch and process audit trends
      if (workPapersData) {
        const monthlyData = processAuditTrends(workPapersData);
        setAuditTrends(monthlyData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

const fetchAuditRecapData = async () => {
  try {
    // Fetch regular audits
    const { data: regularData, error: regularError } = await supabase
      .from('audit_regular')
      .select('*, pic'); // Include the 'pic' field

    if (regularError) throw regularError;

    // Fetch fraud audits
    const { data: fraudData, error: fraudError } = await supabase
      .from('audit_fraud')
      .select('*, pic'); // Include the 'pic' field

    if (fraudError) throw fraudError;

    // Tampilkan semua regular audit di Report
    setRegularAudits(regularData || []);
    setFraudAudits(fraudData || []);
  } catch (error) {
    console.error('Error fetching audit recap data:', error);
  }
};

  const fetchAuditors = async () => {
    try {
      const { data, error } = await supabase
        .from('auditors')
        .select('name, auditor_id');
      
      if (error) {
        console.error('Error fetching auditors:', error);
        return;
      }
      
      setAuditors(data || []);
    } catch (error) {
      console.error('Error fetching auditors:', error);
      setAuditors([]);
    }
  };

  const fetchFraudCases = async () => {
    try {
      const { data: fraudData, error: fraudError } = await supabase
        .from('work_papers')
        .select(`
          id,
          branch_name,
          fraud_amount,
          fraud_staff,
          fraud_payments_audits (
            id,
            hkp_amount,
            payment_date,
            notes,
            from_salary
          )
        `)
        .eq('audit_type', 'fraud');

      if (fraudError) throw fraudError;

      // Get all branches to map regions
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('name, region');
      
      if (branchesError) throw branchesError;
      
      // Create a lookup map for regions by branch name
      const branchRegionMap = {};
      branchesData?.forEach(branch => {
        branchRegionMap[branch.name] = branch.region;
      });

      // Add region to each fraud case
      const fraudCasesWithRegion = fraudData?.map(fraud => ({
        ...fraud,
        region: branchRegionMap[fraud.branch_name] || 'Unknown'
      })) || [];

      setFraudCases(fraudCasesWithRegion);
    } catch (error) {
      console.error('Error fetching fraud cases:', error);
    }
  };

  const fetchPaymentHistory = async (fraudId: string) => {
    try {
      const { data, error } = await supabase
        .from('fraud_payments_audits')
        .select('*')
        .eq('work_paper_id', fraudId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      
      setPaymentHistory(data || []);
      setIsHistoryDialogOpen(true);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  // Add this function with your other fetch functions (after fetchPaymentHistory)
  const fetchFraudDetailsByRegion = async () => {
    try {
      // 1. Get all branches with their regions
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('name, region');
      
      if (branchesError) throw branchesError;
      
      // Create a lookup map for regions by branch name
      const branchRegionMap = {};
      branchesData?.forEach(branch => {
        branchRegionMap[branch.name] = branch.region;
      });
      
      // Get unique regions
      const regions = [...new Set(branchesData?.map(branch => branch.region))];
      
      // 2. Fetch work_papers data with fraud_payments_audits information
      const { data: workPapersData, error: workPapersError } = await supabase
        .from('work_papers')
        .select(`
          branch_name, 
          fraud_amount, 
          audit_type, 
          fraud_staff,
          fraud_payments_audits (
            hkp_amount,
            from_salary
          )
        `);
      
      if (workPapersError) throw workPapersError;
      
      // 3. Fetch regular audits
      const { data: regularAuditData, error: regularAuditError } = await supabase
        .from('audit_regular')
        .select('branch_name');
      
      if (regularAuditError) throw regularAuditError;
      
      // Process data by region
      const fraudDetailsByRegion = regions.map(region => {
        // Filter work papers for this region with audit_type='fraud'
        const regionFraudWorkPapers = workPapersData?.filter(wp => 
          branchRegionMap[wp.branch_name] === region && 
          wp.audit_type === 'fraud'
        ) || [];
        
        // Calculate total fraud amount for this region
        const fraudAmount = regionFraudWorkPapers
          .reduce((sum, wp) => sum + (wp.fraud_amount || 0), 0);
        
        // Calculate total recovery amount for this region
        const recoveryAmount = regionFraudWorkPapers
          .reduce((sum, wp) => {
            const hkpAmount = wp.fraud_payments_audits?.[0]?.hkp_amount || 0;
            // If payment is from salary, count the full fraud amount as recovered
            const fromSalary = wp.fraud_payments_audits?.[0]?.from_salary || false;
            return sum + (fromSalary ? wp.fraud_amount || 0 : hkpAmount);
          }, 0) || 0;
        
        // Count regular audits for this region
        const regularAuditCount = regularAuditData
          ?.filter(audit => branchRegionMap[audit.branch_name] === region)
          .length || 0;
        
        // Count special audits for this region - Using work_papers where audit_type='fraud'
        const specialAuditCount = regionFraudWorkPapers.length;
        
        // Count fraud staff cases for this region
        const fraudStaffSet = new Set();
        regionFraudWorkPapers
          .filter(wp => wp.fraud_staff && wp.fraud_staff.trim() !== '')
          .forEach(wp => {
            // Count unique fraud staff names
            fraudStaffSet.add(wp.fraud_staff.trim().toLowerCase());
          });
        
        return {
          region,
          totalFraudAmount: fraudAmount,
          totalRecoveryAmount: recoveryAmount, // Add recovery amount
          totalRegularAudit: regularAuditCount,
          totalSpecialAudit: specialAuditCount,
          totalFraudStaff: fraudStaffSet.size
        };
      });
      
      // Sort by region name and filter out empty regions
      const sortedFraudDetails = fraudDetailsByRegion
        .filter(detail => detail.totalFraudAmount > 0 || detail.totalRegularAudit > 0 || 
                 detail.totalSpecialAudit > 0 || detail.totalFraudStaff > 0)
        .sort((a, b) => a.region.localeCompare(b.region));
      
      setFraudDetailsByRegion(sortedFraudDetails);
    } catch (error) {
      console.error('Error fetching fraud details by region:', error);
    }
  };

  const processAuditTrends = (workPapers: any[]) => {
    // Initialize monthly audits counter
    const monthlyAudits: { [key: string]: { regular: number; fraud: number } } = {};
    
    // Initialize all months with zero counts
    MONTHS.forEach(month => {
      monthlyAudits[month] = { regular: 0, fraud: 0 };
    });

    // Process work papers
    workPapers.forEach(paper => {
      if (paper.audit_end_date) {
        const month = format(parseISO(paper.audit_end_date), 'MMM');
        
        if (monthlyAudits[month]) {
          if (paper.audit_type === 'regular') {
            monthlyAudits[month].regular++;
          } else if (paper.audit_type === 'fraud') {
            monthlyAudits[month].fraud++;
          }
        }
      }
    });

    // Convert to array format for chart
    return MONTHS.map(month => ({
      month,
      regular: monthlyAudits[month].regular,
      fraud: monthlyAudits[month].fraud,
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleDownload = () => {
    try {
      let dataToExport;
      
      if (activeTab === 'regular') {
        dataToExport = regularAudits.map(audit => {
          const formattedAudit = { ...audit };
          // Add a new field with a list of failed checks using aliases
          formattedAudit['failed_checks'] = Object.entries(audit)
            .filter(([key, value]) => 
              typeof value === 'boolean' && 
              !value && 
              regularAuditAliases[key]
            )
            .map(([key]) => regularAuditAliases[key])
            .join(', ');
          
          return formattedAudit;
        });
      } else {
        dataToExport = fraudAudits.map(audit => {
          const formattedAudit = { ...audit };
          // Add a new field with a list of failed checks using aliases
          formattedAudit['failed_checks'] = Object.entries(audit)
            .filter(([key, value]) => 
              typeof value === 'boolean' && 
              !value && 
              fraudAuditAliases[key]
            )
            .map(([key]) => fraudAuditAliases[key])
            .join(', ');
          
          return formattedAudit;
        });
      }
      
      const fileName = `${activeTab}_audit_recap.xlsx`;

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Summary: Incomplete Documentation (Special & Regular)');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, fileName);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const handleDownloadAuditors = () => {
    try {
      const fileName = 'auditors_list.xlsx';
      const worksheet = XLSX.utils.json_to_sheet(auditors);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditors');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, fileName);
    } catch (error) {
      console.error('Error downloading auditors list:', error);
    }
  };

  // Add this function in the ManagerDashboard component
  const handleDownloadAllReports = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // 1. List of Auditors sheet
      const auditorsWorksheet = XLSX.utils.json_to_sheet(auditors);
      XLSX.utils.book_append_sheet(workbook, auditorsWorksheet, 'List of Auditors');
      
      // 2. Audit Trends sheet
      const trendsWorksheet = XLSX.utils.json_to_sheet(auditTrends);
      XLSX.utils.book_append_sheet(workbook, trendsWorksheet, 'Audit Trends');
      
      // 3. Audit Counts Per Auditor sheet
      const auditorCountsForExport = auditorAuditCounts.map(auditor => ({
        No: auditorAuditCounts.indexOf(auditor) + 1,
        Auditor_Name: auditor.name,
        Regular_Audits: auditor.regular_count,
        Special_Audits: auditor.fraud_count,
        Total_Audits: auditor.regular_count + auditor.fraud_count
      }));
      const auditorCountsWorksheet = XLSX.utils.json_to_sheet(auditorCountsForExport);
      XLSX.utils.book_append_sheet(workbook, auditorCountsWorksheet, 'Audit Counts Per Auditor');
      
      // 4. Support Auditor Summary sheet
      const supportAuditorForExport = supportAuditorSummary.map((summary, index) => ({
        No: index + 1,
        Auditor: summary.auditor,
        Input_Audit: summary.inputAudit,
        Supporting_Data: summary.supportingData,
        Total: summary.inputAudit + summary.supportingData
      }));
      const supportAuditorWorksheet = XLSX.utils.json_to_sheet(supportAuditorForExport);
      XLSX.utils.book_append_sheet(workbook, supportAuditorWorksheet, 'Support Auditor Summary');
      
      // 5. Regular Audits sheet (Incomplete Documentation)
      const regularAuditsForExport = regularAudits.map((audit, index) => {
        const failedChecks = Object.entries(audit)
          .filter(([key, value]) => 
            typeof value === 'boolean' && 
            !value && 
            regularAuditAliases[key]
          )
          .map(([key]) => regularAuditAliases[key])
          .join(', ');
        
        return {
          No: index + 1,
          Branch_Name: audit.branch_name,
          Region: audit.region,
          Monitoring: audit.monitoring,
          PIC: audit.pic || 'N/A',
          Failed_Checks: failedChecks,
          DAPA: audit.dapa ? 'Complete' : 'Incomplete',
          DAPA_Perubahan: audit.revised_dapa ? 'Complete' : 'Incomplete',
          Data_Dukung_DAPA: audit.dapa_supporting_data ? 'Complete' : 'Incomplete',
          Surat_Tugas: audit.assignment_letter ? 'Complete' : 'Incomplete',
          Entrance_Agenda: audit.entrance_agenda ? 'Complete' : 'Incomplete',
          Absensi_Entrance: audit.entrance_attendance ? 'Complete' : 'Incomplete',
          KK_Pemeriksaan: audit.audit_working_papers ? 'Complete' : 'Incomplete',
          BA_Exit_Meeting: audit.exit_meeting_minutes ? 'Complete' : 'Incomplete',
          Absensi_Exit: audit.exit_attendance_list ? 'Complete' : 'Incomplete',
          LHA: audit.audit_result_letter ? 'Complete' : 'Incomplete',
          RTA: audit.rta ? 'Complete' : 'Incomplete'
        };
      });
      const regularWorksheet = XLSX.utils.json_to_sheet(regularAuditsForExport);
      XLSX.utils.book_append_sheet(workbook, regularWorksheet, 'Regular Audits - Incomplete');
      
      // 6. Fraud Audits sheet (Incomplete Documentation)
      const fraudAuditsForExport = fraudAudits.map((audit, index) => {
        const failedChecks = Object.entries(audit)
          .filter(([key, value]) => 
            typeof value === 'boolean' && 
            !value && 
            fraudAuditAliases[key]
          )
          .map(([key]) => fraudAuditAliases[key])
          .join(', ');
        
        return {
          No: index + 1,
          Branch_Name: audit.branch_name,
          Region: audit.region,
          PIC: audit.pic || 'N/A',
          Review: audit.review,
          Failed_Checks: failedChecks,
          Data_Persiapan: audit.data_preparation ? 'Complete' : 'Incomplete',
          Surat_Tugas: audit.assignment_letter ? 'Complete' : 'Incomplete',
          KK_Pemeriksaan: audit.audit_working_papers ? 'Complete' : 'Incomplete',
          SHA: audit.audit_report ? 'Complete' : 'Incomplete',
          RTA: audit.detailed_findings ? 'Complete' : 'Incomplete'
        };
      });
      const fraudAuditWorksheet = XLSX.utils.json_to_sheet(fraudAuditsForExport);
      XLSX.utils.book_append_sheet(workbook, fraudAuditWorksheet, 'Special Audits - Incomplete');
      
      // 7. Fraud Cases Data sheet
      const fraudDataForExport = fraudCases.map((fraud, index) => ({
        No: index + 1,
        Region: fraud.region,
        Branch_Name: fraud.branch_name,
        Fraud_Staff: fraud.fraud_staff,
        Fraud_Amount: fraud.fraud_amount,
        HKP_Amount: fraud.fraud_payments_audits?.[0]?.hkp_amount || 0,
        Payment_Date: fraud.fraud_payments_audits?.[0]?.payment_date || '',
        From_Salary: fraud.fraud_payments_audits?.[0]?.from_salary ? 'Yes' : 'No',
        Notes: fraud.fraud_payments_audits?.[0]?.notes || '',
        Payment_Status: isPaymentComplete(fraud) ? 'Complete' : 'Incomplete',
        Outstanding_Amount: fraud.fraud_amount - (fraud.fraud_payments_audits?.[0]?.hkp_amount || 0)
      }));
      const fraudDataWorksheet = XLSX.utils.json_to_sheet(fraudDataForExport);
      XLSX.utils.book_append_sheet(workbook, fraudDataWorksheet, 'Fraud Cases Data');
      
      // 8. Fraud by Region sheet
      const fraudByRegionForExport = fraudDetailsByRegion.map((detail, index) => ({
        No: index + 1,
        Region: detail.region,
        Total_Fraud_Amount: detail.totalFraudAmount,
        Fraud_Recovery: detail.totalRecoveryAmount,
        Outstanding_Fraud: detail.totalFraudAmount - detail.totalRecoveryAmount,
        Total_Regular_Audit: detail.totalRegularAudit,
        Total_Special_Audit: detail.totalSpecialAudit,
        Total_Fraud_Staff: detail.totalFraudStaff,
        Recovery_Percentage: detail.totalFraudAmount > 0 ? 
          ((detail.totalRecoveryAmount / detail.totalFraudAmount) * 100).toFixed(2) + '%' : '0%'
      }));
      const fraudByRegionWorksheet = XLSX.utils.json_to_sheet(fraudByRegionForExport);
      XLSX.utils.book_append_sheet(workbook, fraudByRegionWorksheet, 'Fraud by Region');
      
      // 9. Dashboard Statistics sheet
      const dashboardStatsForExport = [
        { Metric: 'Total Branches', Value: stats.totalBranches },
        { Metric: 'Regular Audits', Value: stats.regularAudits },
        { Metric: 'Special Audits', Value: stats.specialAudits },
        { Metric: 'Fraud Cases', Value: stats.fraudAudits },
        { Metric: 'Total Auditors', Value: stats.totalAuditors },
        { Metric: 'Total Fraud Amount', Value: stats.totalFraud },
        { Metric: 'Fraud Recovery', Value: stats.fraudRecovery },
        { Metric: 'Outstanding Fraud', Value: stats.outstandingFraud },
        { Metric: 'Recovery Percentage', Value: stats.totalFraud > 0 ? 
          ((stats.fraudRecovery / stats.totalFraud) * 100).toFixed(2) + '%' : '0%' }
      ];
      const dashboardStatsWorksheet = XLSX.utils.json_to_sheet(dashboardStatsForExport);
      XLSX.utils.book_append_sheet(workbook, dashboardStatsWorksheet, 'Dashboard Statistics');
      
      // Generate and download the Excel file
      const fileName = `manager_dashboard_complete_report_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, fileName);
      
      console.log('Complete report downloaded successfully with all data sheets');
    } catch (error) {
      console.error('Error generating complete report:', error);
      alert('Error generating report. Please try again.');
    }
  };

  // Handle sorting
  const requestSort = (key: string) => {
    let direction: SortOrder = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const requestFraudSort = (key: string) => {
    let direction: SortOrder = 'asc';
    if (fraudSortConfig.key === key && fraudSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setFraudSortConfig({ key, direction });
  };

  // Function to get sorted data
  const getSortedData = (data: any[]) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getSortedFraudData = (data: FraudCase[]) => {
    if (!fraudSortConfig.key) return data;

    return [...data].sort((a, b) => {
      if (a[fraudSortConfig.key] < b[fraudSortConfig.key]) {
        return fraudSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[fraudSortConfig.key] > b[fraudSortConfig.key]) {
        return fraudSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Function to get failed checks with aliases
  const getFailedChecksWithAliases = (audit: any, isRegular: boolean) => {
    const aliases = isRegular ? regularAuditAliases : fraudAuditAliases;
    
    return Object.entries(audit)
      .filter(([key, value]) => 
        typeof value === 'boolean' && 
        !value && 
        aliases[key]
      )
      .map(([key]) => aliases[key])
      .join(', ');
  };

  const isPaymentComplete = (fraud: FraudCase) => {
    const payment = fraud.fraud_payments_audits?.[0];
    if (!payment) return false;
    return (
      (payment.hkp_amount > 0 && payment.hkp_amount === fraud.fraud_amount) ||
      payment.from_salary === true
    );
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFraud) return;

    try {
      const formElement = e.target as HTMLFormElement;
      const formData = new FormData(formElement);

      const paymentDate = formData.get('payment_date') as string;
      const fromSalary = formData.get('from_salary') === 'on';
      const notes = formData.get('notes') as string || '';

      // Gunakan nilai dari state - ini akan tetap 0 kecuali user mengubahnya secara manual
      const hkpAmount = hkpAmountInput;

      const paymentData = {
        work_paper_id: selectedFraud.id,
        hkp_amount: hkpAmount,
        payment_date: paymentDate,
        from_salary: fromSalary,
        notes: notes
      };

      const { error } = await supabase
        .from('fraud_payments_audits')
        .insert([paymentData]);

      if (error) throw error;

      setIsPaymentDialogOpen(false);
      fetchFraudCases();
    } catch (error) {
      console.error('Error submitting payment:', error);
    }
  };

  const handleDeletePayment = async (fraudId: string) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;

    try {
      const { error } = await supabase
        .from('fraud_payments_audits')
        .delete()
        .eq('work_paper_id', fraudId);

      if (error) throw error;
      fetchFraudCases();
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  // Apply filtering and sorting
  const filteredAudits = activeTab === 'regular' 
    ? regularAudits.filter(audit => 
        audit.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.region.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : fraudAudits.filter(audit =>
        audit.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.region.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const sortedAudits = getSortedData(filteredAudits);

  const filteredFraudCases = fraudCases.filter(fraud =>
    fraud.branch_name.toLowerCase().includes(fraudSearchTerm.toLowerCase()) ||
    fraud.fraud_staff.toLowerCase().includes(fraudSearchTerm.toLowerCase()) ||
    fraud.region.toLowerCase().includes(fraudSearchTerm.toLowerCase())
  );

  const sortedFraudCases = getSortedFraudData(filteredFraudCases);

  const fetchAuditorAuditCounts = async () => {
    try {
      // Auditor mapping tetap sama seperti sebelumnya
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
      
      // Initialize counts for all auditors
      const auditorCounts = {};
      auditorMapping.forEach(auditor => {
        auditorCounts[auditor.value] = {
          auditor_id: auditor.value,
          name: auditor.label,
          regular_count: 0,
          fraud_count: 0
        };
      });
      
      // Create mapping from auditor_name in database to our auditor values
      // This handles both matching full lowercase names and short codes
      const nameToValueMap = {};
      
      // First, map direct values (short codes like 'buldani', 'yogi', etc.)
      auditorMapping.forEach(auditor => {
        nameToValueMap[auditor.value] = auditor.value;
        nameToValueMap[auditor.value.toLowerCase()] = auditor.value;
      });
      
      // Second, map from auditor names to their code values
      auditorMapping.forEach(auditor => {
        // Map full names (case insensitive)
        nameToValueMap[auditor.label.toLowerCase()] = auditor.value;
        
        // Map first names (many db entries just use first names)
        const firstName = auditor.label.split(' ')[0].toLowerCase();
        if (!nameToValueMap[firstName]) {
          nameToValueMap[firstName] = auditor.value;
        }
        
        // Add special case for shortened or common names
        if (auditor.label.includes('Ayu')) nameToValueMap['eri'] = auditor.value;
        if (auditor.label.includes('Lise')) nameToValueMap['lise'] = auditor.value;
      });
      
      console.log('Name mapping created:', nameToValueMap);
      
      // Fetch regular audit counts
      let regularQuery = supabase
        .from('audit_counts')
        .select('*')
        .eq('audit_type', 'regular');
    
      // Fetch fraud audit counts
      let fraudQuery = supabase
        .from('audit_counts')
        .select('*')
        .eq('audit_type', 'fraud');
    
      // Add date filters if provided
      if (startDate && endDate) {
        regularQuery = regularQuery.gte('audit_end_date', startDate).lte('audit_end_date', endDate);
        fraudQuery = fraudQuery.gte('audit_end_date', startDate).lte('audit_end_date', endDate);
      }
    
      // Execute queries
      const { data: regularCounts, error: regularError } = await regularQuery;
      if (regularError) throw regularError;
      console.log('Regular counts fetched:', regularCounts?.length);
      
      const { data: fraudCounts, error: fraudError } = await fraudQuery;
      if (fraudError) throw fraudError;
      console.log('Fraud counts fetched:', fraudCounts?.length);
      
      // Struktur untuk melacak audit unik per auditor berdasarkan branch_name dan audit_end_date
      const uniqueRegularAudits = {}; // {auditor_id: Set("branch_name|audit_end_date")}
      const uniqueFraudAudits = {};
      
      // Process regular audits - dengan penghapusan duplikat
      regularCounts?.forEach(record => {
        const auditorName = record.auditor_name?.toLowerCase();
        if (!auditorName) return;
        
        // Find the matching auditor value
        const auditorValue = nameToValueMap[auditorName];
        if (auditorValue && auditorCounts[auditorValue]) {
          // Buat kunci unik dari branch_name dan audit_end_date
          const uniqueKey = `${record.branch_name}|${record.audit_end_date}`;
          
          // Inisialisasi set jika belum ada
          if (!uniqueRegularAudits[auditorValue]) {
            uniqueRegularAudits[auditorValue] = new Set();
          }
          
          // Hanya tambahkan count jika kunci belum ada (audit unik)
          if (!uniqueRegularAudits[auditorValue].has(uniqueKey)) {
            uniqueRegularAudits[auditorValue].add(uniqueKey);
            auditorCounts[auditorValue].regular_count += 1;
            console.log(`Counted unique regular audit for "${auditorName}": ${uniqueKey}`);
          } else {
            console.log(`Skipped duplicate regular audit for "${auditorName}": ${uniqueKey}`);
          }
        }
      });
      
      // Process fraud audits - dengan penghapusan duplikat
      fraudCounts?.forEach(record => {
        const auditorName = record.auditor_name?.toLowerCase();
        if (!auditorName) return;
        
        // Find the matching auditor value
        const auditorValue = nameToValueMap[auditorName];
        if (auditorValue && auditorCounts[auditorValue]) {
          // Buat kunci unik dari branch_name dan audit_end_date
          const uniqueKey = `${record.branch_name}|${record.audit_end_date}`;
          
          // Inisialisasi set jika belum ada
          if (!uniqueFraudAudits[auditorValue]) {
            uniqueFraudAudits[auditorValue] = new Set();
          }
          
          // Hanya tambahkan count jika kunci belum ada (audit unik)
          if (!uniqueFraudAudits[auditorValue].has(uniqueKey)) {
            uniqueFraudAudits[auditorValue].add(uniqueKey);
            auditorCounts[auditorValue].fraud_count += 1;
            console.log(`Counted unique fraud audit for "${auditorName}": ${uniqueKey}`);
          } else {
            console.log(`Skipped duplicate fraud audit for "${auditorName}": ${uniqueKey}`);
          }
        }
      });
      
      // Convert to array and sort - ini tetap sama
      const countsArray = Object.values(auditorCounts).map(auditor => ({
        auditor_id: auditor.auditor_id,
        name: auditor.name, // <-- PASTIKAN INI DARI MAPPING, BUKAN DARI DB
        regular_count: auditor.regular_count,
        fraud_count: auditor.fraud_count,
        total: auditor.regular_count + auditor.fraud_count
      }));
      
      // Filter auditors with counts and sort by total
      const filteredCounts = countsArray
        .filter(auditor => auditor.regular_count > 0 || auditor.fraud_count > 0)
        .sort((a, b) => (b.regular_count + b.fraud_count) - (a.regular_count + a.fraud_count));
      
      console.log('Filtered auditor counts:', filteredCounts.length);
      
      // Set the state - use filtered if available, otherwise alphabetical
      if (filteredCounts.length > 0) {
        setAuditorAuditCounts(filteredCounts);
      } else {
        setAuditorAuditCounts(countsArray.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      console.error('Error fetching auditor audit counts:', error);
    }
  };

  const handleExportAuditorCounts = () => {
    try {
      const fileName = 'auditor_audit_counts.xlsx';
      const worksheet = XLSX.utils.json_to_sheet(auditorAuditCounts);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditor Counts');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, fileName);
    } catch (error) {
      console.error('Error downloading auditor counts:', error);
    }
  };

  // Add this function to the ManagerDashboard component
  const handleDownloadChartImage = () => {
    const chartElement = document.querySelector('.recharts-wrapper') as HTMLElement;
    if (!chartElement) {
      console.error('Chart element not found');
      return;
    }

    html2canvas(chartElement).then(canvas => {
      canvas.toBlob(blob => {
        if (blob) {
          saveAs(blob, `audit_trends_chart_${format(new Date(), 'yyyy-MM-dd')}.png`);
        }
      });
    }).catch(error => {
      console.error('Error generating chart image:', error);
    });
  };

  const SUPPORT_AUDITOR_ALIASES: Record<string, string> = {
    'Joey': 'Dede',
    'Ganjar Raharja': 'Ganjar',
    'Lise Roswati R.': 'Lise',
    'Ayu Sri Erian Agustin': 'Ayu',
    // Tambahkan jika ada nama lain yang perlu di-mapping
  };
  const SUPPORT_AUDITORS = ['Ganjar', 'Dede', 'Lise', 'Ayu'];

  // Tambahkan state untuk workPapersRegular
const [workPapersRegular, setWorkPapersRegular] = useState<any[]>([]);

// Tambahkan useEffect untuk mengambil data work_papers regular
useEffect(() => {
  const fetchWorkPapersRegular = async () => {
    const { data, error } = await supabase
      .from('work_papers')
      .select('branch_name')
      .eq('audit_type', 'regular');
    if (!error) setWorkPapersRegular(data || []);
  };
  fetchWorkPapersRegular();
}, []);

  // Modify the Audit Trends Chart section to include the download image button
  return (
    <div className="p-0 space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manager Dashboard</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleDownloadAllReports}
            className="Download-button"
          >
            <svg
              viewBox="0 0 640 512"
              width="20"
              height="16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="white"
                d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
              ></path>
            </svg>
            <span>Download All Reports</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="relative flex w-full overflow-hidden rounded-[10px] border border-[#35343439] bg-white text-black mb-10">
        <label className="flex w-full cursor-pointer items-center justify-center p-3 font-semibold tracking-tight text-sm peer-checked:text-white transition-colors relative z-10">
          <input
            type="radio"
            name="managerTab"
            value="auditorCounts"
            checked={activeSection === 'auditorCounts'}
            onChange={() => setActiveSection('auditorCounts')}
            className="hidden peer"
          />
          <span className={activeSection === 'auditorCounts' ? 'text-white' : 'text-gray-700'}>
            Auditor Performa
          </span>
        </label>
        <label className="flex w-full cursor-pointer items-center justify-center p-3 font-semibold tracking-tight text-sm peer-checked:text-white transition-colors relative z-10">
          <input
            type="radio"
            name="managerTab"
            value="auditSummary"
            checked={activeSection === 'auditSummary'}
            onChange={() => setActiveSection('auditSummary')}
            className="hidden peer"
          />
          <span className={activeSection === 'auditSummary' ? 'text-white' : 'text-gray-700'}>
            Audit Summary
          </span>
        </label>
        <label className="flex w-full cursor-pointer items-center justify-center p-3 font-semibold tracking-tight text-sm peer-checked:text-white transition-colors relative z-10">
          <input
            type="radio"
            name="managerTab"
            value="fraudData"
            checked={activeSection === 'fraudData'}
            onChange={() => setActiveSection('fraudData')}
            className="hidden peer"
          />
          <span className={activeSection === 'fraudData' ? 'text-white' : 'text-gray-700'}>
            Fraud Data
          </span>
        </label>
        <label className="flex w-full cursor-pointer items-center justify-center p-3 font-semibold tracking-tight text-sm peer-checked:text-white transition-colors relative z-10">
          <input
            type="radio"
            name="managerTab"
            value="main"
            checked={activeSection === 'main'}
            onChange={() => setActiveSection('main')}
            className="hidden peer"
          />
          <span className={activeSection === 'main' ? 'text-white' : 'text-gray-700'}>
            Overview
          </span>
        </label>
        <span 
          className={`absolute top-0 h-full w-1/4 bg-indigo-600 transition-all duration-300 ease-in-out z-0 ${
            activeSection === 'auditorCounts' ? 'left-0' : 
            activeSection === 'auditSummary' ? 'left-1/4' : 
            activeSection === 'fraudData' ? 'left-2/4' : 
            'left-3/4'
          }`}
        />
      </div>

      {/* Main Dashboard Section - Always visible */}
      {activeSection === 'main' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-9 gap-2 mt-">
            <Card className="col-span-3 min-h-[80px] flex items-center">
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Branch</p>
                  <p className="text-base font-bold"><CountUp to={stats.totalBranches} duration={1.5} /></p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3 min-h-[80px] flex items-center">
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Audit</p>
                  <div className="flex flex-col">
                    <span className="text-xs text-green-500 font-semibold">
                      <CountUp to={stats.regularAudits} duration={1.5} /> Regular
                    </span>
                    <span className="text-xs text-red-500 font-semibold">
                      <CountUp to={stats.specialAudits} duration={1.5} /> Special Audit
                    </span>
                    <span className="text-xs text-yellow-500 font-semibold">
                      <CountUp to={stats.fraudAudits || 0} duration={1.5} /> Fraud Cases
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="col-span-3 min-h-[80px] flex items-center cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setIsAuditorListOpen(true);
                fetchAuditors();
              }}
            >
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Auditors</p>
                  <p className="text-base font-bold"><CountUp to={stats.totalAuditors} duration={1.5} /></p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3 min-h-[80px] flex items-center">
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Fraud</p>
                  <p className="text-base font-bold text-red-600"><CountUp to={stats.totalFraud} duration={1.5} prefix="Rp " separator="," /></p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3 min-h-[80px] flex items-center">
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Fraud Recovery</p>
                  <p className="text-base font-bold text-emerald-600"><CountUp to={stats.fraudRecovery} duration={1.5} prefix="Rp " separator="," /></p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3 min-h-[80px] flex items-center">
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ArrowDown className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Outstanding Fraud</p>
                  <p className="text-base font-bold text-yellow-600"><CountUp to={stats.outstandingFraud} duration={1.5} prefix="Rp " separator="," /></p>
                </div>
              </CardContent>
            </Card>
          </div>

         {/* Audit Trends Chart */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Audit Trends</h2>
                <button
                  onClick={handleDownloadChartImage}
                  className="Download-button Download-button-sm"
                >
                  <svg
                    viewBox="0 0 640 512"
                    width="20"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill="white"
                      d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
                    ></path>
                  </svg>
                  <span>Download Chart</span>
                </button>
              </div>
              <ChartContainer config={auditTrendsConfig} className="h-[400px] w-full">
                <BarChart data={auditTrends} height={350} width={undefined}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Legend />
                  <Bar dataKey="regular" name="Regular" fill="#50C878" radius={4} />
                  <Bar dataKey="fraud" name="Fraud" fill="#e74c3c" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}


      {/* Audit Counts Per Auditor Section */}
      {activeSection === 'auditorCounts' && (
        <>
          {/* Audit Counts Per Auditor */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Audit Counts Per Auditor</h2>
                <div className="flex items-center gap-4">
                  {/* Date Filter Controls - Shadcn Version */}
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="justify-start text-xs h-9 px-3 py-1 w-[240px]"
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {startDate && endDate ? (
                            <span>
                              {format(parseISO(startDate), "PPP")} - {format(parseISO(endDate), "PPP")}
                            </span>
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={startDate ? parseISO(startDate) : new Date()}
                          selected={{
                            from: startDate ? parseISO(startDate) : undefined,
                            to: endDate ? parseISO(endDate) : undefined,
                          }}
                          onSelect={(range: DateRange | undefined) => {
                            if (range?.from) {
                              setStartDate(format(range.from, "yyyy-MM-dd"));
                            } else {
                              setStartDate("");
                            }
                            if (range?.to) {
                              setEndDate(format(range.to, "yyyy-MM-dd"));
                            } else {
                              setEndDate("");
                            }
                          }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Button
                      onClick={() => fetchAuditorAuditCounts()}
                      className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                      size="sm"
                    >
                      Apply Filter
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        fetchAuditorAuditCounts();
                      }}
                      variant="outline"
                      className="h-9 text-xs"
                      size="sm"
                    >
                      Reset
                    </Button>
                  </div>
                  
                  {/* Existing Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={auditorSearchTerm}
                      onChange={(e) => setAuditorSearchTerm(e.target.value)}
                      placeholder="Search auditor..."
                      className="pl-9 pr-2 py-1.5 text-xs border rounded-md w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 w-12">
                        No.
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Auditor
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Regular Audits
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Special Audits
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditorAuditCounts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                          No data available. Try clearing filters.
                        </td>
                      </tr>
                    ) : (
                      auditorAuditCounts
                        .filter(auditor => 
                          auditor.name.toLowerCase().includes(auditorSearchTerm.toLowerCase())
                        )
                        .map((auditor, index) => (
                          <tr key={auditor.auditor_id}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {auditor.name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {auditor.regular_count}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {auditor.fraud_count}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                              {auditor.regular_count + auditor.fraud_count}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Support Auditor Table (TABEL TERPISAH) */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="text-md font-semibold mb-2">Support Auditor</h3>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auditor</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Input Audit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supporting Data</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supportAuditorSummary.map((row) => (
                      <tr key={row.auditor}>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.auditor}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.inputAudit}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.supportingData}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Audit Summary Section */}
      {activeSection === 'auditSummary' && (
        <>
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Audit Rating - Recap</CardTitle>
              <div>
                <select
                  value={selectedRegion}
                  onChange={e => setSelectedRegion(e.target.value)}
                  className="border rounded px-3 py-2 text-sm bg-muted"
                  style={{ minWidth: 160 }}
                >
                  {regionOptions.map(region => (
                    <option key={region} value={region}>{region === 'ALL' ? 'All Region' : region}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {/** Gunakan summary yang sudah difilter */}
              {(() => {
                const filteredSummary = getFilteredRatingSummary();
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card className="bg-red-100">
                        <CardContent className="flex flex-col items-center py-6">
                          <span className="text-3xl font-bold text-rose-600">{filteredSummary.high}</span>
                          <span className="text-lg font-semibold text-rose-500 mt-2">Total High</span>
                        </CardContent>
                      </Card>
                      <Card className="bg-yellow-100">
                        <CardContent className="flex flex-col items-center py-6">
                          <span className="text-3xl font-bold text-amber-600">{filteredSummary.medium}</span>
                          <span className="text-lg font-semibold text-amber-500 mt-2">Total Medium</span>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-100">
                        <CardContent className="flex flex-col items-center py-6">
                          <span className="text-3xl font-bold text-emerald-600">{filteredSummary.low}</span>
                          <span className="text-lg font-semibold text-emerald-500 mt-2">Total Low</span>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Bar Chart Style shadcn */}
                      <Card>
                        <CardHeader>
                        </CardHeader>
                        <CardContent>
                          <ChartContainer
                            config={{
                              high: { label: "High", color: "#fb7185" },      // rose-400
                              medium: { label: "Medium", color: "#fde68a" },   // amber-300
                              low: { label: "Low", color: "#34d399" },         // emerald-400
                            }}
                          >
                            <BarChart data={getBarChartData()} accessibilityLayer>
                              <CartesianGrid vertical={false} />
                              <XAxis
                                dataKey="region"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                              />
                              <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dashed" />}
                              />
                              <Bar dataKey="high" fill="#fb7185" radius={4} />      {/* rose-400 */}
                              <Bar dataKey="medium" fill="#fde68a" radius={4} />    {/* amber-300 */}
                              <Bar dataKey="low" fill="#34d399" radius={4} />       {/* emerald-400 */}
                            </BarChart>
                          </ChartContainer>
                        </CardContent>
                        <CardFooter className="flex-col gap-2 text-sm text-center">
                          <div className="flex gap-2 leading-none font-medium">
                            Audit rating recap by region
                          </div>
                        </CardFooter>
                      </Card>
                      {/* Pie Chart Style shadcn */}
                      <Card className="flex flex-col">
                        <CardHeader className="items-center pb-0">
                        </CardHeader>
                        <CardContent className="flex-1 pb-0">
                          <ChartContainer
                            config={{
                              high: { label: "High", color: "#fb7185" },      // rose-400
                              medium: { label: "Medium", color: "#fde68a" },   // amber-300
                              low: { label: "Low", color: "#34d399" },         // emerald-400
                            }}
                            className="mx-auto aspect-square max-h-[450px]"
                          >
                            <PieChart>
                              <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                              />
                              <Pie
                                data={[
                                  { name: "High", value: filteredSummary.high, fill: "#fb7185" },    // rose-400
                                  { name: "Medium", value: filteredSummary.medium, fill: "#fde68a" }, // amber-300
                                  { name: "Low", value: filteredSummary.low, fill: "#34d399" },       // emerald-400
                                ]}
                                dataKey="value"
                                nameKey="name"
                                stroke="0"
                              />
                            </PieChart>
                          </ChartContainer>
                        </CardContent>
                        <CardFooter className="flex-col gap-2 text-sm">
                          <div className="flex items-center gap-2 leading-none font-medium">
                            Audit rating recap total
                          </div>
                        </CardFooter>
                      </Card>
                    </div>

                    {/* Tambahkan Tabel Recap Rating Per Region */}
                    <div className="mt-8">
                      <h4 className="text-md font-semibold mb-2">Audit Rating Recap Per Region</h4>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-rose-500 uppercase tracking-wider">High</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-amber-500 uppercase tracking-wider">Medium</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-emerald-500 uppercase tracking-wider">Low</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {auditRatingByRegion.map(region => (
                              <tr key={region.region}>
                                <td className="px-3 py-2 text-xs text-gray-900">{region.region}</td>
                                <td className="px-3 py-2 text-center text-xs font-bold text-rose-600">{region.high}</td>
                                <td className="px-3 py-2 text-center text-xs font-bold text-amber-600">{region.medium}</td>
                                <td className="px-3 py-2 text-center text-xs font-bold text-emerald-600">{region.low}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              {/* All the existing audit summary content */}
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Incomplete Documentation</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="pl-7 pr-2 py-1 border rounded-md w-44 text-xs"
                  />
                </div>
              </div>

              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => setActiveTab('regular')}
                  className={`px-4 py-2 rounded-md ${
                    activeTab === 'regular'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Regular Audits
                </button>
                <button
                  onClick={() => setActiveTab('fraud')}
                  className={`px-4 py-2 rounded-md ${
                    activeTab === 'fraud'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Special Audits
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('branch_name')}
                      >
                        <div className="flex items-center">
                          Branch Name
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </div>
                      </th>
                      <th 
                        className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('region')}
                      >
                        <div className="flex items-center">
                          Region
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </div>
                      </th>
                      {activeTab === 'regular' ? (
                        <>
                          <th 
                            className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('monitoring')}
                          >
                            <div className="flex items-center">
                              Monitoring
                              <ArrowUpDown className="ml-1 h-4 w-4" />
                            </div>
                          </th>
                          <th 
                            className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider"
                          >
                            <div className="flex items-center">
                              Failed Checks
                            </div>
                          </th>
                          <th 
                            className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider"
                          >
                            <div className="flex items-center">
                              PIC
                            </div>
                          </th>
                        </>
                      ) : (
                        <>
                          <th 
                            className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider"
                          >
                            <div className="flex items-center">
                              Failed Checks
                            </div>
                          </th>
                          <th 
                            className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-normal break-words max-w-[300px]"
                            onClick={() => requestSort('review')}
                          >
                            <div className="flex items-center">
                              Review
                              <ArrowUpDown className="ml-1 h-4 w-4" />
                            </div>
                          </th>
                          <th 
                            className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider"
                          >
                            <div className="flex items-center">
                              PIC
                            </div>
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedAudits
                      .filter(audit => {
                        if (activeTab !== 'regular') return true;
                        // Cari semua field boolean yang false dan ada di aliases
                        const failedKeys = Object.entries(audit)
                          .filter(([key, value]) =>
                            typeof value === 'boolean' &&
                            !value &&
                            regularAuditAliases[key]
                          )
                          .map(([key]) => key);

                        // Jika hanya "revised_dapa" yang false, baris dihilangkan
                        if (failedKeys.length === 1 && failedKeys[0] === 'revised_dapa') {
                          return false;
                        }
                        return true;
                      })
                      .map((audit, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {audit.branch_name}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                            {audit.region}
                          </td>
                          {/* ...existing columns... */}
                          {activeTab === 'regular' ? (
                            <>
                              <td className="px-3 py-2 whitespace-nowrap text-xs">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-medium max-w-[50px] ${
                                  audit.monitoring === 'Adequate' 
                                    ? 'bg-lime-100 text-lime-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {audit.monitoring}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-900 whitespace-normal break-words max-w-[300px]">
                                {getFailedChecksWithAliases(audit, true)}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-900 whitespace-normal break-words max-w-[200px]">
                                {audit.pic || 'N/A'}
                              </td>
                            </>
                          ) : (
                            <>
                              {/* ...fraud columns... */}
                            </>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

         {/* Container Baru: Report */}
    <Card className="mt-8">
  <CardHeader>
  <CardTitle className="text-lg">Report</CardTitle>
  <div className="mt-2 flex gap-2 items-center flex-wrap">
    {/* Region Filter as Label + Button */}
    <button
      className={`px-3 py-1 rounded-md text-xs font-medium border ${selectedRegionReport === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
      onClick={() => setSelectedRegionReport('ALL')}
      type="button"
    >
      All Region
    </button>
    {Array.from({ length: 19 }, (_, i) => String.fromCharCode(65 + i)).map(region => (
      <button
        key={region}
        className={`px-3 py-1 rounded-md text-xs font-medium border ${selectedRegionReport === region ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        onClick={() => setSelectedRegionReport(region)}
        type="button"
      >
        Regional {region}
      </button>
    ))}
    <label className="flex items-center text-xs font-medium ml-2">
      <input
      type="checkbox"
      checked={reportUndoneOnly}
      onChange={e => setReportUndoneOnly(e.target.checked)}
      className="mr-2 h-4 w-4" // Tambahkan h-5 w-5 untuk memperbesar checkbox
      />
      Show only Undone
    </label>
  </div>
</CardHeader>
  <CardContent>
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Name</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RTA</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {regularAudits
            .filter(audit => selectedRegionReport === 'ALL' || audit.region === selectedRegionReport)
            .filter(audit => {
              const branchName = audit.branch_name;
              const rtaStatus = audit.rta ? 'Done' : 'Undone';
              const foundInWorkPapers = workPapersRegular.some(wp => wp.branch_name === branchName);
              const reportStatus = foundInWorkPapers ? 'Done' : 'Undone';
              if (!reportUndoneOnly) return true;
              return rtaStatus === 'Undone' || reportStatus === 'Undone';
            })
            .map((audit, idx) => {
              const branchName = audit.branch_name;
              const rtaStatus = audit.rta ? 'Done' : 'Undone';
              const foundInWorkPapers = workPapersRegular.some(wp => wp.branch_name === branchName);
              const reportStatus = foundInWorkPapers ? 'Done' : 'Undone';
              return (
                <tr key={branchName + idx}>
                  <td className="px-3 py-2 text-xs text-gray-900">{idx + 1}</td>
                  <td className="px-3 py-2 text-xs text-gray-900">{branchName}</td>
                  <td className={`px-3 py-2 text-xs font-semibold ${audit.rta ? 'text-green-600' : 'text-red-600'}`}>{rtaStatus}</td>
                  <td className={`px-3 py-2 text-xs font-semibold ${reportStatus === 'Done' ? 'text-green-600' : 'text-red-600'}`}>{reportStatus}</td>
                </tr>
              );
            })}
          {regularAudits
            .filter(audit => selectedRegionReport === 'ALL' || audit.region === selectedRegionReport)
            .filter(audit => {
              const branchName = audit.branch_name;
              const rtaStatus = audit.rta ? 'Done' : 'Undone';
              const foundInWorkPapers = workPapersRegular.some(wp => wp.branch_name === branchName);
              const reportStatus = foundInWorkPapers ? 'Done' : 'Undone';
              if (!reportUndoneOnly) return true;
              return rtaStatus === 'Undone' || reportStatus === 'Undone';
            }).length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                No data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </CardContent>
</Card>
        </>
      )}

      {/* Fraud Data Section */}
      {activeSection === 'fraudData' && (
        <Card>
          <CardContent className="p-6">
            {/* All the existing fraud data content */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Fraud Data</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={fraudSearchTerm}
                  onChange={(e) => setFraudSearchTerm(e.target.value)}
                  placeholder="Search branch or staff..."
                  className="pl-9 pr-2 py-1.5 text-xs border rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setActiveFraudTab('data')}
                className={`px-4 py-2 rounded-md ${
                  activeFraudTab === 'data'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Fraud Data
              </button>
              <button
                onClick={() => setActiveFraudTab('region')}
                className={`px-4 py-2 rounded-md ${
                  activeFraudTab === 'region'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Fraud by Region
              </button>
            </div>

            {activeFraudTab === 'data' ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No.</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => requestFraudSort('region')}
                      >
                        <div className="flex items-center">
                          Region

                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => requestFraudSort('branch_name')}
                      >
                        <div className="flex items-center">
                          Branch Name
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => requestFraudSort('fraud_staff')}
                      >
                        <div className="flex items-center">
                          Fraud Staff
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => requestFraudSort('fraud_amount')}
                      >
                        <div className="flex items-center">
                          Fraud Amount
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>HKP Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFraudCases.map((fraud, index) => (
                      <TableRow
                        key={fraud.id}
                        className={isPaymentComplete(fraud) ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}
                      >
                        <TableCell className="text-xs font-medium text-gray-500">{index + 1}</TableCell>
                        <TableCell className="text-xs">{fraud.region}</TableCell>
                        <TableCell className="text-xs">{fraud.branch_name}</TableCell>
                        <TableCell className="text-xs">{fraud.fraud_staff}</TableCell>
                        <TableCell className="text-xs">
                          {formatCurrency(fraud.fraud_amount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {fraud.fraud_payments_audits?.[0]?.hkp_amount 
                            ? formatCurrency(fraud.fraud_payments_audits[0].hkp_amount) 
                            : 'No HKP'}
                          {fraud.fraud_payments_audits?.[0]?.from_salary && (
                            <span className="ml-1 text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">Salary</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[250px] whitespace-normal break-words">
                          {fraud.fraud_payments_audits?.[0]?.notes !== undefined &&
                          fraud.fraud_payments_audits?.[0]?.notes !== null
                            ? fraud.fraud_payments_audits[0].notes
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                setSelectedFraud(fraud);
                                setIsPaymentDialogOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              aria-label="Edit Payment"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => fetchPaymentHistory(fraud.id)}
                              className="text-gray-600 hover:text-gray-800"
                              aria-label="View Payment History"
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No.</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Total Fraud Amount</TableHead>
                      <TableHead>Fraud Recovery</TableHead>
                      <TableHead>Total Regular Audit</TableHead>
                      <TableHead>Total Special Audit</TableHead>
                      <TableHead>Total Fraud Staff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fraudDetailsByRegion.map((detail, index) => (
                      <TableRow key={detail.region}>
                        <TableCell className="text-xs font-medium text-gray-500">{index + 1}</TableCell>
                        <TableCell className="text-xs">{detail.region}</TableCell>
                        <TableCell className="text-xs font-medium text-red-600">
                          {formatCurrency(detail.totalFraudAmount)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-emerald-600">
                          {formatCurrency(detail.totalRecoveryAmount)}
                        </TableCell>
                        <TableCell className="text-xs">{detail.totalRegularAudit}</TableCell>
                        <TableCell className="text-xs">{detail.totalSpecialAudit}</TableCell>
                        <TableCell className="text-xs">{detail.totalFraudStaff}</TableCell>
                      </TableRow>
                    ))}
                    {fraudDetailsByRegion.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-sm text-gray-500">
                          No fraud details found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update HKP Amount</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-700">HKP Amount</label>
              <input
                type="number"
                name="amount"
                className="w-full mt-1 text-sm border rounded-md p-2"
                min="0"
                value={hkpAmountInput}
                onChange={e => setHkpAmountInput(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Payment Date</label>
              <input
                type="date"
                name="payment_date"
                className="w-full mt-1 text-sm border rounded-md p-2"
                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                name="from_salary"
                id="from_salary"
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                checked={fromSalaryChecked}
                onChange={e => setFromSalaryChecked(e.target.checked)}
              />
              <label htmlFor="from_salary" className="ml-2 text-xs text-gray-700">
                From Salary and Kopkada
              </label>
            </div>
            <div>
              <label className="text-xs text-gray-700">Notes</label>
              <textarea
                name="notes"
                className="w-full mt-1 text-sm border rounded-md p-2"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsPaymentDialogOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {paymentHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-xs">
                        {payment.payment_date ? format(parseISO(payment.payment_date as string), 'dd MMM yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatCurrency(payment.hkp_amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {payment.notes?.includes('[From Salary]') ? 'Salary Deduction' : 'Direct Payment'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-4 text-sm text-gray-500">No payment history found</p>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setIsHistoryDialogOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auditor List Dialog */}
      <Dialog open={isAuditorListOpen} onOpenChange={setIsAuditorListOpen}>
        <DialogContent className="max-w-md max-h-[70vh]">
          <DialogHeader className="pr-6">
            <DialogTitle className="text-lg">List of Auditors</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[50vh]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Auditor ID
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Name
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditors.map((auditor, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {auditor.auditor_id}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {auditor.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add this new Dialog for Auditor Audit Counts */}
      <Dialog open={isAuditorAuditCountOpen} onOpenChange={setIsAuditorAuditCountOpen}>
        <DialogContent className="max-w-md max-h-[70vh]">
          <DialogHeader className="pr-6">
            <DialogTitle className="text-lg">Audit Counts Per Auditor</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[50vh]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    No.
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Auditor
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Regular Audits
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Fraud Audits
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditorAuditCounts.map((auditor, index) => (
                  <tr key={auditor.auditor_id}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {auditor.name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {auditor.regular_count}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {auditor.fraud_count}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      {auditor.regular_count + auditor.fraud_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerDashboard;