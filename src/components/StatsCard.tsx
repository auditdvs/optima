import { motion } from 'framer-motion';
import React from 'react';
import CountUp from './CountUp';

interface StatsCardProps {
  title: string;
  value: number;
  bgColor: string;
  textColor: string;
  titleColor: string;
  delay?: number;
  icon?: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  bgColor,
  textColor,
  titleColor,
  delay = 0,
  icon
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={`${bgColor} rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 border border-opacity-20 border-gray-200`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.2, duration: 0.3 }}
        className="flex justify-center mb-3"
      >
        {icon && (
          <div className={`p-2 rounded-full ${textColor.replace('text-', 'bg-').replace('-600', '-100')}`}>
            <div className={textColor}>
              {icon}
            </div>
          </div>
        )}
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.3, duration: 0.5 }}
        className={`text-3xl font-bold ${textColor} mb-2`}
      >
        <CountUp to={value} duration={1.5} delay={delay + 0.3} />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.4, duration: 0.5 }}
        className={`text-sm font-medium ${titleColor}`}
      >
        {title}
      </motion.div>
    </motion.div>
  );
};

export default StatsCard;
