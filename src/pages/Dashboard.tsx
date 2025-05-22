import { Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from 'recharts';
import { BranchLocationTable, BranchRow } from "../components/dashboard/BranchLocationTable";
import DashboardStats from '../components/dashboard/DashboardStats';
import { FraudRow } from "../components/dashboard/TopFraudTable";
import { Card, CardContent } from '../components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";
import PasswordModal from '../components/ui/PasswordModal';
import { supabase } from '../lib/supabaseClient';

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

const barChartConfig = {
  annualAudits: {
    label: "Annual Audits",
    color: "#50C878",
  },
  fraudAudits: {
    label: "Fraud Audits",
    color: "#e74c3c",
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

  useEffect(() => {
    fetchData();
  }, []);

  // Add function to handle password verification
  const handleUncensorFraud = () => {
    if (passwordInput === 'optima') {
      setIsFraudAmountCensored(false);
      setPasswordError(false);
      setIsPasswordModalOpen(false);
    } else {
      setPasswordError(true);
    }
    setPasswordInput('');
  };

  // Calculate statistics
  const regularAuditedBranches = new Set(
    workPapers.filter(wp => wp.audit_type === 'regular').map(wp => wp.branch_name)
  );

  const stats = {
    totalBranches: branches.length,
    auditedBranches: regularAuditedBranches.size,
    unauditedBranches: branches.length - regularAuditedBranches.size,
    fraudAudits: fraudAuditCount,
    annualAudits: workPapers.filter(wp => wp.audit_type === 'regular').length,
    totalAudits: workPapers.length,
    totalFraud: workPapers.reduce((sum, wp) => sum + (wp.fraud_amount || 0), 0),
    totalFraudCases: new Set(
      workPapers
        .filter(wp => wp.audit_type === 'fraud' && wp.fraud_staff)
        .map(wp => wp.fraud_staff)
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
    "Annual Audits": { label: "Annual Audits", color: "#50C878" },
    "Fraud Audits": { label: "Fraud Audits", color: "#e74c3c" },
  } satisfies ChartConfig;

  // Add this function to process region audit data
  const getRegionAuditData = () => {
    const regionData: Record<string, { regular: number, fraud: number }> = {};
    
    // Count regular and fraud audits per region
    workPapers.forEach(wp => {
      // Find the branch to get its region
      const branch = branches.find(b => b.name === wp.branch_name);
      if (!branch) return;
      
      const region = branch.region;
      
      // Initialize region data if not exists
      if (!regionData[region]) {
        regionData[region] = { regular: 0, fraud: 0 };
      }
      
      // Increment the appropriate counter
      if (wp.audit_type === 'regular') {
        regionData[region].regular++;
      } else if (wp.audit_type === 'fraud') {
        regionData[region].fraud++;
      }
    });
    
    // Convert to array and sort alphabetically by region name
    return Object.entries(regionData)
      .map(([region, counts]) => ({ region, ...counts }))
      .sort((a, b) => a.region.localeCompare(b.region));
  };

   return (
    <div className="space-y-2 p-0">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard Summary Audits Branches</h1>
      
      {/* Pass the censored state and functions to DashboardStats */}
      <DashboardStats 
        stats={stats} 
        isFraudAmountCensored={isFraudAmountCensored}
        onFraudSectionClick={() => setIsPasswordModalOpen(true)}
      />
      
      {/* Password Modal */}
      <PasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordError(false);
          setPasswordInput('');
        }}
        onSubmit={handleUncensorFraud}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        passwordError={passwordError}
      />

      {/* Main Content - 2 columns */}
      <div className="grid grid-cols-11 lg:grid-cols-[0.7fr_1.4fr] gap-1">
        {/* Left Column - Branch Locations */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold">Branch Locations</h2>
              <div className="relative pt-2">
                <Search className="absolute pt-2 left-2 top-2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search branch name or region..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border rounded-md w-56 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              <BranchLocationTable data={branchTableData} />
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Performance Summary */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold pt-1 mb-2">Audit Performance Summary</h2>
            
            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-2 mb-0 lg:grid-cols-[0.8fr_1.2fr]">
              {/* Pie Chart */}
              <Card className="flex flex-col bg-white shadow-sm">
                <CardContent className="flex-1 pb-0">
                  <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[300px]"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        stroke="0"
                      />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Bar Chart */}
              <Card>
                <CardContent className="pb-2 mt-5">
                  <ChartContainer config={barChartConfig}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dashed" />}
                      />
                      <Bar dataKey="annualAudits" fill="#50C878" radius={3} />
                      <Bar dataKey="fraudAudits" fill="#e74c3c" radius={3} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Fraud Cases Table */}
            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-2">Audit Summary by Region</h3>
              <div className="overflow-auto max-h-[200px] border rounded">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr className="text-gray-500 border-b">
                      {/* First group of columns */}
                      <th className="text-left py-1 px-2 font-medium">Region</th>
                      <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                      <th className="text-right py-1 px-2 font-medium text-red-600">Fraud</th>
                      {/* Second group of columns */}
                      <th className="text-left py-1 px-2 font-medium border-l">Region</th>
                      <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                      <th className="text-right py-1 px-2 font-medium text-red-600">Fraud</th>
                      {/* Third group of columns */}
                      <th className="text-left py-1 px-2 font-medium border-l">Region</th>
                      <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                      <th className="text-right py-1 px-2 font-medium text-red-600">Fraud</th>
                      {/* Fourth group of columns */}
                      <th className="text-left py-1 px-2 font-medium border-l">Region</th>
                      <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                      <th className="text-right py-1 px-2 font-medium text-red-600">Fraud</th>
                      {/* Fifth group of columns */}
                      <th className="text-left py-1 px-2 font-medium border-l">Region</th>
                      <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                      <th className="text-right py-1 px-2 font-medium text-red-600">Fraud</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const regionData = getRegionAuditData();
                      const rows = [];
                      const regionsPerRow = 5; // Changed from 3 to 5
                      
                      // Create rows based on the total number of regions
                      for (let i = 0; i < Math.ceil(regionData.length / regionsPerRow); i++) {
                        rows.push(
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            {/* Map each group of 5 regions */}
                            {[0, 1, 2, 3, 4].map(colIndex => { // Changed from [0, 1, 2] to [0, 1, 2, 3, 4]
                              const dataIndex = i * regionsPerRow + colIndex;
                              const item = regionData[dataIndex];
                              
                              if (!item) {
                                // Return empty cells if no data
                                return (
                                  <React.Fragment key={colIndex}>
                                    <td className="py-1 px-2 font-medium"></td>
                                    <td className="text-right py-1 px-2"></td>
                                    <td className="text-right py-1 px-2"></td>
                                  </React.Fragment>
                                );
                              }
                              
                              // Return cells with data
                              return (
                                <React.Fragment key={colIndex}>
                                  <td className={`py-1 px-2 font-medium ${colIndex > 0 ? 'border-l' : ''}`}>
                                    {item.region}
                                  </td>
                                  <td className="text-right py-1 px-2">
                                    <span className="text-green-600">{item.regular}</span>
                                  </td>
                                  <td className="text-right py-1 px-2">
                                    <span className="text-red-600">{item.fraud}</span>
                                  </td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        );
                      }
                      
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
