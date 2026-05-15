import { AlertCircle, AlertTriangle, ArrowUpDown, CheckCircle2, Search } from "lucide-react";
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, Cell, Legend } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import LazyEChart from '../common/LazyEChart';

const PIE_COLORS = ['#11356B', '#C0392B', '#E67E22', '#27AE60', '#8E44AD', '#2980B9', '#D35400', '#16A085', '#7F8C8D', '#F39C12'];
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "../ui/chart";

type SortOrder = 'asc' | 'desc';

const AuditSummary = () => {
  // State Audit Rating Count
  const [auditRatingSummary, setAuditRatingSummary] = useState<{ high: number; medium: number; low: number }>({ high: 0, medium: 0, low: 0 });
  const [auditRatingByRegion, setAuditRatingByRegion] = useState<{ region: string; high: number; medium: number; low: number }[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [regionOptions, setRegionOptions] = useState<string[]>([]);

  // Risk Issue Tab States
  const [mainTab, setMainTab] = useState<'rating' | 'risk_issue'>('rating');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [riskIssues, setRiskIssues] = useState<{ kode: string; judul: string; count: number }[]>([]);
  const [pieChartData, setPieChartData] = useState<{ kode: string; judul: string; count: number }[]>([]);
  const [barChartOption, setBarChartOption] = useState<any>(null);

  // Data chart audit rating (ECharts format)
  const getAuditBarOption = () => {
    let regions: { region: string; high: number; medium: number; low: number }[] = [];
    if (selectedRegion === 'ALL') {
       regions = auditRatingByRegion;
    } else {
       regions = auditRatingByRegion.filter(r => r.region === selectedRegion);
    }
    
    const source: any[] = [['Region', 'High', 'Medium', 'Low']];
    regions.forEach(r => {
       source.push([r.region, r.high, r.medium, r.low]);
    });
    
    return {
       tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
       legend: { data: ['High', 'Medium', 'Low'], top: 0, padding: 0 },
       grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
       xAxis: { type: 'category', axisLabel: { interval: 0, fontSize: 11 } },
       yAxis: { type: 'value' },
       dataset: { source },
       series: [
          { type: 'bar', itemStyle: { color: '#fb7185', borderRadius: [2, 2, 0, 0] } },
          { type: 'bar', itemStyle: { color: '#fbbf24', borderRadius: [2, 2, 0, 0] } },
          { type: 'bar', itemStyle: { color: '#34d399', borderRadius: [2, 2, 0, 0] } }
       ]
    };
  };

  // Pengambilan data audit rating
  const fetchAuditRatingSummary = async () => {
    try {
      const { data: auditMaster } = await supabase
        .from('audit_master')
        .select('region, rating, audit_type');

      const regularAudits = auditMaster?.filter(a => 
         a.audit_type === 'Regular' || 
         a.audit_type === 'regular' || 
         a.audit_type?.toLowerCase().includes('reguler')
      );

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

  const fetchRiskIssues = async () => {
    try {
      let query = supabase.from('risk_issue').select('kode_risk_issue, judul_risk_issue, kc_kr_kp');
      
      if (startDate) {
        query = query.gte('tanggal_audit', startDate);
      }
      if (endDate) {
        query = query.lte('tanggal_audit', endDate);
      }

      const { data, error } = await query;
      
      const { data: branches } = await supabase.from('branches_info').select('name, region');
      const branchMap = new Map();
      branches?.forEach(b => {
        if (b.name) branchMap.set(b.name.trim().toLowerCase(), b.region);
      });
      
      if (error) throw error;

      if (data) {
        const agg: Record<string, { kode: string, judul: string, count: number }> = {};
        const regionIssueCount: Record<string, Record<string, number>> = {};

        data.forEach(item => {
          const key = item.kode_risk_issue || '-';
          if (!agg[key]) agg[key] = { kode: key, judul: item.judul_risk_issue || '-', count: 0 };
          agg[key].count++;

          let region = '';
          const kc = (item.kc_kr_kp || '').trim().toLowerCase();
          if (kc.startsWith('regional')) {
             region = kc.replace('regional', '').trim().toUpperCase();
          } else if (branchMap.has(kc)) {
             region = branchMap.get(kc);
          } else {
             for (const [branchName, branchRegion] of branchMap.entries()) {
                if (branchName.length > 3 && (branchName.includes(kc) || kc.includes(branchName))) {
                   region = branchRegion;
                   break;
                }
             }
          }

          if (region) {
            if (!regionIssueCount[region]) regionIssueCount[region] = {};
            if (!regionIssueCount[region][key]) regionIssueCount[region][key] = 0;
            regionIssueCount[region][key]++;
          }
        });

        // 1. Table Data: All issues
        const sortedAll = Object.values(agg).sort((a, b) => b.count - a.count);
        setRiskIssues(sortedAll);

        // 2. Pie Chart: 10 Terbanyak, sisanya 'Lainnya'
        const top10 = sortedAll.slice(0, 10);
        const rest = sortedAll.slice(10);
        const pieData = [...top10];
        if (rest.length > 0) {
          const sumRest = rest.reduce((acc, curr) => acc + curr.count, 0);
          pieData.push({ kode: 'Lainnya', judul: 'Lainnya', count: sumRest });
        }
        setPieChartData(pieData);

        // 3. Bar Chart: 3 Terbanyak per Regional
        const sortedRegions = Object.keys(regionIssueCount).sort();
        
        const top1Data: any[] = [];
        const top2Data: any[] = [];
        const top3Data: any[] = [];

        sortedRegions.forEach(reg => {
           const issues = Object.entries(regionIssueCount[reg]).map(([kode, count]) => ({ kode, count }));
           issues.sort((a, b) => b.count - a.count);
           
           top1Data.push(issues[0] ? { value: issues[0].count, kode: issues[0].kode } : { value: 0, kode: '' });
           top2Data.push(issues[1] ? { value: issues[1].count, kode: issues[1].kode } : { value: 0, kode: '' });
           top3Data.push(issues[2] ? { value: issues[2].count, kode: issues[2].kode } : { value: 0, kode: '' });
        });

        setBarChartOption({
          tooltip: { 
            trigger: 'axis', 
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
               let result = `<strong>Regional ${params[0].axisValue}</strong><br/>`;
               params.forEach((item: any) => {
                  if (item.data && item.data.value > 0) {
                     result += `${item.marker} ${item.seriesName}: <b>${item.data.kode}</b> (${item.data.value})<br/>`;
                  }
               });
               return result;
            }
          },
          legend: { data: ['Terbanyak 1', 'Terbanyak 2', 'Terbanyak 3'], top: 0 },
          grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
          xAxis: { type: 'category', data: sortedRegions, axisLabel: { interval: 0, fontSize: 11 } },
          yAxis: { type: 'value' },
          series: [
            {
               name: 'Terbanyak 1',
               type: 'bar',
               data: top1Data,
               label: { show: true, position: 'top', formatter: (p: any) => p.data.kode || '', fontSize: 10, rotate: 90, align: 'left', verticalAlign: 'middle', distance: 5 },
               itemStyle: { color: '#3b82f6', borderRadius: [2, 2, 0, 0] }
            },
            {
               name: 'Terbanyak 2',
               type: 'bar',
               data: top2Data,
               label: { show: true, position: 'top', formatter: (p: any) => p.data.kode || '', fontSize: 10, rotate: 90, align: 'left', verticalAlign: 'middle', distance: 5 },
               itemStyle: { color: '#f59e0b', borderRadius: [2, 2, 0, 0] }
            },
            {
               name: 'Terbanyak 3',
               type: 'bar',
               data: top3Data,
               label: { show: true, position: 'top', formatter: (p: any) => p.data.kode || '', fontSize: 10, rotate: 90, align: 'left', verticalAlign: 'middle', distance: 5 },
               itemStyle: { color: '#10b981', borderRadius: [2, 2, 0, 0] }
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching risk issues:', error);
    }
  };

  useEffect(() => {
    fetchAuditRatingSummary();
  }, []);

  useEffect(() => {
    if (mainTab === 'risk_issue') {
      fetchRiskIssues();
    }
  }, [mainTab, startDate, endDate]);

  return (
    <>
      <div className="flex border-b border-gray-200 mb-6 gap-2">
        <button
          onClick={() => setMainTab('rating')}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${mainTab === 'rating' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Audit Rating - Recap
        </button>
        <button
          onClick={() => setMainTab('risk_issue')}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${mainTab === 'risk_issue' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Risk Issue
        </button>
      </div>

      {mainTab === 'rating' && (
        <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
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
                       <AlertTriangle size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">High Risk</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredSummary.high}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                       <AlertCircle size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Medium Risk</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredSummary.medium}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                       <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Low Risk</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredSummary.low}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
                  {/* Pie Chart (1/3 width) */}
                  <div className="lg:col-span-1 flex flex-col justify-center items-center rounded-xl bg-slate-50/50 p-4 border border-slate-100 shadow-sm">
                    <ChartContainer
                      config={{
                        high: { label: "High", color: "#fb7185" },
                        medium: { label: "Medium", color: "#fde68a" },
                        low: { label: "Low", color: "#34d399" },
                      }}
                      className="mx-auto w-full aspect-square max-h-[350px]"
                    >
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie
                          data={[
                            { name: "High", value: filteredSummary.high, fill: "#fb7185" },
                            { name: "Medium", value: filteredSummary.medium, fill: "#fbbf24" },
                            { name: "Low", value: filteredSummary.low, fill: "#34d399" },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={65}
                          outerRadius={95}
                          cornerRadius={6}
                          paddingAngle={3}
                          stroke="none"
                        />
                        <Legend 
                          layout="horizontal" 
                          verticalAlign="bottom" 
                          align="center"
                          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        />
                      </PieChart>
                    </ChartContainer>
                    <p className="text-center text-xs font-medium text-slate-500 mt-4">Audit Rating Recap Total</p>
                  </div>

                  {/* Bar Chart (2/3 width) */}
                  <div className="lg:col-span-2 flex flex-col rounded-xl bg-slate-50/50 p-4 border border-slate-100 shadow-sm min-h-[300px]">
                    <p className="text-sm font-semibold text-slate-700 mb-4 text-center">Audit Rating Recap by Region</p>
                    <div className="flex-1 w-full relative">
                      <div className="absolute inset-0">
                        <LazyEChart option={getAuditBarOption()} style={{ width: '100%', height: '100%' }} />
                      </div>
                    </div>
                  </div>
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
      )}

      {mainTab === 'risk_issue' && (
        <Card className="mb-6 shadow-sm border-slate-200">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <CardTitle className="text-xl">Isu Risiko Signifikan</CardTitle>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="border rounded px-3 py-1.5 text-sm bg-muted/50 border-slate-300 shadow-sm"
              />
              <span className="text-gray-500">-</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="border rounded px-3 py-1.5 text-sm bg-muted/50 border-slate-300 shadow-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {riskIssues.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">Tidak ada data risk issue pada periode ini.</div>
            ) : (
              <div className="flex flex-col gap-8">
                {/* Visualizations Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Pie Chart (1/3 width) */}
                  <div className="lg:col-span-1 flex flex-col justify-center items-center rounded-xl bg-slate-50/50 p-4 border border-slate-100 shadow-sm">
                    <ChartContainer
                      config={{}}
                      className="mx-auto w-full aspect-square max-h-[350px]"
                    >
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie
                          data={pieChartData}
                          dataKey="count"
                          nameKey="kode"
                          innerRadius={65}
                          outerRadius={95}
                          cornerRadius={6}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.kode === 'Lainnya' ? '#CBD5E1' : PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend 
                          layout="horizontal" 
                          verticalAlign="bottom" 
                          align="center"
                          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        />
                      </PieChart>
                    </ChartContainer>
                    <p className="text-center text-xs font-medium text-slate-500 mt-4">Sebaran Isu Risiko Keseluruhan</p>
                  </div>

                  {/* Bar Chart (2/3 width) */}
                  <div className="lg:col-span-2 flex flex-col rounded-xl bg-slate-50/50 p-4 border border-slate-100 shadow-sm min-h-[300px]">
                    <p className="text-sm font-semibold text-slate-700 mb-4 text-center">Top 3 Isu Risiko per Regional</p>
                    <div className="flex-1 w-full relative">
                      {barChartOption && (
                         <div className="absolute inset-0">
                           <LazyEChart option={barChartOption} style={{ width: '100%', height: '100%' }} />
                         </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table Row (Full width) */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm max-h-[500px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Kode</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Judul Risk Issue</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {riskIssues.map((ri, idx) => (
                        <tr key={ri.kode} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-center text-sm font-medium text-slate-900">{idx + 1}</td>
                          <td className="px-4 py-3 text-left text-sm text-indigo-600 font-semibold whitespace-nowrap">{ri.kode}</td>
                          <td className="px-4 py-3 text-left text-sm text-slate-700">{ri.judul}</td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">{ri.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AuditSummary;
