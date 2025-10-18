import React from 'react';

interface ProgressProps {
  value?: number;
  className?: string;
  max?: number;
}

export const Progress: React.FC<ProgressProps> = ({ 
  value = 0,
  className = '',
  max = 100
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className={`relative h-4 w-full overflow-hidden rounded-full bg-secondary ${className}`}>
      <div 
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
};