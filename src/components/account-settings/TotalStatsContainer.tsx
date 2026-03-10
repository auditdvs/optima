import { motion } from 'framer-motion';
import { AlertTriangle, ClipboardCheck, FileSearch, Target } from 'lucide-react';
import React from 'react';

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
  sisaTarget,
  loading,
  adminIssuesCount = 0
}) => {
  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex items-center w-full"
      >
        <div className="grid grid-cols-2 gap-4 w-full">
          {Array.from({ length: 4 }).map((_, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white border border-gray-100 rounded-xl h-24 animate-pulse shadow-sm"
            />
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
      className="h-full flex flex-col justify-center w-full"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full h-full">
        {/* Total Regular */}
        <motion.div 
          className="bg-white rounded-xl border border-gray-100 flex items-center p-5 shadow-sm transition-all"
          whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
        >
          <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl mr-4">
            <ClipboardCheck className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-0.5">Total Regular</p>
            <h4 className="text-2xl font-bold text-gray-900 leading-none">{totalRegular}</h4>
          </div>
        </motion.div>
        
        {/* Admin Issue */}
        <motion.div 
          className="bg-white rounded-xl border border-gray-100 flex items-center p-5 shadow-sm transition-all"
          whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
        >
          <div className="bg-amber-100 text-amber-600 p-3 rounded-xl mr-4">
            <AlertTriangle className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-0.5">Admin Issues</p>
            <h4 className="text-2xl font-bold text-gray-900 leading-none">{adminIssuesCount}</h4>
          </div>
        </motion.div>

        {/* Total Fraud */}
        <motion.div 
          className="bg-white rounded-xl border border-gray-100 flex items-center p-5 shadow-sm transition-all"
          whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
        >
          <div className="bg-red-100 text-red-600 p-3 rounded-xl mr-4">
            <FileSearch className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-0.5">Total Fraud</p>
            <h4 className="text-2xl font-bold text-gray-900 leading-none">{totalFraud}</h4>
          </div>
        </motion.div>

        {/* Target Audit */}
        <motion.div 
          className="bg-white rounded-xl border border-gray-100 flex items-center p-5 shadow-sm transition-all"
          whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
        >
          <div className="bg-blue-100 text-blue-600 p-3 rounded-xl mr-4">
            <Target className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-0.5">Target Audit</p>
            <h4 className="text-2xl font-bold text-gray-900 leading-none">{sisaTarget <= 0 ? 0 : sisaTarget}</h4>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TotalStatsContainer;
