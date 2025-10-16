/**
 * Custom Jest Matchers for Web3 Integration Tests
 * Provides specialized matchers for blockchain and Web3 testing
 */

import { expect } from '@jest/globals';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEthereumAddress(): R;
      toBeValidTransactionHash(): R;
      toHaveValidTokenBalance(): R;
      toBeWithinGasLimit(limit: number): R;
      toHaveValidBlockNumber(): R;
      toBeValidProposal(): R;
      toHaveValidStakingInfo(): R;
      toBeWithinPerformanceThreshold(thresholdMs: number): R;
      toHaveValidWeb3Component(): R;
      toBeAccessibleWeb3Element(): R;
    }
  }
}

// Ethereum address validation
expect.extend({
  toBeValidEthereumAddress(received: string) {
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    const pass = ethereumAddressRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Ethereum address`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Ethereum address (0x followed by 40 hex characters)`,
        pass: false,
      };
    }
  },
});

// Transaction hash validation
expect.extend({
  toBeValidTransactionHash(received: string) {
    const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
    const pass = txHashRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid transaction hash`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid transaction hash (0x followed by 64 hex characters)`,
        pass: false,
      };
    }
  },
});

// Token balance validation
expect.extend({
  toHaveValidTokenBalance(received: any) {
    const isValidBalance = 
      received !== null &&
      received !== undefined &&
      (typeof received === 'string' || typeof received === 'number') &&
      !isNaN(Number(received)) &&
      Number(received) >= 0;
    
    if (isValidBalance) {
      return {
        message: () => `expected ${received} not to be a valid token balance`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid token balance (non-negative number)`,
        pass: false,
      };
    }
  },
});

// Gas limit validation
expect.extend({
  toBeWithinGasLimit(received: number, limit: number) {
    const pass = received > 0 && received <= limit;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be within gas limit of ${limit}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within gas limit of ${limit}`,
        pass: false,
      };
    }
  },
});

// Block number validation
expect.extend({
  toHaveValidBlockNumber(received: any) {
    const isValidBlockNumber = 
      received !== null &&
      received !== undefined &&
      (typeof received === 'string' || typeof received === 'number') &&
      !isNaN(Number(received)) &&
      Number(received) >= 0 &&
      Number.isInteger(Number(received));
    
    if (isValidBlockNumber) {
      return {
        message: () => `expected ${received} not to be a valid block number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid block number (non-negative integer)`,
        pass: false,
      };
    }
  },
});

// Governance proposal validation
expect.extend({
  toBeValidProposal(received: any) {
    const requiredFields = ['id', 'description', 'votesFor', 'votesAgainst', 'executed'];
    const hasRequiredFields = requiredFields.every(field => 
      received && typeof received === 'object' && field in received
    );
    
    const hasValidTypes = 
      hasRequiredFields &&
      (typeof received.id === 'string' || typeof received.id === 'number') &&
      typeof received.description === 'string' &&
      received.description.length > 0 &&
      !isNaN(Number(received.votesFor)) &&
      !isNaN(Number(received.votesAgainst)) &&
      typeof received.executed === 'boolean';
    
    if (hasValidTypes) {
      return {
        message: () => `expected proposal not to be valid`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected proposal to have valid structure with fields: ${requiredFields.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Staking info validation
expect.extend({
  toHaveValidStakingInfo(received: any) {
    const requiredFields = ['totalStaked', 'stakerCount', 'stakingTier'];
    const hasRequiredFields = requiredFields.every(field => 
      received && typeof received === 'object' && field in received
    );
    
    const validTiers = ['gold', 'silver', 'bronze', 'none'];
    const hasValidTypes = 
      hasRequiredFields &&
      !isNaN(Number(received.totalStaked)) &&
      Number(received.totalStaked) >= 0 &&
      !isNaN(Number(received.stakerCount)) &&
      Number(received.stakerCount) >= 0 &&
      Number.isInteger(Number(received.stakerCount)) &&
      validTiers.includes(received.stakingTier);
    
    if (hasValidTypes) {
      return {
        message: () => `expected staking info not to be valid`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected staking info to have valid structure with totalStaked (>=0), stakerCount (integer >=0), and stakingTier (${validTiers.join('|')})`,
        pass: false,
      };
    }
  },
});

// Performance threshold validation
expect.extend({
  toBeWithinPerformanceThreshold(received: number, thresholdMs: number) {
    const pass = received >= 0 && received <= thresholdMs;
    
    if (pass) {
      return {
        message: () => `expected ${received}ms not to be within performance threshold of ${thresholdMs}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received}ms to be within performance threshold of ${thresholdMs}ms`,
        pass: false,
      };
    }
  },
});

// Web3 component validation
expect.extend({
  toHaveValidWeb3Component(received: any) {
    // Check if it's a React component with Web3 props
    const isReactElement = received && typeof received === 'object' && received.type;
    const hasWeb3Props = received && received.props && (
      'walletAddress' in received.props ||
      'tokenBalance' in received.props ||
      'stakingInfo' in received.props ||
      'onChainProof' in received.props ||
      'web3Provider' in received.props
    );
    
    const pass = isReactElement && hasWeb3Props;
    
    if (pass) {
      return {
        message: () => `expected component not to be a valid Web3 component`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected component to be a valid Web3 component with Web3-related props`,
        pass: false,
      };
    }
  },
});

// Accessibility validation for Web3 elements
expect.extend({
  toBeAccessibleWeb3Element(received: HTMLElement) {
    const accessibilityChecks = [
      // Has proper ARIA labels
      () => {
        const hasAriaLabel = received.hasAttribute('aria-label') || 
                            received.hasAttribute('aria-labelledby') ||
                            received.textContent?.trim().length > 0;
        return { pass: hasAriaLabel, message: 'should have proper ARIA labeling' };
      },
      
      // Has proper role for interactive elements
      () => {
        const isInteractive = received.tagName === 'BUTTON' || 
                             received.hasAttribute('onclick') ||
                             received.hasAttribute('role');
        const hasProperRole = !isInteractive || 
                             received.hasAttribute('role') ||
                             ['BUTTON', 'A', 'INPUT'].includes(received.tagName);
        return { pass: hasProperRole, message: 'interactive elements should have proper roles' };
      },
      
      // Has keyboard navigation support
      () => {
        const isInteractive = received.tagName === 'BUTTON' || 
                             received.hasAttribute('onclick');
        const hasKeyboardSupport = !isInteractive || 
                                  received.hasAttribute('tabindex') ||
                                  ['BUTTON', 'A', 'INPUT'].includes(received.tagName);
        return { pass: hasKeyboardSupport, message: 'interactive elements should support keyboard navigation' };
      },
      
      // Has sufficient color contrast (simplified check)
      () => {
        const style = window.getComputedStyle(received);
        const hasVisibleText = received.textContent?.trim().length > 0;
        const hasColors = style.color && style.backgroundColor;
        // This is a simplified check - in real tests you'd use a proper contrast checker
        return { pass: !hasVisibleText || hasColors, message: 'should have sufficient color contrast' };
      },
    ];
    
    const failedChecks = accessibilityChecks
      .map(check => check())
      .filter(result => !result.pass);
    
    if (failedChecks.length === 0) {
      return {
        message: () => `expected element not to be accessible`,
        pass: true,
      };
    } else {
      const failureMessages = failedChecks.map(check => check.message).join(', ');
      return {
        message: () => `expected element to be accessible: ${failureMessages}`,
        pass: false,
      };
    }
  },
});

// Utility functions for test helpers
export const web3TestUtils = {
  // Generate mock Ethereum address
  generateMockAddress(): string {
    return '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  },
  
  // Generate mock transaction hash
  generateMockTxHash(): string {
    return '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  },
  
  // Generate mock token balance
  generateMockBalance(min = 0, max = 1000000): string {
    const balance = Math.floor(Math.random() * (max - min) + min);
    return balance.toString();
  },
  
  // Generate mock proposal
  generateMockProposal(id?: number): any {
    return {
      id: id || Math.floor(Math.random() * 1000),
      description: `Test proposal ${Math.random().toString(36).substring(7)}`,
      votesFor: this.generateMockBalance(0, 10000),
      votesAgainst: this.generateMockBalance(0, 5000),
      executed: Math.random() > 0.7,
    };
  },
  
  // Generate mock staking info
  generateMockStakingInfo(): any {
    const tiers = ['gold', 'silver', 'bronze', 'none'];
    return {
      totalStaked: parseInt(this.generateMockBalance(0, 100000)),
      stakerCount: Math.floor(Math.random() * 100),
      stakingTier: tiers[Math.floor(Math.random() * tiers.length)],
      userStake: parseInt(this.generateMockBalance(0, 1000)),
    };
  },
  
  // Wait for blockchain transaction
  async waitForTransaction(txHash: string, timeout = 30000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // In real tests, this would check the actual blockchain
      // For mocks, we'll simulate a successful transaction
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (Math.random() > 0.1) { // 90% success rate
        return {
          status: 1,
          blockNumber: Math.floor(Math.random() * 1000000),
          gasUsed: Math.floor(Math.random() * 100000) + 21000,
          transactionHash: txHash,
        };
      }
    }
    
    throw new Error(`Transaction ${txHash} timed out after ${timeout}ms`);
  },
  
  // Performance measurement helper
  measurePerformance<T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
    return new Promise(async (resolve) => {
      const startTime = performance.now();
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      resolve({ result, duration });
    });
  },
};