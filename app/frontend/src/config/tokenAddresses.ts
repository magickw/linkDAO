/**
 * Token Contract Addresses
 * Official contract addresses for supported tokens across different networks
 */

export interface TokenAddress {
    symbol: string;
    name: string;
    decimals: number;
    addresses: {
        [chainId: number]: string;
    };
}

/**
 * Official USDC contract addresses
 * Source: https://developers.circle.com/stablecoins/docs/usdc-on-main-networks
 */
export const USDC_ADDRESSES: TokenAddress = {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addresses: {
        1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',      // Ethereum Mainnet
        11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia Testnet
        137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',     // Polygon
        42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',   // Arbitrum One
        10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',      // Optimism
        8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',    // Base
    }
};

/**
 * Official USDT contract addresses
 */
export const USDT_ADDRESSES: TokenAddress = {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    addresses: {
        1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',      // Ethereum Mainnet
        11155111: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia Testnet (Unofficial)
        137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',     // Polygon
        42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',   // Arbitrum One
        10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',      // Optimism
    }
};

/**
 * Native token (ETH) placeholder address
 */
export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Get token address for a specific chain
 */
export function getTokenAddress(
    tokenSymbol: 'USDC' | 'USDT' | 'ETH',
    chainId: number
): string {
    if (tokenSymbol === 'ETH') {
        return NATIVE_TOKEN_ADDRESS;
    }

    const tokenConfig = tokenSymbol === 'USDC' ? USDC_ADDRESSES : USDT_ADDRESSES;
    const address = tokenConfig.addresses[chainId];

    if (!address) {
        console.warn(`No ${tokenSymbol} address configured for chain ${chainId}, using Ethereum Mainnet address`);
        return tokenConfig.addresses[1]; // Fallback to Ethereum Mainnet
    }

    return address;
}

/**
 * Get token decimals
 */
export function getTokenDecimals(tokenSymbol: 'USDC' | 'USDT' | 'ETH'): number {
    if (tokenSymbol === 'ETH') return 18;
    if (tokenSymbol === 'USDC') return USDC_ADDRESSES.decimals;
    if (tokenSymbol === 'USDT') return USDT_ADDRESSES.decimals;
    return 18; // Default
}

/**
 * Validate if an address is a known token address
 */
export function isKnownTokenAddress(address: string, chainId: number): boolean {
    const normalizedAddress = address.toLowerCase();

    return (
        normalizedAddress === USDC_ADDRESSES.addresses[chainId]?.toLowerCase() ||
        normalizedAddress === USDT_ADDRESSES.addresses[chainId]?.toLowerCase() ||
        normalizedAddress === NATIVE_TOKEN_ADDRESS.toLowerCase()
    );
}
