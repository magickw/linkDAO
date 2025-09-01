import React from 'react';

interface NetworkSwitcherProps {
  variant?: 'compact' | 'full';
  showDisconnect?: boolean;
}

export const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ 
  variant = 'full', 
  showDisconnect = false 
}) => {
  // This is a placeholder component for NetworkSwitcher
  // TODO: Implement actual network switching functionality
  return (
    <div className="flex items-center space-x-2">
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-sm text-gray-600">Ethereum</span>
    </div>
  );
};