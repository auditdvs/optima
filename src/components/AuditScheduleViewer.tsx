import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LoadingAnimation } from './LoadingAnimation'; // Import the new component

interface AuditScheduleProps {
  className?: string;
}

interface AuditScheduleItem {
  branch_name: string;
  region: string;
  no: string;
  audit_period?: string;
  status?: string;
}

const AuditScheduleViewer: React.FC<AuditScheduleProps> = ({ className }) => {
  const [schedules, setSchedules] = useState<AuditScheduleItem[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [auditedBranches, setAuditedBranches] = useState<Record<string, { 
    isAudited: boolean,
    period?: string
  }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch audit_schedule data
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('audit_schedule')
        .select('branch_name, region, no')
        .order('no');
      
      if (schedulesError) throw schedulesError;
      
      // Fetch audit_regular data to check audited status and periods
      const { data: auditRegularData, error: auditRegularError } = await supabase
        .from('audit_regular')
        .select('branch_name, audit_period_start, audit_period_end');
      
      if (auditRegularError) throw auditRegularError;
      
      // Create a mapping of branch names to audit status and period
      const auditStatusMap: Record<string, { isAudited: boolean, period?: string }> = {};
      
      auditRegularData?.forEach(audit => {
        const periodStart = audit.audit_period_start ? formatDate(audit.audit_period_start) : '';
        const periodEnd = audit.audit_period_end ? formatDate(audit.audit_period_end) : '';
        const periodStr = periodStart && periodEnd ? `${periodStart} - ${periodEnd}` : '';
        
        auditStatusMap[audit.branch_name] = {
          isAudited: true,
          period: periodStr
        };
      });
      
      setAuditedBranches(auditStatusMap);
      
      // Combine the data
      const enhancedSchedules = schedulesData?.map(schedule => {
        const auditInfo = auditStatusMap[schedule.branch_name] || { isAudited: false };
        
        return {
          ...schedule,
          audit_period: auditInfo.period || 'Not set',
          status: auditInfo.isAudited ? 'Audited' : 'Unaudited'
        };
      }) || [];
      
      // Extract unique regions
      const uniqueRegions = [...new Set(enhancedSchedules.map(item => item.region) || [])];
      setRegions(uniqueRegions);
      
      // If no region is selected, default to first one
      if (!selectedRegion && uniqueRegions.length > 0) {
        setSelectedRegion(uniqueRegions[0]);
      }
      
      setSchedules(enhancedSchedules);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      return `${month}, ${year}`;
    } catch (error) {
      console.error("Error formatting date:", dateStr, error);
      return '';
    }
  };

  const filteredSchedules = selectedRegion 
    ? schedules.filter(s => s.region === selectedRegion)
    : schedules;

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {expanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <h3 className="text-lg font-medium">Audit Schedule</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Region:</label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
          >
            {regions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      </div>

      {expanded && (
        <>
          {loading ? (
            <LoadingAnimation /> // Replace the previous loading indicator
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSchedules.length > 0 ? (
                    filteredSchedules.map((schedule) => (
                      <tr key={schedule.branch_name} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {schedule.no}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {schedule.branch_name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {schedule.audit_period !== 'Not set' ? schedule.audit_period : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <span 
                            className={`px-2 py-1 rounded-full text-xs
                              ${schedule.status === 'Audited' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                            `}
                          >
                            {schedule.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                        No schedules found for this region
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuditScheduleViewer;