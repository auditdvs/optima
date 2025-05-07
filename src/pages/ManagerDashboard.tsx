import { format, parseISO } from 'date-fns';
import { saveAs } from 'file-saver';
import { AlertTriangle, ArrowDown, ArrowUpDown, Building2, Download, Search, TrendingUp, Users, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
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

  useEffect(() => {
    fetchDashboardData();
    fetchAuditRecapData();
    fetchAuditors();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total branches
      const { data: branchesData } = await supabase
        .from('branches')
        .select('name', { count: 'exact' });

      // Fetch regular audits
      const { data: regularAuditsData } = await supabase
        .from('audit_regular')
        .select('branch_name', { count: 'exact' });

      // Fetch fraud audits and total fraud amount
      const { data: fraudAuditsData } = await supabase
        .from('work_papers')
        .select('*')
        .eq('audit_type', 'fraud');

      // Fetch total auditors
      const { data: auditorsData } = await supabase
        .from('auditors')
        .select('name', { count: 'exact' });

      // Fetch fraud recovery payments
      const { data: fraudPaymentsData } = await supabase
        .from('fraud_payments')
        .select('amount');

      // Fetch special audits count (just count all rows in audit_fraud)
      const { data: specialAuditsData, error: specialAuditsError } = await supabase
        .from('audit_fraud')
        .select('branch_name');

      if (specialAuditsError) throw specialAuditsError;

      // Calculate totals
      const totalFraud = fraudAuditsData?.reduce((sum, audit) => sum + (audit.fraud_amount || 0), 0) || 0;
      const fraudRecovery = fraudPaymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      setStats({
        totalBranches: branchesData?.length || 0,
        regularAudits: regularAuditsData?.length || 0,
        specialAudits: specialAuditsData?.length || 0,
        fraudAudits: fraudAuditsData?.length || 0,
        totalAuditors: auditorsData?.length || 0,
        totalFraud,
        fraudRecovery,
        outstandingFraud: totalFraud - fraudRecovery
      });

      // Fetch and process audit trends
      const { data: workPapersData } = await supabase
        .from('work_papers')
        .select('audit_end_date, audit_type');

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

      // Process and set data as before
      const filteredRegularAudits = regularData?.filter(audit => {
        const falseCount = [
          audit.dapa,
          audit.revised_dapa,
          audit.dapa_supporting_data,
          audit.assignment_letter,
          audit.entrance_agenda,
          audit.entrance_attendance,
          audit.audit_working_papers,
          audit.exit_meeting_minutes,
          audit.exit_attendance_list,
          audit.audit_result_letter,
          audit.rta
        ].filter(value => value === false).length;
        return falseCount >= 2;
      });

      const filteredFraudAudits = fraudData?.filter(audit => {
        const hasFalseValue = [
          audit.data_preparation,
          audit.assignment_letter,
          audit.audit_working_papers,
          audit.audit_report,
          audit.detailed_findings
        ].some(value => value === false);
        return hasFalseValue;
      });

      setRegularAudits(filteredRegularAudits || []);
      setFraudAudits(filteredFraudAudits || []);
    } catch (error) {
      console.error('Error fetching audit recap data:', error);
    }
  };

  const fetchAuditors = async () => {
    try {
      const { data, error } = await supabase
        .from('auditors')
        .select('name, auditor_id');
      
      if (error) throw error;
      setAuditors(data || []);
    } catch (error) {
      console.error('Error fetching auditors:', error);
    }
  };

  const processAuditTrends = (workPapers: any[]) => {
    // Hitung jumlah audit per bulan
    const monthlyAudits: { [key: string]: { regular: number; fraud: number } } = {};

    workPapers.forEach(paper => {
      if (paper.audit_end_date) {
        const month = format(parseISO(paper.audit_end_date), 'MMM');
        if (!monthlyAudits[month]) {
          monthlyAudits[month] = { regular: 0, fraud: 0 };
        }
        if (paper.audit_type === 'regular') {
          monthlyAudits[month].regular++;
        } else {
          monthlyAudits[month].fraud++;
        }
      }
    });

    // Pastikan semua bulan ada, jika tidak ada data isi 0
    return MONTHS.map(month => ({
      month,
      regular: monthlyAudits[month]?.regular || 0,
      fraud: monthlyAudits[month]?.fraud || 0,
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
      // Prepare data for export with aliases
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

  // Handle sorting
  const requestSort = (key: string) => {
    let direction: SortOrder = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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

  return (
    <div className="p-0 space-y-3">
      <h1 className="text-2xl font-bold">Manager Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-9 gap-2">
        <Card className="col-span-3 min-h-[80px] flex items-center">
          <CardContent className="p-3 flex items-center gap-x-3 h-full">
            <div className="p-2 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Branch</p>
              <p className="text-base font-bold">{stats.totalBranches}</p>
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
                <p className="text-xs text-green-600">{stats.regularAudits} Regular</p>
                <p className="text-xs text-blue-600">{stats.specialAudits} Special Audit</p>
                <p className="text-xs text-red-600">{stats.fraudAudits} Fraud Cases</p>
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
              <p className="text-base font-bold">{stats.totalAuditors}</p>
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
              <p className="text-base font-bold text-red-600">{formatCurrency(stats.totalFraud)}</p>
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
              <p className="text-base font-bold text-emerald-600">{formatCurrency(stats.fraudRecovery)}</p>
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
              <p className="text-base font-bold text-yellow-600">{formatCurrency(stats.outstandingFraud)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Trends Chart */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 mt-2">Audit Trends</h2>
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

      {/* Audit Recap Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-3 mt-6">
            <h2 className="text-lg font-semibold mt-3">Audit Summary: Incomplete Documentation (Special & Regular)</h2>
            <div className="flex items-center space-x-4">
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
              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                <span>Download Report</span>
              </button>
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
              Fraud Audits
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
                        className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
                {sortedAudits.map((audit, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {audit.branch_name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {audit.region}
                    </td>
                    {activeTab === 'regular' ? (
                      <>
                        <td className="px-3 py-2 whitespace-nowrap text-xs">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                            audit.monitoring === 'Adequate' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {audit.monitoring}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {getFailedChecksWithAliases(audit, true)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {audit.pic || 'N/A'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {getFailedChecksWithAliases(audit, false)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {(audit as FraudAudit).review}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {audit.pic || 'N/A'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Auditor List Dialog */}
      <Dialog open={isAuditorListOpen} onOpenChange={setIsAuditorListOpen}>
        <DialogContent className="max-w-md max-h-[70vh]">
          <DialogHeader className="pr-6">
            <div className="flex items-center justify-between mb-2">
              <DialogTitle className="text-lg">List of Auditors</DialogTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAuditors}
                  className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700 text-xs"
                >
                  <Download className="h-3 w-3" />
                  <span>Excel</span>
                </button>
              </div>
            </div>
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