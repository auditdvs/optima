import React from 'react';

export const LoadingAnimation: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 4 }) => {
  return (
    <div className="w-full p-4">
      <div className="space-y-2">
        {[...Array(rows)].map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4">
            {[...Array(cols)].map((_, colIdx) => (
              <div
                key={colIdx}
                className="h-6 w-full bg-gray-200 rounded animate-pulse"
                style={{ minWidth: 80, maxWidth: 200 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};