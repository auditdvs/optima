import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Types for cached dashboard data
interface WorkPaper {
  id: string;
  branch_name: string;
  audit_type: 'regular' | 'fraud';
  fraud_amount?: number;
  fraud_staff?: string;
  audit_start_date: string;
  audit_end_date: string;
  rating: 'high' | 'medium' | 'low';
  inputted_by: string;
  auditors: string[];
}

interface Branch {
  id: string;
  name: string;
  region: string;
  coordinates: any;
}

interface DashboardStats {
  totalBranches: number;
  annualAudits: number;
  fraudAudits: number;
  totalAuditors: number;
  totalFraudAmount: number;
  totalFraudStaffCount: number;
}

interface MonthlyData {
  month: string;
  fraudAudits: number;
  annualAudits: number;
}

interface AuditorCount {
  auditor_id?: string;
  auditor_name: string;
  regular: number;
  fraud: number;
  total: number;
}

interface DashboardCacheContextType {
  // Dashboard data
  branches: Branch[];
  workPapers: WorkPaper[];
  monthlyData: MonthlyData[];
  auditorCounts: AuditorCount[];
  dashboardStats: DashboardStats;
  
  // Loading states
  isLoading: boolean;
  isLoaded: boolean;
  
  // Methods
  refreshDashboardData: () => Promise<void>;
  clearCache: () => void;
  lastUpdated: Date | null;
}

const defaultStats: DashboardStats = {
  totalBranches: 0,
  annualAudits: 0,
  fraudAudits: 0,
  totalAuditors: 0,
  totalFraudAmount: 0,
  totalFraudStaffCount: 0,
};

const DashboardCacheContext = createContext<DashboardCacheContextType | undefined>(undefined);

export function DashboardCacheProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [workPapers, setWorkPapers] = useState<WorkPaper[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [auditorCounts, setAuditorCounts] = useState<AuditorCount[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasInitialized = useRef(false);

  // Helper function to get monthly audit data
  const getMonthlyAuditData = (papers: WorkPaper[]): MonthlyData[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map(month => ({
      month,
      fraudAudits: 0,
      annualAudits: 0
    }));

    papers.forEach(wp => {
      const startDate = new Date(wp.audit_start_date);
      const monthIndex = startDate.getMonth();
      
      if (wp.audit_type === 'fraud') {
        data[monthIndex].fraudAudits++;
      } else {
        data[monthIndex].annualAudits++;
      }
    });

    return data;
  };

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch branches
      const { data: branchesData } = await supabase.from('branches').select('*');
      if (branchesData) {
        setBranches(branchesData);
      }

      // Fetch audit data from audit_master
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear - 1, 11, 1).toISOString();
      const endOfYear = new Date(currentYear, 11, 31).toISOString();

      const { data: auditMasterData } = await supabase
        .from('audit_master')
        .select('*')
        .gte('audit_start_date', startOfYear)
        .lte('audit_start_date', endOfYear);

      if (auditMasterData) {
        const transformedData: WorkPaper[] = auditMasterData.map((audit) => ({
          id: audit.id,
          branch_name: audit.branch_name,
          audit_type: audit.audit_type?.toLowerCase().includes('khusus') || 
                     audit.audit_type?.toLowerCase().includes('fraud') || 
                     audit.audit_type?.toLowerCase().includes('investigasi') 
                     ? 'fraud' 
                     : 'regular',
          fraud_amount: audit.fraud_amount || 0,
          fraud_staff: audit.fraud_staff,
          audit_start_date: audit.audit_start_date,
          audit_end_date: audit.audit_end_date,
          rating: audit.rating || 'medium',
          inputted_by: audit.inputted_by || '',
          auditors: [],
        }));
        
        setWorkPapers(transformedData);
        setMonthlyData(getMonthlyAuditData(transformedData));

        // Calculate stats
        const regularAudits = new Set(
          transformedData.filter(wp => wp.audit_type === 'regular').map(wp => wp.branch_name)
        ).size;
        const fraudAudits = new Set(
          transformedData.filter(wp => wp.audit_type === 'fraud').map(wp => `${wp.branch_name}|${wp.audit_start_date}`)
        ).size;

        setDashboardStats(prev => ({
          ...prev,
          totalBranches: branchesData?.length || 0,
          annualAudits: regularAudits,
          fraudAudits: fraudAudits,
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, []);

  // Fetch auditor counts
  const fetchAuditorCounts = useCallback(async () => {
    try {
      const { data: auditCounts, error } = await supabase
        .from('audit_counts')
        .select('auditor_name, branch_name, audit_end_date, audit_type');
        
      if (error) throw error;
      
      // Process auditor counts
      const auditorMap: Record<string, { auditor_name: string; regular: Set<string>; fraud: Set<string> }> = {};
      
      auditCounts?.forEach((record: any) => {
        const auditor = record.auditor_name;
        if (!auditor) return;
        
        const uniqueKey = `${record.branch_name}|${record.audit_end_date}`;
        
        if (!auditorMap[auditor]) {
          auditorMap[auditor] = {
            auditor_name: auditor,
            regular: new Set(),
            fraud: new Set()
          };
        }
        
        if (record.audit_type === 'regular') {
          auditorMap[auditor].regular.add(uniqueKey);
        } else if (record.audit_type === 'fraud') {
          auditorMap[auditor].fraud.add(uniqueKey);
        }
      });

      const result: AuditorCount[] = Object.values(auditorMap).map((auditor: any) => ({
        auditor_name: auditor.auditor_name,
        regular: auditor.regular.size,
        fraud: auditor.fraud.size,
        total: auditor.regular.size + auditor.fraud.size,
      })).sort((a, b) => b.total - a.total);

      setAuditorCounts(result);
      setDashboardStats(prev => ({
        ...prev,
        totalAuditors: result.length,
      }));
    } catch (error) {
      console.error('Error fetching auditor counts:', error);
    }
  }, []);

  // Fetch fraud data
  const fetchFraudData = useCallback(async () => {
    try {
      const { data: fraudData, error } = await supabase
        .from('work_paper_persons')
        .select('fraud_amount, fraud_staff');

      if (error) throw error;

      if (fraudData) {
        const totalAmount = fraudData.reduce((sum, record) => sum + (record.fraud_amount || 0), 0);
        const uniqueStaff = new Set(
          fraudData
            .filter(record => record.fraud_staff && record.fraud_staff.trim() !== '')
            .map(record => record.fraud_staff)
        );

        setDashboardStats(prev => ({
          ...prev,
          totalFraudAmount: totalAmount,
          totalFraudStaffCount: uniqueStaff.size,
        }));
      }
    } catch (error) {
      console.error('Error fetching fraud data:', error);
    }
  }, []);

  // Refresh all data
  const refreshDashboardData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchDashboardData(),
      fetchAuditorCounts(),
      fetchFraudData()
    ]);
    setLastUpdated(new Date());
    setIsLoading(false);
    setIsLoaded(true);

    // Cache to sessionStorage
    const cacheData = {
      branches,
      workPapers,
      monthlyData,
      auditorCounts,
      dashboardStats,
      timestamp: Date.now()
    };
    sessionStorage.setItem('dashboardCache', JSON.stringify(cacheData));
  }, [fetchDashboardData, fetchAuditorCounts, fetchFraudData, branches, workPapers, monthlyData, auditorCounts, dashboardStats]);

  // Clear all cached data
  const clearCache = useCallback(() => {
    // Clear sessionStorage
    sessionStorage.removeItem('dashboardCache');
    
    // Reset all state to defaults
    setBranches([]);
    setWorkPapers([]);
    setMonthlyData([]);
    setAuditorCounts([]);
    setDashboardStats(defaultStats);
    setIsLoaded(false);
    setLastUpdated(null);
    
    console.log('🗑️ Dashboard cache cleared');
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for dashboard data

    // Try to load from cache
    const cached = sessionStorage.getItem('dashboardCache');
    if (cached) {
      try {
        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - cacheData.timestamp;

        if (cacheAge < CACHE_DURATION) {
          setBranches(cacheData.branches || []);
          setWorkPapers(cacheData.workPapers || []);
          setMonthlyData(cacheData.monthlyData || []);
          setAuditorCounts(cacheData.auditorCounts || []);
          setDashboardStats(cacheData.dashboardStats || defaultStats);
          setLastUpdated(new Date(cacheData.timestamp));
          setIsLoaded(true);
          console.log('📊 Dashboard data loaded from cache');
          return;
        }
      } catch (e) {
        console.error('Error parsing cached dashboard data:', e);
      }
    }

    // Fetch fresh data
    console.log('📊 Fetching fresh dashboard data...');
    const initData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchAuditorCounts(),
        fetchFraudData()
      ]);
      setLastUpdated(new Date());
      setIsLoading(false);
      setIsLoaded(true);
    };
    initData();
  }, [fetchDashboardData, fetchAuditorCounts, fetchFraudData]);

  // Save to cache when data changes
  useEffect(() => {
    if (isLoaded && branches.length > 0) {
      const cacheData = {
        branches,
        workPapers,
        monthlyData,
        auditorCounts,
        dashboardStats,
        timestamp: Date.now()
      };
      sessionStorage.setItem('dashboardCache', JSON.stringify(cacheData));
    }
  }, [isLoaded, branches, workPapers, monthlyData, auditorCounts, dashboardStats]);

  return (
    <DashboardCacheContext.Provider value={{
      branches,
      workPapers,
      monthlyData,
      auditorCounts,
      dashboardStats,
      isLoading,
      isLoaded,
      refreshDashboardData,
      clearCache,
      lastUpdated
    }}>
      {children}
    </DashboardCacheContext.Provider>
  );
}

export function useDashboardCache() {
  const context = useContext(DashboardCacheContext);
  if (context === undefined) {
    throw new Error('useDashboardCache must be used within a DashboardCacheProvider');
  }
  return context;
}
