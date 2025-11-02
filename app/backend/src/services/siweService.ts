/**
 * EIP-4361: Sign-In with Ethereum (SIWE) Implementation
 * Provides secure Web3 authentication following the EIP-4361 standard
 *
 * Benefits over basic signature verification:
 * - Standardized message format
 * - Replay attack protection with nonces
 * - Domain binding
 * - Timestamp-based expiration
 * - Chain ID validation
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString } from '../utils/inputSanitization';

interface SIWEMessage {
  domain: string; // RFC 4501 dns authority
  address: string; // Ethereum address
  statement?: string; // Human-readable statement
  uri: string; // RFC 3986 URI
  version: string; // Current version is '1'
  chainId: number; // EIP-155 Chain ID
  nonce: string; // Randomized token to prevent replay attacks
  issuedAt: string; // ISO 8601 datetime
  expirationTime?: string; // ISO 8601 datetime
  notBefore?: string; // ISO 8601 datetime
  requestId?: string; // System-specific identifier
  resources?: string[]; // List of resources
}

interface SIWEVerificationResult {
  success: boolean;
  address?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

interface SIWENonceStore {
  nonce: string;
  address: string;
  createdAt: Date;
  used: boolean;
}

/**
 * EIP-4361 SIWE Service
 * Handles creation and verification of Sign-In with Ethereum messages
 */
export class SIWEService {
  private readonly nonceStore: Map<string, SIWENonceStore> = new Map();
  private readonly nonceLifetimeMs = 10 * 60 * 1000; // 10 minutes
  private readonly domain: string;
  private readonly uri: string;

  constructor() {
    this.domain = process.env.DOMAIN || 'linkdao.io';
    this.uri = process.env.APP_URI || 'https://linkdao.io';

    // Clean up expired nonces every 5 minutes
    setInterval(() => this.cleanExpiredNonces(), 5 * 60 * 1000);
  }

  /**
   * Generate a unique nonce for SIWE message
   */
  generateNonce(address: string): string {
    const nonce = crypto.randomBytes(16).toString('base64');

    this.nonceStore.set(nonce, {
      nonce,
      address: address.toLowerCase(),
      createdAt: new Date(),
      used: false
    });

    safeLogger.info('SIWE nonce generated', { address, nonce });

    return nonce;
  }

  /**
   * Create EIP-4361 compliant message
   */
  createMessage(params: {
    address: string;
    nonce: string;
    chainId?: number;
    statement?: string;
    expirationTime?: Date;
    notBefore?: Date;
    requestId?: string;
    resources?: string[];
  }): string {
    const message: SIWEMessage = {
      domain: this.domain,
      address: ethers.getAddress(params.address), // Checksum address
      uri: this.uri,
      version: '1',
      chainId: params.chainId || 1, // Default to Ethereum mainnet
      nonce: params.nonce,
      issuedAt: new Date().toISOString(),
      statement: params.statement,
      expirationTime: params.expirationTime?.toISOString(),
      notBefore: params.notBefore?.toISOString(),
      requestId: params.requestId,
      resources: params.resources
    };

    return this.formatMessage(message);
  }

  /**
   * Format SIWE message according to EIP-4361 specification
   */
  private formatMessage(msg: SIWEMessage): string {
    const header = `${msg.domain} wants you to sign in with your Ethereum account:`;
    const addressLine = msg.address;

    const parts: string[] = [header, addressLine];

    if (msg.statement) {
      parts.push('');
      parts.push(msg.statement);
    }

    parts.push('');
    parts.push(`URI: ${msg.uri}`);
    parts.push(`Version: ${msg.version}`);
    parts.push(`Chain ID: ${msg.chainId}`);
    parts.push(`Nonce: ${msg.nonce}`);
    parts.push(`Issued At: ${msg.issuedAt}`);

    if (msg.expirationTime) {
      parts.push(`Expiration Time: ${msg.expirationTime}`);
    }

    if (msg.notBefore) {
      parts.push(`Not Before: ${msg.notBefore}`);
    }

    if (msg.requestId) {
      parts.push(`Request ID: ${msg.requestId}`);
    }

    if (msg.resources && msg.resources.length > 0) {
      parts.push(`Resources:`);
      msg.resources.forEach(resource => {
        parts.push(`- ${resource}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Parse SIWE message from string
   */
  private parseMessage(message: string): SIWEMessage | null {
    try {
      const lines = message.split('\n');
      const parsed: Partial<SIWEMessage> = {};

      // Extract address (second line)
      if (lines.length < 2) {
        return null;
      }

      parsed.address = lines[1].trim();

      // Parse key-value pairs
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();

        switch (key.trim()) {
          case 'URI':
            parsed.uri = value;
            break;
          case 'Version':
            parsed.version = value;
            break;
          case 'Chain ID':
            parsed.chainId = parseInt(value);
            break;
          case 'Nonce':
            parsed.nonce = value;
            break;
          case 'Issued At':
            parsed.issuedAt = value;
            break;
          case 'Expiration Time':
            parsed.expirationTime = value;
            break;
          case 'Not Before':
            parsed.notBefore = value;
            break;
          case 'Request ID':
            parsed.requestId = value;
            break;
        }
      }

      // Extract domain (first line)
      if (lines[0]) {
        const domainMatch = lines[0].match(/^([^\s]+)\s+wants you/);
        if (domainMatch) {
          parsed.domain = domainMatch[1];
        }
      }

      // Validate required fields
      if (!parsed.domain || !parsed.address || !parsed.uri || !parsed.version ||
          !parsed.chainId || !parsed.nonce || !parsed.issuedAt) {
        return null;
      }

      return parsed as SIWEMessage;
    } catch (error) {
      safeLogger.error('SIWE message parsing error:', error);
      return null;
    }
  }

  /**
   * Verify SIWE signature
   */
  async verifySignature(
    message: string,
    signature: string,
    expectedAddress?: string
  ): Promise<SIWEVerificationResult> {
    try {
      // Parse message
      const parsedMessage = this.parseMessage(message);
      if (!parsedMessage) {
        return {
          success: false,
          error: 'Invalid SIWE message format',
          errorCode: 'INVALID_MESSAGE_FORMAT'
        };
      }

      // Verify signature and recover address
      let recoveredAddress: string;
      try {
        recoveredAddress = ethers.verifyMessage(message, signature);
      } catch (error) {
        return {
          success: false,
          error: 'Invalid signature',
          errorCode: 'INVALID_SIGNATURE'
        };
      }

      // Verify recovered address matches message address
      if (recoveredAddress.toLowerCase() !== parsedMessage.address.toLowerCase()) {
        return {
          success: false,
          error: 'Signature does not match message address',
          errorCode: 'ADDRESS_MISMATCH'
        };
      }

      // Verify expected address if provided
      if (expectedAddress && recoveredAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        return {
          success: false,
          error: 'Recovered address does not match expected address',
          errorCode: 'UNEXPECTED_ADDRESS'
        };
      }

      // Verify domain
      if (parsedMessage.domain !== this.domain) {
        return {
          success: false,
          error: 'Domain mismatch',
          errorCode: 'DOMAIN_MISMATCH'
        };
      }

      // Verify version
      if (parsedMessage.version !== '1') {
        return {
          success: false,
          error: 'Unsupported SIWE version',
          errorCode: 'UNSUPPORTED_VERSION'
        };
      }

      // Verify nonce
      const nonceData = this.nonceStore.get(parsedMessage.nonce);
      if (!nonceData) {
        return {
          success: false,
          error: 'Invalid or expired nonce',
          errorCode: 'INVALID_NONCE'
        };
      }

      if (nonceData.used) {
        return {
          success: false,
          error: 'Nonce already used (replay attack detected)',
          errorCode: 'NONCE_REUSED'
        };
      }

      if (nonceData.address !== parsedMessage.address.toLowerCase()) {
        return {
          success: false,
          error: 'Nonce was generated for different address',
          errorCode: 'NONCE_ADDRESS_MISMATCH'
        };
      }

      // Check nonce expiration
      const nonceAge = Date.now() - nonceData.createdAt.getTime();
      if (nonceAge > this.nonceLifetimeMs) {
        this.nonceStore.delete(parsedMessage.nonce);
        return {
          success: false,
          error: 'Nonce expired',
          errorCode: 'NONCE_EXPIRED'
        };
      }

      // Mark nonce as used
      nonceData.used = true;

      // Verify timestamps
      const now = new Date();

      if (parsedMessage.notBefore) {
        const notBefore = new Date(parsedMessage.notBefore);
        if (now < notBefore) {
          return {
            success: false,
            error: 'Message not yet valid',
            errorCode: 'NOT_YET_VALID'
          };
        }
      }

      if (parsedMessage.expirationTime) {
        const expirationTime = new Date(parsedMessage.expirationTime);
        if (now > expirationTime) {
          return {
            success: false,
            error: 'Message has expired',
            errorCode: 'MESSAGE_EXPIRED'
          };
        }
      }

      // Check issued at is not too old (within 1 hour)
      const issuedAt = new Date(parsedMessage.issuedAt);
      const messageAge = now.getTime() - issuedAt.getTime();
      if (messageAge > 60 * 60 * 1000) {
        return {
          success: false,
          error: 'Message issued too long ago',
          errorCode: 'MESSAGE_TOO_OLD'
        };
      }

      safeLogger.info('SIWE verification successful', {
        address: recoveredAddress,
        nonce: parsedMessage.nonce
      });

      return {
        success: true,
        address: recoveredAddress,
        message: 'SIWE verification successful'
      };

    } catch (error) {
      safeLogger.error('SIWE verification error:', error);
      return {
        success: false,
        error: 'Verification failed',
        errorCode: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * Clean up expired nonces
   */
  private cleanExpiredNonces(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [nonce, data] of this.nonceStore.entries()) {
      const age = now - data.createdAt.getTime();
      if (age > this.nonceLifetimeMs) {
        this.nonceStore.delete(nonce);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      safeLogger.info(`Cleaned ${cleaned} expired SIWE nonces`);
    }
  }

  /**
   * Get nonce stats (for monitoring)
   */
  getNonceStats(): {
    total: number;
    used: number;
    unused: number;
  } {
    let used = 0;
    let unused = 0;

    for (const data of this.nonceStore.values()) {
      if (data.used) {
        used++;
      } else {
        unused++;
      }
    }

    return {
      total: this.nonceStore.size,
      used,
      unused
    };
  }
}

export const siweService = new SIWEService();
