import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, ArrowDown, ArrowUpDown, Building2, Download, Search, TrendingUp, Users, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface DashboardStats {
  totalBranches: number;
  regularAudits: number;
  fraudAudits: number;
  totalAuditors: number;
  totalFraud: number;
  fraudRecovery: number;
  outstandingFraud: number;
}

interface AuditTrend {
  month: string;
  regular: number;
  fraud: number;
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
    outstandingFraud: 0
  });
  const [auditTrends, setAuditTrends] = useState<AuditTrend[]>([]);
  const [regularAudits, setRegularAudits] = useState<RegularAudit[]>([]);
  const [fraudAudits, setFraudAudits] = useState<FraudAudit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'regular' | 'fraud'>('regular');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'branch_name', direction: 'asc' });

  useEffect(() => {
    fetchDashboardData();
    fetchAuditRecapData();
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

      // Calculate totals
      const totalFraud = fraudAuditsData?.reduce((sum, audit) => sum + (audit.fraud_amount || 0), 0) || 0;
      const fraudRecovery = fraudPaymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      setStats({
        totalBranches: branchesData?.length || 0,
        regularAudits: regularAuditsData?.length || 0,
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
      // Fetch regular audits - removed the monitoring filter
      const { data: regularData, error: regularError } = await supabase
        .from('audit_regular')
        .select('*');

      if (regularError) throw regularError;

      // Fetch branches to get region information
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*');

      if (branchesError) throw branchesError;

      // Create a mapping of branch names to regions
      const branchRegionMap = {};
      branchesData?.forEach(branch => {
        branchRegionMap[branch.name] = branch.region;
      });

      // Add region to regular audits
      const regularAuditsWithRegion = regularData?.map(audit => ({
        ...audit,
        region: branchRegionMap[audit.branch_name] || 'Unknown'
      }));

      // Filter regular audits with 2+ false values
      const filteredRegularAudits = regularAuditsWithRegion?.filter(audit => {
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

      setRegularAudits(filteredRegularAudits || []);

      // Fetch fraud audits - removed the review condition
      const { data: fraudData, error: fraudError } = await supabase
        .from('audit_fraud')
        .select('*');

      if (fraudError) throw fraudError;

// Filter fraud audits with at least one false value
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
  
  setFraudAudits(filteredFraudAudits || []);
    } catch (error) {
      console.error('Error fetching audit recap data:', error);
    }
  };

  const processAuditTrends = (workPapers: any[]) => {
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

    return Object.entries(monthlyAudits).map(([month, counts]) => ({
      month,
      ...counts
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
        <Card className="col-span-3">
          <CardContent className="p-4 flex justify-center items-center h-full">
            <div className="flex mt-4 items-center justify-start space-x-4 w-full">
              <div className="p-4 bg-purple-100 rounded-lg">
                <Building2 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-x text-gray-500">Total Branch</p>
                <p className="text-base font-bold">{stats.totalBranches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardContent className="p-4 flex justify-center items-center h-full">
            <div className="flex mt-4 items-center justify-start space-x-2 w-full">
              <div className="p-4 bg-blue-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-x text-gray-600">Total Audit</p>
                <div className="flex flex-col">
                  <p className="text-xs text-green-600">{stats.regularAudits} Regular</p>
                  <p className="text-xs text-red-600">{stats.fraudAudits} Fraud</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardContent className="p-4 flex justify-center items-center h-full">
            <div className="flex mt-4 items-center justify-start space-x-2 w-full">
              <div className="p-4 bg-green-100 rounded-lg">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-x text-gray-500">Total Auditors</p>
                <p className="text-base font-bold">{stats.totalAuditors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardContent className="p-4 flex justify-center items-center h-full">
            <div className="flex mt-4 items-center justify-start space-x-2 w-full">
              <div className="p-4 bg-red-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-x text-gray-600">Total Fraud</p>
                <p className="text-x font-bold text-red-600 truncate">
                  {formatCurrency(stats.totalFraud)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardContent className="p-4 flex justify-center items-center h-full">
            <div className="flex mt-4 items-center justify-start space-x-2 w-full">
              <div className="p-4 bg-emerald-100 rounded-lg flex-shrink-0">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-x text-gray-600">Fraud Recovery</p>
                <p className="text-x font-bold text-emerald-600 truncate">
                  {formatCurrency(stats.fraudRecovery)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardContent className="p-3 flex justify-center items-center h-full">
            <div className="flex mt-4 items-center justify-start space-x-2 w-full">
              <div className="p-4 bg-yellow-100 rounded-lg flex-shrink-0">
                <ArrowDown className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-x text-gray-600">Outstanding Fraud</p>
                <p className="text-x font-bold text-yellow-600 truncate">
                  {formatCurrency(stats.outstandingFraud)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Trends Chart */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 mt-2">Audit Trends</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={auditTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="regular" name="Regular" fill="#50C878" />
                <Bar dataKey="fraud" name="Fraud" fill="#e74c3c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                  className="pl-9 pr-4 py-2 border rounded-md w-64"
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('branch_name')}
                  >
                    <div className="flex items-center">
                      Branch Name
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('monitoring')}
                      >
                        <div className="flex items-center">
                          Monitoring
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <div className="flex items-center">
                          Failed Checks
                        </div>
                      </th>
                    </>
                  ) : (
                    <>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <div className="flex items-center">
                          Failed Checks
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('review')}
                      >
                        <div className="flex items-center">
                          Review
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        </div>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAudits.map((audit, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {audit.branch_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {audit.region}
                    </td>
                    {activeTab === 'regular' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            audit.monitoring === 'Adequate' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {audit.monitoring}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getFailedChecksWithAliases(audit, true)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getFailedChecksWithAliases(audit, false)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(audit as FraudAudit).review}
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
    </div>
  );
};

export default ManagerDashboard;