import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DashboardStats from '../components/dashboard/DashboardStats';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
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

  // Get top 5 fraud cases
  const topFraudCases = workPapers
    .filter(wp => wp.audit_type === 'fraud' && wp.fraud_amount && wp.fraud_staff)
    .sort((a, b) => (b.fraud_amount || 0) - (a.fraud_amount || 0))
    .slice(0, 5);

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

  // Format currency
  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // Pie chart data
  const pieData = [
    { name: 'Annual Audits', value: stats.annualAudits },
    { name: 'Fraud Audits', value: stats.fraudAudits }
  ];

  const COLORS = ['#4F46E5', '#EF4444'];

   return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard Summary Audits Branches</h1>
      
      {/* Ganti bagian stats cards dengan DashboardStats */}
      <DashboardStats stats={stats} />

      {/* Main Content - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-medium py-2">Branch Name</TableHead>
                    <TableHead className="text-xs font-medium py-2">Region</TableHead>
                    <TableHead className="text-xs font-medium py-2">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="text-xs py-1.5">{branch.name}</TableCell>
                      <TableCell className="text-xs py-1.5">{branch.region}</TableCell>
                      <TableCell className="text-xs py-1.5">
                        
                        <a href={`https://www.google.com/maps?q=${getCoordinatesText(branch.coordinates)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View on Maps
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Performance Summary */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold pt-2 mb-4">Audit Performance Summary</h2>
            
            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Pie Chart */}
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={30}
                      content={({ payload }) => (
                        <div className="flex justify-center gap-3">
                          {payload.map((entry, index) => (
                            <div key={`legend-${index}`} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-xs">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Line Chart */}
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="fraudAudits" stroke="#EF4444" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="annualAudits" stroke="#4F46E5" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fraud Cases Table */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Top 5 Fraud Branches</h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-medium py-1.5">Branch</TableHead>
                    <TableHead className="text-xs font-medium py-1.5">Fraud Staff Name</TableHead>
                    <TableHead className="text-xs font-medium py-1.5">Fraud Amount</TableHead>
                    <TableHead className="text-xs font-medium py-1.5">Auditors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topFraudCases.map((fraud) => (
                    <TableRow key={fraud.id}>
                      <TableCell className="text-xs py-1">{fraud.branch_name}</TableCell>
                      <TableCell className="text-xs py-1">{fraud.fraud_staff}</TableCell>
                      <TableCell className="text-xs py-1">{formatCurrency(fraud.fraud_amount || 0)}</TableCell>
                      <TableCell className="text-xs py-1">
                        {fraud.work_paper_auditors?.map(a => a.auditor_name).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
