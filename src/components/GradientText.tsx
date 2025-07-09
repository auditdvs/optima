import React from 'react';

interface GradientTextProps {
  colors: string[];
  animationSpeed?: number; // in seconds
  showBorder?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const GradientText: React.FC<GradientTextProps> = ({
  colors,
  animationSpeed = 3,
  showBorder = false,
  className = '',
  children,
}) => {
  // Create a CSS linear-gradient string from the colors array
  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;

  // Unique animation name to avoid conflicts
  const animationName = `gradient-move-${colors.join('-').replace(/[#(),\s]/g, '')}`;

  // Keyframes for gradient animation
  const keyframes = `
    @keyframes ${animationName} {
      0% { background-position: 0% 50%; }
      100% { background-position: 100% 50%; }
    }
  `;

  return (
    <span
      className={className}
      style={{
        background: gradient,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block',
        border: showBorder ? '1px solid #6366f1' : undefined,
        borderRadius: showBorder ? 4 : undefined,
        backgroundSize: '200% 200%',
        animation: `${animationName} ${animationSpeed}s linear infinite`,
      }}
    >
      <style>{keyframes}</style>
      {children}
    </span>
  );
};
