import { ArrowUpDown, Search } from "lucide-react";
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "../ui/chart";

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
  pic?: string;
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
  pic?: string;
}

// Field name to display name mapping
const regularAuditAliases: Record<string, string> = {
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

const fraudAuditAliases: Record<string, string> = {
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

const AuditSummary = () => {
  // State variables
  const [regularAudits, setRegularAudits] = useState<RegularAudit[]>([]);
  const [fraudAudits, setFraudAudit] = useState<FraudAudit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'regular' | 'fraud'>('regular');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'branch_name', direction: 'asc' });
  const [selectedRegionReport, setSelectedRegionReport] = useState<string>('ALL');
  const [reportUndoneOnly, setReportUndoneOnly] = useState(false);
  const [workPapersRegular, setWorkPapersRegular] = useState<any[]>([]);

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

  const getFilteredRatingSummary = () => {
    if (selectedRegion === 'ALL') {
      return auditRatingSummary;
    }
    const regionData = auditRatingByRegion.find(r => r.region === selectedRegion);
    return regionData
      ? { high: regionData.high, medium: regionData.medium, low: regionData.low }
      : { high: 0, medium: 0, low: 0 };
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
      setFraudAudit(fraudData || []);
    } catch (error) {
      console.error('Error fetching audit recap data:', error);
    }
  };

  const fetchWorkPapersRegular = async () => {
    const { data, error } = await supabase
      .from('work_papers')
      .select('branch_name')
      .eq('audit_type', 'regular');
    if (!error) setWorkPapersRegular(data || []);
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

  useEffect(() => {
    fetchAuditRatingSummary();
    fetchAuditRecapData();
    fetchWorkPapersRegular();
  }, []);

  return (
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
                    if (activeTab === 'regular') {
                      const failedKeys = Object.entries(audit)
                        .filter(([key, value]) =>
                          typeof value === 'boolean' &&
                          !value &&
                          regularAuditAliases[key]
                        )
                        .map(([key]) => key);

                      if (failedKeys.length === 0) return false;
                      if (failedKeys.length === 1 && failedKeys[0] === 'revised_dapa') return false;
                      return true;
                    }
                    if (activeTab === 'fraud') {
                      const failedKeys = Object.entries(audit)
                        .filter(([key, value]) =>
                          typeof value === 'boolean' &&
                          !value &&
                          fraudAuditAliases[key]
                        )
                        .map(([key]) => key);

                      return failedKeys.length > 0;
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
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-normal break-words max-w-[300px]">
                            {getFailedChecksWithAliases(audit, false)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-normal break-words max-w-[200px]">
                            {audit.review}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 whitespace-normal break-words max-w-[200px]">
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
  );
};

export default AuditSummary;
