/**
 * Network Logo Utilities
 * 
 * Provides functions to get official network/chain logos for display in wallet components
 */

// Known network logos mapping
const NETWORK_LOGOS: Record<number, string> = {
    // Ethereum Mainnet
    1: '/networks/ethereum.png',

    // Base
    8453: '/networks/base.png',

    // Polygon
    137: '/networks/polygon.png',

    // Arbitrum
    42161: '/networks/arbitrum.png',

    // Sepolia Testnet
    11155111: '/networks/ethereum.png', // Use same as Ethereum

    // Base Sepolia
    84532: '/networks/base.png', // Use same as Base
};

/**
 * Get the logo URL for a given chain ID
 * @param chainId - Chain ID (e.g., 1 for Ethereum, 8453 for Base)
 * @returns Logo URL string or null if not found
 */
export function getNetworkLogo(chainId: number): string | null {
    return NETWORK_LOGOS[chainId] || null;
}

/**
 * Get network logo with fallback
 * @param chainId - Chain ID
 * @param fallbackUrl - Optional fallback URL
 * @returns Logo URL or null if should use initials
 */
export function getNetworkLogoWithFallback(chainId: number, fallbackUrl?: string): string | null {
    // Use provided fallback URL if available
    if (fallbackUrl) {
        return fallbackUrl;
    }

    // Get logo from our mapping
    const mappedLogo = getNetworkLogo(chainId);
    if (mappedLogo) {
        return mappedLogo;
    }

    // Return null to indicate we should use initials/symbol
    return null;
}

/**
 * Get network name from chain ID
 * @param chainId - Chain ID
 * @returns Network name
 */
export function getNetworkName(chainId: number): string {
    const names: Record<number, string> = {
        1: 'Ethereum',
        8453: 'Base',
        137: 'Polygon',
        42161: 'Arbitrum',
        11155111: 'Sepolia',
        84532: 'Base Sepolia',
    };
    return names[chainId] || `Chain ${chainId}`;
}
