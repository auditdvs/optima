import { Clock, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getNextComponentAccessTime, isComponentAccessAllowed } from "../../utils/componentAccessUtils";

interface ComponentAccessGuardProps {
  componentName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showStatus?: boolean;
}

interface AccessStatus {
  allowed: boolean;
  reason?: string;
  component?: any;
}

interface NextAccessInfo {
  nextTime?: string;
  component?: any;
}

/**
 * ComponentAccessGuard - Simple component to check if a specific component access is allowed
 */
const ComponentAccessGuard: React.FC<ComponentAccessGuardProps> = ({ 
  componentName,
  children, 
  fallback, 
  showStatus = false 
}) => {
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [nextAccessTime, setNextAccessTime] = useState<NextAccessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
    
    // Check access every minute
    const interval = setInterval(checkAccess, 60000);
    
    return () => clearInterval(interval);
  }, [componentName]);

  const checkAccess = async () => {
    try {
      const [accessResult, nextTimeResult] = await Promise.all([
        isComponentAccessAllowed(componentName),
        getNextComponentAccessTime(componentName)
      ]);
      
      console.log(`[ComponentAccessGuard] ${componentName} - Access Status:`, accessResult);
      
      setAccessStatus(accessResult);
      setNextAccessTime(nextTimeResult);
    } catch (error) {
      console.error('Error checking component access:', error);
      // On error, allow access (fail open)
      setAccessStatus({ allowed: true, reason: 'Unable to verify component access' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-sm text-gray-600">Checking access...</span>
      </div>
    );
  }

  if (!accessStatus?.allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="w-full flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          {/* Access Denied Icon */}
          <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center ring-4 ring-red-50 mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          
          {/* Main Message */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Access Restricted
          </h3>
          
          <p className="text-gray-600 mb-4">
            {accessStatus?.reason || 'Component access is currently not allowed.'}
          </p>
          
          {/* Next Available Time */}
          {nextAccessTime?.nextTime && nextAccessTime.nextTime !== 'Component is disabled' && (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 mb-4">
              <div className="flex items-center justify-center gap-2 text-orange-700 mb-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium text-sm">Next Available</span>
              </div>
              <p className="text-sm text-orange-800 font-medium">
                {nextAccessTime.nextTime}
              </p>
            </div>
          )}
          
          {/* Retry Button */}
          <button
            onClick={checkAccess}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
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
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2 text-green-800">
            <Clock className="h-3 w-3" />
            <span className="text-xs font-medium">Access Active</span>
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
 * Hook untuk komponen yang perlu cek akses secara programmatik
 */
export const useComponentAccessStatus = (componentName: string) => {
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const result = await isComponentAccessAllowed(componentName);
      setAccessStatus(result);
      return result;
    } catch (error) {
      console.error('Error checking component access:', error);
      const fallbackResult = { allowed: true, reason: 'Unable to verify component access' };
      setAccessStatus(fallbackResult);
      return fallbackResult;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, [componentName]);

  return {
    accessStatus,
    loading,
    checkAccess,
    isAllowed: accessStatus?.allowed ?? false
  };
};

export default ComponentAccessGuard;