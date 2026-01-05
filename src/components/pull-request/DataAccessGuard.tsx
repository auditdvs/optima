import { Clock, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getNextAccessTime, isDataAccessAllowed } from '../utils/scheduleUtils';

interface DataAccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showStatus?: boolean;
}

interface AccessStatus {
  allowed: boolean;
  reason?: string;
  activeSchedule?: {
    id: number;
    name: string;
    schedule_type: string;
    [key: string]: any;
  };
}

interface NextAccessInfo {
  nextTime?: string;
  schedule?: {
    id: number;
    name: string;
    [key: string]: any;
  };
}

/**
 * DataAccessGuard component that checks if data access is allowed
 * and conditionally renders children or an access denied message
 */
const DataAccessGuard: React.FC<DataAccessGuardProps> = ({ 
  children, 
  fallback, 
  showStatus = true 
}) => {
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [nextAccessTime, setNextAccessTime] = useState<NextAccessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
    
    // Check access every minute
    const interval = setInterval(checkAccess, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const checkAccess = async () => {
    try {
      const [accessResult, nextTimeResult] = await Promise.all([
        isDataAccessAllowed(),
        getNextAccessTime()
      ]);
      
      setAccessStatus(accessResult);
      setNextAccessTime(nextTimeResult);
    } catch (error) {
      console.error('Error checking data access:', error);
      // On error, allow access (fail open)
      setAccessStatus({ allowed: true, reason: 'Unable to verify access schedule' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Checking data access...</span>
      </div>
    );
  }

  if (!accessStatus?.allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          {/* Access Denied Icon */}
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center ring-8 ring-red-50 mb-6">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          
          {/* Main Message */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Data Access Restricted
          </h3>
          
          <p className="text-gray-600 mb-6">
            {accessStatus?.reason || 'Data access is currently not allowed.'}
          </p>
          
          {/* Next Available Time */}
          {nextAccessTime?.nextTime && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-center gap-2 text-orange-700 mb-2">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Next Available Access</span>
              </div>
              <p className="text-sm text-orange-800 font-medium">
                {nextAccessTime.nextTime}
              </p>
              {nextAccessTime.schedule?.name && (
                <p className="text-xs text-orange-600 mt-1">
                  Schedule: {nextAccessTime.schedule.name}
                </p>
              )}
            </div>
          )}
          
          {/* Retry Button */}
          <button
            onClick={checkAccess}
            className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showStatus && accessStatus && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Data Access Active</span>
          </div>
          {accessStatus.reason && (
            <p className="text-xs text-green-700 mt-1">{accessStatus.reason}</p>
          )}
        </div>
      )}
      {children}
    </>
  );
};

/**
 * Hook for components that need to check data access programmatically
 */
export const useDataAccess = () => {
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const result = await isDataAccessAllowed();
      setAccessStatus(result);
      return result;
    } catch (error) {
      console.error('Error checking data access:', error);
      const fallbackResult = { allowed: true, reason: 'Unable to verify access schedule' };
      setAccessStatus(fallbackResult);
      return fallbackResult;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, []);

  return {
    accessStatus,
    loading,
    checkAccess,
    isAllowed: accessStatus?.allowed ?? false
  };
};

export default DataAccessGuard;