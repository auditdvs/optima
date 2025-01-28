import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Building2, Users, AlertTriangle, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../pages/store';

interface WorkPaper {
  id: string;
  branch_name: string;
  audit_type: 'regular' | 'fraud';
  fraud_amount?: number;
  audit_start_date: string;
  audit_end_date: string;
  rating: 'high' | 'medium' | 'low';
}

const Dashboard = () => {
  const { branches, setBranches } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [workPapers, setWorkPapers] = useState<WorkPaper[]>([]);

  // Filter branches based on search term
  const filteredBranches = branches.filter(branch => 
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch branches data
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*');

      if (branchesError) throw branchesError;
      if (branchesData) {
        setBranches(branchesData.map(branch => ({
          id: branch.id,
          code: branch.code,
          name: branch.name,
          coordinates: branch.coordinates,
          region: branch.region
        })));
      }

      // Fetch work papers data
      const { data: workPapersData, error: workPapersError } = await supabase
        .from('work_papers')
        .select('*');

      if (workPapersError) throw workPapersError;
      if (workPapersData) {
        setWorkPapers(workPapersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Calculate statistics from work papers
  const stats = {
    totalBranches: branches.length,
    regularAudits: workPapers.filter(wp => wp.audit_type === 'regular').length,
    specialAudits: workPapers.filter(wp => wp.audit_type === 'fraud').length,
    totalFraud: workPapers.reduce((sum, wp) => 
      sum + (wp.audit_type === 'fraud' ? (wp.fraud_amount || 0) : 0), 0
    )
  };

  const pieData = [
    { name: 'Regular Audits', value: stats.regularAudits || 0 },
    { name: 'Special/Fraud Audits', value: stats.specialAudits || 0 }
  ];

  // If both values are 0, show a single green segment
  const emptyData = stats.regularAudits === 0 && stats.specialAudits === 0;
  const chartData = emptyData 
    ? [{ name: 'No Audits', value: 1 }] 
    : pieData;

  // Colors: green for empty data, blue for regular, red for fraud
  const getChartColors = () => {
    if (emptyData) {
      return ['#22C55E']; // Green color for empty data
    }
    return ['#4F46E5', '#EF4444']; // Blue for regular, Red for fraud
  };

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

      if (typeof coordinates === 'string' && coordinates.includes(',')) {
        return coordinates.trim();
      }

      if (Array.isArray(coordinates) && coordinates.length === 2) {
        return `${coordinates[1]},${coordinates[0]}`;
      }

      return '';
    } catch (error) {
      console.error('Error parsing coordinates:', error);
      return '';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                <Building2 size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Branches</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalBranches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Users size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Audits</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.regularAudits + stats.specialAudits}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Fraud</p>
                <p className="text-2xl font-semibold text-gray-900">
                  Rp {stats.totalFraud.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Branch Locations</CardTitle>
            <div className="relative mt-4">
              <input
                type="text"
                placeholder="Search branch name or region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Branch Name</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBranches.map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell className="font-medium">{branch.name}</TableCell>
                        <TableCell>{branch.region}</TableCell>
                        <TableCell>
                          <a
                            href={`https://www.google.com/maps?q=${getCoordinatesText(branch.coordinates)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            View on Maps
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => 
                      emptyData 
                        ? 'No Audits' 
                        : `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getChartColors()[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;