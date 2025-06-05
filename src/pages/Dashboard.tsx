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
  
  // Add this new state for the administration section
  const [activeSection, setActiveSection] = useState<'main' | 'administration'>('main');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [adminRegularAudits, setAdminRegularAudits] = useState<any[]>([]);
  const [uniqueRegions, setUniqueRegions] = useState<string[]>([]);
  const [adminAuditType, setAdminAuditType] = useState<'annual' | 'fraud'>('annual');
  const [adminFraudAudits, setAdminFraudAudits] = useState<any[]>([]);
  
  // Add these state variables near your other state declarations
  const [isAdminSectionLocked, setIsAdminSectionLocked] = useState(true);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState(false);
  
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
  
  useEffect(() => {
    fetchData();
    
    // Add this call to fetch admin audit data
    fetchAdminRegularAudits();
    fetchAdminFraudAudits();
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
    "Annual Audits": { label: "Annual Audits: ", color: "#50C878" },
    "Fraud Audits": { label: "Special Audits: ", color: "#e74c3c" },
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

  // Function to get failed checks with aliases (excluding DAPA Perubahan)
  const getFailedChecksWithAliases = (audit: any) => {
    const regularAuditAliases = {
      dapa: "DAPA",
      revised_dapa: "DAPA Perubahan", // Will be excluded from failed checks
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
        key !== 'revised_dapa' // Exclude DAPA Perubahan from failed checks
      )
      .map(([key]) => regularAuditAliases[key])
      .join(', ');
  };

  // Add this function to get failed checks for fraud audits
  const getFraudFailedChecksWithAliases = (audit: any) => {
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
        <div className="grid grid-cols-1 lg:grid-cols-[0.5fr_1.1fr] gap-4">
          {/* Branch Locations */}
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                <h2 className="text-sm font-semibold mb-2 sm:mb-0">Branch Locations</h2>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search branch name or region..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border rounded-md w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                <BranchLocationTable data={branchTableData} />
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold pt-1 mb-4">Audit Performance Summary</h2>
              
              {/* Charts - Stack on mobile AND tablet, 2 columns ONLY on large screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Pie Chart */}
                <Card className="flex flex-col bg-white shadow-sm">
                  <CardContent className="flex-1">
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
                  <CardContent className="pt-5 pb-2">
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

              {/* Audit Summary by Region - Responsive version */}
              <div className="mt-2">
                <h3 className="text-sm font-semibold mb-2">Audit Summary by Region</h3>
                
                {/* Mobile & Tablet View: Simple stacked layout */}
                <div className="overflow-y-auto max-h-[300px] border rounded block lg:hidden">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white shadow-sm">
                      <tr className="text-gray-500 border-b">
                        <th className="text-left py-1 px-2 font-medium">Region</th>
                        <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                        <th className="text-right py-1 px-2 font-medium text-red-600">Special</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRegionAuditData().map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-1 px-2 font-medium">{item.region}</td>
                          <td className="text-right py-1 px-2">
                            <span className="text-green-600">{item.regular}</span>
                          </td>
                          <td className="text-right py-1 px-2">
                            <span className="text-red-600">{item.fraud}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Desktop View: Multi-column layout */}
                <div className="overflow-x-auto hidden lg:block">
                  <div className="overflow-y-auto max-h-[200px] border rounded">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-white shadow-sm">
                        <tr className="text-gray-500 border-b">
                          {/* First group of columns */}
                          <th className="text-left py-1 px-2 font-medium">Region</th>
                          <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                          <th className="text-right py-1 px-2 font-medium text-red-600">Special</th>
                          {/* Second group of columns */}
                          <th className="text-left py-1 px-2 font-medium border-l">Region</th>
                          <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                          <th className="text-right py-1 px-2 font-medium text-red-600">Special</th>
                          {/* Third group of columns */}
                          <th className="text-left py-1 px-2 font-medium border-l">Region</th>
                          <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                          <th className="text-right py-1 px-2 font-medium text-red-600">Special</th>
                          {/* Fourth group of columns */}
                          <th className="text-left py-1 px-2 font-medium border-l">Region</th>
                          <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                          <th className="text-right py-1 px-2 font-medium text-red-600">Special</th>
                          {/* Fifth group of columns */}
                          <th className="text-left py-1 px-2 font-medium border-l">Region</th>
                          <th className="text-right py-1 px-2 font-medium text-green-600">Regular</th>
                          <th className="text-right py-1 px-2 font-medium text-red-600">Special</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const regionData = getRegionAuditData();
                          const rows = [];
                          const regionsPerRow = 5;
                          
                          // Create rows based on the total number of regions
                          for (let i = 0; i < Math.ceil(regionData.length / regionsPerRow); i++) {
                            rows.push(
                              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                {/* Map each group of 5 regions */}
                                {[0, 1, 2, 3, 4].map(colIndex => {
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
              </div>
            </CardContent>
          </Card>
        </div>
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
                Fraud Audit
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
