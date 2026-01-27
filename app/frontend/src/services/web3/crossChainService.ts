import { ethers } from 'ethers';
import { safeLogger } from '../../utils/safeLogger';

// Chain configurations
export const CHAIN_CONFIGS = {
  ETHEREUM: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  POLYGON: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    }
  },
  ARBITRUM: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  BASE: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  }
};

// Bridge contract addresses (to be deployed)
export const BRIDGE_ADDRESSES = {
  ETHEREUM: process.env.NEXT_PUBLIC_LDAO_BRIDGE_ETHEREUM || '',
  POLYGON: process.env.NEXT_PUBLIC_LDAO_BRIDGE_POLYGON || '',
  ARBITRUM: process.env.NEXT_PUBLIC_LDAO_BRIDGE_ARBITRUM || '',
  BASE: process.env.NEXT_PUBLIC_LDAO_BRIDGE_BASE || ''
};

// LDAO Token addresses
export const LDAO_TOKEN_ADDRESSES = {
  ETHEREUM: process.env.NEXT_PUBLIC_LDAO_TOKEN_ETHEREUM || '',
  POLYGON: process.env.NEXT_PUBLIC_LDAO_TOKEN_POLYGON || '',
  ARBITRUM: process.env.NEXT_PUBLIC_LDAO_TOKEN_ARBITRUM || '',
  BASE: process.env.NEXT_PUBLIC_LDAO_TOKEN_BASE || ''
};

interface BridgeRequest {
  amount: string;
  sourceChain: keyof typeof CHAIN_CONFIGS;
  destinationChain: keyof typeof CHAIN_CONFIGS;
  recipient: string;
}

interface BridgeStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sourceChain: string;
  destinationChain: string;
  amount: string;
  txHash?: string;
  bridgeTxHash?: string;
  timestamp: number;
  estimatedTime?: number;
}

/**
 * Cross-Chain Bridge Service
 * Handles cross-chain token transfers using LDAO Bridge
 */
export class CrossChainService {
  private static instance: CrossChainService;
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private bridgeContracts: Map<number, ethers.Contract> = new Map();
  private tokenContracts: Map<number, ethers.Contract> = new Map();

  private constructor() {
    this.initializeProviders();
    this.initializeContracts();
  }

  public static getInstance(): CrossChainService {
    if (!CrossChainService.instance) {
      CrossChainService.instance = new CrossChainService();
    }
    return CrossChainService.instance;
  }

  private initializeProviders(): void {
    Object.entries(CHAIN_CONFIGS).forEach(([key, config]) => {
      this.providers.set(config.chainId, new ethers.JsonRpcProvider(config.rpcUrl));
    });
  }

  private initializeContracts(): void {
    // LDAO Bridge ABI (simplified)
    const bridgeAbi = [
      'function initiateBridge(uint256 amount, uint8 destinationChain) external payable returns (uint256)',
      'function completeBridge(uint256 nonce, bytes32[] calldata signatures) external',
      'function getBridgeTransaction(uint256 nonce) external view returns (tuple(address user, uint256 amount, uint8 sourceChain, uint8 destinationChain, uint256 nonce, uint256 timestamp, uint8 status, bytes32 txHash, uint256 fee))',
      'function bridgeFee() external view returns (uint256)',
      'function validatorThreshold() external view returns (uint256)'
    ];

    // LDAO Token ABI (simplified)
    const tokenAbi = [
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)',
      'function balanceOf(address account) external view returns (uint256)',
      'function transfer(address recipient, uint256 amount) external returns (bool)',
      'function decimals() external view returns (uint8)'
    ];

    // Initialize bridge contracts
    Object.entries(BRIDGE_ADDRESSES).forEach(([key, address]) => {
      if (address) {
        const chainId = CHAIN_CONFIGS[key as keyof typeof CHAIN_CONFIGS].chainId;
        const provider = this.providers.get(chainId);
        if (provider) {
          this.bridgeContracts.set(chainId, new ethers.Contract(address, bridgeAbi, provider));
        }
      }
    });

    // Initialize token contracts
    Object.entries(LDAO_TOKEN_ADDRESSES).forEach(([key, address]) => {
      if (address) {
        const chainId = CHAIN_CONFIGS[key as keyof typeof CHAIN_CONFIGS].chainId;
        const provider = this.providers.get(chainId);
        if (provider) {
          this.tokenContracts.set(chainId, new ethers.Contract(address, tokenAbi, provider));
        }
      }
    });
  }

  /**
   * Get provider for specific chain
   */
  public getProvider(chainId: number): ethers.JsonRpcProvider | undefined {
    return this.providers.get(chainId);
  }

  /**
   * Get bridge contract for specific chain
   */
  public getBridgeContract(chainId: number): ethers.Contract | undefined {
    return this.bridgeContracts.get(chainId);
  }

  /**
   * Get token contract for specific chain
   */
  public getTokenContract(chainId: number): ethers.Contract | undefined {
    return this.tokenContracts.get(chainId);
  }

  /**
   * Check if bridge is available for chain
   */
  public isBridgeAvailable(chainId: number): boolean {
    return this.bridgeContracts.has(chainId);
  }

  /**
   * Calculate bridge fee
   */
  public async calculateBridgeFee(
    sourceChain: keyof typeof CHAIN_CONFIGS,
    destinationChain: keyof typeof CHAIN_CONFIGS,
    amount: string
  ): Promise<{ fee: string; totalAmount: string; estimatedGas: string }> {
    try {
      const sourceChainId = CHAIN_CONFIGS[sourceChain].chainId;
      const bridgeContract = this.bridgeContracts.get(sourceChainId);

      if (!bridgeContract) {
        throw new Error(`Bridge not available for ${sourceChain}`);
      }

      const bridgeFee = await bridgeContract.bridgeFee();
      const feeAmount = ethers.formatEther(bridgeFee);

      // Estimate gas for bridge transaction
      const estimatedGas = await bridgeContract.initiateBridge.estimateGas(
        amount,
        CHAIN_CONFIGS[destinationChain].chainId,
        { value: amount }
      );

      const totalAmount = (parseFloat(amount) + parseFloat(feeAmount)).toString();

      return {
        fee: feeAmount,
        totalAmount,
        estimatedGas: estimatedGas.toString()
      };
    } catch (error) {
      safeLogger.error('Error calculating bridge fee:', error);
      throw error;
    }
  }

  /**
   * Initiate cross-chain bridge
   */
  public async initiateBridge(
    request: BridgeRequest,
    signer: ethers.Signer
  ): Promise<string> {
    try {
      const sourceChainId = CHAIN_CONFIGS[request.sourceChain].chainId;
      const destChainId = CHAIN_CONFIGS[request.destinationChain].chainId;

      const bridgeContract = this.bridgeContracts.get(sourceChainId);
      if (!bridgeContract) {
        throw new Error(`Bridge not available for ${request.sourceChain}`);
      }

      const tokenContract = this.tokenContracts.get(sourceChainId);
      if (!tokenContract) {
        throw new Error(`LDAO token not available on ${request.sourceChain}`);
      }

      // Check allowance
      const allowance = await tokenContract.allowance(
        await signer.getAddress(),
        await bridgeContract.getAddress()
      );

      const amountWei = ethers.parseEther(request.amount);

      if (allowance < amountWei) {
        // Approve bridge contract
        const approveTx = await tokenContract.approve(
          await bridgeContract.getAddress(),
          amountWei
        );
        await approveTx.wait();
        safeLogger.info('Bridge contract approved');
      }

      // Calculate fee
      const feeInfo = await this.calculateBridgeFee(
        request.sourceChain,
        request.destinationChain,
        request.amount
      );

      // Initiate bridge
      const bridgeTx = await bridgeContract.initiateBridge(
        amountWei,
        destChainId,
        { value: ethers.parseEther(feeInfo.totalAmount) }
      );

      await bridgeTx.wait();
      safeLogger.info('Bridge transaction completed:', bridgeTx.hash);

      return bridgeTx.hash;
    } catch (error) {
      safeLogger.error('Error initiating bridge:', error);
      throw error;
    }
  }

  /**
   * Get bridge transaction status
   */
  public async getBridgeStatus(
    nonce: number,
    chainId: number
  ): Promise<BridgeStatus | null> {
    try {
      const bridgeContract = this.bridgeContracts.get(chainId);
      if (!bridgeContract) {
        return null;
      }

      const txData = await bridgeContract.getBridgeTransaction(nonce);
      const statusMap = ['pending', 'processing', 'completed', 'failed'];

      return {
        status: statusMap[txData.status],
        sourceChain: Object.values(CHAIN_CONFIGS).find(c => c.chainId === txData.sourceChain)?.name || 'Unknown',
        destinationChain: Object.values(CHAIN_CONFIGS).find(c => c.chainId === txData.destinationChain)?.name || 'Unknown',
        amount: ethers.formatEther(txData.amount),
        txHash: txData.txHash || undefined,
        bridgeTxHash: txData.txHash || undefined,
        timestamp: Number(txData.timestamp),
        estimatedTime: 1800 // 30 minutes default
      };
    } catch (error) {
      safeLogger.error('Error getting bridge status:', error);
      return null;
    }
  }

  /**
   * Switch wallet to different chain
   */
  public async switchChain(
    chainId: number,
    signer: ethers.Signer
  ): Promise<void> {
    try {
      const chainConfig = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
      if (!chainConfig) {
        throw new Error(`Chain not found: ${chainId}`);
      }

      await (signer.provider as ethers.BrowserProvider).send('wallet_switchEthereumChain', [{
        chainId: `0x${chainId.toString(16)}`
      }]);

      safeLogger.info(`Switched to chain: ${chainConfig.name}`);
    } catch (error: any) {
      // Chain not added, try to add it
      if (error.code === 4902) {
        await this.addChain(chainId, signer);
      } else {
        throw error;
      }
    }
  }

  /**
   * Add chain to wallet
   */
  public async addChain(
    chainId: number,
    signer: ethers.Signer
  ): Promise<void> {
    try {
      const chainConfig = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
      if (!chainConfig) {
        throw new Error(`Chain not found: ${chainId}`);
      }

      await (signer.provider as ethers.BrowserProvider).send('wallet_addEthereumChain', [{
        chainId: `0x${chainId.toString(16)}`,
        chainName: chainConfig.name,
        nativeCurrency: chainConfig.nativeCurrency,
        rpcUrls: [chainConfig.rpcUrl],
        blockExplorerUrls: [chainConfig.explorerUrl]
      }]);

      safeLogger.info(`Added chain: ${chainConfig.name}`);
    } catch (error) {
      safeLogger.error('Error adding chain:', error);
      throw error;
    }
  }

  /**
   * Get supported chains
   */
  public getSupportedChains(): typeof CHAIN_CONFIGS {
    return CHAIN_CONFIGS;
  }

  /**
   * Check if user has sufficient balance
   */
  public async checkBalance(
    chainId: number,
    userAddress: string
  ): Promise<string> {
    try {
      const tokenContract = this.tokenContracts.get(chainId);
      if (!tokenContract) {
        return '0';
      }

      const balance = await tokenContract.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      safeLogger.error('Error checking balance:', error);
      return '0';
    }
  }

  /**
   * Estimate gas for bridge transaction
   */
  public async estimateBridgeGas(
    request: BridgeRequest
  ): Promise<string> {
    try {
      const sourceChainId = CHAIN_CONFIGS[request.sourceChain].chainId;
      const bridgeContract = this.bridgeContracts.get(sourceChainId);

      if (!bridgeContract) {
        throw new Error(`Bridge not available for ${request.sourceChain}`);
      }

      const amountWei = ethers.parseEther(request.amount);
      const estimatedGas = await bridgeContract.initiateBridge.estimateGas(
        amountWei,
        CHAIN_CONFIGS[request.destinationChain].chainId,
        { value: amountWei }
      );

      return estimatedGas.toString();
    } catch (error) {
      safeLogger.error('Error estimating bridge gas:', error);
      return '0';
    }
  }
}

export const crossChainService = CrossChainService.getInstance();