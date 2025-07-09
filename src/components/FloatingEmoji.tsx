"use client";

import { motion } from "framer-motion";

interface FloatingEmojiProps {
  emoji: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function FloatingEmoji({ 
  emoji, 
  className = "", 
  size = "md" 
}: FloatingEmojiProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-12 h-12 text-2xl",
    lg: "w-16 h-16 text-3xl"
  };

  return (
    <motion.div
      className={`
        ${sizeClasses[size]}
        bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 
        rounded-full flex items-center justify-center shadow-xl
        ${className}
      `}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ 
        scale: 1, 
        rotate: 0,
        y: [0, -8, 0],
      }}
      transition={{
        scale: { type: "spring", stiffness: 260, damping: 20 },
        rotate: { type: "spring", stiffness: 260, damping: 20 },
        y: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
      whileHover={{ 
        scale: 1.1,
        rotate: [0, 10, -10, 0],
        transition: { duration: 0.3 }
      }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {emoji}
      </motion.span>
    </motion.div>
  );
}
