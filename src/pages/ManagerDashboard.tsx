import { format, parseISO } from "date-fns";
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { AlertTriangle, ArrowDown, Building2, TrendingUp, Users, Wallet } from "lucide-react";
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import AssignmentLetterManager from '../components/AssignmentLetterManager';
import CountUp from '../components/CountUp';
import CurrencyCountUp from '../components/CurrencyCountUp';
import AuditorPerforma from '../components/dashboard/AuditorPerforma';
import AuditSummary from '../components/dashboard/AuditSummary';
import FraudData from '../components/dashboard/FraudData';
import { Card, CardContent } from '../components/ui/card';
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
import { supabase } from '../lib/supabaseClient';
import { formatToRupiah } from '../lib/utils';
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
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [isAuditorListOpen, setIsAuditorListOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'main' | 'auditorCounts' | 'auditSummary' | 'fraudData' | 'assignmentLetters'>('main');

  useEffect(() => {
    const initializeDashboard = async () => {
      const hasAccess = await checkUserAccess(supabase);
      if (!hasAccess) {
        console.error('Unauthorized access to manager dashboard');
        return;
      }

      fetchDashboardData();
      fetchAuditors();
    };

    initializeDashboard();
  }, []);

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

  const handleDownloadAllReports = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // 1. Dashboard Statistics sheet
      const dashboardStatsForExport = [
        { Metric: 'Total Branches', Value: stats.totalBranches },
        { Metric: 'Regular Audits', Value: stats.regularAudits },
        { Metric: 'Special Audits', Value: stats.specialAudits },
        { Metric: 'Fraud Cases', Value: stats.fraudAudits },
        { Metric: 'Total Auditors', Value: stats.totalAuditors },
        { Metric: 'Total Fraud Amount', Value: formatToRupiah(stats.totalFraud) },
        { Metric: 'Fraud Recovery', Value: formatToRupiah(stats.fraudRecovery) },
        { Metric: 'Outstanding Fraud', Value: formatToRupiah(stats.outstandingFraud) },
        { Metric: 'Recovery Percentage', Value: stats.totalFraud > 0 ? 
          ((stats.fraudRecovery / stats.totalFraud) * 100).toFixed(2) + '%' : '0%' }
      ];
      const dashboardStatsWorksheet = XLSX.utils.json_to_sheet(dashboardStatsForExport);
      XLSX.utils.book_append_sheet(workbook, dashboardStatsWorksheet, 'Dashboard Statistics');

      // 2. List of Auditors sheet
      const auditorsWorksheet = XLSX.utils.json_to_sheet(auditors);
      XLSX.utils.book_append_sheet(workbook, auditorsWorksheet, 'List of Auditors');
      
      // 3. Audit Trends sheet
      const trendsWorksheet = XLSX.utils.json_to_sheet(auditTrends);
      XLSX.utils.book_append_sheet(workbook, trendsWorksheet, 'Audit Trends');
      
      // Generate and download the Excel file
      const fileName = `manager_dashboard_overview_report_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, fileName);
      
      console.log('Complete report downloaded successfully with all data sheets');
    } catch (error) {
      console.error('Error generating complete report:', error);
      alert('Error generating report. Please try again.');
    }
  };

  // Modify the Audit Trends Chart section to include the download image button
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
      <div className="flex w-full overflow-hidden rounded-md border border-[#35343439] bg-white text-black mb-10">
        <button
          onClick={() => setActiveSection('auditorCounts')}
          className={`flex-1 p-3 text-center font-medium text-sm ${
            activeSection === 'auditorCounts' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Auditor Performa
        </button>
        <button
          onClick={() => setActiveSection('auditSummary')}
          className={`flex-1 p-3 text-center font-medium text-sm ${
            activeSection === 'auditSummary' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Audit Summary
        </button>
        <button
          onClick={() => setActiveSection('fraudData')}
          className={`flex-1 p-3 text-center font-medium text-sm ${
            activeSection === 'fraudData' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Fraud Data
        </button>
        <button
          onClick={() => setActiveSection('assignmentLetters')}
          className={`flex-1 p-3 text-center font-medium text-sm ${
            activeSection === 'assignmentLetters' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Assignment Letters
        </button>
        <button
          onClick={() => setActiveSection('main')}
          className={`flex-1 p-3 text-center font-medium text-sm ${
            activeSection === 'main' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Overview
        </button>
      </div>

      {/* Render different sections based on activeSection */}
      {activeSection === 'auditorCounts' && <AuditorPerforma />}
      {activeSection === 'auditSummary' && <AuditSummary />}
      {activeSection === 'fraudData' && <FraudData />}
      {activeSection === 'assignmentLetters' && <AssignmentLetterManager />}
      
      {/* Main Dashboard Section - Always visible when Overview is selected */}
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
                  <p className="text-base font-bold text-red-600">
                    <CurrencyCountUp to={stats.totalFraud} duration={1.5} />
                  </p>
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
                  <p className="text-base font-bold text-emerald-600">
                    <CurrencyCountUp to={stats.fraudRecovery} duration={1.5} />
                  </p>
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
                  <p className="text-base font-bold text-yellow-600">
                    <CurrencyCountUp to={stats.outstandingFraud} duration={1.5} />
                  </p>
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

          {/* Assignment Letters Management Section */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Assignment Letter Management</h2>
              <AssignmentLetterManager />
            </CardContent>
          </Card>
        </>
      )}

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
    </div>
  );
};

export default ManagerDashboard;
