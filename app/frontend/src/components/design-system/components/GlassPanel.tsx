/**
 * Simple GlassPanel Component
 * Basic glass panel implementation for messaging components
 */

import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = ''
}) => {
  const classes = `bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-lg ${className}`;

  return (
    <div className={classes}>
      {children}
    </div>
  );
};