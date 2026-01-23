/**
 * Environment Configuration
 * Centralized environment variables for the mobile app
 */

export interface EnvConfig {
  BACKEND_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  ENABLE_WALLET_CONNECT: boolean;
  ENABLE_BIOMETRICS: boolean;
  ENABLE_PUSH_NOTIFICATIONS: boolean;
  WS_URL: string;
  DEFAULT_CHAIN_ID: number;
}

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return process.env[`EXPO_PUBLIC_${key}`] || defaultValue;
};

// Helper to get origin from platform-specific constants
const getOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  // For React Native, use a default or platform-specific origin
  return 'http://localhost:10000';
};

export const ENV: EnvConfig = {
  BACKEND_URL: getEnvVar('BACKEND_URL', getOrigin()),
  APP_NAME: getEnvVar('APP_NAME', 'LinkDAO'),
  APP_VERSION: getEnvVar('APP_VERSION', '1.0.0'),
  ENABLE_WALLET_CONNECT: getEnvVar('ENABLE_WALLET_CONNECT', 'true') === 'true',
  ENABLE_BIOMETRICS: getEnvVar('ENABLE_BIOMETRICS', 'true') === 'true',
  ENABLE_PUSH_NOTIFICATIONS: getEnvVar('ENABLE_PUSH_NOTIFICATIONS', 'true') === 'true',
  // WS_URL derived from BACKEND_URL - Socket.IO will handle ws/wss protocol upgrade automatically
  WS_URL: getEnvVar('WS_URL', getOrigin().replace(/^http/, 'ws')),
  DEFAULT_CHAIN_ID: parseInt(getEnvVar('DEFAULT_CHAIN_ID', '84532'), 10),
};

export default ENV;