export interface AuthenticatedUser {
  id: string;
  address: string;
  walletAddress: string;
  userId: string;
  kycStatus?: string | null;
  permissions?: string[];
  role: string;
  email?: string | null;
  isAdmin: boolean;
}

export interface AuthenticationRequest {
  walletAddress: string;
  signature: string;
  nonce: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface NonceRequest {
  walletAddress: string;
}

export interface NonceResponse {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface AuthenticationResponse {
  success: boolean;
  sessionToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  walletAddress?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface SessionStatusResponse {
  authenticated: boolean;
  walletAddress?: string;
  expiresAt?: string;
  sessionId?: string;
  role?: string;
  permissions?: string[];
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface AuthStats {
  totalSessions: number;
  activeSessions: number;
  recentAttempts: number;
  successRate: number;
  lastActivity?: string;
}

export interface WalletAuthAttempt {
  id: string;
  walletAddress: string;
  attemptType: 'login' | 'refresh' | 'logout';
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AuthSession {
  id: string;
  walletAddress: string;
  sessionToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
  lastUsedAt: Date;
  createdAt: Date;
}

export interface WalletNonce {
  id: string;
  walletAddress: string;
  nonce: string;
  message: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export enum AuthErrorCode {
  INVALID_NONCE = 'INVALID_NONCE',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  REFRESH_FAILED = 'REFRESH_FAILED',
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  MISSING_WALLET_ADDRESS = 'MISSING_WALLET_ADDRESS',
  WALLET_ACCESS_DENIED = 'WALLET_ACCESS_DENIED',
}

export interface AuthConfig {
  jwtSecret: string;
  sessionExpiryHours: number;
  refreshExpiryDays: number;
  nonceExpiryMinutes: number;
  maxAuthAttempts: number;
  authRateLimitWindowMinutes: number;
}
