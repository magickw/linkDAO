/**
 * Wallet Asset Detection Service
 * Automatically detects user's wallet assets across networks and recommends optimal payment methods
 */

import { PublicClient, createPublicClient, http } from 'viem';
import { mainnet, polygon, arbitrum, base, sepolia } from 'wagmi/chains';
import { erc20Abi } from 'viem';
import { USDC_MAINNET, USDC_POLYGON, USDC_ARBITRUM, USDC_BASE, USDC_SEPOLIA, USDT_MAINNET, USDT_POLYGON } from '@/config/payment';

export interface WalletAsset {
  chainId: number;
  chainName: string;
  tokenSymbol: string;
  tokenAddress: string;
  balance: bigint;
  balanceUSD: number;
  decimals: number;
}

export interface WalletAssetSummary {
  address: string;
  totalBalanceUSD: number;
  assetsByChain: Record<number, WalletAsset[]>;
  recommendedNetwork: number;
  canPayWithCrypto: boolean;
  hasSufficientBalance: boolean;
  requiredAmount: number;
}

export class WalletAssetDetectionService {
  private publicClients: Map<number, PublicClient>;
  private supportedChains: number[];
  private stablecoinAddresses: Record<number, Record<string, string>>;

  constructor() {
    this.supportedChains = [mainnet.id, polygon.id, arbitrum.id, base.id, sepolia.id];
    this.publicClients = new Map();

    // Initialize public clients for all supported chains
    this.supportedChains.forEach(chainId => {
      const chain = this.getChainConfig(chainId);
      if (chain) {
        this.publicClients.set(
          chainId,
          createPublicClient({
            chain,
            transport: http()
          })
        );
      }
    });

    // Configure stablecoin addresses
    this.stablecoinAddresses = {
      [mainnet.id]: {
        USDC: USDC_MAINNET.address,
        USDT: USDT_MAINNET.address
      },
      [polygon.id]: {
        USDC: USDC_POLYGON.address,
        USDT: USDT_POLYGON.address
      },
      [arbitrum.id]: {
        USDC: USDC_ARBITRUM.address
      },
      [base.id]: {
        USDC: USDC_BASE.address
      },
      [sepolia.id]: {
        USDC: USDC_SEPOLIA.address
      }
    };
  }

  private getChainConfig(chainId: number) {
    switch (chainId) {
      case mainnet.id: return mainnet;
      case polygon.id: return polygon;
      case arbitrum.id: return arbitrum;
      case base.id: return base;
      case sepolia.id: return sepolia;
      default: return null;
    }
  }

  private getChainName(chainId: number): string {
    const chain = this.getChainConfig(chainId);
    return chain?.name || `Chain ${chainId}`;
  }

  /**
   * Detect all assets in the user's wallet across supported networks
   */
  async detectWalletAssets(
    address: string,
    requiredAmountUSD: number
  ): Promise<WalletAssetSummary> {
    const assetsByChain: Record<number, WalletAsset[]> = {};
    let totalBalanceUSD = 0;

    // Detect assets on each supported chain
    for (const chainId of this.supportedChains) {
      const assets = await this.detectAssetsOnChain(address, chainId);
      assetsByChain[chainId] = assets;

      // Sum up USD values
      assets.forEach(asset => {
        totalBalanceUSD += asset.balanceUSD;
      });
    }

    // Determine recommended network based on asset distribution
    const recommendedNetwork = this.recommendOptimalNetwork(assetsByChain, requiredAmountUSD);

    // Check if user can pay with crypto
    const canPayWithCrypto = totalBalanceUSD >= requiredAmountUSD;

    // Check if any chain has sufficient balance
    const hasSufficientBalance = Object.values(assetsByChain).some(assets =>
      assets.some(asset => asset.balanceUSD >= requiredAmountUSD)
    );

    return {
      address,
      totalBalanceUSD,
      assetsByChain,
      recommendedNetwork,
      canPayWithCrypto,
      hasSufficientBalance,
      requiredAmount: requiredAmountUSD
    };
  }

  /**
   * Detect assets on a specific chain
   */
  private async detectAssetsOnChain(
    address: string,
    chainId: number
  ): Promise<WalletAsset[]> {
    const client = this.publicClients.get(chainId);
    if (!client) {
      console.warn(`No public client for chain ${chainId}`);
      return [];
    }

    const assets: WalletAsset[] = [];
    const chainName = this.getChainName(chainId);

    try {
      // Check native token balance (ETH, MATIC, etc.)
      const nativeBalance = await client.getBalance({ address });
      const nativePriceUSD = await this.getNativeTokenPriceUSD(chainId);

      if (nativeBalance > 0n) {
        const nativeSymbol = this.getNativeTokenSymbol(chainId);
        const nativeDecimals = 18;

        assets.push({
          chainId,
          chainName,
          tokenSymbol: nativeSymbol,
          tokenAddress: '0x0000000000000000000000000000000000000000',
          balance: nativeBalance,
          balanceUSD: (Number(nativeBalance) / 10 ** nativeDecimals) * nativePriceUSD,
          decimals: nativeDecimals
        });
      }

      // Check stablecoin balances
      const stablecoins = this.stablecoinAddresses[chainId] || {};
      for (const [symbol, tokenAddress] of Object.entries(stablecoins)) {
        try {
          const balance = await client.readContract({
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`]
          }) as bigint;

          if (balance > 0n) {
            const decimals = symbol === 'USDC' || symbol === 'USDT' ? 6 : 18;
            const priceUSD = symbol === 'USDC' || symbol === 'USDT' ? 1 : await this.getTokenPriceUSD(tokenAddress, chainId);

            assets.push({
              chainId,
              chainName,
              tokenSymbol: symbol,
              tokenAddress,
              balance,
              balanceUSD: (Number(balance) / 10 ** decimals) * priceUSD,
              decimals
            });
          }
        } catch (error) {
          console.warn(`Failed to check ${symbol} balance on ${chainName}:`, error);
        }
      }
    } catch (error) {
      console.error(`Failed to detect assets on ${chainName}:`, error);
    }

    return assets;
  }

  /**
   * Recommend the optimal network for payment
   */
  private recommendOptimalNetwork(
    assetsByChain: Record<number, WalletAsset[]>,
    requiredAmountUSD: number
  ): number {
    let bestChain = mainnet.id;
    let bestScore = -1;

    for (const [chainId, assets] of Object.entries(assetsByChain)) {
      const chainIdNum = parseInt(chainId);
      let score = 0;

      // Check if chain has sufficient stablecoin balance (highest priority)
      const stablecoinBalance = assets
        .filter(a => a.tokenSymbol === 'USDC' || a.tokenSymbol === 'USDT')
        .reduce((sum, a) => sum + a.balanceUSD, 0);

      if (stablecoinBalance >= requiredAmountUSD) {
        score += 1000; // Highest priority
      } else {
        score += stablecoinBalance / requiredAmountUSD * 500;
      }

      // Check total balance
      const totalBalance = assets.reduce((sum, a) => sum + a.balanceUSD, 0);
      if (totalBalance >= requiredAmountUSD) {
        score += 500;
      } else {
        score += totalBalance / requiredAmountUSD * 250;
      }

      // Prefer chains with lower gas fees (rough estimate)
      const gasFeeMultiplier = this.getGasFeeMultiplier(chainIdNum);
      score *= gasFeeMultiplier;

      // Prefer Ethereum mainnet for stability
      if (chainIdNum === mainnet.id) {
        score *= 1.1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestChain = chainIdNum;
      }
    }

    return bestChain;
  }

  /**
   * Get native token symbol for a chain
   */
  private getNativeTokenSymbol(chainId: number): string {
    switch (chainId) {
      case mainnet.id: return 'ETH';
      case polygon.id: return 'MATIC';
      case arbitrum.id: return 'ETH';
      case base.id: return 'ETH';
      case sepolia.id: return 'ETH';
      default: return 'ETH';
    }
  }

  /**
   * Get gas fee multiplier for a chain (lower is better)
   */
  private getGasFeeMultiplier(chainId: number): number {
    switch (chainId) {
      case polygon.id: return 1.5; // Lower gas fees
      case arbitrum.id: return 1.4; // Lower gas fees
      case base.id: return 1.3; // Lower gas fees
      case sepolia.id: return 1.2; // Testnet, lower fees
      case mainnet.id: return 1.0; // Base multiplier
      default: return 1.0;
    }
  }

  /**
   * Get native token price in USD (mock implementation)
   */
  private async getNativeTokenPriceUSD(chainId: number): Promise<number> {
    // In production, fetch from price oracle or API
    const prices: Record<number, number> = {
      [mainnet.id]: 2000, // ETH
      [polygon.id]: 0.8, // MATIC
      [arbitrum.id]: 2000, // ETH
      [base.id]: 2000, // ETH
      [sepolia.id]: 2000 // ETH (testnet)
    };

    return prices[chainId] || 2000;
  }

  /**
   * Get token price in USD (mock implementation)
   */
  private async getTokenPriceUSD(tokenAddress: string, chainId: number): Promise<number> {
    // In production, fetch from price oracle or API
    // For now, assume stablecoins are $1
    return 1;
  }

  /**
   * Get the best payment method based on wallet assets
   */
  async getBestPaymentMethod(
    address: string,
    requiredAmountUSD: number
  ): Promise<{
    recommendedChainId: number;
    recommendedToken: string;
    canPayWithCrypto: boolean;
    shouldUseFiat: boolean;
    reason: string;
  }> {
    const summary = await this.detectWalletAssets(address, requiredAmountUSD);

    // Check if user has sufficient stablecoin balance
    for (const [chainId, assets] of Object.entries(summary.assetsByChain)) {
      const stablecoinAsset = assets.find(
        a => (a.tokenSymbol === 'USDC' || a.tokenSymbol === 'USDT') && a.balanceUSD >= requiredAmountUSD
      );

      if (stablecoinAsset) {
        return {
          recommendedChainId: parseInt(chainId),
          recommendedToken: stablecoinAsset.tokenSymbol,
          canPayWithCrypto: true,
          shouldUseFiat: false,
          reason: `You have sufficient ${stablecoinAsset.tokenSymbol} balance on ${stablecoinAsset.chainName}`
        };
      }
    }

    // Check if user has sufficient native token balance
    for (const [chainId, assets] of Object.entries(summary.assetsByChain)) {
      const nativeAsset = assets.find(
        a => a.tokenAddress === '0x0000000000000000000000000000000000000000' && a.balanceUSD >= requiredAmountUSD
      );

      if (nativeAsset) {
        return {
          recommendedChainId: parseInt(chainId),
          recommendedToken: nativeAsset.tokenSymbol,
          canPayWithCrypto: true,
          shouldUseFiat: false,
          reason: `You have sufficient ${nativeAsset.tokenSymbol} balance on ${nativeAsset.chainName}`
        };
      }
    }

    // If no sufficient crypto balance, recommend fiat
    return {
      recommendedChainId: summary.recommendedNetwork,
      recommendedToken: 'USD',
      canPayWithCrypto: false,
      shouldUseFiat: true,
      reason: 'Insufficient crypto balance. Use Credit/Debit Card for instant payment.'
    };
  }
}

// Export singleton instance
export const walletAssetDetectionService = new WalletAssetDetectionService();