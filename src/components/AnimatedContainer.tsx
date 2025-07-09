"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function AnimatedContainer({ 
  children, 
  className = "",
  delay = 0 
}: AnimatedContainerProps) {
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: 50, 
        scale: 0.9,
        filter: "blur(10px)"
      }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        filter: "blur(0px)"
      }}
      transition={{
        duration: 0.8,
        delay,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{
        y: -4,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={`
        relative overflow-hidden
        bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50
        border border-blue-200/50 rounded-2xl shadow-2xl
        backdrop-blur-sm
        ${className}
      `}
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(219, 234, 254, 0.8) 0%, 
            rgba(191, 219, 254, 0.9) 25%,
            rgba(165, 180, 252, 0.8) 50%,
            rgba(196, 181, 253, 0.9) 75%,
            rgba(221, 214, 254, 0.8) 100%
          )
        `
      }}
    >
      {/* Animated background overlay */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            linear-gradient(45deg,
              transparent 30%,
              rgba(59, 130, 246, 0.1) 50%,
              transparent 70%
            )
          `,
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{
          boxShadow: [
            "0 0 20px rgba(59, 130, 246, 0.3)",
            "0 0 40px rgba(147, 51, 234, 0.4)",
            "0 0 20px rgba(59, 130, 246, 0.3)"
          ]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
