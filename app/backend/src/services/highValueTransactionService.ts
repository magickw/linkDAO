import { db } from '../db';
import { getPrimaryFrontendUrl } from '../utils/urlUtils';
import { users, orders } from '../db/schema';
import { marketplaceUsers } from '../db/marketplaceSchema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { NotificationService } from './notificationService';
import { emailService } from './emailService';

export interface TransactionThresholds {
  // Single transaction thresholds
  singleTransactionLimit: number;
  // Cumulative thresholds
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  // Verification level requirements
  basicVerificationLimit: number;
  enhancedVerificationLimit: number;
  premiumVerificationLimit: number;
}

export interface SellerVerificationStatus {
  sellerId: string;
  isVerified: boolean;
  verificationLevel: 'none' | 'basic' | 'enhanced' | 'premium';
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired';
  kycExpiresAt?: Date;
  transactionLimits: TransactionThresholds;
  currentUsage: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  canProcessTransaction: boolean;
  requiredAction?: string;
}

export interface TransactionVerificationResult {
  allowed: boolean;
  reason?: string;
  requiredVerificationLevel?: 'basic' | 'enhanced' | 'premium';
  currentVerificationLevel?: 'none' | 'basic' | 'enhanced' | 'premium';
  limitExceeded?: {
    type: 'single' | 'daily' | 'weekly' | 'monthly';
    current: number;
    limit: number;
  };
  suggestedActions: string[];
}

export interface HighValueTransactionAlert {
  transactionId: string;
  sellerId: string;
  buyerId: string;
  amount: number;
  currency: string;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class HighValueTransactionService {
  private notificationService: NotificationService;

  // Default thresholds (in USD equivalent)
  private readonly DEFAULT_THRESHOLDS: TransactionThresholds = {
    singleTransactionLimit: 5000,
    dailyLimit: 10000,
    weeklyLimit: 50000,
    monthlyLimit: 100000,
    basicVerificationLimit: 500,
    enhancedVerificationLimit: 5000,
    premiumVerificationLimit: 50000
  };

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Verify if a seller can process a high-value transaction
   */
  async verifySellerForTransaction(
    sellerId: string,
    transactionAmount: number,
    currency: string = 'USD'
  ): Promise<TransactionVerificationResult> {
    try {
      safeLogger.info(`Verifying seller ${sellerId} for transaction of ${transactionAmount} ${currency}`);

      // Get seller verification status
      const sellerStatus = await this.getSellerVerificationStatus(sellerId);

      // Convert amount to USD if needed
      const amountInUSD = await this.convertToUSD(transactionAmount, currency);

      const suggestedActions: string[] = [];

      // Check single transaction limit based on verification level
      const singleTxResult = this.checkSingleTransactionLimit(amountInUSD, sellerStatus);
      if (!singleTxResult.allowed) {
        return singleTxResult;
      }

      // Check cumulative limits
      const cumulativeResult = this.checkCumulativeLimits(amountInUSD, sellerStatus);
      if (!cumulativeResult.allowed) {
        return cumulativeResult;
      }

      // Check if KYC verification is required based on amount
      const verificationRequired = this.getRequiredVerificationLevel(amountInUSD);

      if (verificationRequired !== 'none' &&
          this.getVerificationLevelPriority(sellerStatus.verificationLevel) <
          this.getVerificationLevelPriority(verificationRequired)) {

        suggestedActions.push(`Complete ${verificationRequired} KYC verification to process this transaction`);
        suggestedActions.push('Submit required identity documents');

        if (verificationRequired === 'enhanced') {
          suggestedActions.push('Provide proof of address');
        }

        if (verificationRequired === 'premium') {
          suggestedActions.push('Complete video verification');
          suggestedActions.push('Provide business documentation if applicable');
        }

        return {
          allowed: false,
          reason: `Transaction amount of ${amountInUSD} USD requires ${verificationRequired} verification`,
          requiredVerificationLevel: verificationRequired as 'basic' | 'enhanced' | 'premium',
          currentVerificationLevel: sellerStatus.verificationLevel as 'none' | 'basic' | 'enhanced' | 'premium',
          suggestedActions
        };
      }

      // Check if KYC is expired
      if (sellerStatus.kycExpiresAt && new Date() > sellerStatus.kycExpiresAt) {
        suggestedActions.push('Renew your KYC verification - it has expired');

        return {
          allowed: false,
          reason: 'KYC verification has expired',
          currentVerificationLevel: sellerStatus.verificationLevel as 'none' | 'basic' | 'enhanced' | 'premium',
          suggestedActions
        };
      }

      // Transaction can proceed
      safeLogger.info(`Seller ${sellerId} approved for transaction of ${amountInUSD} USD`);

      // Log high-value transaction for monitoring
      if (amountInUSD >= 1000) {
        await this.logHighValueTransaction(sellerId, amountInUSD, currency, 'approved');
      }

      return {
        allowed: true,
        currentVerificationLevel: sellerStatus.verificationLevel as 'none' | 'basic' | 'enhanced' | 'premium',
        suggestedActions: []
      };

    } catch (error) {
      safeLogger.error('Error verifying seller for transaction:', error);
      return {
        allowed: false,
        reason: 'Verification service temporarily unavailable',
        suggestedActions: ['Please try again later or contact support']
      };
    }
  }

  /**
   * Get seller's verification status and limits
   */
  async getSellerVerificationStatus(sellerId: string): Promise<SellerVerificationStatus> {
          try {
            // Get seller from database with marketplace verification info
            const [sellerData] = await db
                        .select({
                          id: users.id,
                          walletAddress: users.walletAddress,
                          kycVerified: marketplaceUsers.kycVerified,
                          kycVerificationDate: marketplaceUsers.kycVerificationDate,
                          kycExpiresAt: marketplaceUsers.kycVerificationDate // Fallback or add column if exists
                        })              .from(users)
              .leftJoin(marketplaceUsers, eq(users.id, marketplaceUsers.userId))
              .where(eq(users.id, sellerId))
              .limit(1);
    
            if (!sellerData) {
              return this.getDefaultVerificationStatus(sellerId);
            }
    
            // Parse seller verification data
            const verificationLevel = sellerData.kycVerified
              ? this.determineVerificationLevel(sellerData as any)
              : 'none';
    
            const kycStatus = sellerData.kycVerified ? 'approved' : 'not_started';
    
            // Calculate current usage
            const currentUsage = await this.calculateCurrentUsage(sellerId);
    
            // Get limits based on verification level
            const transactionLimits = this.getLimitsForVerificationLevel(verificationLevel);
    
            return {
              sellerId,
              isVerified: sellerData.kycVerified || false,
              verificationLevel,
                        kycStatus: kycStatus as any,
                        kycExpiresAt: sellerData.kycExpiresAt || undefined,
                        transactionLimits,              currentUsage
            };
        } catch (error) {
      safeLogger.error('Error getting seller verification status:', error);
      return this.getDefaultVerificationStatus(sellerId);
    }
  }

  /**
   * Alert admin about suspicious high-value transaction
   */
  async alertHighValueTransaction(alert: HighValueTransactionAlert): Promise<void> {
    try {
      safeLogger.warn('High-value transaction alert:', alert);

      // Send admin notification
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        await emailService.sendEmail({
          to: adminEmail,
          subject: `[${alert.riskLevel.toUpperCase()}] High-Value Transaction Alert - ${alert.amount} ${alert.currency}`,
          html: `
            <h2>High-Value Transaction Alert</h2>
            <p><strong>Risk Level:</strong> ${alert.riskLevel.toUpperCase()}</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Transaction ID:</strong> ${alert.transactionId}</p>
              <p><strong>Amount:</strong> ${alert.amount} ${alert.currency}</p>
              <p><strong>Seller ID:</strong> ${alert.sellerId}</p>
              <p><strong>Buyer ID:</strong> ${alert.buyerId}</p>
              <p><strong>Reason:</strong> ${alert.reason}</p>
              <p><strong>Timestamp:</strong> ${alert.timestamp.toISOString()}</p>
            </div>
            <p>Please review this transaction in the admin dashboard.</p>
            <a href="${getPrimaryFrontendUrl()}/admin/transactions/${alert.transactionId}"
               style="display: inline-block; background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Review Transaction
            </a>
          `
        });
      }

      // Store alert for analytics
      safeLogger.info('High-value transaction alert stored:', {
        transactionId: alert.transactionId,
        amount: alert.amount,
        riskLevel: alert.riskLevel
      });

    } catch (error) {
      safeLogger.error('Error sending high-value transaction alert:', error);
    }
  }

  /**
   * Check if seller needs verification upgrade based on transaction history
   */
  async checkVerificationUpgradeNeeded(sellerId: string): Promise<{
    needsUpgrade: boolean;
    currentLevel: string;
    recommendedLevel: string;
    reason: string;
  }> {
    try {
      const status = await this.getSellerVerificationStatus(sellerId);
      const currentLevel = status.verificationLevel;

      // Check if approaching limits
      const dailyUsagePercent = (status.currentUsage.daily / status.transactionLimits.dailyLimit) * 100;
      const monthlyUsagePercent = (status.currentUsage.monthly / status.transactionLimits.monthlyLimit) * 100;

      if (dailyUsagePercent >= 80 || monthlyUsagePercent >= 80) {
        const recommendedLevel = this.getNextVerificationLevel(currentLevel);
        return {
          needsUpgrade: true,
          currentLevel,
          recommendedLevel,
          reason: `You have used ${Math.max(dailyUsagePercent, monthlyUsagePercent).toFixed(0)}% of your transaction limits. Upgrade to ${recommendedLevel} verification for higher limits.`
        };
      }

      return {
        needsUpgrade: false,
        currentLevel,
        recommendedLevel: currentLevel,
        reason: 'Current verification level is sufficient'
      };

    } catch (error) {
      safeLogger.error('Error checking verification upgrade needed:', error);
      return {
        needsUpgrade: false,
        currentLevel: 'unknown',
        recommendedLevel: 'unknown',
        reason: 'Unable to determine verification status'
      };
    }
  }

  /**
   * Validate transaction before processing
   */
  async validateTransaction(
    sellerId: string,
    buyerId: string,
    amount: number,
    currency: string,
    orderId?: string
  ): Promise<{ valid: boolean; error?: string; warnings: string[] }> {
    const warnings: string[] = [];

    try {
      // Verify seller
      const sellerResult = await this.verifySellerForTransaction(sellerId, amount, currency);
      if (!sellerResult.allowed) {
        return {
          valid: false,
          error: sellerResult.reason,
          warnings: sellerResult.suggestedActions
        };
      }

      // Check for unusual patterns
      const amountUSD = await this.convertToUSD(amount, currency);

      if (amountUSD >= 10000) {
        warnings.push('Large transaction flagged for compliance review');
        await this.alertHighValueTransaction({
          transactionId: orderId || `pending_${Date.now()}`,
          sellerId,
          buyerId,
          amount: amountUSD,
          currency: 'USD',
          reason: 'Large transaction requiring compliance review',
          riskLevel: amountUSD >= 50000 ? 'high' : 'medium',
          timestamp: new Date()
        });
      }

      // Check verification upgrade
      const upgradeCheck = await this.checkVerificationUpgradeNeeded(sellerId);
      if (upgradeCheck.needsUpgrade) {
        warnings.push(upgradeCheck.reason);
      }

      return {
        valid: true,
        warnings
      };

    } catch (error) {
      safeLogger.error('Error validating transaction:', error);
      return {
        valid: false,
        error: 'Transaction validation failed',
        warnings: []
      };
    }
  }

  // Private helper methods

  private checkSingleTransactionLimit(
    amount: number,
    status: SellerVerificationStatus
  ): TransactionVerificationResult {
    const limit = status.transactionLimits.singleTransactionLimit;

    if (amount > limit) {
      return {
        allowed: false,
        reason: `Transaction amount exceeds single transaction limit of ${limit} USD`,
        limitExceeded: {
          type: 'single',
          current: amount,
          limit
        },
        suggestedActions: [
          'Upgrade your verification level for higher limits',
          'Split the transaction into smaller amounts',
          'Contact support for a limit increase'
        ]
      };
    }

    return { allowed: true, suggestedActions: [] };
  }

  private checkCumulativeLimits(
    amount: number,
    status: SellerVerificationStatus
  ): TransactionVerificationResult {
    const { daily, weekly, monthly } = status.currentUsage;
    const limits = status.transactionLimits;

    if (daily + amount > limits.dailyLimit) {
      return {
        allowed: false,
        reason: `Transaction would exceed daily limit of ${limits.dailyLimit} USD`,
        limitExceeded: {
          type: 'daily',
          current: daily + amount,
          limit: limits.dailyLimit
        },
        suggestedActions: [
          'Wait until tomorrow to process this transaction',
          'Upgrade your verification level for higher limits'
        ]
      };
    }

    if (weekly + amount > limits.weeklyLimit) {
      return {
        allowed: false,
        reason: `Transaction would exceed weekly limit of ${limits.weeklyLimit} USD`,
        limitExceeded: {
          type: 'weekly',
          current: weekly + amount,
          limit: limits.weeklyLimit
        },
        suggestedActions: [
          'Wait until next week to process this transaction',
          'Upgrade your verification level for higher limits'
        ]
      };
    }

    if (monthly + amount > limits.monthlyLimit) {
      return {
        allowed: false,
        reason: `Transaction would exceed monthly limit of ${limits.monthlyLimit} USD`,
        limitExceeded: {
          type: 'monthly',
          current: monthly + amount,
          limit: limits.monthlyLimit
        },
        suggestedActions: [
          'Wait until next month to process this transaction',
          'Upgrade to premium verification for higher limits'
        ]
      };
    }

    return { allowed: true, suggestedActions: [] };
  }

  private getRequiredVerificationLevel(amount: number): 'none' | 'basic' | 'enhanced' | 'premium' {
    if (amount >= this.DEFAULT_THRESHOLDS.premiumVerificationLimit) {
      return 'premium';
    }
    if (amount >= this.DEFAULT_THRESHOLDS.enhancedVerificationLimit) {
      return 'enhanced';
    }
    if (amount >= this.DEFAULT_THRESHOLDS.basicVerificationLimit) {
      return 'basic';
    }
    return 'none';
  }

  private getVerificationLevelPriority(level: string): number {
    const priorities: Record<string, number> = {
      'none': 0,
      'basic': 1,
      'enhanced': 2,
      'premium': 3
    };
    return priorities[level] || 0;
  }

  private getNextVerificationLevel(current: string): string {
    const levels = ['none', 'basic', 'enhanced', 'premium'];
    const currentIndex = levels.indexOf(current);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : 'premium';
  }

  private getLimitsForVerificationLevel(level: string): TransactionThresholds {
    switch (level) {
      case 'premium':
        return {
          singleTransactionLimit: 100000,
          dailyLimit: 500000,
          weeklyLimit: 1000000,
          monthlyLimit: 5000000,
          basicVerificationLimit: 500,
          enhancedVerificationLimit: 5000,
          premiumVerificationLimit: 50000
        };
      case 'enhanced':
        return {
          singleTransactionLimit: 25000,
          dailyLimit: 100000,
          weeklyLimit: 250000,
          monthlyLimit: 500000,
          basicVerificationLimit: 500,
          enhancedVerificationLimit: 5000,
          premiumVerificationLimit: 50000
        };
      case 'basic':
        return {
          singleTransactionLimit: 5000,
          dailyLimit: 10000,
          weeklyLimit: 50000,
          monthlyLimit: 100000,
          basicVerificationLimit: 500,
          enhancedVerificationLimit: 5000,
          premiumVerificationLimit: 50000
        };
      default:
        return {
          singleTransactionLimit: 500,
          dailyLimit: 500,
          weeklyLimit: 1000,
          monthlyLimit: 2000,
          basicVerificationLimit: 500,
          enhancedVerificationLimit: 5000,
          premiumVerificationLimit: 50000
        };
    }
  }

  private async calculateCurrentUsage(sellerId: string): Promise<{ daily: number; weekly: number; monthly: number }> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get daily total
      const dailyResult = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)` })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(orders.createdAt, startOfDay)
          )
        );

      // Get weekly total
      const weeklyResult = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)` })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(orders.createdAt, startOfWeek)
          )
        );

      // Get monthly total
      const monthlyResult = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)` })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(orders.createdAt, startOfMonth)
          )
        );

      return {
        daily: parseFloat(dailyResult[0]?.total || '0'),
        weekly: parseFloat(weeklyResult[0]?.total || '0'),
        monthly: parseFloat(monthlyResult[0]?.total || '0')
      };

    } catch (error) {
      safeLogger.error('Error calculating current usage:', error);
      return { daily: 0, weekly: 0, monthly: 0 };
    }
  }

  private determineVerificationLevel(seller: any): 'none' | 'basic' | 'enhanced' | 'premium' {
    // Check verification tier/level from user data
    const tier = seller.verificationTier || seller.kycTier || 'none';

    if (['premium', 'tier3', 'business'].includes(tier)) {
      return 'premium';
    }
    if (['enhanced', 'tier2', 'advanced'].includes(tier)) {
      return 'enhanced';
    }
    if (['basic', 'tier1', 'standard'].includes(tier)) {
      return 'basic';
    }

    return 'none';
  }

  private mapKycStatus(status: string | null): 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired' {
    if (!status) return 'not_started';

    const statusLower = status.toLowerCase();

    if (['approved', 'verified', 'complete'].includes(statusLower)) {
      return 'approved';
    }
    if (['pending', 'in_review', 'submitted'].includes(statusLower)) {
      return 'pending';
    }
    if (['rejected', 'failed', 'denied'].includes(statusLower)) {
      return 'rejected';
    }
    if (['expired'].includes(statusLower)) {
      return 'expired';
    }

    return 'not_started';
  }

  private getDefaultVerificationStatus(sellerId: string): SellerVerificationStatus {
    return {
      sellerId,
      isVerified: false,
      verificationLevel: 'none',
      kycStatus: 'not_started',
      transactionLimits: this.getLimitsForVerificationLevel('none'),
      currentUsage: { daily: 0, weekly: 0, monthly: 0 },
      canProcessTransaction: true, // Allow small transactions without KYC
      requiredAction: 'Complete KYC verification to increase your transaction limits'
    };
  }

  private async convertToUSD(amount: number, currency: string): Promise<number> {
    // In a real implementation, this would call a price oracle or exchange rate API
    // For now, we'll use a simplified conversion
    const exchangeRates: Record<string, number> = {
      'USD': 1,
      'EUR': 1.10,
      'GBP': 1.27,
      'ETH': 2000, // Approximate
      'USDC': 1,
      'USDT': 1,
      'DAI': 1
    };

    const rate = exchangeRates[currency.toUpperCase()] || 1;
    return amount * rate;
  }

  private async logHighValueTransaction(
    sellerId: string,
    amount: number,
    currency: string,
    status: string
  ): Promise<void> {
    safeLogger.info('High-value transaction logged:', {
      sellerId,
      amount,
      currency,
      status,
      timestamp: new Date().toISOString()
    });
  }
}

export const highValueTransactionService = new HighValueTransactionService();
