import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface AuditScheduleItem {
  no?: number;
  branch_name: string;
  region?: string;
  isAudited?: boolean;
  audit_period_start?: string | null;
  audit_period_end?: string | null;
  audit_start_date?: string | null; // For Pelaksanaan
  audit_end_date?: string | null; // For Pelaksanaan
  execution_order?: number;
  priority?: number;
  status?: string;
}

const AuditSchedule = () => {
  const [auditScheduleData, setAuditScheduleData] = useState<AuditScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('A');

  useEffect(() => {
    fetchAuditScheduleData();
  }, []);

  const fetchAuditScheduleData = async () => {
    try {
      setLoadingSchedule(true);
      
      // Get audit_schedule data (for priority, branch_name, region)
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('audit_schedule')
        .select('id, no, branch_name, region')
        .order('no', { ascending: true });

      if (scheduleError) {
        console.error("Error fetching audit_schedule:", scheduleError);
        setLoadingSchedule(false);
        return;
      }

      // Get audit_master data (for audit period, execution order calculation, status)
      // Only get regular audits
      const { data: auditMasterData, error: auditError } = await supabase
        .from('audit_master')
        .select('branch_name, audit_period_start, audit_period_end, audit_start_date, audit_end_date, created_at, audit_type')
        .or('audit_type.ilike.%regular%,audit_type.ilike.%reguler%');

      if (auditError) {
        console.error("Error fetching audit_master:", auditError);
      }

      // Create map of audited branches (VLOOKUP by branch_name)
      const auditedBranchMap: Record<string, {
        audit_period_start: string | null;
        audit_period_end: string | null;
        audit_start_date: string | null;
        audit_end_date: string | null;
        created_at: string;
      }> = {};

      auditMasterData?.forEach(audit => {
        // Store the earliest audit for each branch (in case multiple audits exist)
        if (!auditedBranchMap[audit.branch_name] || 
            new Date(audit.created_at) < new Date(auditedBranchMap[audit.branch_name].created_at)) {
          auditedBranchMap[audit.branch_name] = {
            audit_period_start: audit.audit_period_start,
            audit_period_end: audit.audit_period_end,
            audit_start_date: audit.audit_start_date,
            audit_end_date: audit.audit_end_date,
            created_at: audit.created_at
          };
        }
      });

      // Group audits by region for execution order calculation
      const auditsByRegion: Record<string, Array<{
        branch_name: string;
        created_at: string;
      }>> = {};

      auditMasterData?.forEach(audit => {
        // Find region from scheduleData
        const scheduleItem = scheduleData?.find(s => s.branch_name === audit.branch_name);
        const region = scheduleItem?.region;
        
        if (region && !auditsByRegion[region]?.find(a => a.branch_name === audit.branch_name)) {
          if (!auditsByRegion[region]) {
            auditsByRegion[region] = [];
          }
          auditsByRegion[region].push({
            branch_name: audit.branch_name,
            created_at: auditedBranchMap[audit.branch_name].created_at
          });
        }
      });

      // Calculate execution order per region (sorted by created_at, earliest = 1)
      const executionOrderMap: Record<string, number> = {};
      Object.keys(auditsByRegion).forEach(region => {
        const sortedAudits = auditsByRegion[region].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        sortedAudits.forEach((audit, index) => {
          executionOrderMap[audit.branch_name] = index + 1;
        });
      });

      // Combine schedule with audit data (VLOOKUP result)
      const formattedSchedule = scheduleData?.map((item: any) => {
        const auditData = auditedBranchMap[item.branch_name];
        const isAudited = !!auditData;
        
        return {
          no: parseInt(item.no) || 0,
          branch_name: item.branch_name,
          region: item.region,
          priority: parseInt(item.no) || 0,
          status: isAudited ? 'Audited' : 'Unaudited',
          isAudited: isAudited,
          audit_period_start: auditData?.audit_period_start || null,
          audit_period_end: auditData?.audit_period_end || null,
          audit_start_date: auditData?.audit_start_date || null,
          audit_end_date: auditData?.audit_end_date || null,
          execution_order: executionOrderMap[item.branch_name] || undefined
        };
      }) || [];
      
      setAuditScheduleData(formattedSchedule);
    } catch (error) {
      console.error('Error fetching audit schedule data:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  /* Helper to format date range intelligently
     - Same month & year: "12 s.d. 20 Januari 2026"
     - Same year: "28 Februari s.d. 5 Maret 2026" (opsional, tapi user minta spesifik yg sama bulan)
     - Different year: "28 Desember 2025 s.d. 5 Januari 2026"
  */
  const formatDateRange = (startDateStr: string | undefined | null, endDateStr: string | undefined | null) => {
    if (!startDateStr || !endDateStr) return '-';

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleDateString('id-ID', { month: 'long' });
    const startYear = startDate.getFullYear();

    const endDay = endDate.getDate();
    const endMonth = endDate.toLocaleDateString('id-ID', { month: 'long' });
    const endYear = endDate.getFullYear();

    if (startMonth === endMonth && startYear === endYear) {
      return `${startDay} s.d. ${endDay} ${endMonth} ${endYear}`;
    } else if (startYear === endYear) {
      return `${startDay} ${startMonth} s.d. ${endDay} ${endMonth} ${endYear}`;
    } else {
      return `${startDay} ${startMonth} ${startYear} s.d. ${endDay} ${endMonth} ${endYear}`;
    }
  };

  // Helper khusus untuk Periode Data (biasanya per Bulan/Tahun, tidak butuh tanggal hari)
  // Contoh: "Januari 2025 - Desember 2025" atau "Januari 2025" (jika sama)
  const formatPeriod = (startDateStr: string | undefined | null, endDateStr: string | undefined | null) => {
    if (!startDateStr || !endDateStr) return '-';

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const startMonth = startDate.toLocaleDateString('id-ID', { month: 'long' });
    const startYear = startDate.getFullYear();

    const endMonth = endDate.toLocaleDateString('id-ID', { month: 'long' });
    const endYear = endDate.getFullYear();

    if (startMonth === endMonth && startYear === endYear) {
      return `${startMonth} ${startYear}`;
    } else if (startYear === endYear) {
      return `${startMonth} - ${endMonth} ${endYear}`;
    } else {
      return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Region Tabs */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 border-b border-gray-200">
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'].map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                selectedRegion === region
                  ? 'text-blue-600 border-blue-600 bg-blue-50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">PRIO</TableHead>
              <TableHead className="w-20 text-center whitespace-nowrap">EXE ORDER</TableHead>
              <TableHead>BRANCH NAME</TableHead>
              <TableHead>PERIODE DATA</TableHead>
              <TableHead>PELAKSANAAN</TableHead>
              <TableHead className="text-center">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingSchedule ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : auditScheduleData.filter(schedule => 
                schedule.region === selectedRegion
              ).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No audit schedule found for Region {selectedRegion}</TableCell>
              </TableRow>
            ) : (
              auditScheduleData
                .filter(schedule => schedule.region === selectedRegion)
                .sort((a, b) => (a.no || 0) - (b.no || 0)) // Sort by priority ascending
                .map((schedule, idx) => {
                  let rowColorClass = '';
                  
                  // Logic pewarnaan baris berdasarkan status dan prioritas
                  const regionSchedules = auditScheduleData.filter(s => s.region === selectedRegion).sort((a, b) => (a.no || 0) - (b.no || 0));
                  const isTopPriority = regionSchedules.findIndex(s => s.branch_name === schedule.branch_name) < 3; // Top 3
                  
                  if (schedule.isAudited) {
                    rowColorClass = 'bg-green-50 hover:bg-green-100 text-green-900'; // Hijau: Sudah diaudit
                  } else if (isTopPriority) {
                    rowColorClass = 'bg-orange-50 hover:bg-orange-100 text-orange-900 font-medium'; // Orange: Belum + Prioritas Tinggi
                  } else {
                    rowColorClass = 'bg-red-50 hover:bg-red-100 text-red-900'; // Merah: Belum audit
                  }

                  return (
                    <TableRow key={idx} className={rowColorClass}>
                      <TableCell className="font-medium text-center">{schedule.priority}</TableCell>
                      <TableCell className="text-center font-bold">
                        {schedule.execution_order ? schedule.execution_order : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{schedule.branch_name}</TableCell>
                      <TableCell className="text-sm">
                        {schedule.audit_period_start && schedule.audit_period_end 
                          ? formatPeriod(schedule.audit_period_start, schedule.audit_period_end)
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-sm">
                        {schedule.audit_start_date && schedule.audit_end_date 
                          ? formatDateRange(schedule.audit_start_date, schedule.audit_end_date)
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold
                          ${schedule.isAudited 
                            ? 'bg-green-200 text-green-800' 
                            : isTopPriority
                              ? 'bg-orange-200 text-orange-800'
                              : 'bg-red-200 text-red-800'
                          }`}>
                          {schedule.isAudited ? 'DONE' : 'PENDING'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
        
        {/* Legend / Keterangan Warna */}
        <div className="mt-4 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-200 border border-green-300 rounded"></span>
            <span>Sudah Diaudit (Done)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-orange-200 border border-orange-300 rounded"></span>
            <span>Prioritas Tinggi (Pending - Top 3)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-200 border border-red-300 rounded"></span>
            <span>Belum Diaudit (Pending)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditSchedule;
