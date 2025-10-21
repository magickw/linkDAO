import { PaymentMethod, PaymentMethodType } from '../types/paymentPrioritization';

export interface NetworkHandlingResult {
  action: 'suggest_network_switch' | 'suggest_alternatives' | 'show_fiat_option' | 'show_error';
  targetNetwork?: number;
  targetNetworkName?: string;
  alternatives?: PaymentMethod[];
  migrationInstructions?: string;
  userMessage: string;
  canRetry: boolean;
}

export interface NetworkInfo {
  chainId: number;
  name: string;
  displayName: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export class NetworkUnavailabilityHandler {
  private supportedNetworks: Map<number, NetworkInfo>;
  private paymentMethodNetworks: Map<PaymentMethodType, number[]>;

  constructor() {
    this.supportedNetworks = new Map([
      [1, {
        chainId: 1,
        name: 'ethereum',
        displayName: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/',
        blockExplorerUrl: 'https://etherscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
      }],
      [137, {
        chainId: 137,
        name: 'polygon',
        displayName: 'Polygon',
        rpcUrl: 'https://polygon-rpc.com',
        blockExplorerUrl: 'https://polygonscan.com',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
      }],
      [56, {
        chainId: 56,
        name: 'bsc',
        displayName: 'BNB Smart Chain',
        rpcUrl: 'https://bsc-dataseed.binance.org',
        blockExplorerUrl: 'https://bscscan.com',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
      }],
      [42161, {
        chainId: 42161,
        name: 'arbitrum',
        displayName: 'Arbitrum One',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        blockExplorerUrl: 'https://arbiscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
      }]
    ]);

    this.paymentMethodNetworks = new Map([
      [PaymentMethodType.STABLECOIN_USDC, [1, 137, 56, 42161]], // USDC available on multiple networks
      [PaymentMethodType.STABLECOIN_USDT, [1, 137, 56]], // USDT available on fewer networks
      [PaymentMethodType.NATIVE_ETH, [1, 42161]], // ETH on Ethereum and Arbitrum
      [PaymentMethodType.FIAT_STRIPE, []] // Fiat doesn't depend on network
    ]);
  }

  /**
   * Handles network unavailability for a specific payment method
   */
  async handleUnsupportedNetwork(
    preferredMethod: PaymentMethod,
    currentNetwork: number,
    availableAlternatives: PaymentMethod[]
  ): Promise<NetworkHandlingResult> {
    const supportedNetworks = this.getSupportedNetworks(preferredMethod.type);
    
    // If method doesn't require a network (like fiat), show error
    if (supportedNetworks.length === 0) {
      return {
        action: 'show_error',
        userMessage: `${preferredMethod.name} is currently unavailable. Please try again later.`,
        canRetry: true
      };
    }

    // Find the best network to switch to
    const bestNetwork = this.findBestNetworkForMethod(preferredMethod.type, currentNetwork);
    
    if (bestNetwork) {
      return this.suggestNetworkSwitch(preferredMethod, bestNetwork, currentNetwork);
    }

    // If no good network switch option, suggest alternatives
    return this.suggestAlternativePaymentMethods(preferredMethod, currentNetwork, availableAlternatives);
  }

  /**
   * Suggests switching to a compatible network
   */
  private suggestNetworkSwitch(
    method: PaymentMethod,
    targetNetwork: NetworkInfo,
    currentNetwork: number
  ): NetworkHandlingResult {
    const currentNetworkInfo = this.supportedNetworks.get(currentNetwork);
    const migrationInstructions = this.generateMigrationInstructions(currentNetworkInfo, targetNetwork);

    return {
      action: 'suggest_network_switch',
      targetNetwork: targetNetwork.chainId,
      targetNetworkName: targetNetwork.displayName,
      migrationInstructions,
      userMessage: `${method.name} is not available on ${currentNetworkInfo?.displayName || 'current network'}. Switch to ${targetNetwork.displayName} to use this payment method.`,
      canRetry: true
    };
  }

  /**
   * Suggests alternative payment methods available on current network
   */
  private suggestAlternativePaymentMethods(
    preferredMethod: PaymentMethod,
    currentNetwork: number,
    availableAlternatives: PaymentMethod[]
  ): NetworkHandlingResult {
    const currentNetworkInfo = this.supportedNetworks.get(currentNetwork);
    const compatibleAlternatives = availableAlternatives.filter(alt => 
      this.isMethodSupportedOnNetwork(alt.type, currentNetwork)
    );

    // Always include fiat as an option if available
    const fiatAlternative = availableAlternatives.find(alt => alt.type === PaymentMethodType.FIAT_STRIPE);
    if (fiatAlternative && !compatibleAlternatives.includes(fiatAlternative)) {
      compatibleAlternatives.unshift(fiatAlternative);
    }

    if (compatibleAlternatives.length === 0) {
      return {
        action: 'show_error',
        userMessage: `No payment methods are available on ${currentNetworkInfo?.displayName || 'current network'}. Please switch networks or try again later.`,
        canRetry: true
      };
    }

    if (compatibleAlternatives.length === 1 && compatibleAlternatives[0].type === PaymentMethodType.FIAT_STRIPE) {
      return {
        action: 'show_fiat_option',
        alternatives: compatibleAlternatives,
        userMessage: `${preferredMethod.name} is not available on ${currentNetworkInfo?.displayName || 'current network'}. You can use fiat payment instead.`,
        canRetry: false
      };
    }

    return {
      action: 'suggest_alternatives',
      alternatives: compatibleAlternatives,
      userMessage: `${preferredMethod.name} is not available on ${currentNetworkInfo?.displayName || 'current network'}. Here are alternative payment methods you can use:`,
      canRetry: false
    };
  }

  /**
   * Finds the best network for a payment method type
   */
  private findBestNetworkForMethod(methodType: PaymentMethodType, currentNetwork: number): NetworkInfo | null {
    const supportedNetworks = this.getSupportedNetworks(methodType);
    
    if (supportedNetworks.length === 0) {
      return null;
    }

    // Prefer networks with lower fees (Polygon, Arbitrum, BSC, then Ethereum)
    const networkPriority = [137, 42161, 56, 1];
    
    for (const chainId of networkPriority) {
      if (supportedNetworks.includes(chainId) && chainId !== currentNetwork) {
        return this.supportedNetworks.get(chainId) || null;
      }
    }

    // If no preferred network found, return the first supported network
    const firstSupported = supportedNetworks.find(chainId => chainId !== currentNetwork);
    return firstSupported ? this.supportedNetworks.get(firstSupported) || null : null;
  }

  /**
   * Gets supported networks for a payment method type
   */
  private getSupportedNetworks(methodType: PaymentMethodType): number[] {
    return this.paymentMethodNetworks.get(methodType) || [];
  }

  /**
   * Checks if a payment method is supported on a specific network
   */
  private isMethodSupportedOnNetwork(methodType: PaymentMethodType, chainId: number): boolean {
    const supportedNetworks = this.getSupportedNetworks(methodType);
    return supportedNetworks.includes(chainId) || methodType === PaymentMethodType.FIAT_STRIPE;
  }

  /**
   * Generates migration instructions for network switching
   */
  private generateMigrationInstructions(
    currentNetwork: NetworkInfo | undefined,
    targetNetwork: NetworkInfo
  ): string {
    if (!currentNetwork) {
      return `Please connect to ${targetNetwork.displayName} in your wallet to use this payment method.`;
    }

    return `To switch from ${currentNetwork.displayName} to ${targetNetwork.displayName}:
1. Open your wallet (MetaMask, WalletConnect, etc.)
2. Click on the network selector
3. Select "${targetNetwork.displayName}" or add it manually:
   - Network Name: ${targetNetwork.displayName}
   - RPC URL: ${targetNetwork.rpcUrl}
   - Chain ID: ${targetNetwork.chainId}
   - Currency Symbol: ${targetNetwork.nativeCurrency.symbol}
   - Block Explorer: ${targetNetwork.blockExplorerUrl}
4. Confirm the network switch in your wallet`;
  }

  /**
   * Gets network information by chain ID
   */
  getNetworkInfo(chainId: number): NetworkInfo | undefined {
    return this.supportedNetworks.get(chainId);
  }

  /**
   * Gets all supported networks
   */
  getAllSupportedNetworks(): NetworkInfo[] {
    return Array.from(this.supportedNetworks.values());
  }

  /**
   * Adds support for a new network
   */
  addSupportedNetwork(networkInfo: NetworkInfo): void {
    this.supportedNetworks.set(networkInfo.chainId, networkInfo);
  }

  /**
   * Updates payment method network support
   */
  updatePaymentMethodNetworks(methodType: PaymentMethodType, supportedNetworks: number[]): void {
    this.paymentMethodNetworks.set(methodType, supportedNetworks);
  }

  /**
   * Handles network connection errors
   */
  async handleNetworkConnectionError(
    currentNetwork: number,
    availableAlternatives: PaymentMethod[]
  ): Promise<NetworkHandlingResult> {
    const networkInfo = this.supportedNetworks.get(currentNetwork);
    const fiatAlternative = availableAlternatives.find(alt => alt.type === PaymentMethodType.FIAT_STRIPE);

    if (fiatAlternative) {
      return {
        action: 'show_fiat_option',
        alternatives: [fiatAlternative],
        userMessage: `Network connection issues detected on ${networkInfo?.displayName || 'current network'}. You can use fiat payment to complete your transaction.`,
        canRetry: true
      };
    }

    return {
      action: 'show_error',
      userMessage: `Unable to connect to ${networkInfo?.displayName || 'current network'}. Please check your connection and try again.`,
      canRetry: true
    };
  }
}

// Export singleton instance
export const networkUnavailabilityHandler = new NetworkUnavailabilityHandler();