// Centralized environment configuration
export const ENV_CONFIG = {
  // Backend API URL - defaults to localhost:10000 for development
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000',
  API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000',
  
  // WalletConnect
  WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'd051afaee33392cccc42e141b9f7697b',
  
  // RPC URLs
  MAINNET_RPC_URL: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/1f6040196b894a6e90ef4842c62503d7',
  BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base-mainnet.infura.io/v3/1f6040196b894a6e90ef4842c62503d7',
  
  // Environment detection
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // Admin address
  ADMIN_ADDRESS: process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '0x1234567890123456789012345678901234567890',
} as const;

// Helper function to get the correct API endpoint
export const getApiEndpoint = (path: string): string => {
  const baseUrl = ENV_CONFIG.BACKEND_URL.endsWith('/') 
    ? ENV_CONFIG.BACKEND_URL.slice(0, -1) 
    : ENV_CONFIG.BACKEND_URL;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
};

// Helper function to check if we're in development mode
export const isDevelopment = (): boolean => ENV_CONFIG.IS_DEVELOPMENT;

// Helper function to check if we're in production mode
export const isProduction = (): boolean => ENV_CONFIG.IS_PRODUCTION;

export default ENV_CONFIG;