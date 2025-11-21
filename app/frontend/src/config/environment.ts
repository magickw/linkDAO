// Centralized environment configuration
export const ENV_CONFIG = {
  // Backend API URL - defaults to localhost:8000 for development
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000',
  API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000',

  // WebSocket URL - derived from backend URL (Socket.IO will append /socket.io/)
  WS_URL: process.env.NEXT_PUBLIC_WS_URL ||
    (process.env.NEXT_PUBLIC_BACKEND_URL
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/socket.io/`
      : 'ws://localhost:8000/socket.io/'),

  // WalletConnect
  WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'd051afaee33392cccc42e141b9f7697b',

  // Coinbase CDP (for OnchainKit and x402 protocol)
  CDP_API_KEY: process.env.NEXT_PUBLIC_CDP_API_KEY || '',

  // Smart Contract Addresses (Sepolia Testnet)
  LDAO_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS || '0xc9F690B45e33ca909bB9ab97836091673232611B',
  TIP_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_TIP_ROUTER_ADDRESS || '0x755Fe81411c86019fff6033E0567A4D93b57281b',
  TREASURY_ADDRESS: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0xeF85C8CcC03320dA32371940b315D563be2585e5',
  MARKETPLACE_ADDRESS: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A',
  GOVERNANCE_ADDRESS: process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS || '0x27a78A860445DFFD9073aFd7065dd421487c0F8A',
  
  // RPC URLs
  MAINNET_RPC_URL: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/1f6040196b894a6e90ef4842c62503d7',
  BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base-mainnet.infura.io/v3/1f6040196b894a6e90ef4842c62503d7',
  SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/1f6040196b894a6e90ef4842c62503d7',
  
  // Environment detection
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // Admin address
  ADMIN_ADDRESS: process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '0xEe034b53D4cCb101b2a4faec27708be507197350',
} as const;

// Helper function to get the correct API endpoint
export const getApiEndpoint = (path: string): string => {
  const baseUrl = ENV_CONFIG.BACKEND_URL.endsWith('/') 
    ? ENV_CONFIG.BACKEND_URL.slice(0, -1) 
    : ENV_CONFIG.BACKEND_URL;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
};

// Helper function to get the correct WebSocket endpoint
export const getWebSocketEndpoint = (): string => {
  // If NEXT_PUBLIC_WS_URL is set and includes the full path, use it as is
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  
  // Otherwise derive from backend URL
  return ENV_CONFIG.WS_URL;
};

// Helper function to check if we're in development mode
export const isDevelopment = (): boolean => ENV_CONFIG.IS_DEVELOPMENT;

// Helper function to check if we're in production mode
export const isProduction = (): boolean => ENV_CONFIG.IS_PRODUCTION;

export default ENV_CONFIG;