/* Type augmentation for Express Request to include `user` */
import 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request {
      user?: {
        address?: string;
        walletAddress?: string;
        userId?: string;
        kycStatus?: string;
        permissions?: string[];
        id?: string;
        isAdmin?: boolean;
        [key: string]: any;
      };
    }
  }
}

export {};
