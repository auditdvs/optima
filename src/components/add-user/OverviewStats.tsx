import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ChevronRight, FileText, Palette, Rocket, Server, Tag, Users, Wrench, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePresence } from '../../contexts/PresenceContext';
import { supabase } from '../../lib/supabase';
import { supabaseService } from '../../lib/supabaseService';

export default function OverviewStats() {
  const { onlineUserIds } = usePresence();
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  const { data: overviewStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin_overview_stats'],
    queryFn: async () => {
      // 1. Total users
      let totalUsers = 0;
      try {
        const { data: { users } } = await supabaseService.auth.admin.listUsers();
        totalUsers = users ? users.length : 0;
      } catch (err) { console.error(err); }

      // 2. Latest MSSQL status
      const { data: mssqlLog } = await supabase
        .from('db_connection_log')
        .select('status, checked_at')
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      // 3. Total Reprocess Queue
      let totalQueue = 0;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reprocess-approvals`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ type: 'check' }),
          });
          const checkData = await res.json();
          totalQueue = checkData.pending ? checkData.pending.length : 0;
        }
      } catch (err) {
        console.error("Failed to fetch reprocess queue", err);
      }

      // 4. Total Releases + breakdown for bar chart
      const { data: releases } = await supabase
        .from('system_changelog')
        .select('release_date, icon');
      
      const totalReleases = releases ? releases.length : 0;

      // Group releases per month
      const releasesPerMonth: Record<string, { total: number, label: string, breakdown: Record<string, number> }> = {};
      if (releases) {
        releases.forEach(r => {
          const dateObj = new Date(r.release_date);
          const sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
          const monthYear = dateObj.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
          
          if (!releasesPerMonth[sortKey]) {
            releasesPerMonth[sortKey] = { total: 0, label: monthYear, breakdown: { Wrench: 0, Palette: 0, Rocket: 0, Tag: 0, Other: 0 } };
          }
          
          releasesPerMonth[sortKey].total += 1;
          
          if (r.icon === 'Wrench' || r.icon === 'Palette' || r.icon === 'Rocket' || r.icon === 'Tag') {
             releasesPerMonth[sortKey].breakdown[r.icon] += 1;
          } else {
             releasesPerMonth[sortKey].breakdown['Other'] += 1;
          }
        });
      }

      // Build bar chart data (only 3 categories)
      const releaseChartData = Object.entries(releasesPerMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, data]) => ({
          month: data.label,
          Perbaikan: data.breakdown.Wrench,
          'Desain/UI': data.breakdown.Palette,
          'Release Fitur': data.breakdown.Rocket,
        }));

      // 5. Latency data (all entries)
      const { data: latencyLogs } = await supabase
        .from('db_connection_log')
        .select('checked_at, latency_ms, status')
        .order('checked_at', { ascending: true });

      return {
        totalUsers,
        latestMssqlStatus: mssqlLog?.status || 'unknown',
        latestMssqlTime: mssqlLog?.checked_at ? new Date(mssqlLog.checked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
        totalQueue,
        totalReleases,
        releasesPerMonth,
        releaseChartData,
        latencyRaw: latencyLogs || [],
      };
    },
    refetchInterval: 60000
  });
  const [latencyGrouping, setLatencyGrouping] = useState<'day' | 'week' | 'month' | 'year'>('day');

  // Group & average latency data
  const latencyChartData = useMemo(() => {
    const raw = overviewStats?.latencyRaw || [];
    if (raw.length === 0) return [];

    const getGroupKey = (dateStr: string) => {
      const d = new Date(dateStr);
      if (latencyGrouping === 'year') {
        return d.getFullYear().toString();
      }
      if (latencyGrouping === 'month') {
        return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      }
      if (latencyGrouping === 'day') {
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      }
      // week
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
      const week = Math.ceil((days + jan1.getDay() + 1) / 7);
      return `W${week} ${d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })}`;
    };

    const grouped: Record<string, { sum: number; count: number; min: number; max: number }> = {};
    const orderedKeys: string[] = [];

    raw.forEach((l: any) => {
      const key = getGroupKey(l.checked_at);
      const val = l.latency_ms ?? 0;
      if (!grouped[key]) {
        grouped[key] = { sum: 0, count: 0, min: val, max: val };
        orderedKeys.push(key);
      }
      grouped[key].sum += val;
      grouped[key].count += 1;
      grouped[key].min = Math.min(grouped[key].min, val);
      grouped[key].max = Math.max(grouped[key].max, val);
    });

    return orderedKeys.map(key => ({
      time: key,
      latency: Math.round(grouped[key].sum / grouped[key].count),
      min: grouped[key].min,
      max: grouped[key].max,
      count: grouped[key].count,
    }));
  }, [overviewStats?.latencyRaw, latencyGrouping]);

  return (
    <>
      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 px-1">
        
        {/* Active / Total Users */}
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
           <div className="flex justify-between items-center mb-1">
             <span className="text-sm font-medium text-gray-500">Active / Total Users</span>
             <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
               <Users className="w-4 h-4 text-indigo-600" />
             </div>
           </div>
           <div className="flex items-baseline gap-2">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               <span className="text-2xl font-bold text-gray-900">{onlineUserIds.size}</span>
             </div>
             <span className="text-sm font-medium text-gray-400">/ {statsLoading ? '-' : overviewStats?.totalUsers}</span>
           </div>
        </div>

        {/* MSSQL Status */}
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
           <div className="flex justify-between items-center mb-1">
             <span className="text-sm font-medium text-gray-500">Database Status</span>
             <div className={`p-1.5 rounded-lg border ${overviewStats?.latestMssqlStatus === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
               <Server className={`w-4 h-4 ${overviewStats?.latestMssqlStatus === 'success' ? 'text-emerald-600' : 'text-red-600'}`} />
             </div>
           </div>
           <div className="flex flex-col">
             <span className="text-xl font-bold text-gray-900 capitalize leading-tight">
               {statsLoading ? 'Checking...' : overviewStats?.latestMssqlStatus === 'success' ? 'Connected' : overviewStats?.latestMssqlStatus === 'failed' ? 'Failed' : 'Unknown'}
             </span>
             <span className="text-[11px] text-gray-400 font-medium">Last check: {statsLoading ? '-' : overviewStats?.latestMssqlTime}</span>
           </div>
        </div>

        {/* Reprocess Queue */}
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
           <div className="flex justify-between items-center mb-1">
             <span className="text-sm font-medium text-gray-500">Reprocess Queue</span>
             <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-100">
               <AlertTriangle className="w-4 h-4 text-amber-600" />
             </div>
           </div>
           <div className="flex items-baseline gap-2">
             <span className="text-2xl font-bold text-gray-900">{statsLoading ? '-' : overviewStats?.totalQueue}</span>
             <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Pending</span>
           </div>
        </div>

        {/* Total Releases */}
        <div 
          onClick={() => setShowReleaseModal(true)}
          className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex flex-col cursor-pointer hover:border-[#fd8c73] hover:shadow-md transition-all group relative"
        >
           <div className="flex justify-between items-center mb-1">
             <span className="text-sm font-medium text-gray-500 group-hover:text-[#fd8c73] transition-colors">Total Releases</span>
             <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 group-hover:bg-[#fd8c73]/10 group-hover:border-[#fd8c73]/20 transition-colors">
               <FileText className="w-4 h-4 text-gray-500 group-hover:text-[#fd8c73] transition-colors" />
             </div>
           </div>
           <div className="flex items-center justify-between">
             <div className="flex items-baseline gap-1.5">
               <span className="text-2xl font-bold text-gray-900 group-hover:text-[#fd8c73] transition-colors">{statsLoading ? '-' : overviewStats?.totalReleases}</span>
               <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Updates</span>
             </div>
             <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#fd8c73] transition-colors transform group-hover:translate-x-1" />
           </div>
        </div>
      </div>

      {/* ─── Charts ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-5 px-1">

        {/* Bar Chart: Releases by Type */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">System Releases by Type</h3>
          <p className="text-xs text-gray-400 mb-4">Grouped by icon category per month</p>
          {overviewStats?.releaseChartData && overviewStats.releaseChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overviewStats.releaseChartData} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="Perbaikan" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Desain/UI" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Release Fitur" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">No release data available</div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3 justify-center">
            {[
              { label: 'Perbaikan', color: '#f59e0b' },
              { label: 'Desain/UI', color: '#8b5cf6' },
              { label: 'Release Fitur', color: '#3b82f6' },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }}></span>
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* Line Chart: MSSQL Latency */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-0.5">MSSQL Connection Latency</h3>
              <p className="text-xs text-gray-400">Average latency per {latencyGrouping} ({latencyChartData.length} data points)</p>
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50 text-xs font-medium">
              {(['day', 'week', 'month', 'year'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setLatencyGrouping(g)}
                  className={`px-3 py-1.5 transition-colors capitalize ${
                    latencyGrouping === g
                      ? 'bg-emerald-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          {latencyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={latencyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit=" ms" />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'latency' ? 'Avg Latency' : name === 'min' ? 'Min' : 'Max';
                    return [`${value.toLocaleString('id-ID')} ms`, label];
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                  name="latency"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">No latency data available</div>
          )}
        </div>
      </div>

      {/* ─── Release Stats Modal ─── */}
      {showReleaseModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex justify-center items-center z-[100] backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full sm:max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 fade-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Releases per Month
              </h3>
              <button onClick={() => setShowReleaseModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-50/30">
              {!overviewStats?.releasesPerMonth || Object.keys(overviewStats.releasesPerMonth).length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Belum ada data rilis.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.entries(overviewStats.releasesPerMonth)
                    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                    .map(([sortKey, data], i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] hover:shadow-md hover:border-[#fd8c73]/40 transition-all flex flex-col">
                      <div className="border-b border-gray-100 pb-3 mb-3 flex justify-between items-center text-sm">
                        <span className="font-bold text-gray-800">{data.label}</span>
                        <span className="bg-[#fd8c73]/10 border border-[#fd8c73]/20 text-[#e95a3a] text-xs font-bold px-2 py-0.5 rounded-md">
                          {data.total}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mt-auto">
                         {data.breakdown.Wrench > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-amber-50">
                              <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                                <Wrench className="w-3.5 h-3.5"/> Fixes
                              </span>
                              <span className="font-bold text-gray-700">{data.breakdown.Wrench}</span>
                            </div>
                         )}
                         {data.breakdown.Palette > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-purple-50">
                              <span className="flex items-center gap-1.5 text-purple-700 font-medium">
                                <Palette className="w-3.5 h-3.5"/> Design
                              </span>
                              <span className="font-bold text-gray-700">{data.breakdown.Palette}</span>
                            </div>
                         )}
                         {data.breakdown.Rocket > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-blue-50">
                              <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                                <Rocket className="w-3.5 h-3.5"/> Feature
                              </span>
                              <span className="font-bold text-gray-700">{data.breakdown.Rocket}</span>
                            </div>
                         )}
                         {data.breakdown.Tag > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-gray-100">
                              <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                                <Tag className="w-3.5 h-3.5"/> Misc
                              </span>
                              <span className="font-bold text-gray-700">{data.breakdown.Tag}</span>
                            </div>
                         )}
                         {data.breakdown.Other > 0 && (
                            <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-emerald-50">
                              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5"/> Update
                              </span>
                              <span className="font-bold text-gray-700">{data.breakdown.Other}</span>
                            </div>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Total keseluruhan pembaharuan sistem</span>
              <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded shadow-sm border border-gray-100 text-base">{overviewStats?.totalReleases || 0}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
