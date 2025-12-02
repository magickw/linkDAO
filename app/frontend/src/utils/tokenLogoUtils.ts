/**
 * Token Logo Utilities
 * 
 * Provides functions to get official token logos for display in wallet components
 */

// Known token logos mapping
const TOKEN_LOGOS: Record<string, string> = {
  // Major cryptocurrencies
  'ETH': '/tokens/eth.png',
  'WETH': '/tokens/eth.png',
  'BTC': '/tokens/btc.png',
  'WBTC': '/tokens/wbtc.png',
  
  // Stablecoins
  'USDC': '/tokens/usdc.png',
  'USDT': '/tokens/usdt.png',
  'DAI': '/tokens/dai.png',
  
  // Major tokens
  'LINK': '/tokens/link.png',
  'UNI': '/tokens/uni.png',
  'AAVE': '/tokens/aave.png',
  'COMP': '/tokens/comp.png',
  'MKR': '/tokens/mkr.png',
  'SNX': '/tokens/snx.png',
  'YFI': '/tokens/yfi.png',
  
  // LinkDAO token
  'LDAO': '/logo.png',
  'LINKDAO': '/logo.png',
  
  // Default fallback
  'DEFAULT': '/images/default-token.png'
};

/**
 * Get the logo URL for a given token symbol
 * @param symbol - Token symbol (e.g., 'ETH', 'USDC')
 * @returns Logo URL string
 */
export function getTokenLogo(symbol: string): string {
  if (!symbol) return TOKEN_LOGOS.DEFAULT;
  
  const upperSymbol = symbol.toUpperCase();
  
  // Check for exact match
  if (TOKEN_LOGOS[upperSymbol]) {
    return TOKEN_LOGOS[upperSymbol];
  }
  
  // Check for partial matches (e.g., WETH, WETH.e)
  for (const [key, logo] of Object.entries(TOKEN_LOGOS)) {
    if (upperSymbol.includes(key) || key.includes(upperSymbol)) {
      return logo;
    }
  }
  
  // Return default logo if no match found
  return TOKEN_LOGOS.DEFAULT;
}

/**
 * Get token logo with fallback to initials
 * @param symbol - Token symbol
 * @param logoUrl - Optional logo URL from token service
 * @returns Logo URL or null if should use initials
 */
export function getTokenLogoWithFallback(symbol: string, logoUrl?: string): string | null {
  // Use provided logo URL if available
  if (logoUrl) {
    return logoUrl;
  }
  
  // Get logo from our mapping
  const mappedLogo = getTokenLogo(symbol);
  if (mappedLogo !== TOKEN_LOGOS.DEFAULT) {
    return mappedLogo;
  }
  
  // Return null to indicate we should use initials
  return null;
}