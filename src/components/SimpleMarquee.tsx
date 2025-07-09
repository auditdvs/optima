import React from 'react';

interface SimpleMarqueeProps {
  text: string;
  speed?: number;
  className?: string;
}

const SimpleMarquee: React.FC<SimpleMarqueeProps> = ({ 
  text, 
  speed = 35, 
  className = "" 
}) => {
  // Create a repeated text to ensure seamless loop
  const repeatedText = `${text} • ${text} • ${text} • ${text} • ${text} • ${text} • ${text} • ${text} • ${text} • ${text} • ${text} •`;
  
  return (
    <div className={`marquee ${className}`}>
      <div className="marquee__inner" style={{ animationDuration: `${speed}s` }}>
        <div className="marquee__group">
          <span>{repeatedText}</span>
        </div>
        <div className="marquee__group">
          <span>{repeatedText}</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleMarquee;
