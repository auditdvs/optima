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
      const { data: auditMaster } = await supabase
        .from('audit_master')
        .select('region, rating, audit_type'); // Removed filter here to do it in js or add .ilike if needed

      // Filter regular only in JS to be safe with types
      const regularAudits = auditMaster?.filter(a => 
         a.audit_type === 'Regular' || 
         a.audit_type === 'regular' || 
         a.audit_type?.toLowerCase().includes('reguler')
      );

      // Rekap total
      const total = { high: 0, medium: 0, low: 0 };
      const regionMap: Record<string, { high: number; medium: number; low: number }> = {};

      regularAudits?.forEach(wp => {
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
      const { data: auditMaster, error } = await supabase
        .from('audit_master')
        .select('*');

      if (error) throw error;

      // Filter and Map Regular Audits
      const regularData: RegularAudit[] = auditMaster
        ?.filter(a => 
             a.audit_type === 'Regular' || 
             a.audit_type === 'regular' || 
             a.audit_type?.toLowerCase().includes('reguler')
        )
        .map(a => ({
             branch_name: a.branch_name,
             region: a.region,
             monitoring: a.monitoring_reg,
             dapa: a.dapa_reg,
             revised_dapa: a.revised_dapa_reg,
             dapa_supporting_data: a.dapa_supporting_data_reg,
             assignment_letter: a.assignment_letter_reg,
             entrance_agenda: a.entrance_agenda_reg,
             entrance_attendance: false, // Not in provided schema
             audit_working_papers: a.audit_wp_reg,
             exit_meeting_minutes: a.exit_meeting_minutes_reg,
             exit_attendance_list: a.exit_attendance_list_reg,
             audit_result_letter: a.audit_result_letter_reg,
             rta: a.rta_reg,
             pic: a.leader
        })) || [];

      // Filter and Map Fraud Audits
      const fraudData: FraudAudit[] = auditMaster
        ?.filter(a => 
             a.audit_type?.toLowerCase().includes('fraud') || 
             a.audit_type?.toLowerCase().includes('investigasi') ||
             a.audit_type?.toLowerCase().includes('khusus') || // Special audit treated as potential fraud or just separate? Assume fraud tab handles special too
             a.audit_type?.toLowerCase().includes('special')
        )
        .map(a => ({
             branch_name: a.branch_name,
             region: a.region,
             data_preparation: a.data_prep,
             assignment_letter: a.assignment_letter_fr,
             audit_working_papers: a.audit_wp_fr,
             audit_report: a.audit_report_fr,
             detailed_findings: a.detailed_findings_fr,
             review: a.comment_fr,
             pic: a.leader
        })) || [];

      setRegularAudits(regularData);
      setFraudAudit(fraudData);
    } catch (error) {
      console.error('Error fetching audit recap data:', error);
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
        audit.branch_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.region?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : fraudAudits.filter(audit =>
        audit.branch_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audit.region?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const sortedAudits = getSortedData(filteredAudits);

  useEffect(() => {
    fetchAuditRatingSummary();
    fetchAuditRecapData();
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
                  <div className="bg-white rounded-xl border border-rose-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                       <ArrowUpDown size={24} className="transform rotate-180" /> {/* Mimic high icon or use simple circle */}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">High Risk</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredSummary.high}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                       <div className="w-6 h-1 bg-current rounded-full" /> {/* Medium dash */}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Medium Risk</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredSummary.medium}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                       <ArrowUpDown size={24} /> {/* Mimic low icon */}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Low Risk</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredSummary.low}</p>
                    </div>
                  </div>
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
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Regional Breakdown</h4>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Region</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-rose-600 uppercase tracking-wider bg-rose-50/50">High</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50/50">Medium</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50/50">Low</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {auditRatingByRegion.map((region, idx) => (
                          <tr key={region.region} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">{region.region}</td>
                            <td className="px-6 py-3 text-center text-sm font-semibold text-rose-600 bg-rose-50/30">{region.high || '-'}</td>
                            <td className="px-6 py-3 text-center text-sm font-semibold text-amber-600 bg-amber-50/30">{region.medium || '-'}</td>
                            <td className="px-6 py-3 text-center text-sm font-semibold text-emerald-600 bg-emerald-50/30">{region.low || '-'}</td>
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
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-bold text-gray-900">Report Status</CardTitle>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={reportUndoneOnly}
                onChange={e => setReportUndoneOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 select-none">Show Undone Only</span>
            </label>
            
            <div className="relative min-w-[180px]">
              <select
                value={selectedRegionReport}
                onChange={(e) => setSelectedRegionReport(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              >
                <option value="ALL">All Regions</option>
                {Array.from({ length: 19 }, (_, i) => String.fromCharCode(65 + i)).map(region => (
                  <option key={region} value={region}>Regional {region}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No.</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch Name</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">RTA</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Report</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {regularAudits
                  .filter(audit => selectedRegionReport === 'ALL' || audit.region === selectedRegionReport)
                  .filter(audit => {
                    const rtaStatus = audit.rta ? 'Done' : 'Undone';
                    const reportStatus = audit.audit_result_letter ? 'Done' : 'Undone';
                    if (!reportUndoneOnly) return true;
                    return rtaStatus === 'Undone' || reportStatus === 'Undone';
                  })
                  .map((audit, idx) => {
                    const rtaStatus = audit.rta ? 'Done' : 'Undone';
                    const reportStatus = audit.audit_result_letter ? 'Done' : 'Undone';
                    return (
                      <tr key={audit.branch_name + idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-sm text-gray-900">{idx + 1}</td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{audit.branch_name}</td>
                        <td className="px-6 py-3 text-center">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                             audit.rta 
                               ? 'bg-emerald-100 text-emerald-800' 
                               : 'bg-rose-100 text-rose-800'
                           }`}>
                             {rtaStatus}
                           </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                             reportStatus === 'Done' 
                               ? 'bg-emerald-100 text-emerald-800' 
                               : 'bg-rose-100 text-rose-800'
                           }`}>
                             {reportStatus}
                           </span>
                        </td>
                      </tr>
                    );
                  })}
                {regularAudits
                  .filter(audit => selectedRegionReport === 'ALL' || audit.region === selectedRegionReport)
                  .filter(audit => {
                    const rtaStatus = audit.rta ? 'Done' : 'Undone';
                    const reportStatus = audit.audit_result_letter ? 'Done' : 'Undone';
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
