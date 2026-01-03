import { PrioritizedPaymentMethod } from '../types/paymentPrioritization';

export interface GroupedPaymentMethods {
    mainnetL1: PrioritizedPaymentMethod[];
    l2Solutions: PrioritizedPaymentMethod[];
    testnets: PrioritizedPaymentMethod[];
    fiat: PrioritizedPaymentMethod[];
}

export const getNetworkIcon = (chainId: number): string => {
    switch (chainId) {
        case 1: return 'ethereum';
        case 137: return 'polygon';
        case 42161: return 'arbitrum';
        case 8453: return 'base';
        case 11155111: return 'sepolia';
        case 84532: return 'base-sepolia';
        case 0: return 'fiat';
        default: return 'unknown';
    }
};

export const getNetworkType = (chainId: number): 'mainnet' | 'testnet' => {
    const testnets = [11155111, 84532, 5, 80001]; // Sepolia, Base Sepolia, Goerli, Mumbai
    return testnets.includes(chainId) ? 'testnet' : 'mainnet';
};

export const getNetworkLayer = (chainId: number): 'L1' | 'L2' | 'fiat' => {
    if (chainId === 0) return 'fiat';

    const l2Networks = [137, 42161, 10, 8453, 84532]; // Polygon, Arbitrum, Optimism, Base, Base Sepolia
    return l2Networks.includes(chainId) ? 'L2' : 'L1';
};

export const getNetworkName = (chainId: number): string => {
    switch (chainId) {
        case 1: return 'Ethereum';
        case 137: return 'Polygon';
        case 42161: return 'Arbitrum';
        case 8453: return 'Base';
        case 11155111: return 'Sepolia';
        case 84532: return 'Base Sepolia';
        case 10: return 'Optimism';
        case 56: return 'BSC';
        case 0: return 'Fiat';
        default: return `Chain ${chainId}`;
    }
};

export const groupPaymentMethods = (
    methods: PrioritizedPaymentMethod[]
): GroupedPaymentMethods => {
    const grouped: GroupedPaymentMethods = {
        mainnetL1: [],
        l2Solutions: [],
        testnets: [],
        fiat: []
    };

    methods.forEach(method => {
        const chainId = method.method.chainId || 0;
        const networkType = getNetworkType(chainId);
        const layer = getNetworkLayer(chainId);

        if (layer === 'fiat') {
            grouped.fiat.push(method);
        } else if (networkType === 'testnet') {
            grouped.testnets.push(method);
        } else if (layer === 'L2') {
            grouped.l2Solutions.push(method);
        } else {
            grouped.mainnetL1.push(method);
        }
    });

    return grouped;
};

export const getNetworkColor = (chainId: number): string => {
    switch (chainId) {
        case 1: return 'text-blue-400'; // Ethereum
        case 137: return 'text-purple-400'; // Polygon
        case 42161: return 'text-blue-500'; // Arbitrum
        case 8453: return 'text-blue-300'; // Base
        case 11155111: return 'text-purple-300'; // Sepolia
        case 84532: return 'text-blue-200'; // Base Sepolia
        case 0: return 'text-gray-400'; // Fiat
        default: return 'text-gray-300';
    }
};

export const getNetworkBgColor = (chainId: number): string => {
    switch (chainId) {
        case 1: return 'bg-blue-500'; // Ethereum
        case 137: return 'bg-purple-600'; // Polygon
        case 42161: return 'bg-blue-600'; // Arbitrum
        case 8453: return 'bg-blue-400'; // Base
        case 11155111: return 'bg-purple-500'; // Sepolia
        case 84532: return 'bg-blue-300'; // Base Sepolia
        case 0: return 'bg-gray-500'; // Fiat
        default: return 'bg-gray-400';
    }
};
