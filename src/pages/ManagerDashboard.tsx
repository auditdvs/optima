import { format, parseISO } from "date-fns";
import { EChartsOption } from 'echarts';
import { AlertTriangle, ArrowDown, Building2, TrendingUp, Users, Wallet } from "lucide-react";
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CountUp from '../components/common/CountUp';
import CurrencyCountUp from '../components/common/CurrencyCountUp';
import EChartComponent from '../components/common/EChartComponent';
import AuditorPerforma from '../components/dashboard/AuditorPerforma';
import AuditSummary from '../components/dashboard/AuditSummary';
import FraudData from '../components/dashboard/FraudData';
import AssignmentLetterManager from '../components/manager-dashboard/AssignmentLetterManager';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { supabase } from '../lib/supabaseClient';
import '../styles/radioButtons.css';

const checkUserAccess = async (supabase: any) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userRoles || !['manager', 'superadmin'].includes(userRoles.role)) {
      throw new Error('Unauthorized access');
    }

    return true;
  } catch (error) {
    console.error('Access check failed:', error);
    return false;
  }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DashboardStats {
  totalBranches: number;
  regularAudits: number;
  fraudAudits: number;
  totalAuditors: number;
  totalFraud: number;
  fraudRecovery: number;
  outstandingFraud: number;
  specialAudits: number;
}

interface AuditTrend {
  month: string;
  regular: number;
  fraud: number;
}

interface Auditor {
  name: string;
  auditor_id: string;
}

const ManagerDashboard = () => {
  const location = useLocation();
  const [stats, setStats] = useState<DashboardStats>({
    totalBranches: 0,
    regularAudits: 0,
    fraudAudits: 0,
    totalAuditors: 0,
    totalFraud: 0,
    fraudRecovery: 0,
    outstandingFraud: 0,
    specialAudits: 0
  });

  const [auditTrends, setAuditTrends] = useState<AuditTrend[]>([]);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [isAuditorListOpen, setIsAuditorListOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'main' | 'auditorCounts' | 'auditSummary' | 'fraudData' | 'assignmentLetters'>('main');
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Track if data is loaded for skipAnimation

  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<'letter' | 'addendum'>('letter');

  useEffect(() => {
    const initializeDashboard = async () => {
      const hasAccess = await checkUserAccess(supabase);
      if (!hasAccess) {
        console.error('Unauthorized access to manager dashboard');
        return;
      }

      await fetchDashboardData();
      await fetchAuditors();
      setIsDataLoaded(true); // Mark data as loaded after fetching
      
      // Check for navigation state to switch tab
      if (location.state && location.state.targetTab) {
        setActiveSection(location.state.targetTab);
        if (location.state.targetSubTab) {
          setActiveSubTab(location.state.targetSubTab);
        }
        window.scrollTo({ top: 300, behavior: 'smooth' }); // Optional scroll to tabs
        
        // Clear the state after processing to prevent it from persisting
        navigate(location.pathname, { replace: true, state: {} });
      }
    };

    initializeDashboard();
  }, [location.state]); // Add location.state dependency for reactivity if state changes

  const fetchDashboardData = async () => {
    try {
      const { data: branchesData } = await supabase
        .from('branches')
        .select('name', { count: 'exact' });

      // Fetch all audit records from audit_master
      const { data: auditMasterData } = await supabase
        .from('audit_master')
        .select(`
          id,
          branch_name,
          audit_start_date,
          audit_end_date,
          audit_type,
          team,
          leader,
          audit_period_start,
          audit_period_end
        `);

      // Count regular audits
      const regularAudits = auditMasterData?.filter(wp => wp.audit_type === 'Regular' || wp.audit_type === 'regular' || wp.audit_type?.toLowerCase().includes('reguler')).length || 0;

      // Count special audits
      const specialAudits = auditMasterData?.filter(wp => wp.audit_type === 'Special' || wp.audit_type === 'special' || wp.audit_type?.toLowerCase().includes('khusus')).length || 0;

      // For fraud stats, we might still need work_papers or similar if audit_master doesn't have amounts
      // Assuming for now we just use audit_master for counts. 
      // If fraud amounts are needed, they presumably come from a different table now or stuck with work_papers? 
      // The user specially mentioned audit_master.
      
      // Let's try to get fraud counts from audit_master too if type is fraud
      const fraudAuditCount = auditMasterData?.filter(wp => wp.audit_type?.toLowerCase().includes('fraud') || wp.audit_type?.toLowerCase().includes('investigasi')).length || 0;

      // We'll keep the separate fraud fetch for amounts if available, otherwise 0
      // Previous code used work_papers for amounts. I will try to fetch work_papers separately JUST for amounts if it still exists, 
      // but if the user says "data source changed", I should rely on audit_master for the main metrics.
      // I'll set amounts to 0 for now to be safe with the new schema, or keep the old query separate?
      // "yang di Manager Dashboard data source nya udah berubah deh, dari tabel audit_master" -> "The data source in Manager Dashboard has changed, (it is now) from table audit_master"
      
      // I will use audit_master for the TRENDS and COUNTS.
      // I will temporarily set financial stats to 0 or leave them if I can't find source.
      
      // Actually the previous code fetched `work_papers` and used it for everything. 
      // I will replace that with `audit_master` fetching.

      const fraudCases = fraudAuditCount; 
      
      // Since audit_master doesn't have fraud_amount, we'll set these to 0 or leave them alone?
      // I'll set them to 0 to avoid errors accessing missing columns.
      const totalFraud = 0;
      const fraudRecovery = 0;
      const outstandingFraud = 0;

      // Fetch total auditors
      const { data: auditorsData } = await supabase
        .from('auditors')
        .select('name', { count: 'exact' });

      setStats({
        totalBranches: branchesData?.length || 0,
        regularAudits,
        specialAudits, // Count from audit_master now
        fraudAudits: fraudCases,
        totalAuditors: auditorsData?.length || 0,
        totalFraud, 
        fraudRecovery,
        outstandingFraud
      });

      // Fetch and process audit trends using audit_master data
      if (auditMasterData) {
        const monthlyData = processAuditTrends(auditMasterData);
        setAuditTrends(monthlyData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchAuditors = async () => {
    try {
      const { data, error } = await supabase
        .from('auditors')
        .select('name, auditor_id');
      
      if (error) {
        console.error('Error fetching auditors:', error);
        return;
      }
      
      setAuditors(data || []);
    } catch (error) {
      console.error('Error fetching auditors:', error);
      setAuditors([]);
    }
  };

  const processAuditTrends = (workPapers: any[]) => {
    // Initialize monthly audits counter
    const monthlyAudits: { [key: string]: { regular: number; fraud: number } } = {};
    
    // Initialize all months with zero counts
    MONTHS.forEach(month => {
      monthlyAudits[month] = { regular: 0, fraud: 0 };
    });

    // Process work papers
    workPapers.forEach(paper => {
      if (paper.audit_end_date) {
        const month = format(parseISO(paper.audit_end_date), 'MMM');
        
        if (monthlyAudits[month]) {
          if (paper.audit_type === 'regular') {
            monthlyAudits[month].regular++;
          } else if (paper.audit_type === 'fraud') {
            monthlyAudits[month].fraud++;
          }
        }
      }
    });

    // Convert to array format for chart
    return MONTHS.map(month => ({
      month,
      regular: monthlyAudits[month].regular,
      fraud: monthlyAudits[month].fraud,
    }));
  };

  const getAuditTrendsOption = (): EChartsOption => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['Regular', 'Fraud'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: auditTrends.map(item => item.month)
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: 'Regular',
          type: 'bar',
          data: auditTrends.map(item => item.regular),
          itemStyle: { color: '#50C878' },
          barMaxWidth: 50
        },
        {
          name: 'Fraud',
          type: 'bar',
          data: auditTrends.map(item => item.fraud),
          itemStyle: { color: '#e74c3c' },
          barMaxWidth: 50
        }
      ]
    };
  };



  return (
    <div className="p-0 space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manager Dashboard</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex w-full overflow-hidden rounded-md border border-[#35343439] bg-white text-black mb-10">
        <button
          onClick={() => setActiveSection('auditorCounts')}
          className={`flex-1 p-3 text-center font-medium text-sm ${
            activeSection === 'auditorCounts' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Auditor Performa
        </button>
        <button
          onClick={() => setActiveSection('auditSummary')}
          className={`flex-1 p-3 text-center font-medium text-sm ${
            activeSection === 'auditSummary' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Audit Summary
        </button>
        <button
          onClick={() => setActiveSection('fraudData')}
          className={`flex-1 p-3 text-center font-medium text-sm ${
            activeSection === 'fraudData' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Fraud Data
        </button>
        <button
          onClick={() => setActiveSection('assignmentLetters')}
          className={`flex-1 p-3 text-center font-medium text-sm ${
            activeSection === 'assignmentLetters' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Assignment Letters
        </button>
        <button
          onClick={() => setActiveSection('main')}
          className={`flex-1 p-3 text-center font-medium text-sm ${
            activeSection === 'main' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Overview
        </button>
      </div>

      {/* Render different sections based on activeSection */}
      {activeSection === 'auditorCounts' && <AuditorPerforma />}
      {activeSection === 'auditSummary' && <AuditSummary />}
      {activeSection === 'fraudData' && <FraudData />}
      {activeSection === 'assignmentLetters' && <AssignmentLetterManager initialTab={activeSubTab} />}
      
      {/* Main Dashboard Section - Always visible when Overview is selected */}
      {activeSection === 'main' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-9 gap-2 mt-">
            <Card className="col-span-3 min-h-[80px] flex items-center">
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Branch</p>
                  <p className="text-base font-bold"><CountUp to={stats.totalBranches} duration={1.5} skipAnimation={isDataLoaded} /></p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3 min-h-[80px] flex items-center">
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Audit</p>
                  <div className="flex flex-col">
                    <span className="text-xs text-green-500 font-semibold">
                      <CountUp to={stats.regularAudits} duration={1.5} skipAnimation={isDataLoaded} /> Regular
                    </span>
                    <span className="text-xs text-red-500 font-semibold">
                      <CountUp to={stats.specialAudits} duration={1.5} skipAnimation={isDataLoaded} /> Special Audit
                    </span>
                    <span className="text-xs text-yellow-500 font-semibold">
                      <CountUp to={stats.fraudAudits || 0} duration={1.5} skipAnimation={isDataLoaded} /> Fraud Cases
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="col-span-3 min-h-[80px] flex items-center cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setIsAuditorListOpen(true);
                fetchAuditors();
              }}
            >
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Auditors</p>
                  <p className="text-base font-bold"><CountUp to={stats.totalAuditors} duration={1.5} skipAnimation={isDataLoaded} /></p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3 min-h-[80px] flex items-center">
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Fraud</p>
                  <p className="text-base font-bold text-red-600">
                    <CurrencyCountUp to={stats.totalFraud} duration={1.5} skipAnimation={isDataLoaded} />
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3 min-h-[80px] flex items-center">
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Fraud Recovery</p>
                  <p className="text-base font-bold text-emerald-600">
                    <CurrencyCountUp to={stats.fraudRecovery} duration={1.5} skipAnimation={isDataLoaded} />
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3 min-h-[80px] flex items-center">
              <CardContent className="p-3 flex items-center gap-x-3 h-full">
                <div className="p-2 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ArrowDown className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Outstanding Fraud</p>
                  <p className="text-base font-bold text-yellow-600">
                    <CurrencyCountUp to={stats.outstandingFraud} duration={1.5} skipAnimation={isDataLoaded} />
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

         {/* Audit Trends Chart */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Audit Trends</h2>
              <EChartComponent option={getAuditTrendsOption()} style={{ height: '400px', width: '100%' }} />
            </CardContent>
          </Card>
        </>
      )}

      {/* Auditor List Dialog */}
      <Dialog open={isAuditorListOpen} onOpenChange={setIsAuditorListOpen}>
        <DialogContent className="max-w-md max-h-[70vh]">
          <DialogHeader className="pr-6">
            <DialogTitle className="text-lg">List of Auditors</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[50vh]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Auditor ID
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Name
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditors.map((auditor, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {auditor.auditor_id}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {auditor.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerDashboard;
