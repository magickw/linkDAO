import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ExplorerLinkButtonProps {
  transactionHash: string;
  network?: 'ethereum' | 'polygon' | 'arbitrum' | 'optimism';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const EXPLORER_URLS = {
  ethereum: 'https://etherscan.io',
  polygon: 'https://polygonscan.com',
  arbitrum: 'https://arbiscan.io',
  optimism: 'https://optimistic.etherscan.io'
};

export const ExplorerLinkButton: React.FC<ExplorerLinkButtonProps> = ({
  transactionHash,
  network = 'ethereum',
  size = 'md',
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-1 text-xs';
      case 'lg':
        return 'p-3 text-base';
      default:
        return 'p-2 text-sm';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const explorerUrl = `${EXPLORER_URLS[network]}/tx/${transactionHash}`;
    window.open(explorerUrl, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center space-x-1 
        text-gray-500 hover:text-blue-600 
        hover:bg-blue-50 rounded-md transition-colors
        ${getSizeClasses()} ${className}
      `}
      title={`View transaction on ${network} explorer`}
    >
      <ExternalLink className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />
      {size !== 'sm' && <span>Explorer</span>}
    </button>
  );
};

export default ExplorerLinkButton;