import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, ClipboardCheck, FileSearch, Target } from 'lucide-react';
import React from 'react';
import StatsCard from './StatsCard';

interface TotalStatsContainerProps {
  totalRegular: number;
  totalFraud: number;
  totalAudits: number;
  sisaTarget: number;
  targetColor: string;
  loading: boolean;
  adminIssuesCount?: number;
}

const TotalStatsContainer: React.FC<TotalStatsContainerProps> = ({
  totalRegular,
  totalFraud,
  totalAudits,
  sisaTarget,
  targetColor,
  loading,
  adminIssuesCount = 0
}) => {
  // Clean icons using lucide-react
  const RegularIcon = () => <ClipboardCheck className="w-5 h-5" strokeWidth={1.5} />;
  const SpecialIcon = () => <FileSearch className="w-5 h-5" strokeWidth={1.5} />;
  const TotalIcon = () => <BarChart3 className="w-5 h-5" strokeWidth={1.5} />;
  const TargetIcon = () => <Target className="w-5 h-5" strokeWidth={1.5} />;
  const IssuesIcon = () => <AlertTriangle className="w-5 h-5" strokeWidth={1.5} />;

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-6"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center animate-pulse shadow-md"
            >
              <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mb-6"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Regular"
          value={totalRegular}
          bgColor="bg-gradient-to-br from-green-50 to-green-100"
          textColor="text-green-600"
          titleColor="text-green-800"
          delay={0}
          icon={<RegularIcon />}
        />
        
        <StatsCard
          title="Total Special"
          value={totalFraud}
          bgColor="bg-gradient-to-br from-red-50 to-red-100"
          textColor="text-red-600"
          titleColor="text-red-800"
          delay={0.1}
          icon={<SpecialIcon />}
        />
        
        <StatsCard
          title="Total Audits"
          value={totalAudits}
          bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
          textColor="text-blue-600"
          titleColor="text-blue-800"
          delay={0.2}
          icon={<TotalIcon />}
        />
        
        <StatsCard
          title={sisaTarget <= 0 ? 'Target Achieved' : 'Remaining Target'}
          value={sisaTarget <= 0 ? 0 : sisaTarget}
          bgColor={`bg-gradient-to-br ${
            targetColor === '#16a34a' ? 'from-green-50 to-green-100' :
            targetColor === '#2563eb' ? 'from-blue-50 to-blue-100' :
            'from-red-50 to-red-100'
          }`}
          textColor={
            targetColor === '#16a34a' ? 'text-green-600' :
            targetColor === '#2563eb' ? 'text-blue-600' :
            'text-red-600'
          }
          titleColor={
            targetColor === '#16a34a' ? 'text-green-800' :
            targetColor === '#2563eb' ? 'text-blue-800' :
            'text-red-800'
          }
          delay={0.3}
          icon={<TargetIcon />}
        />

        <StatsCard
          title="Admin Issues"
          value={adminIssuesCount}
          bgColor={`bg-gradient-to-br ${
            adminIssuesCount === 0 ? 'from-green-50 to-green-100' : 'from-amber-50 to-amber-100'
          }`}
          textColor={adminIssuesCount === 0 ? 'text-green-600' : 'text-amber-600'}
          titleColor={adminIssuesCount === 0 ? 'text-green-800' : 'text-amber-800'}
          delay={0.4}
          icon={<IssuesIcon />}
        />
      </div>
    </motion.div>
  );
};

export default TotalStatsContainer;
