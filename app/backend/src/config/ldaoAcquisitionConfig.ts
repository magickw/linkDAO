import { LDAOAcquisitionConfig, ExternalIntegration } from '../types/ldaoAcquisition';

export class LDAOAcquisitionConfigManager {
  private config: LDAOAcquisitionConfig;
  private integrations: Map<string, ExternalIntegration>;

  constructor() {
    this.config = this.loadConfig();
    this.integrations = new Map();
    this.initializeIntegrations();
  }

  private loadConfig(): LDAOAcquisitionConfig {
    return {
      treasuryContract: process.env.LDAO_TREASURY_CONTRACT || '',
      supportedTokens: (process.env.LDAO_SUPPORTED_TOKENS || 'ETH,USDC,USDT').split(','),
      supportedNetworks: (process.env.LDAO_SUPPORTED_NETWORKS || 'ethereum,polygon,arbitrum,base').split(','),
      fiatPaymentEnabled: process.env.LDAO_FIAT_PAYMENT_ENABLED === 'true',
      dexIntegrationEnabled: process.env.LDAO_DEX_INTEGRATION_ENABLED === 'true',
      earnToOwnEnabled: process.env.LDAO_EARN_TO_OWN_ENABLED === 'true',
      stakingEnabled: process.env.LDAO_STAKING_ENABLED === 'true',
      bridgeEnabled: process.env.LDAO_BRIDGE_ENABLED === 'true',
    };
  }

  private initializeIntegrations(): void {
    // Stripe integration
    if (this.config.fiatPaymentEnabled) {
      this.integrations.set('stripe', {
        name: 'Stripe',
        type: 'payment',
        enabled: !!process.env.STRIPE_SECRET_KEY,
        config: {
          secretKey: process.env.STRIPE_SECRET_KEY,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        },
      });

      // MoonPay integration
      this.integrations.set('moonpay', {
        name: 'MoonPay',
        type: 'payment',
        enabled: !!process.env.MOONPAY_API_KEY,
        config: {
          apiKey: process.env.MOONPAY_API_KEY,
          secretKey: process.env.MOONPAY_SECRET_KEY,
          baseUrl: process.env.MOONPAY_BASE_URL || 'https://api.moonpay.com',
        },
      });
    }

    // Uniswap V3 integration
    if (this.config.dexIntegrationEnabled) {
      this.integrations.set('uniswap', {
        name: 'Uniswap V3',
        type: 'dex',
        enabled: true,
        config: {
          routerAddress: process.env.UNISWAP_ROUTER_ADDRESS,
          quoterAddress: process.env.UNISWAP_QUOTER_ADDRESS,
          factoryAddress: process.env.UNISWAP_FACTORY_ADDRESS,
        },
      });
    }

    // Cross-chain bridge integrations
    if (this.config.bridgeEnabled) {
      this.integrations.set('layerzero', {
        name: 'LayerZero',
        type: 'bridge',
        enabled: !!process.env.LAYERZERO_ENDPOINT,
        config: {
          endpoint: process.env.LAYERZERO_ENDPOINT,
          chainIds: {
            ethereum: 101,
            polygon: 109,
            arbitrum: 110,
          },
        },
      });
    }
  }

  public getConfig(): LDAOAcquisitionConfig {
    return { ...this.config };
  }

  public getIntegration(name: string): ExternalIntegration | undefined {
    return this.integrations.get(name);
  }

  public getAllIntegrations(): ExternalIntegration[] {
    return Array.from(this.integrations.values());
  }

  public isIntegrationEnabled(name: string): boolean {
    const integration = this.integrations.get(name);
    return integration?.enabled || false;
  }

  public updateConfig(updates: Partial<LDAOAcquisitionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public updateIntegration(name: string, updates: Partial<ExternalIntegration>): void {
    const existing = this.integrations.get(name);
    if (existing) {
      this.integrations.set(name, { ...existing, ...updates });
    }
  }

  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.treasuryContract) {
      errors.push('Treasury contract address is required');
    }

    if (this.config.supportedTokens.length === 0) {
      errors.push('At least one supported token is required');
    }

    if (this.config.supportedNetworks.length === 0) {
      errors.push('At least one supported network is required');
    }

    // Validate integrations
    for (const [name, integration] of Array.from(this.integrations.entries())) {
      if (integration.enabled) {
        switch (integration.type) {
          case 'payment':
            if (name === 'stripe' && !integration.config.secretKey) {
              errors.push('Stripe secret key is required when Stripe is enabled');
            }
            if (name === 'moonpay' && !integration.config.apiKey) {
              errors.push('MoonPay API key is required when MoonPay is enabled');
            }
            break;
          case 'dex':
            if (name === 'uniswap' && !integration.config.routerAddress) {
              errors.push('Uniswap router address is required when Uniswap is enabled');
            }
            break;
          case 'bridge':
            if (name === 'layerzero' && !integration.config.endpoint) {
              errors.push('LayerZero endpoint is required when LayerZero is enabled');
            }
            break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
export const ldaoAcquisitionConfig = new LDAOAcquisitionConfigManager();
