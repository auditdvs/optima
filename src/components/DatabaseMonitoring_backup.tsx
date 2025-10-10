import { RefreshCw, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface MonitoringRequest {
  id: string;
  type: 'THC' | 'Fix Asset' | 'Db Loan & Saving' | 'Detail Nasabah SRSS';
  requested_by: string;
  requested_by_name: string;
  branch_code?: string;
  branch_id?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  status: string;
}

interface ComponentAccessControl {
  id: number;
  component_name: string;
  display_name: string;
  is_enabled: boolean;
  is_24_hours: boolean;
  start_time: string;
  end_time: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

const DatabaseMonitoring = () => {
  const { user, userRole } = useAuth();
  const [requests, setRequests] = useState<MonitoringRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [componentAccess, setComponentAccess] = useState<ComponentAccessControl[]>([]);
  const [savingChanges, setSavingChanges] = useState(false);

  const isAdmin = ['superadmin', 'dvs', 'manager'].includes(userRole || '');

  useEffect(() => {
    if (user && isAdmin) {
      fetchAllRequests();
      fetchComponentAccess();
    }
  }, [user, isAdmin]);

  const fetchComponentAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('component_access_control')
        .select('*')
        .order('display_name', { ascending: true });
      
      if (error) throw error;
      setComponentAccess(data || []);
    } catch (error) {
      console.error('Error fetching component access:', error);
      toast.error('Failed to load component access settings');
    }
  };

  const updateComponentAccess = async (componentId: number, updates: Partial<ComponentAccessControl>) => {
    setSavingChanges(true);
    try {
      const { error } = await supabase
        .from('component_access_control')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', componentId);
      
      if (error) throw error;
      
      // Update local state
      setComponentAccess(prev => 
        prev.map(comp => 
          comp.id === componentId 
            ? { ...comp, ...updates } 
            : comp
        )
      );
      
      toast.success('Component access updated');
    } catch (error) {
      console.error('Error updating component access:', error);
      toast.error('Failed to update component access');
    } finally {
      setSavingChanges(false);
    }
  };

  const fetchAllRequests = async () => {
    setLoading(true);
    setError(false);
    
    try {
      const allRequests: MonitoringRequest[] = [];

      // Fetch THC requests
      const { data: thcData, error: thcError } = await supabase
        .from('thc')
        .select('id, requested_by, branch_id, start_date, end_date, created_at, status');
      
      if (thcError) {
        console.error('Error fetching THC data:', thcError);
      } else if (thcData) {
        const thcRequests = thcData.map(req => ({
          id: req.id,
          type: 'THC' as const,
          requested_by: req.requested_by,
          requested_by_name: '',
          branch_id: req.branch_id,
          start_date: req.start_date,
          end_date: req.end_date,
          created_at: req.created_at,
          status: req.status || 'queued'
        }));
        allRequests.push(...thcRequests);
      }

      // Fetch Fix Asset requests
      const { data: fixAssetData, error: fixAssetError } = await supabase
        .from('fix_asset')
        .select('id, requested_by, branch_code, created_at, status');
      
      if (fixAssetError) {
        console.error('Error fetching Fix Asset data:', fixAssetError);
      } else if (fixAssetData) {
        const fixAssetRequests = fixAssetData.map(req => ({
          id: req.id,
          type: 'Fix Asset' as const,
          requested_by: req.requested_by,
          requested_by_name: '',
          branch_code: req.branch_code,
          created_at: req.created_at,
          status: req.status || 'queued'
        }));
        allRequests.push(...fixAssetRequests);
      }

      // Fetch Db Loan & Saving requests
      const { data: dbLoanSavingData, error: dbLoanSavingError } = await supabase
        .from('dbLoanSaving')
        .select('id, requested_by, branch_code, created_at, status');
      
      if (dbLoanSavingError) {
        console.error('Error fetching Db Loan & Saving data:', dbLoanSavingError);
      } else if (dbLoanSavingData) {
        const dbLoanSavingRequests = dbLoanSavingData.map(req => ({
          id: req.id,
          type: 'Db Loan & Saving' as const,
          requested_by: req.requested_by,
          requested_by_name: '',
          branch_code: req.branch_code,
          created_at: req.created_at,
          status: req.status || 'queued'
        }));
        allRequests.push(...dbLoanSavingRequests);
      }

      // Fetch Detail Nasabah SRSS requests
      const { data: detailNasabahData, error: detailNasabahError } = await supabase
        .from('detail_nasabah_srss')
        .select('id, requested_by, branch_code, created_at, status');
      
      if (detailNasabahError) {
        console.error('Error fetching Detail Nasabah SRSS data:', detailNasabahError);
      } else if (detailNasabahData) {
        const detailNasabahRequests = detailNasabahData.map(req => ({
          id: req.id,
          type: 'Detail Nasabah SRSS' as const,
          requested_by: req.requested_by,
          requested_by_name: '',
          branch_code: req.branch_code,
          created_at: req.created_at,
          status: req.status || 'queued'
        }));
        allRequests.push(...detailNasabahRequests);
      }

      // Get all unique user IDs to fetch profile names
      const userIds = [...new Set(allRequests.map(req => req.requested_by))];
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else if (profilesData) {
          // Create a map for easy lookup
          const userMap: { [key: string]: string } = {};
          profilesData.forEach(profile => {
            userMap[profile.id] = profile.full_name;
          });

          // Update requests with user names
          allRequests.forEach(req => {
            req.requested_by_name = userMap[req.requested_by] || 'Unknown';
          });
        }
      }

      // Sort by created_at (newest first)
      allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRequests(allRequests);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      toast.error('Failed to load monitoring data');
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'completed': 'bg-emerald-100 text-emerald-800',
      'rejected': 'bg-rose-100 text-rose-800',
      'queued': 'bg-amber-100 text-amber-800',
      'processing': 'bg-blue-100 text-blue-800'
    };

    const className = statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${className}`}>
        {status || 'queued'}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('id-ID', { month: 'long' });
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = (hours % 12 || 12).toString().padStart(2, '0');
    
    return `${day} ${month} ${year}, ${displayHours}:${minutes} ${ampm}`;
  };

  const getInformationCell = (request: MonitoringRequest) => {
    let branchInfo = '';
    
    // Handle branch information
    if (request.branch_code) {
      branchInfo = `Branch: ${request.branch_code}`;
    } else if (request.branch_id) {
      branchInfo = `Branch: ${request.branch_id}`;
    }

    // For THC, include date range
    if (request.type === 'THC' && request.start_date && request.end_date) {
      const startDate = new Date(request.start_date).toLocaleDateString('id-ID');
      const endDate = new Date(request.end_date).toLocaleDateString('id-ID');
      return (
        <div className="text-sm">
          <div>{branchInfo}</div>
          <div className="text-xs text-gray-500 mt-1">
            {startDate} - {endDate}
          </div>
        </div>
      );
    }

    return <div className="text-sm">{branchInfo}</div>;
  };

  // Show access denied message for non-admin users
  if (!isAdmin) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">Database monitoring is only available for administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">Database Monitoring</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor all database requests from users across different modules.
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchAllRequests();
              checkCurrentAccessStatus();
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Refresh data"
            disabled={loading}
          >
            <RefreshCw size={18} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Component Access Control Table */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Component Access Control
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage access settings for each data component
            </p>
          </div>
        </div>

        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Component
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Setting
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Time
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Time
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {componentAccess.map((component) => (
                <tr key={component.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {component.display_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {component.component_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={component.is_enabled}
                        onChange={(e) => updateComponentAccess(component.id, { is_enabled: e.target.checked })}
                        disabled={savingChanges}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={component.is_24_hours}
                        onChange={(e) => updateComponentAccess(component.id, { is_24_hours: e.target.checked })}
                        disabled={savingChanges || !component.is_enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                    <div className="text-xs text-gray-500 mt-1">
                      {component.is_24_hours ? '24 Hours' : 'Custom'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="time"
                      value={component.start_time.slice(0, 5)}
                      onChange={(e) => updateComponentAccess(component.id, { start_time: e.target.value + ':00' })}
                      disabled={savingChanges || !component.is_enabled || component.is_24_hours}
                      className="text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="time"
                      value={component.end_time.slice(0, 5)}
                      onChange={(e) => updateComponentAccess(component.id, { end_time: e.target.value + ':00' })}
                      disabled={savingChanges || !component.is_enabled || component.is_24_hours}
                      className="text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      component.is_enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {component.is_enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
              
              {componentAccess.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No components found. Please check database configuration.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {savingChanges && (
          <div className="mt-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-sm text-gray-600">Saving changes...</span>
          </div>
        )}
      </div>

      {/* Status Legend */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">queued</span>
          <span className="text-sm text-gray-600">: Waiting for processing</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">processing</span>
          <span className="text-sm text-gray-600">: Currently being processed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">completed</span>
          <span className="text-sm text-gray-600">: Successfully completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold">rejected</span>
          <span className="text-sm text-gray-600">: Request rejected</span>
        </div>
      </div>

      {/* Monitoring Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loader">
            <div className="loader-ring loader-ring-a"></div>
            <div className="loader-ring loader-ring-b"></div>
            <div className="loader-ring loader-ring-c"></div>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8 bg-rose-50 border border-rose-200 rounded-lg text-center">
          <div className="text-rose-600 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-rose-800">Failed to Load Data</h3>
          <p className="text-rose-700 mt-1">There was an error loading the monitoring data.</p>
          <button 
            onClick={() => {
              setError(false);
              setLoading(true);
              fetchAllRequests();
            }}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 focus:outline-none"
          >
            Try Again
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No requests found.
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="min-w-full border rounded-lg shadow-sm">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Req Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Information
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Requested
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request, index) => (
                  <tr key={`${request.type}-${request.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {request.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.requested_by_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getInformationCell(request)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(request.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setEditingSchedule(null);
          }}
          schedule={editingSchedule}
          onSave={() => {
            fetchSchedules();
            setShowScheduleModal(false);
            setEditingSchedule(null);
          }}
        />
      )}
    </div>
  );
};

// Schedule Modal Component
interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: DataAccessSchedule | null;
  onSave: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, schedule, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_enabled: true,
    schedule_type: '24/7' as '24/7' | 'custom' | 'business_hours',
    start_time: '00:00',
    end_time: '23:59',
    timezone: 'Asia/Jakarta',
    allowed_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name,
        description: schedule.description || '',
        is_enabled: schedule.is_enabled,
        schedule_type: schedule.schedule_type,
        start_time: schedule.start_time.slice(0, 5),
        end_time: schedule.end_time.slice(0, 5),
        timezone: schedule.timezone,
        allowed_days: schedule.allowed_days
      });
    } else {
      // Reset form for new schedule
      setFormData({
        name: '',
        description: '',
        is_enabled: true,
        schedule_type: '24/7',
        start_time: '00:00',
        end_time: '23:59',
        timezone: 'Asia/Jakarta',
        allowed_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      });
    }
  }, [schedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduleData = {
        ...formData,
        start_time: formData.start_time + ':00',
        end_time: formData.end_time + ':00',
        updated_at: new Date().toISOString()
      };

      if (schedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('data_access_schedule')
          .update(scheduleData)
          .eq('id', schedule.id);
        
        if (error) throw error;
        toast.success('Schedule updated successfully');
      } else {
        // Create new schedule
        const { error } = await supabase
          .from('data_access_schedule')
          .insert([{
            ...scheduleData,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }]);
        
        if (error) throw error;
        toast.success('Schedule created successfully');
      }

      onSave();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_days: prev.allowed_days.includes(day)
        ? prev.allowed_days.filter(d => d !== day)
        : [...prev.allowed_days, day]
    }));
  };

  if (!isOpen) return null;

  const daysOfWeek = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {schedule ? 'Edit Schedule' : 'Add New Schedule'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Settings className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Business Hours Only"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Type *
                </label>
                <select
                  value={formData.schedule_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, schedule_type: e.target.value as any }))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="24/7">24/7 Access</option>
                  <option value="business_hours">Business Hours</option>
                  <option value="custom">Custom Schedule</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Optional description of this schedule"
              />
            </div>

            {/* Time Settings */}
            {formData.schedule_type !== '24/7' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                      <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                      <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                    </select>
                  </div>
                </div>

                {/* Days Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Allowed Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDayToggle(key)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          formData.allowed_days.includes(key)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Enable Schedule</h4>
                <p className="text-sm text-gray-500">
                  When enabled, this schedule will control data access
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : (schedule ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DatabaseMonitoring;