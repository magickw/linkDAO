/**
 * On-chain verification service for Web3 integration
 */

import { 
  OnChainProof, 
  VerificationRequest, 
  VerificationResponse, 
  OnChainAchievement,
  OnChainProfile,
  BlockchainExplorerConfig 
} from '../../types/onChainVerification';
import { web3ErrorHandler } from '../../utils/web3ErrorHandling';

export class OnChainVerificationService {
  private static instance: OnChainVerificationService;
  private verificationCache: Map<string, OnChainProof> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes

  private explorerConfigs: Record<number, BlockchainExplorerConfig> = {
    1: { // Ethereum Mainnet
      name: 'Etherscan',
      baseUrl: 'https://etherscan.io',
      transactionPath: '/tx/',
      addressPath: '/address/',
      blockPath: '/block/',
      contractPath: '/address/',
      supported: true
    },
    11155111: { // Sepolia Testnet
      name: 'Sepolia Etherscan',
      baseUrl: 'https://sepolia.etherscan.io',
      transactionPath: '/tx/',
      addressPath: '/address/',
      blockPath: '/block/',
      contractPath: '/address/',
      supported: true
    }
  };

  static getInstance(): OnChainVerificationService {
    if (!OnChainVerificationService.instance) {
      OnChainVerificationService.instance = new OnChainVerificationService();
    }
    return OnChainVerificationService.instance;
  }

  async verifyTransaction(request: VerificationRequest): Promise<VerificationResponse> {
    try {
      // Check cache first
      const cached = this.verificationCache.get(request.transactionHash);
      if (cached && cached.verified) {
        return {
          success: true,
          proof: cached
        };
      }

      // This would verify the transaction on-chain
      const proof = await this.fetchTransactionProof(request);
      
      if (proof) {
        this.verificationCache.set(request.transactionHash, proof);
        return {
          success: true,
          proof
        };
      }

      return {
        success: false,
        error: 'Transaction not found or not yet confirmed'
      };
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'verifyTransaction',
        component: 'OnChainVerificationService'
      });

      return {
        success: false,
        error: errorResponse.message
      };
    }
  }

  private async fetchTransactionProof(request: VerificationRequest): Promise<OnChainProof | null> {
    try {
      // This would fetch transaction details from blockchain RPC
      // For now, return mock structure
      return {
        id: `proof_${request.transactionHash}`,
        transactionHash: request.transactionHash,
        blockNumber: 0,
        contractAddress: '',
        verified: false,
        proofType: request.expectedProofType,
        status: 'pending',
        verificationSource: 'blockchain-rpc',
        confirmations: 0,
        requiredConfirmations: 12,
        timestamp: new Date(),
        fromAddress: '',
        description: request.description
      };
    } catch (error) {
      console.error('Failed to fetch transaction proof:', error);
      return null;
    }
  }

  async getOnChainProfile(address: string): Promise<OnChainProfile | null> {
    try {
      // This would aggregate on-chain data for the address
      return {
        address,
        achievements: await this.getUserAchievements(address),
        nftCollections: await this.getUserNFTs(address),
        totalTransactions: 0,
        totalValue: 0,
        firstTransaction: new Date(),
        lastTransaction: new Date(),
        onChainReputation: 0,
        verificationLevel: 'unverified',
        trustScore: 0
      };
    } catch (error) {
      web3ErrorHandler.handleError(error as Error, {
        action: 'getOnChainProfile',
        component: 'OnChainVerificationService'
      });
      return null;
    }
  }

  private async getUserAchievements(address: string): Promise<OnChainAchievement[]> {
    // This would check various on-chain criteria for achievements
    return [];
  }

  private async getUserNFTs(address: string) {
    // This would fetch NFTs owned by the address
    return [];
  }

  getExplorerUrl(chainId: number, type: 'transaction' | 'address' | 'block' | 'contract', identifier: string): string | null {
    const config = this.explorerConfigs[chainId];
    if (!config || !config.supported) {
      return null;
    }

    const pathMap = {
      transaction: config.transactionPath,
      address: config.addressPath,
      block: config.blockPath,
      contract: config.contractPath
    };

    return `${config.baseUrl}${pathMap[type]}${identifier}`;
  }

  async waitForConfirmations(transactionHash: string, requiredConfirmations: number = 12): Promise<OnChainProof | null> {
    try {
      return await web3ErrorHandler.withRetry(async () => {
        const proof = await this.fetchTransactionProof({
          transactionHash,
          expectedProofType: 'custom'
        });

        if (!proof || proof.confirmations < requiredConfirmations) {
          throw new Error('Insufficient confirmations');
        }

        return proof;
      }, {
        action: 'waitForConfirmations',
        component: 'OnChainVerificationService'
      }, {
        maxAttempts: 10,
        baseDelay: 5000,
        retryableErrors: ['TIMEOUT_ERROR', 'RPC_ERROR']
      });
    } catch (error) {
      console.error('Failed to wait for confirmations:', error);
      return null;
    }
  }

  async batchVerifyTransactions(transactionHashes: string[]): Promise<Map<string, OnChainProof | null>> {
    const results = new Map<string, OnChainProof | null>();

    // Process in batches to avoid overwhelming the RPC
    const batchSize = 10;
    for (let i = 0; i < transactionHashes.length; i += batchSize) {
      const batch = transactionHashes.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (hash) => {
        const response = await this.verifyTransaction({
          transactionHash: hash,
          expectedProofType: 'custom'
        });
        return { hash, proof: response.proof || null };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ hash, proof }) => {
        results.set(hash, proof);
      });
    }

    return results;
  }

  clearCache(): void {
    this.verificationCache.clear();
  }

  addExplorerConfig(chainId: number, config: BlockchainExplorerConfig): void {
    this.explorerConfigs[chainId] = config;
  }
}

export const onChainVerificationService = OnChainVerificationService.getInstance();