/**
 * Custom Jest Matchers for LDAO Token Acquisition System Tests
 */

import { ethers } from 'ethers';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidEthereumAddress(): R;
      toHaveValidTransactionHash(): R;
      toHaveValidUUID(): R;
      toHaveValidEmail(): R;
      toBeWithinRange(min: number, max: number): R;
      toHaveCoverageAbove(threshold: number): R;
      toHaveResponseTimeBelow(maxTime: number): R;
      toBeValidLDAOAmount(): R;
      toHaveValidPriceQuote(): R;
      toBeValidPurchaseResult(): R;
      toBeValidEarnResult(): R;
      toBeValidSwapResult(): R;
      toBeValidBridgeResult(): R;
      toHaveValidStakingPosition(): R;
      toBeWithinSlippageTolerance(expectedPrice: number, tolerance: number): R;
      toHaveValidCircuitBreakerState(): R;
      toBeValidKYCStatus(): R;
      toHaveValidAuditTrail(): R;
    }
  }
}

// Ethereum address validation
expect.extend({
  toHaveValidEthereumAddress(received: string) {
    const isValid = ethers.utils.isAddress(received);
    
    return {
      message: () => `expected ${received} to be a valid Ethereum address`,
      pass: isValid
    };
  }
});

// Transaction hash validation
expect.extend({
  toHaveValidTransactionHash(received: string) {
    const isValid = /^0x[a-fA-F0-9]{64}$/.test(received);
    
    return {
      message: () => `expected ${received} to be a valid transaction hash`,
      pass: isValid
    };
  }
});

// UUID validation
expect.extend({
  toHaveValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(received);
    
    return {
      message: () => `expected ${received} to be a valid UUID`,
      pass: isValid
    };
  }
});

// Email validation
expect.extend({
  toHaveValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(received);
    
    return {
      message: () => `expected ${received} to be a valid email address`,
      pass: isValid
    };
  }
});

// Range validation
expect.extend({
  toBeWithinRange(received: number, min: number, max: number) {
    const isWithinRange = received >= min && received <= max;
    
    return {
      message: () => `expected ${received} to be within range ${min}-${max}`,
      pass: isWithinRange
    };
  }
});

// Coverage validation
expect.extend({
  toHaveCoverageAbove(received: number, threshold: number) {
    const isAboveThreshold = received >= threshold;
    
    return {
      message: () => `expected coverage ${received}% to be above ${threshold}%`,
      pass: isAboveThreshold
    };
  }
});

// Response time validation
expect.extend({
  toHaveResponseTimeBelow(received: number, maxTime: number) {
    const isBelowMax = received <= maxTime;
    
    return {
      message: () => `expected response time ${received}ms to be below ${maxTime}ms`,
      pass: isBelowMax
    };
  }
});

// LDAO amount validation
expect.extend({
  toBeValidLDAOAmount(received: any) {
    const isValid = typeof received === 'number' && 
                   received > 0 && 
                   received <= 1000000000 && // Max supply
                   Number.isFinite(received);
    
    return {
      message: () => `expected ${received} to be a valid LDAO token amount`,
      pass: isValid
    };
  }
});

// Price quote validation
expect.extend({
  toHaveValidPriceQuote(received: any) {
    const isValid = received &&
                   typeof received.pricePerToken === 'number' &&
                   typeof received.totalPrice === 'number' &&
                   typeof received.discount === 'number' &&
                   typeof received.discountPercentage === 'number' &&
                   received.validUntil instanceof Date &&
                   received.pricePerToken > 0 &&
                   received.totalPrice > 0 &&
                   received.discount >= 0 &&
                   received.discountPercentage >= 0 &&
                   received.discountPercentage <= 100;
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid price quote`,
      pass: isValid
    };
  }
});

// Purchase result validation
expect.extend({
  toBeValidPurchaseResult(received: any) {
    const isValid = received &&
                   typeof received.success === 'boolean' &&
                   (received.success ? (
                     typeof received.transactionId === 'string' &&
                     typeof received.estimatedTokens === 'number' &&
                     typeof received.finalPrice === 'number' &&
                     received.estimatedTokens > 0 &&
                     received.finalPrice > 0
                   ) : (
                     typeof received.error === 'string' &&
                     received.error.length > 0
                   ));
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid purchase result`,
      pass: isValid
    };
  }
});

// Earn result validation
expect.extend({
  toBeValidEarnResult(received: any) {
    const isValid = received &&
                   typeof received.success === 'boolean' &&
                   (received.success ? (
                     typeof received.tokensEarned === 'number' &&
                     typeof received.multiplier === 'number' &&
                     received.tokensEarned >= 0 &&
                     received.multiplier >= 1.0
                   ) : (
                     typeof received.error === 'string' &&
                     received.error.length > 0
                   ));
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid earn result`,
      pass: isValid
    };
  }
});

// Swap result validation
expect.extend({
  toBeValidSwapResult(received: any) {
    const isValid = received &&
                   typeof received.success === 'boolean' &&
                   (received.success ? (
                     typeof received.txHash === 'string' &&
                     typeof received.amountOut === 'number' &&
                     /^0x[a-fA-F0-9]{64}$/.test(received.txHash) &&
                     received.amountOut > 0
                   ) : (
                     typeof received.error === 'string' &&
                     received.error.length > 0
                   ));
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid swap result`,
      pass: isValid
    };
  }
});

// Bridge result validation
expect.extend({
  toBeValidBridgeResult(received: any) {
    const isValid = received &&
                   typeof received.success === 'boolean' &&
                   (received.success ? (
                     typeof received.txHash === 'string' &&
                     typeof received.bridgeId === 'string' &&
                     /^0x[a-fA-F0-9]{64}$/.test(received.txHash) &&
                     received.bridgeId.length > 0
                   ) : (
                     typeof received.error === 'string' &&
                     received.error.length > 0
                   ));
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid bridge result`,
      pass: isValid
    };
  }
});

// Staking position validation
expect.extend({
  toHaveValidStakingPosition(received: any) {
    const isValid = received &&
                   typeof received.id === 'string' &&
                   typeof received.userId === 'string' &&
                   typeof received.amount === 'number' &&
                   typeof received.lockPeriod === 'number' &&
                   typeof received.aprRate === 'number' &&
                   received.startDate instanceof Date &&
                   received.endDate instanceof Date &&
                   typeof received.isAutoCompound === 'boolean' &&
                   ['active', 'completed', 'withdrawn'].includes(received.status) &&
                   received.amount > 0 &&
                   received.lockPeriod > 0 &&
                   received.aprRate > 0 &&
                   received.aprRate <= 1 && // APR as decimal
                   received.endDate > received.startDate;
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid staking position`,
      pass: isValid
    };
  }
});

// Slippage tolerance validation
expect.extend({
  toBeWithinSlippageTolerance(received: number, expectedPrice: number, tolerance: number) {
    const priceDifference = Math.abs(received - expectedPrice) / expectedPrice;
    const isWithinTolerance = priceDifference <= tolerance;
    
    return {
      message: () => `expected price ${received} to be within ${tolerance * 100}% of expected price ${expectedPrice} (actual difference: ${(priceDifference * 100).toFixed(2)}%)`,
      pass: isWithinTolerance
    };
  }
});

// Circuit breaker state validation
expect.extend({
  toHaveValidCircuitBreakerState(received: any) {
    const validStates = ['closed', 'open', 'half-open'];
    const isValid = received &&
                   typeof received.state === 'string' &&
                   validStates.includes(received.state) &&
                   typeof received.failureCount === 'number' &&
                   typeof received.lastFailureTime === 'object' &&
                   typeof received.nextAttemptTime === 'object' &&
                   received.failureCount >= 0;
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid circuit breaker state`,
      pass: isValid
    };
  }
});

// KYC status validation
expect.extend({
  toBeValidKYCStatus(received: any) {
    const validStatuses = ['pending', 'approved', 'rejected', 'expired'];
    const isValid = received &&
                   typeof received.status === 'string' &&
                   validStatuses.includes(received.status) &&
                   typeof received.userAddress === 'string' &&
                   ethers.utils.isAddress(received.userAddress) &&
                   received.submittedAt instanceof Date &&
                   (received.status !== 'pending' ? received.reviewedAt instanceof Date : true);
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid KYC status`,
      pass: isValid
    };
  }
});

// Audit trail validation
expect.extend({
  toHaveValidAuditTrail(received: any) {
    const isValid = received &&
                   typeof received.transactionId === 'string' &&
                   typeof received.action === 'string' &&
                   typeof received.userAddress === 'string' &&
                   ethers.utils.isAddress(received.userAddress) &&
                   received.timestamp instanceof Date &&
                   typeof received.details === 'object' &&
                   received.transactionId.length > 0 &&
                   received.action.length > 0;
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid audit trail entry`,
      pass: isValid
    };
  }
});

export {};