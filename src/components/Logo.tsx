import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizes[size]} relative`}>
        <img 
          src="/cloud.gif" 
          alt="TailAdmin Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      <span className="text-5xl font-bold text-white tracking-tight">
        O P T I M A
      </span>
    </div>
  );
};

export default Logo;