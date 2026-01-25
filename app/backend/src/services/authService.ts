import jwt from 'jsonwebtoken';
import { UserService } from './userService';
import { tokenRevocationService } from './tokenRevocationService';
import { getRequiredEnv, isDevelopment } from '../utils/envValidation';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedUser } from '../types/authentication';

const userService = new UserService();

export class AuthService {
  private getJwtSecret(): string {
    return isDevelopment()
      ? (process.env.JWT_SECRET || 'development-secret-key-change-in-production')
      : getRequiredEnv('JWT_SECRET');
  }

  async generateToken(user: any): Promise<string> {
    const payload = {
      userId: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      kycStatus: user.kycStatus,
    };
    const secret = this.getJwtSecret();
    return jwt.sign(payload, secret, { expiresIn: '1d' });
  }

  async verifyToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const secret = this.getJwtSecret();
      const decoded = jwt.verify(token, secret) as any;

      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        throw new Error('Token has expired');
      }

      if (decoded.jti) {
        const isRevoked = await tokenRevocationService.isTokenRevoked(decoded.jti);
        if (isRevoked) {
          safeLogger.warn(`[AuthService] Revoked token attempted: ${decoded.jti}`);
          throw new Error('Token has been revoked');
        }
      }

      if (decoded.userId && decoded.iat) {
        const areUserTokensRevoked = await tokenRevocationService.areUserTokensRevoked(
          decoded.userId,
          decoded.iat * 1000
        );
        if (areUserTokensRevoked) {
          safeLogger.warn(`[AuthService] User tokens revoked: ${decoded.userId}`);
          throw new Error('All user tokens have been revoked. Please sign in again.');
        }
      }

      const user = await userService.getUserById(decoded.userId);
      if (!user) {
        return null;
      }

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        address: user.walletAddress,
        walletAddress: user.walletAddress,
        userId: user.id,
        kycStatus: user.kycStatus,
        permissions: user.permissions as string[] | undefined,
        role: user.role || 'user',
        email: user.email,
        isAdmin: ['admin', 'super_admin', 'moderator', 'support', 'analyst'].includes(user.role || ''),
      };

      return authenticatedUser;
    } catch (error) {
      safeLogger.error('Error verifying token:', error);
      return null;
    }
  }
}