/**
 * Nonce Manager Service
 * Prevents replay attacks by tracking nonces
 */

import { Hash } from 'viem';

export interface NonceRecord {
  address: string;
  chainId: number;
  currentNonce: bigint;
  usedNonces: Set<bigint>;
  pendingNonces: Set<bigint>;
  lastUpdated: number;
}

/**
 * Nonce Manager Service
 */
export class NonceManager {
  private static instance: NonceManager;
  private nonceRecords: Map<string, NonceRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  static getInstance(): NonceManager {
    if (!NonceManager.instance) {
      NonceManager.instance = new NonceManager();
    }
    return NonceManager.instance;
  }

  /**
   * Get the next nonce for an address and chain ID
   */
  async getNonce(address: string, chainId: number): Promise<bigint> {
    const key = `${address.toLowerCase()}:${chainId}`;
    let record = this.nonceRecords.get(key);

    if (!record) {
      record = {
        address: address.toLowerCase(),
        chainId,
        currentNonce: 0n,
        usedNonces: new Set(),
        pendingNonces: new Set(),
        lastUpdated: Date.now()
      };
      this.nonceRecords.set(key, record);
    }

    // Find next available nonce
    let nextNonce = record.currentNonce;
    while (record.usedNonces.has(nextNonce) || record.pendingNonces.has(nextNonce)) {
      nextNonce++;
    }

    return nextNonce;
  }

  /**
   * Validate and consume a nonce
   */
  async validateAndConsumeNonce(
    address: string,
    chainId: number,
    nonce: bigint
  ): Promise<{ valid: boolean; error?: string }> {
    const key = `${address.toLowerCase()}:${chainId}`;
    const record = this.nonceRecords.get(key);

    if (!record) {
      // First transaction for this address/chain
      if (nonce === 0n) {
        this.nonceRecords.set(key, {
          address: address.toLowerCase(),
          chainId,
          currentNonce: 1n,
          usedNonces: new Set([0n]),
          pendingNonces: new Set(),
          lastUpdated: Date.now()
        });
        return { valid: true };
      }
      return { valid: true, error: 'Nonce is valid (first transaction)' };
    }

    // Check if nonce has already been used
    if (record.usedNonces.has(nonce)) {
      return { valid: false, error: 'Nonce has already been used' };
    }

    // Check if nonce is too low (below current nonce)
    if (nonce < record.currentNonce) {
      return { valid: false, error: 'Nonce is too low' };
    }

    // Check if nonce is too high (gap detected)
    if (nonce > record.currentNonce) {
      // Allow gap but mark intermediate nonces as pending
      for (let i = record.currentNonce; i < nonce; i++) {
        record.pendingNonces.add(i);
      }
    }

    // Mark nonce as used
    record.usedNonces.add(nonce);
    record.currentNonce = nonce + 1n;
    record.lastUpdated = Date.now();

    return { valid: true };
  }

  /**
   * Reserve a nonce for a pending transaction
   */
  async reserveNonce(
    address: string,
    chainId: number,
    nonce: bigint
  ): Promise<{ success: boolean; error?: string }> {
    const key = `${address.toLowerCase()}:${chainId}`;
    let record = this.nonceRecords.get(key);

    if (!record) {
      record = {
        address: address.toLowerCase(),
        chainId,
        currentNonce: 0n,
        usedNonces: new Set(),
        pendingNonces: new Set(),
        lastUpdated: Date.now()
      };
      this.nonceRecords.set(key, record);
    }

    // Check if nonce is already used
    if (record.usedNonces.has(nonce)) {
      return { success: false, error: 'Nonce has already been used' };
    }

    // Check if nonce is already pending
    if (record.pendingNonces.has(nonce)) {
      return { success: false, error: 'Nonce is already reserved' };
    }

    // Reserve nonce
    record.pendingNonces.add(nonce);
    record.lastUpdated = Date.now();

    return { success: true };
  }

  /**
   * Release a reserved nonce
   */
  async releaseNonce(
    address: string,
    chainId: number,
    nonce: bigint
  ): Promise<void> {
    const key = `${address.toLowerCase()}:${chainId}`;
    const record = this.nonceRecords.get(key);

    if (record) {
      record.pendingNonces.delete(nonce);
      record.lastUpdated = Date.now();
    }
  }

  /**
   * Confirm a nonce has been used in a confirmed transaction
   */
  async confirmNonce(
    address: string,
    chainId: number,
    nonce: bigint
  ): Promise<void> {
    const key = `${address.toLowerCase()}:${chainId}`;
    let record = this.nonceRecords.get(key);

    if (!record) {
      record = {
        address: address.toLowerCase(),
        chainId,
        currentNonce: 0n,
        usedNonces: new Set(),
        pendingNonces: new Set(),
        lastUpdated: Date.now()
      };
      this.nonceRecords.set(key, record);
    }

    // Mark nonce as used
    record.usedNonces.add(nonce);
    record.pendingNonces.delete(nonce);

    // Update current nonce if this is the highest
    if (nonce >= record.currentNonce) {
      record.currentNonce = nonce + 1n;
    }

    record.lastUpdated = Date.now();
  }

  /**
   * Get current nonce for an address and chain ID
   */
  getCurrentNonce(address: string, chainId: number): bigint {
    const key = `${address.toLowerCase()}:${chainId}`;
    const record = this.nonceRecords.get(key);
    return record ? record.currentNonce : 0n;
  }

  /**
   * Get pending nonces for an address and chain ID
   */
  getPendingNonces(address: string, chainId: number): bigint[] {
    const key = `${address.toLowerCase()}:${chainId}`;
    const record = this.nonceRecords.get(key);
    return record ? Array.from(record.pendingNonces) : [];
  }

  /**
   * Get used nonces for an address and chain ID
   */
  getUsedNonces(address: string, chainId: number): bigint[] {
    const key = `${address.toLowerCase()}:${chainId}`;
    const record = this.nonceRecords.get(key);
    return record ? Array.from(record.usedNonces) : [];
  }

  /**
   * Reset nonce for an address and chain ID
   */
  async resetNonce(address: string, chainId: number): Promise<void> {
    const key = `${address.toLowerCase()}:${chainId}`;
    this.nonceRecords.delete(key);
  }

  /**
   * Reset all nonces for an address
   */
  async resetAllNonces(address: string): Promise<void> {
    const keysToDelete: string[] = [];
    this.nonceRecords.forEach((record, key) => {
      if (record.address === address.toLowerCase()) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.nonceRecords.delete(key));
  }

  /**
   * Sync nonce with blockchain state
   */
  async syncNonce(
    address: string,
    chainId: number,
    blockchainNonce: bigint
  ): Promise<void> {
    const key = `${address.toLowerCase()}:${chainId}`;
    let record = this.nonceRecords.get(key);

    if (!record) {
      record = {
        address: address.toLowerCase(),
        chainId,
        currentNonce: blockchainNonce,
        usedNonces: new Set(),
        pendingNonces: new Set(),
        lastUpdated: Date.now()
      };
      this.nonceRecords.set(key, record);
      return;
    }

    // Update current nonce if blockchain nonce is higher
    if (blockchainNonce > record.currentNonce) {
      // Remove used nonces that are below blockchain nonce
      for (let i = 0n; i < blockchainNonce; i++) {
        record.usedNonces.delete(i);
        record.pendingNonces.delete(i);
      }
      record.currentNonce = blockchainNonce;
      record.lastUpdated = Date.now();
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRecords: number;
    totalUsedNonces: number;
    totalPendingNonces: number;
    recordsByChain: Record<number, number>;
  } {
    const recordsByChain: Record<number, number> = {};
    let totalUsedNonces = 0;
    let totalPendingNonces = 0;

    this.nonceRecords.forEach(record => {
      recordsByChain[record.chainId] = (recordsByChain[record.chainId] || 0) + 1;
      totalUsedNonces += record.usedNonces.size;
      totalPendingNonces += record.pendingNonces.size;
    });

    return {
      totalRecords: this.nonceRecords.size,
      totalUsedNonces,
      totalPendingNonces,
      recordsByChain
    };
  }

  /**
   * Clear all nonce records
   */
  clear(): void {
    this.nonceRecords.clear();
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  /**
   * Clean up old nonce records
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    this.nonceRecords.forEach((record, key) => {
      if (now - record.lastUpdated > maxAge) {
        this.nonceRecords.delete(key);
      }
    });
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const nonceManager = NonceManager.getInstance();