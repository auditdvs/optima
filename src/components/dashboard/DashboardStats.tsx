import { AlertTriangle, Building2, Users } from 'lucide-react';
import CountUp from '../CountUp';
import { Card, CardContent } from '../ui/card';

interface DashboardStatsProps {
  stats: {
    totalBranches: number;
    auditedBranches: number;
    unauditedBranches: number;
    fraudAudits: number;
    annualAudits: number;
    totalAudits: number;
    totalFraud: number;
    totalFraudCases: number;
    totalFraudulentBranches: number;
  };
  isFraudAmountCensored: boolean;
  onFraudSectionClick: () => void;
}

const DashboardStats = ({ 
  stats, 
  isFraudAmountCensored,
  onFraudSectionClick
}: DashboardStatsProps) => {
  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Branches Card */}
      <Card className="bg-white">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded-lg">
              <Building2 className="w-8 h-8 text-sky-500" />
            </div>
            <div className="flex-1">
              <p className="text-xm text-gray-600 mt-2 mb-0.5">Total Branches</p>
              <div className="flex items-center gap-2">
                <CountUp 
                  to={stats.totalBranches} 
                  className="text-2xl font-semibold"
                  duration={1.5}
                  separator=","
                />
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] text-sky-600 flex items-center gap-1">
                    <CountUp 
                      to={stats.auditedBranches} 
                      duration={1.5}
                      delay={0.3}
                    />
                    <span>audited</span>
                  </span>
                  <span className="text-[11px] text-rose-600 flex items-center gap-1">
                    <CountUp 
                      to={stats.unauditedBranches} 
                      duration={1.5}
                      delay={0.6}
                    />
                    <span>unaudited</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Total Fraud Card with Censoring */}
      <Card 
        className={`bg-white ${isFraudAmountCensored ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={isFraudAmountCensored ? onFraudSectionClick : undefined}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 rounded-lg mt-2">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>
            <div className="flex-1">
              <p className="text-xm text-gray-600 mt-2">Total Fraud</p>
              <div className="flex flex-col leading-tight">
                {isFraudAmountCensored ? (
                  <>
                    <span className="text-xl font-semibold">Click to reveal</span>
                  </>
                ) : (
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(stats.totalFraud)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Fraud Cases Card */}
      <Card className="bg-white">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Users className="w-7 h-7 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-xm text-gray-600">Total fraud cases (staff)</p>
              <div className="flex flex-col leading-tight">
                <CountUp 
                  to={stats.totalFraudCases} 
                  className="text-xl font-semibold"
                  duration={1.5}
                  delay={0.5}
                />
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <CountUp 
                    to={stats.totalFraudulentBranches} 
                    duration={1.5}
                    delay={0.8}
                  />
                  <span>branches involved</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
