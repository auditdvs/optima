import { motion } from 'framer-motion';
import React from 'react';
import StatsCard from './StatsCard';

interface TotalStatsContainerProps {
  totalRegular: number;
  totalFraud: number;
  totalAudits: number;
  sisaTarget: number;
  targetColor: string;
  loading: boolean;
}

const TotalStatsContainer: React.FC<TotalStatsContainerProps> = ({
  totalRegular,
  totalFraud,
  totalAudits,
  sisaTarget,
  targetColor,
  loading
}) => {
  // Icons for each stat (using simple SVG)
  const RegularIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
    </svg>
  );

  const SpecialIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0012 1.944 11.954 11.954 0 0021.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C9.34 16.67 6 12.225 6 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
    </svg>
  );

  const TotalIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 2a1 1 0 000 2h6a1 1 0 100-2H9z"/>
      <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h8a1 1 0 001-1V3a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h7a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd"/>
    </svg>
  );

  const TargetIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>
    </motion.div>
  );
};

export default TotalStatsContainer;
