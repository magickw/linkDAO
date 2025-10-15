/**
 * Progressive enhancement framework for Web3 features
 */

export type FeatureLevel = 'basic' | 'enhanced' | 'premium';
export type Web3Capability = 'wallet' | 'transactions' | 'contracts' | 'governance' | 'staking';

export interface FeatureConfig {
  level: FeatureLevel;
  requiredCapabilities: Web3Capability[];
  fallbackComponent?: React.ComponentType<any>;
  fallbackProps?: Record<string, any>;
  gracefulDegradation: boolean;
}

export interface Web3CapabilityStatus {
  wallet: boolean;
  transactions: boolean;
  contracts: boolean;
  governance: boolean;
  staking: boolean;
}

export interface ProgressiveEnhancementConfig {
  enableFallbacks: boolean;
  showWeb3Prompts: boolean;
  cacheCapabilities: boolean;
  retryFailedCapabilities: boolean;
  capabilityCheckInterval: number;
}

export class ProgressiveEnhancementManager {
  private static instance: ProgressiveEnhancementManager;
  private capabilities: Web3CapabilityStatus = {
    wallet: false,
    transactions: false,
    contracts: false,
    governance: false,
    staking: false
  };
  
  private config: ProgressiveEnhancementConfig = {
    enableFallbacks: true,
    showWeb3Prompts: true,
    cacheCapabilities: true,
    retryFailedCapabilities: true,
    capabilityCheckInterval: 30000 // 30 seconds
  };

  private capabilityCheckers: Map<Web3Capability, () => Promise<boolean>> = new Map();
  private lastCheck: Date = new Date(0);
  private checkInterval?: NodeJS.Timeout;

  static getInstance(): ProgressiveEnhancementManager {
    if (!ProgressiveEnhancementManager.instance) {
      ProgressiveEnhancementManager.instance = new ProgressiveEnhancementManager();
    }
    return ProgressiveEnhancementManager.instance;
  }

  initialize(config?: Partial<ProgressiveEnhancementConfig>): void {
    this.config = { ...this.config, ...config };
    this.setupCapabilityCheckers();
    this.startPeriodicChecks();
    this.checkAllCapabilities();
  }

  private setupCapabilityCheckers(): void {
    this.capabilityCheckers.set('wallet', this.checkWalletCapability.bind(this));
    this.capabilityCheckers.set('transactions', this.checkTransactionCapability.bind(this));
    this.capabilityCheckers.set('contracts', this.checkContractCapability.bind(this));
    this.capabilityCheckers.set('governance', this.checkGovernanceCapability.bind(this));
    this.capabilityCheckers.set('staking', this.checkStakingCapability.bind(this));
  }

  private async checkWalletCapability(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;
      
      // Check for Web3 providers
      const hasEthereum = !!(window as any).ethereum;
      const hasWeb3 = !!(window as any).web3;
      
      if (!hasEthereum && !hasWeb3) return false;

      // Try to get accounts (this will prompt if not connected)
      const provider = (window as any).ethereum;
      if (provider) {
        const accounts = await provider.request({ method: 'eth_accounts' });
        return accounts && accounts.length > 0;
      }
      
      return false;
    } catch (error) {
      console.warn('Wallet capability check failed:', error);
      return false;
    }
  }

  private async checkTransactionCapability(): Promise<boolean> {
    try {
      if (!this.capabilities.wallet) return false;
      
      const provider = (window as any).ethereum;
      if (!provider) return false;

      // Check if we can estimate gas (indicates transaction capability)
      await provider.request({
        method: 'eth_estimateGas',
        params: [{
          to: '0x0000000000000000000000000000000000000000',
          value: '0x0'
        }]
      });
      
      return true;
    } catch (error) {
      // This is expected to fail, we're just checking if the method exists
      return true;
    }
  }

  private async checkContractCapability(): Promise<boolean> {
    try {
      if (!this.capabilities.transactions) return false;
      
      const provider = (window as any).ethereum;
      if (!provider) return false;

      // Check if we can call contract methods
      const chainId = await provider.request({ method: 'eth_chainId' });
      return !!chainId;
    } catch (error) {
      console.warn('Contract capability check failed:', error);
      return false;
    }
  }

  private async checkGovernanceCapability(): Promise<boolean> {
    // Governance requires contract capability plus specific governance contracts
    return this.capabilities.contracts && this.hasGovernanceContracts();
  }

  private async checkStakingCapability(): Promise<boolean> {
    // Staking requires contract capability plus specific staking contracts
    return this.capabilities.contracts && this.hasStakingContracts();
  }

  private hasGovernanceContracts(): boolean {
    // Check if governance contracts are available for current network
    // This would typically check against a registry of deployed contracts
    return true; // Simplified for now
  }

  private hasStakingContracts(): boolean {
    // Check if staking contracts are available for current network
    return true; // Simplified for now
  }

  async checkAllCapabilities(): Promise<void> {
    const now = new Date();
    if (now.getTime() - this.lastCheck.getTime() < this.config.capabilityCheckInterval) {
      return; // Skip if checked recently
    }

    for (const [capability, checker] of this.capabilityCheckers) {
      try {
        this.capabilities[capability] = await checker();
      } catch (error) {
        console.warn(`Failed to check ${capability} capability:`, error);
        this.capabilities[capability] = false;
      }
    }

    this.lastCheck = now;
    this.notifyCapabilityChange();
  }

  private startPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      if (this.config.retryFailedCapabilities) {
        this.checkAllCapabilities();
      }
    }, this.config.capabilityCheckInterval);
  }

  private notifyCapabilityChange(): void {
    window.dispatchEvent(new CustomEvent('web3-capabilities-changed', {
      detail: { capabilities: this.capabilities }
    }));
  }

  getCapabilities(): Web3CapabilityStatus {
    return { ...this.capabilities };
  }

  hasCapability(capability: Web3Capability): boolean {
    return this.capabilities[capability];
  }

  hasAllCapabilities(capabilities: Web3Capability[]): boolean {
    return capabilities.every(cap => this.capabilities[cap]);
  }

  getFeatureLevel(requiredCapabilities: Web3Capability[]): FeatureLevel {
    const hasAll = this.hasAllCapabilities(requiredCapabilities);
    const hasWallet = this.hasCapability('wallet');
    
    if (hasAll) return 'premium';
    if (hasWallet) return 'enhanced';
    return 'basic';
  }

  shouldShowFeature(config: FeatureConfig): boolean {
    const currentLevel = this.getFeatureLevel(config.requiredCapabilities);
    
    switch (config.level) {
      case 'basic':
        return true;
      case 'enhanced':
        return currentLevel === 'enhanced' || currentLevel === 'premium';
      case 'premium':
        return currentLevel === 'premium';
      default:
        return false;
    }
  }

  getFallbackComponent(config: FeatureConfig): React.ComponentType<any> | null {
    if (!this.shouldShowFeature(config) && config.fallbackComponent) {
      return config.fallbackComponent;
    }
    return null;
  }

  async enableCapability(capability: Web3Capability): Promise<boolean> {
    try {
      switch (capability) {
        case 'wallet':
          return await this.enableWallet();
        case 'transactions':
          return await this.enableTransactions();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to enable ${capability}:`, error);
      return false;
    }
  }

  private async enableWallet(): Promise<boolean> {
    try {
      const provider = (window as any).ethereum;
      if (!provider) {
        this.showWalletInstallPrompt();
        return false;
      }

      await provider.request({ method: 'eth_requestAccounts' });
      await this.checkAllCapabilities();
      return this.capabilities.wallet;
    } catch (error) {
      console.error('Failed to enable wallet:', error);
      return false;
    }
  }

  private async enableTransactions(): Promise<boolean> {
    if (!this.capabilities.wallet) {
      return await this.enableWallet();
    }
    return this.capabilities.transactions;
  }

  private showWalletInstallPrompt(): void {
    if (this.config.showWeb3Prompts) {
      window.dispatchEvent(new CustomEvent('show-wallet-install-prompt'));
    }
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }
}

export const progressiveEnhancement = ProgressiveEnhancementManager.getInstance();

// React hook for using progressive enhancement
export function useProgressiveEnhancement(config: FeatureConfig) {
  const [capabilities, setCapabilities] = React.useState<Web3CapabilityStatus>(
    progressiveEnhancement.getCapabilities()
  );

  React.useEffect(() => {
    const handleCapabilityChange = (event: CustomEvent) => {
      setCapabilities(event.detail.capabilities);
    };

    window.addEventListener('web3-capabilities-changed', handleCapabilityChange as EventListener);
    
    return () => {
      window.removeEventListener('web3-capabilities-changed', handleCapabilityChange as EventListener);
    };
  }, []);

  const shouldShow = progressiveEnhancement.shouldShowFeature(config);
  const fallbackComponent = progressiveEnhancement.getFallbackComponent(config);
  const featureLevel = progressiveEnhancement.getFeatureLevel(config.requiredCapabilities);

  return {
    capabilities,
    shouldShow,
    fallbackComponent,
    featureLevel,
    enableCapability: progressiveEnhancement.enableCapability.bind(progressiveEnhancement)
  };
}

// Import React for the hook
import React from 'react';