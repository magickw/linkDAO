/**
 * Centralized Configuration Manager
 * Handles environment variables for both Web and Mobile platforms
 */

export interface AppConfig {
  backendUrl: string;
  apiUrl: string;
  enableDex: boolean;
  etherscanApiKey?: string;
  polygonscanApiKey?: string;
  arbiscanApiKey?: string;
  mainnetRpcUrl: string;
  baseRpcUrl: string;
  polygonRpcUrl: string;
  arbitrumRpcUrl: string;
}

const getEnv = (key: string, fallback: string = ''): string => {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env[key] || 
      process.env['NEXT_PUBLIC_' + key] || 
      process.env['EXPO_PUBLIC_' + key] || 
      fallback
    );
  }
  return fallback;
};

export const Config: AppConfig = {
  backendUrl: getEnv('BACKEND_URL', 'https://api.linkdao.io'),
  apiUrl: getEnv('API_URL', 'https://api.linkdao.io/api'),
  enableDex: getEnv('ENABLE_DEX', 'true') === 'true',
  etherscanApiKey: getEnv('ETHERSCAN_API_KEY'),
  polygonscanApiKey: getEnv('POLYGONSCAN_API_KEY'),
  arbiscanApiKey: getEnv('ARBISCAN_API_KEY'),
  mainnetRpcUrl: getEnv('MAINNET_RPC_URL', 'https://eth.llamarpc.com'),
  baseRpcUrl: getEnv('BASE_RPC_URL', 'https://mainnet.base.org'),
  polygonRpcUrl: getEnv('POLYGON_RPC_URL', 'https://polygon-rpc.com'),
  arbitrumRpcUrl: getEnv('ARBITRUM_RPC_URL', 'https://arb1.arbitrum.io/rpc'),
};

export default Config;
