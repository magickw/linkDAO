/**
 * WalletConnect Security Integration
 * Provides secure WalletConnect connection and transaction handling
 */

import { Hash, TransactionRequest } from 'viem';
import { detectPhishing } from '@/security/phishingDetector';
import { validateTransaction, validateGasParameters } from '@/security/enhancedTransactionValidator';
import { simulateTransaction } from '@/services/transactionSimulator';
import { validateChainIdMatch } from '@/utils/chainValidation';
import { nonceManager } from '@/services/nonceManager';
import { auditLogger } from '@/services/auditLogger';

export interface WalletConnectSession {
  topic: string;
  peer: {
    metadata: {
      name: string;
      description: string;
      url: string;
      icons: string[];
    };
  };
  accounts: string[];
  chainId: number;
  approved: boolean;
}

export interface WalletConnectTransactionRequest extends TransactionRequest {
  from: string;
  chainId: number;
}

export interface WalletConnectSecurityResult {
  success: boolean;
  approved: boolean;
  error?: string;
  warnings?: string[];
  transactionHash?: Hash;
}

export class WalletConnectSecurityService {
  private static instance: WalletConnectSecurityService;
  private sessions: Map<string, WalletConnectSession> = new Map();
  private pendingApprovals: Map<string, { request: any; timestamp: number }> = new Map();
  private approvalTimeout: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  static getInstance(): WalletConnectSecurityService {
    if (!WalletConnectSecurityService.instance) {
      WalletConnectSecurityService.instance = new WalletConnectSecurityService();
    }
    return WalletConnectSecurityService.instance;
  }

  /**
   * Validate WalletConnect session
   */
  validateSession(session: WalletConnectSession): { valid: boolean; error?: string } {
    // Check if session is approved
    if (!session.approved) {
      return { valid: false, error: 'Session is not approved' };
    }

    // Check if session has required fields
    if (!session.topic || !session.peer || !session.accounts || !session.chainId) {
      return { valid: false, error: 'Invalid session format' };
    }

    // Check if peer metadata is present
    if (!session.peer.metadata || !session.peer.metadata.name || !session.peer.metadata.url) {
      return { valid: false, error: 'Invalid peer metadata' };
    }

    // Validate chain ID
    const chainValidation = validateChainId(session.chainId);
    if (!chainValidation.valid) {
      return { valid: false, error: chainValidation.error || 'Invalid chain ID' };
    }

    // Validate accounts
    if (!Array.isArray(session.accounts) || session.accounts.length === 0) {
      return { valid: false, error: 'No accounts in session' };
    }

    for (const account of session.accounts) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(account)) {
        return { valid: false, error: `Invalid account address: ${account}` };
      }
    }

    // Check for suspicious peer URLs
    const suspiciousUrls = [
      'phishing',
      'scam',
      'fake',
      'steal',
      'hack',
      'malicious'
    ];

    const peerUrl = session.peer.metadata.url.toLowerCase();
    for (const suspicious of suspiciousUrls) {
      if (peerUrl.includes(suspicious)) {
        return { valid: false, error: 'Suspicious peer URL detected' };
      }
    }

    return { valid: true };
  }

  /**
   * Register session
   */
  registerSession(session: WalletConnectSession): { success: boolean; error?: string } {
    const validation = this.validateSession(session);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    this.sessions.set(session.topic, session);

    // Log session registration
    auditLogger.log({
      type: 'walletconnect_session_registered',
      userId: session.accounts[0],
      walletAddress: session.accounts[0],
      details: {
        peerName: session.peer.metadata.name,
        peerUrl: session.peer.metadata.url,
        chainId: session.chainId
      },
      category: 'authentication',
      severity: 'info'
    });

    return { success: true };
  }

  /**
   * Get session by topic
   */
  getSession(topic: string): WalletConnectSession | undefined {
    return this.sessions.get(topic);
  }

  /**
   * Remove session
   */
  removeSession(topic: string): void {
    const session = this.sessions.get(topic);
    if (session) {
      auditLogger.log({
        type: 'walletconnect_session_removed',
        userId: session.accounts[0],
        walletAddress: session.accounts[0],
        details: {
          peerName: session.peer.metadata.name,
          topic
        },
        category: 'authentication',
        severity: 'info'
      });
    }
    this.sessions.delete(topic);
  }

  /**
   * Validate and approve transaction request
   */
  async validateAndApproveTransaction(
    topic: string,
    request: WalletConnectTransactionRequest,
    publicClient: any
  ): Promise<WalletConnectSecurityResult> {
    const warnings: string[] = [];

    try {
      // 1. Validate session
      const session = this.sessions.get(topic);
      if (!session) {
        return {
          success: false,
          approved: false,
          error: 'Session not found'
        };
      }

      // 2. Validate sender account
      if (!session.accounts.includes(request.from.toLowerCase())) {
        return {
          success: false,
          approved: false,
          error: 'Sender account not in session'
        };
      }

      // 3. Validate chain ID
      const chainValidation = validateChainIdMatch(request.chainId, session.chainId);
      if (!chainValidation.valid) {
        return {
          success: false,
          approved: false,
          error: chainValidation.error || 'Chain ID mismatch'
        };
      }

      // 4. Phishing detection
      const phishingCheck = detectPhishing(request.to || '0x0', request.value, request.data);
      if (phishingCheck.isSuspicious) {
        warnings.push(...phishingCheck.warnings);
        
        if (phishingCheck.riskLevel === 'high') {
          return {
            success: false,
            approved: false,
            error: `Transaction blocked: High security risk detected. ${phishingCheck.warnings.join('. ')}`,
            warnings: phishingCheck.warnings
          };
        }
        
        if (phishingCheck.riskLevel === 'medium') {
          return {
            success: false,
            approved: false,
            error: `Transaction blocked: Medium security risk detected. ${phishingCheck.warnings.join('. ')}`,
            warnings: phishingCheck.warnings
          };
        }
      }

      // 5. Transaction validation
      const txValidation = await validateTransaction({
        to: request.to || '0x0',
        value: request.value || 0n,
        data: request.data || '0x',
        chainId: request.chainId
      });

      if (!txValidation.valid) {
        return {
          success: false,
          approved: false,
          error: txValidation.errors.join(', '),
          warnings: txValidation.warnings
        };
      }

      warnings.push(...txValidation.warnings);

      // 6. Gas parameter validation
      const gasValidation = validateGasParameters({
        gasLimit: request.gasLimit,
        gasPrice: request.gasPrice,
        maxFeePerGas: request.maxFeePerGas,
        maxPriorityFeePerGas: request.maxPriorityFeePerGas
      });

      if (!gasValidation.valid) {
        return {
          success: false,
          approved: false,
          error: gasValidation.errors.join(', '),
          warnings: gasValidation.warnings
        };
      }

      warnings.push(...gasValidation.warnings);

      // 7. Nonce management
      const nonce = await nonceManager.getNonce(request.from, request.chainId);
      const nonceValidation = await nonceManager.validateAndConsumeNonce(request.from, request.chainId, nonce);
      if (!nonceValidation.valid) {
        return {
          success: false,
          approved: false,
          error: nonceValidation.error || 'Nonce validation failed',
          warnings
        };
      }

      // 8. Transaction simulation
      const simulationResult = await simulateTransaction(
        publicClient,
        request.to || '0x0',
        request.data || '0x',
        request.value || 0n,
        {
          gasPrice: request.gasPrice,
          maxFeePerGas: request.maxFeePerGas,
          maxPriorityFeePerGas: request.maxPriorityFeePerGas
        }
      );

      if (!simulationResult.success) {
        // Release nonce if simulation failed
        await nonceManager.releaseNonce(request.from, request.chainId, nonce);
        
        return {
          success: false,
          approved: false,
          error: `Transaction simulation failed: ${simulationResult.revertReason || 'Unknown error'}`,
          warnings: [
            ...warnings,
            `Simulation failed: ${simulationResult.revertReason || 'Unknown error'}`
          ]
        };
      }

      // Add simulation warnings
      if (simulationResult.warnings.length > 0) {
        warnings.push(...simulationResult.warnings);
      }

      // Check for high gas costs
      if (simulationResult.estimatedCost.wei > 1000000000000000000n) {
        warnings.push(`High gas cost: ${simulationResult.estimatedCost.eth} ETH`);
      }

      // 9. Log transaction approval
      auditLogger.log({
        type: 'walletconnect_transaction_approved',
        userId: request.from,
        walletAddress: request.from,
        details: {
          to: request.to,
          value: request.value?.toString(),
          chainId: request.chainId,
          peerName: session.peer.metadata.name
        },
        category: 'transaction',
        severity: 'info'
      });

      return {
        success: true,
        approved: true,
        warnings
      };
    } catch (error: any) {
      return {
        success: false,
        approved: false,
        error: error.message || 'Transaction validation failed',
        warnings
      };
    }
  }

  /**
   * Reject transaction request
   */
  rejectTransaction(topic: string, request: WalletConnectTransactionRequest, reason: string): void {
    const session = this.sessions.get(topic);
    if (session) {
      auditLogger.log({
        type: 'walletconnect_transaction_rejected',
        userId: request.from,
        walletAddress: request.from,
        details: {
          to: request.to,
          value: request.value?.toString(),
          chainId: request.chainId,
          reason,
          peerName: session.peer.metadata.name
        },
        category: 'transaction',
        severity: 'warning'
      });
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): WalletConnectSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Disconnect all sessions
   */
  disconnectAll(): void {
    this.sessions.forEach((session, topic) => {
      this.removeSession(topic);
    });
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Cleanup every minute
  }

  /**
   * Clean up expired pending approvals
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredApprovals: string[] = [];

    this.pendingApprovals.forEach((approval, key) => {
      if (now - approval.timestamp > this.approvalTimeout) {
        expiredApprovals.push(key);
      }
    });

    expiredApprovals.forEach(key => {
      this.pendingApprovals.delete(key);
    });
  }

  /**
   * Get security stats
   */
  getStats(): {
    activeSessions: number;
    pendingApprovals: number;
    sessionsByChain: Record<number, number>;
  } {
    const sessionsByChain: Record<number, number> = {};
    
    this.sessions.forEach(session => {
      sessionsByChain[session.chainId] = (sessionsByChain[session.chainId] || 0) + 1;
    });

    return {
      activeSessions: this.sessions.size,
      pendingApprovals: this.pendingApprovals.size,
      sessionsByChain
    };
  }
}

export const walletConnectSecurityService = WalletConnectSecurityService.getInstance();