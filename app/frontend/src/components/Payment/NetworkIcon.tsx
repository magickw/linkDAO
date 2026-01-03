import React from 'react';

interface NetworkIconProps {
    network?: string;
    chainId?: number;
    size?: number;
    className?: string;
}

export const NetworkIcon: React.FC<NetworkIconProps> = ({
    network = '',
    chainId,
    size = 24,
    className = ''
}) => {
    const getNetworkIcon = (networkName: string, chain?: number): JSX.Element => {
        const iconSize = size;
        const commonProps = {
            width: iconSize,
            height: iconSize,
            viewBox: "0 0 24 24",
            className: className
        };

        // Determine network by chainId if provided
        const effectiveNetwork = chain
            ? getNetworkNameByChainId(chain)
            : networkName.toLowerCase();

        switch (effectiveNetwork) {
            case 'ethereum':
            case 'eth':
                return (
                    <svg {...commonProps} fill="currentColor">
                        <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
                    </svg>
                );

            case 'polygon':
            case 'matic':
                return (
                    <svg {...commonProps} fill="currentColor">
                        <path d="M16.5 9.5l-4.5-2.6-4.5 2.6v5.2l4.5 2.6 4.5-2.6V9.5zm-9-2.6L12 4.3l4.5 2.6v5.2L12 14.7l-4.5-2.6V6.9z" />
                        <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm6 13.5l-6 3.5-6-3.5v-7L12 5l6 3.5v7z" />
                    </svg>
                );

            case 'arbitrum':
                return (
                    <svg {...commonProps} fill="currentColor">
                        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.5L18.5 8v8L12 19.5 5.5 16V8L12 4.5z" />
                        <path d="M12 8l-4 2.5v5l4 2.5 4-2.5v-5L12 8zm0 2l2 1.25v2.5L12 15l-2-1.25v-2.5L12 10z" />
                    </svg>
                );

            case 'base':
                return (
                    <svg {...commonProps} fill="currentColor">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 6v12M6 12h12" />
                    </svg>
                );

            case 'sepolia':
            case 'base sepolia':
                return (
                    <svg {...commonProps} fill="currentColor" opacity="0.6">
                        <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
                        <text x="12" y="16" fontSize="8" textAnchor="middle" fill="currentColor">T</text>
                    </svg>
                );

            case 'fiat':
            case 'credit card':
                return (
                    <svg {...commonProps} fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <path d="M2 10h20" />
                    </svg>
                );

            default:
                return (
                    <svg {...commonProps} fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <text x="12" y="16" fontSize="10" textAnchor="middle" fill="white">?</text>
                    </svg>
                );
        }
    };

    const getNetworkNameByChainId = (chain: number): string => {
        switch (chain) {
            case 1: return 'ethereum';
            case 137: return 'polygon';
            case 42161: return 'arbitrum';
            case 8453: return 'base';
            case 11155111: return 'sepolia';
            case 84532: return 'base sepolia';
            case 0: return 'fiat';
            default: return 'unknown';
        }
    };

    return getNetworkIcon(network, chainId);
};

export default NetworkIcon;
