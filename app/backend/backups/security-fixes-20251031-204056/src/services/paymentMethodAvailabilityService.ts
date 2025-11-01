import { PaymentValidationService, PaymentValidationRequest } from './paymentValidationService';
import { safeLogger } from '../utils/safeLogger';
import { ExchangeRateService } from './exchangeRateService';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';

export interface PaymentMethodAvailability {
  method: 'crypto' | 'fiat' | 'escrow';
  available: boolean;
  reason?: string;
  requirements: string[];
  estimatedTime: string;
  fees: {
    min: number;
    max: number;
    currency: string;
  };
  limits: {
    min: number;
    max: number;
    currency: string;
  };
  supportedCurrencies: string[];
  benefits: string[];
  risks: string[];
}

export interface UserPaymentProfile {
  userAddress: string;
  verificationLevel: 'none' | 'basic' | 'advanced' | 'premium';
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_required';
  paymentHistory: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalVolume: number;
    averageAmount: number;
  };
  preferredMethods: string[];
  blockedMethods: string[];
  riskScore: number; // 0-100, lower is better
  lastActivity: Date;
}

export interface RegionalRestrictions {
  country: string;
  allowedMethods: string[];
  blockedMethods: string[];
  requiresKyc: boolean;
  maxTransactionAmount: number;
  currency: string;
  additionalRequirements: string[];
}

export class PaymentMethodAvailabilityService {
  private paymentValidationService: PaymentValidationService;
  private exchangeRateService: ExchangeRateService;
  private databaseService: DatabaseService;

  // Regional restrictions (mock data - in production, use compliance service)
  private readonly REGIONAL_RESTRICTIONS: Record<string, RegionalRestrictions> = {
    'US': {
      country: 'United States',
      allowedMethods: ['crypto', 'fiat', 'escrow'],
      blockedMethods: [],
      requiresKyc: true,
      maxTransactionAmount: 10000,
      currency: 'USD',
      additionalRequirements: ['Tax reporting for amounts > $600']
    },
    'EU': {
      country: 'European Union',
      allowedMethods: ['crypto', 'fiat', 'escrow'],
      blockedMethods: [],
      requiresKyc: true,
      maxTransactionAmount: 15000,
      currency: 'EUR',
      additionalRequirements: ['GDPR compliance', 'MiCA regulation compliance']
    },
    'UK': {
      country: 'United Kingdom',
      allowedMethods: ['crypto', 'fiat', 'escrow'],
      blockedMethods: [],
      requiresKyc: true,
      maxTransactionAmount: 12000,
      currency: 'GBP',
      additionalRequirements: ['FCA registration required for crypto']
    },
    'CA': {
      country: 'Canada',
      allowedMethods: ['crypto', 'fiat', 'escrow'],
      blockedMethods: [],
      requiresKyc: true,
      maxTransactionAmount: 13000,
      currency: 'CAD',
      additionalRequirements: ['FINTRAC compliance']
    },
    'RESTRICTED': {
      country: 'Restricted Region',
      allowedMethods: [],
      blockedMethods: ['crypto', 'fiat', 'escrow'],
      requiresKyc: false,
      maxTransactionAmount: 0,
      currency: 'USD',
      additionalRequirements: ['Service not available in this region']
    }
  };

  constructor() {
    this.paymentValidationService = new PaymentValidationService();
    this.exchangeRateService = new ExchangeRateService();
    this.databaseService = new DatabaseService();
  }

  /**
   * Check availability of all payment methods for a user
   */
  async checkPaymentMethodAvailability(
    userAddress: string,
    amount: number,
    currency: string,
    country?: string
  ): Promise<PaymentMethodAvailability[]> {
    try {
      const userProfile = await this.getUserPaymentProfile(userAddress);
      const regionalRestrictions = this.getRegionalRestrictions(country);
      
      const availabilityChecks = await Promise.all([
        this.checkCryptoAvailability(userAddress, amount, currency, userProfile, regionalRestrictions),
        this.checkFiatAvailability(userAddress, amount, currency, userProfile, regionalRestrictions),
        this.checkEscrowAvailability(userAddress, amount, currency, userProfile, regionalRestrictions)
      ]);

      return availabilityChecks;
    } catch (error) {
      safeLogger.error('Error checking payment method availability:', error);
      return [];
    }
  }

  /**
   * Get user's payment profile and history
   */
  async getUserPaymentProfile(userAddress: string): Promise<UserPaymentProfile> {
    try {
      // In production, fetch from database
      const mockProfile: UserPaymentProfile = {
        userAddress,
        verificationLevel: 'basic',
        kycStatus: 'approved',
        paymentHistory: {
          totalTransactions: 25,
          successfulTransactions: 23,
          failedTransactions: 2,
          totalVolume: 15000,
          averageAmount: 600
        },
        preferredMethods: ['crypto', 'escrow'],
        blockedMethods: [],
        riskScore: 15, // Low risk
        lastActivity: new Date()
      };

      return mockProfile;
    } catch (error) {
      safeLogger.error('Error getting user payment profile:', error);
      // Return default profile
      return {
        userAddress,
        verificationLevel: 'none',
        kycStatus: 'pending',
        paymentHistory: {
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          totalVolume: 0,
          averageAmount: 0
        },
        preferredMethods: [],
        blockedMethods: [],
        riskScore: 50,
        lastActivity: new Date()
      };
    }
  }

  /**
   * Get recommended payment method based on user profile and transaction
   */
  async getRecommendedPaymentMethod(
    userAddress: string,
    amount: number,
    currency: string,
    country?: string
  ): Promise<{
    recommended: PaymentMethodAvailability;
    alternatives: PaymentMethodAvailability[];
    reasoning: string[];
  }> {
    const availableMethods = await this.checkPaymentMethodAvailability(
      userAddress,
      amount,
      currency,
      country
    );

    const availableOnly = availableMethods.filter(method => method.available);
    
    if (availableOnly.length === 0) {
      throw new Error('No payment methods available');
    }

    // Score each method based on various factors
    const scoredMethods = availableOnly.map(method => ({
      method,
      score: this.calculateMethodScore(method, amount, currency)
    }));

    // Sort by score (highest first)
    scoredMethods.sort((a, b) => b.score - a.score);

    const recommended = scoredMethods[0].method;
    const alternatives = scoredMethods.slice(1).map(sm => sm.method);

    const reasoning = this.generateRecommendationReasoning(recommended, amount, currency);

    return {
      recommended,
      alternatives,
      reasoning
    };
  }

  /**
   * Check if specific payment method is available for transaction
   */
  async isPaymentMethodAvailable(
    method: 'crypto' | 'fiat' | 'escrow',
    userAddress: string,
    amount: number,
    currency: string,
    country?: string
  ): Promise<{ available: boolean; reason?: string; requirements: string[] }> {
    const availability = await this.checkPaymentMethodAvailability(
      userAddress,
      amount,
      currency,
      country
    );

    const methodAvailability = availability.find(a => a.method === method);
    
    if (!methodAvailability) {
      return {
        available: false,
        reason: 'Payment method not supported',
        requirements: []
      };
    }

    return {
      available: methodAvailability.available,
      reason: methodAvailability.reason,
      requirements: methodAvailability.requirements
    };
  }

  /**
   * Get payment method limits for user
   */
  async getPaymentLimits(
    userAddress: string,
    method: 'crypto' | 'fiat' | 'escrow',
    country?: string
  ): Promise<{
    daily: { min: number; max: number; remaining: number };
    monthly: { min: number; max: number; remaining: number };
    yearly: { min: number; max: number; remaining: number };
    currency: string;
  }> {
    const userProfile = await this.getUserPaymentProfile(userAddress);
    const regionalRestrictions = this.getRegionalRestrictions(country);

    // Base limits based on verification level
    const baseLimits = this.getBaseLimitsByVerification(userProfile.verificationLevel);
    
    // Apply regional restrictions
    const maxAllowed = Math.min(baseLimits.yearly.max, regionalRestrictions.maxTransactionAmount);

    // Mock usage data (in production, fetch from database)
    const currentUsage = {
      daily: userProfile.paymentHistory.totalVolume * 0.1,
      monthly: userProfile.paymentHistory.totalVolume * 0.3,
      yearly: userProfile.paymentHistory.totalVolume
    };

    return {
      daily: {
        min: baseLimits.daily.min,
        max: Math.min(baseLimits.daily.max, maxAllowed),
        remaining: Math.max(0, baseLimits.daily.max - currentUsage.daily)
      },
      monthly: {
        min: baseLimits.monthly.min,
        max: Math.min(baseLimits.monthly.max, maxAllowed),
        remaining: Math.max(0, baseLimits.monthly.max - currentUsage.monthly)
      },
      yearly: {
        min: baseLimits.yearly.min,
        max: Math.min(baseLimits.yearly.max, maxAllowed),
        remaining: Math.max(0, baseLimits.yearly.max - currentUsage.yearly)
      },
      currency: regionalRestrictions.currency
    };
  }

  // Private helper methods

  private async checkCryptoAvailability(
    userAddress: string,
    amount: number,
    currency: string,
    userProfile: UserPaymentProfile,
    regionalRestrictions: RegionalRestrictions
  ): Promise<PaymentMethodAvailability> {
    const method: PaymentMethodAvailability = {
      method: 'crypto',
      available: false,
      requirements: [],
      estimatedTime: '1-5 minutes',
      fees: { min: 0.001, max: 0.01, currency: 'ETH' },
      limits: { min: 1, max: 50000, currency: 'USD' },
      supportedCurrencies: ['ETH', 'MATIC', 'USDC', 'USDT'],
      benefits: [
        'Low fees',
        'Fast settlement',
        'Decentralized',
        'No intermediaries'
      ],
      risks: [
        'Price volatility',
        'Irreversible transactions',
        'Technical complexity'
      ]
    };

    // Check regional restrictions
    if (!regionalRestrictions.allowedMethods.includes('crypto')) {
      method.reason = 'Crypto payments not allowed in your region';
      return method;
    }

    // Check if user has blocked this method
    if (userProfile.blockedMethods.includes('crypto')) {
      method.reason = 'Crypto payments blocked for your account';
      return method;
    }

    // Check risk score
    if (userProfile.riskScore > 70) {
      method.reason = 'Account risk score too high for crypto payments';
      method.requirements.push('Complete additional verification');
      return method;
    }

    // Check amount limits
    const limits = await this.getPaymentLimits(userAddress, 'crypto', regionalRestrictions.country);
    if (amount > limits.daily.remaining) {
      method.reason = 'Amount exceeds daily crypto payment limit';
      method.requirements.push(`Reduce amount to ${limits.daily.remaining} or wait for limit reset`);
      return method;
    }

    // Check wallet connection and balance (simplified)
    try {
      // In production, check actual wallet balance
      method.requirements.push('Connected wallet with sufficient balance');
      method.requirements.push('Sufficient gas fees for transaction');
      
      method.available = true;
    } catch (error) {
      method.reason = 'Unable to verify wallet balance';
      method.requirements.push('Connect wallet and ensure sufficient balance');
    }

    return method;
  }

  private async checkFiatAvailability(
    userAddress: string,
    amount: number,
    currency: string,
    userProfile: UserPaymentProfile,
    regionalRestrictions: RegionalRestrictions
  ): Promise<PaymentMethodAvailability> {
    const method: PaymentMethodAvailability = {
      method: 'fiat',
      available: false,
      requirements: [],
      estimatedTime: 'Instant',
      fees: { min: 0.30, max: 50, currency: 'USD' },
      limits: { min: 1, max: 10000, currency: 'USD' },
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      benefits: [
        'Familiar payment methods',
        'Instant processing',
        'Buyer protection',
        'No crypto knowledge required'
      ],
      risks: [
        'Higher fees',
        'Centralized processing',
        'Potential chargebacks'
      ]
    };

    // Check regional restrictions
    if (!regionalRestrictions.allowedMethods.includes('fiat')) {
      method.reason = 'Fiat payments not allowed in your region';
      return method;
    }

    // Check KYC requirements
    if (regionalRestrictions.requiresKyc && userProfile.kycStatus !== 'approved') {
      method.reason = 'KYC verification required for fiat payments';
      method.requirements.push('Complete KYC verification');
      return method;
    }

    // Check if user has blocked this method
    if (userProfile.blockedMethods.includes('fiat')) {
      method.reason = 'Fiat payments blocked for your account';
      return method;
    }

    // Check amount limits
    const limits = await this.getPaymentLimits(userAddress, 'fiat', regionalRestrictions.country);
    if (amount > limits.daily.remaining) {
      method.reason = 'Amount exceeds daily fiat payment limit';
      method.requirements.push(`Reduce amount to ${limits.daily.remaining} or wait for limit reset`);
      return method;
    }

    // Check currency support
    if (!method.supportedCurrencies.includes(currency)) {
      method.reason = `Currency ${currency} not supported for fiat payments`;
      return method;
    }

    // Fiat payments are generally available if above checks pass
    method.requirements.push('Valid payment method (card, bank account, etc.)');
    method.available = true;

    return method;
  }

  private async checkEscrowAvailability(
    userAddress: string,
    amount: number,
    currency: string,
    userProfile: UserPaymentProfile,
    regionalRestrictions: RegionalRestrictions
  ): Promise<PaymentMethodAvailability> {
    const method: PaymentMethodAvailability = {
      method: 'escrow',
      available: false,
      requirements: [],
      estimatedTime: '1-5 minutes',
      fees: { min: 0.01, max: 0.05, currency: 'ETH' },
      limits: { min: 10, max: 100000, currency: 'USD' },
      supportedCurrencies: ['ETH', 'USDC', 'USDT'],
      benefits: [
        'Buyer protection',
        'Dispute resolution',
        'Secure fund holding',
        'Automatic release'
      ],
      risks: [
        'Longer settlement time',
        'Higher fees',
        'Requires crypto knowledge'
      ]
    };

    // Check regional restrictions
    if (!regionalRestrictions.allowedMethods.includes('escrow')) {
      method.reason = 'Escrow payments not allowed in your region';
      return method;
    }

    // Check if user has blocked this method
    if (userProfile.blockedMethods.includes('escrow')) {
      method.reason = 'Escrow payments blocked for your account';
      return method;
    }

    // Escrow requires higher verification level
    if (userProfile.verificationLevel === 'none') {
      method.reason = 'Basic verification required for escrow payments';
      method.requirements.push('Complete basic account verification');
      return method;
    }

    // Check minimum amount for escrow
    if (amount < method.limits.min) {
      method.reason = `Minimum amount for escrow is ${method.limits.min} ${method.limits.currency}`;
      return method;
    }

    // Check amount limits
    const limits = await this.getPaymentLimits(userAddress, 'escrow', regionalRestrictions.country);
    if (amount > limits.daily.remaining) {
      method.reason = 'Amount exceeds daily escrow payment limit';
      method.requirements.push(`Reduce amount to ${limits.daily.remaining} or wait for limit reset`);
      return method;
    }

    // Check wallet and balance (similar to crypto)
    method.requirements.push('Connected wallet with sufficient balance');
    method.requirements.push('Sufficient gas fees for escrow contract');
    method.requirements.push('Agreement to escrow terms and conditions');
    
    method.available = true;

    return method;
  }

  private getRegionalRestrictions(country?: string): RegionalRestrictions {
    if (!country) {
      return this.REGIONAL_RESTRICTIONS['US']; // Default to US
    }

    return this.REGIONAL_RESTRICTIONS[country.toUpperCase()] || this.REGIONAL_RESTRICTIONS['RESTRICTED'];
  }

  private getBaseLimitsByVerification(level: string) {
    const limits = {
      none: {
        daily: { min: 1, max: 100 },
        monthly: { min: 1, max: 1000 },
        yearly: { min: 1, max: 5000 }
      },
      basic: {
        daily: { min: 1, max: 1000 },
        monthly: { min: 1, max: 10000 },
        yearly: { min: 1, max: 50000 }
      },
      advanced: {
        daily: { min: 1, max: 5000 },
        monthly: { min: 1, max: 50000 },
        yearly: { min: 1, max: 250000 }
      },
      premium: {
        daily: { min: 1, max: 25000 },
        monthly: { min: 1, max: 250000 },
        yearly: { min: 1, max: 1000000 }
      }
    };

    return limits[level as keyof typeof limits] || limits.none;
  }

  private calculateMethodScore(
    method: PaymentMethodAvailability,
    amount: number,
    currency: string
  ): number {
    let score = 0;

    // Base score for availability
    if (method.available) score += 50;

    // Prefer methods with lower fees
    const feePercentage = (method.fees.max / amount) * 100;
    if (feePercentage < 1) score += 20;
    else if (feePercentage < 3) score += 10;
    else if (feePercentage < 5) score += 5;

    // Prefer faster methods
    if (method.estimatedTime.includes('Instant')) score += 15;
    else if (method.estimatedTime.includes('1-5 minutes')) score += 10;
    else if (method.estimatedTime.includes('minutes')) score += 5;

    // Prefer methods with more benefits
    score += method.benefits.length * 2;

    // Penalize methods with more risks
    score -= method.risks.length * 1;

    // Penalize methods with more requirements
    score -= method.requirements.length * 3;

    return Math.max(0, score);
  }

  private generateRecommendationReasoning(
    method: PaymentMethodAvailability,
    amount: number,
    currency: string
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`${method.method.charAt(0).toUpperCase() + method.method.slice(1)} payment is recommended for this transaction`);

    if (method.estimatedTime.includes('Instant')) {
      reasoning.push('Instant processing time');
    } else if (method.estimatedTime.includes('1-5 minutes')) {
      reasoning.push('Fast processing time (1-5 minutes)');
    }

    const feePercentage = (method.fees.max / amount) * 100;
    if (feePercentage < 1) {
      reasoning.push('Very low fees (< 1%)');
    } else if (feePercentage < 3) {
      reasoning.push('Low fees (< 3%)');
    }

    if (method.benefits.length > 0) {
      reasoning.push(`Key benefits: ${method.benefits.slice(0, 2).join(', ')}`);
    }

    if (method.requirements.length === 0) {
      reasoning.push('No additional requirements needed');
    } else if (method.requirements.length === 1) {
      reasoning.push(`Only requires: ${method.requirements[0]}`);
    }

    return reasoning;
  }
}