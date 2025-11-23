/**
 * LoadingSpinner Component
 * Reusable loading spinner with different sizes
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'var(--primary-color)',
  className = ''
}) => {
  const getSize = () => {
    switch (size) {
      case 'sm': return '16px';
      case 'lg': return '48px';
      default: return '32px';
    }
  };

  return (
    <div className={`loading-spinner ${className}`}>
      <div className="spinner"></div>

      <style jsx>{`
        .loading-spinner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: ${getSize()};
          height: ${getSize()};
          border: 2px solid transparent;
          border-top: 2px solid ${color};
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;