import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search } from 'lucide-react';

interface AuditData {
  id: string;
  branch_name: string;
  audit_start_date: string;
  audit_end_date: string;
  audit_type: 'regular' | 'fraud';
  rating?: 'low' | 'medium' | 'high';
  fraud_amount?: number;
  fraud_staff?: string;
  work_paper_auditors?: { auditor_name: string }[];
}

interface ChartData {
  month: string;
  regularAudits: number;
  fraudAudits: number;
  fraudAmount: number;
}

const RiskDashboard = () => {
  const [regularAudits, setRegularAudits] = useState<AuditData[]>([]);
  const [fraudAudits, setFraudAudits] = useState<AuditData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [ratingBreakdown, setRatingBreakdown] = useState({
    low: 0,
    medium: 0,
    high: 0
  });
  const [regularSearchTerm, setRegularSearchTerm] = useState('');
  const [fraudSearchTerm, setFraudSearchTerm] = useState('');

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      // Fetch regular audits
      const { data: regularData, error: regularError } = await supabase
        .from('work_papers')
        .select(`
          *,
          work_paper_auditors(auditor_name)
        `)
        .eq('audit_type', 'regular')
        .order('audit_start_date', { ascending: false });

      if (regularError) throw regularError;

      // Fetch fraud audits
      const { data: fraudData, error: fraudError } = await supabase
        .from('work_papers')
        .select(`
          *,
          work_paper_auditors(auditor_name)
        `)
        .eq('audit_type', 'fraud')
        .order('audit_start_date', { ascending: false });

      if (fraudError) throw fraudError;

      setRegularAudits(regularData || []);
      setFraudAudits(fraudData || []);

      // Process rating breakdown
      const breakdown = {
        low: 0,
        medium: 0,
        high: 0
      };

      regularData?.forEach(audit => {
        if (audit.rating) {
          breakdown[audit.rating]++;
        }
      });

      setRatingBreakdown(breakdown);

      // Process chart data
      const monthlyData = processMonthlyData([...(regularData || []), ...(fraudData || [])]);
      setChartData(monthlyData);
    } catch (error) {
      console.error('Error fetching audits:', error);
    }
  };

  const processMonthlyData = (audits: AuditData[]): ChartData[] => {
    const months: { [key: string]: ChartData } = {};

    audits.forEach(audit => {
      const date = new Date(audit.audit_start_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months[monthKey]) {
        months[monthKey] = {
          month: new Date(date.getFullYear(), date.getMonth()).toLocaleString('default', { month: 'short', year: '2-digit' }),
          regularAudits: 0,
          fraudAudits: 0,
          fraudAmount: 0
        };
      }

      if (audit.audit_type === 'regular') {
        months[monthKey].regularAudits++;
      } else {
        months[monthKey].fraudAudits++;
        months[monthKey].fraudAmount += audit.fraud_amount || 0;
      }
    });

    return Object.values(months).sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const filterRegularAudits = (audits: AuditData[]) => {
    if (!regularSearchTerm) return audits;
    
    const searchLower = regularSearchTerm.toLowerCase();
    return audits.filter(audit => 
      audit.branch_name.toLowerCase().includes(searchLower) ||
      audit.rating?.toLowerCase().includes(searchLower) ||
      audit.work_paper_auditors?.some(a => 
        a.auditor_name.toLowerCase().includes(searchLower)
      )
    );
  };

  const filterFraudAudits = (audits: AuditData[]) => {
    if (!fraudSearchTerm) return audits;
    
    const searchLower = fraudSearchTerm.toLowerCase();
    return audits.filter(audit => 
      audit.branch_name.toLowerCase().includes(searchLower) ||
      (audit.fraud_staff && audit.fraud_staff.toLowerCase().includes(searchLower))
    );
  };

  const filteredRegularAudits = filterRegularAudits(regularAudits);
  const filteredFraudAudits = filterFraudAudits(fraudAudits);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Risk Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Regular Audits</h3>
            <p className="text-2xl font-bold">{regularAudits.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Special Audits</h3>
            <p className="text-2xl font-bold">{fraudAudits.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Fraud Amount</h3>
            <p className="text-2xl font-bold">
              {formatCurrency(fraudAudits.reduce((sum, audit) => sum + (audit.fraud_amount || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Rating Breakdown</h3>
            <div className="flex gap-2 mt-2">
              <span className="text-sm">Low: {ratingBreakdown.low}</span>
              <span className="text-sm">Medium: {ratingBreakdown.medium}</span>
              <span className="text-sm">High: {ratingBreakdown.high}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-medium mb-4">Monthly Audit Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="regularAudits" name="Regular Audits" fill="#4F46E5" />
                  <Bar dataKey="fraudAudits" name="Special Audits" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-medium mb-4">Monthly Fraud Amount Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="fraudAmount" 
                    name="Fraud Amount" 
                    stroke="#EF4444" 
                    strokeWidth={2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Regular Audits</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search branch, rating, or auditors..."
                  value={regularSearchTerm}
                  onChange={(e) => setRegularSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Auditors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegularAudits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell>{audit.branch_name}</TableCell>
                    <TableCell>{formatDate(audit.audit_start_date)}</TableCell>
                    <TableCell>{formatDate(audit.audit_end_date)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        audit.rating === 'high' 
                          ? 'bg-red-100 text-red-800'
                          : audit.rating === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {audit.rating?.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {audit.work_paper_auditors?.map(a => a.auditor_name).join(', ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Special Audits</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search branch or fraud staff..."
                  value={fraudSearchTerm}
                  onChange={(e) => setFraudSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Fraud Amount</TableHead>
                  <TableHead>Fraud Staff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFraudAudits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell>{audit.branch_name}</TableCell>
                    <TableCell>{formatDate(audit.audit_start_date)}</TableCell>
                    <TableCell>{formatDate(audit.audit_end_date)}</TableCell>
                    <TableCell>{formatCurrency(audit.fraud_amount || 0)}</TableCell>
                    <TableCell>{audit.fraud_staff}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiskDashboard;
