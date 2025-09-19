import { RefreshCw } from 'lucide-react';
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

const DatabaseMonitoring = () => {
  const { user, userRole } = useAuth();
  const [requests, setRequests] = useState<MonitoringRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isAdmin = ['superadmin', 'dvs', 'manager'].includes(userRole || '');

  useEffect(() => {
    if (user && isAdmin) {
      fetchAllRequests();
    }
  }, [user, isAdmin]);

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
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Refresh data"
            disabled={loading}
          >
            <RefreshCw size={18} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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
    </div>
  );
};

export default DatabaseMonitoring;