import { ethers } from 'ethers';
import { safeLogger } from '../../utils/safeLogger';
import { getTokenAddress } from '../../config/tokenAddresses';
import { DatabaseService } from '../databaseService';
import { UserProfileService } from '../userProfileService';
import { ExchangeRateService } from '../exchangeRateService';
import { NETWORK_CONFIGS } from '../../config/networkConfig';

export interface PaymentValidationRequest {
  paymentMethod: 'crypto' | 'fiat' | 'escrow';
  amount: number;
  currency: string;
  userAddress: string;
  paymentDetails: CryptoPaymentDetails | FiatPaymentDetails | EscrowPaymentDetails;
  orderId?: string;
  listingId?: string;
}

export interface CryptoPaymentDetails {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  chainId: number;
  recipientAddress: string;
  gasEstimate?: string;
}

export interface FiatPaymentDetails {
  paymentMethodId: string;
  provider: 'stripe' | 'paypal' | 'bank_transfer';
  currency: string;
  convertToCrypto?: {
    targetToken: string;
    targetChain: number;
    slippageTolerance: number;
  };
}

export interface EscrowPaymentDetails {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  chainId: number;
  escrowDuration: number; // in days
  requiresDeliveryConfirmation: boolean;
}

export interface PaymentValidationResult {
  isValid: boolean;
  hasSufficientBalance: boolean;
  errors: string[];
  warnings: string[];
  suggestedAlternatives?: PaymentAlternative[];
  estimatedFees?: PaymentFees;
  exchangeRates?: ExchangeRateInfo[];
}

export interface PaymentAlternative {
  method: 'crypto' | 'fiat' | 'escrow';
  description: string;
  available: boolean;
  estimatedTotal: number;
  currency: string;
  fees: PaymentFees;
  processingTime: string;
  benefits: string[];
  requirements?: string[];
}

export interface PaymentFees {
  processingFee: number;
  platformFee: number;
  gasFee?: number;
  exchangeFee?: number;
  totalFees: number;
  currency: string;
}

export interface ExchangeRateInfo {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: Date;
  source: string;
}

export interface BalanceInfo {
  tokenAddress: string;
  tokenSymbol: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  usdValue?: number;
}

export class PaymentValidationService {
  private databaseService: DatabaseService;
  private userProfileService: UserProfileService;
  private exchangeRateService: ExchangeRateService;
  private provider: ethers.JsonRpcProvider;

  // Supported tokens for each chain
  private readonly SUPPORTED_TOKENS = {
    1: [ // Ethereum Mainnet
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, name: 'Ethereum' },
      { address: getTokenAddress('USDC', 1), symbol: 'USDC', decimals: 6, name: 'USD Coin' },
      { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, name: 'Tether USD' }
    ],
    137: [ // Polygon
      { address: '0x0000000000000000000000000000000000000000', symbol: 'MATIC', decimals: 18, name: 'Polygon' },
      { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
      { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6, name: 'Tether USD' }
    ],
    11155111: [ // Sepolia Testnet
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, name: 'Sepolia Ethereum' },
      { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', symbol: 'USDC', decimals: 6, name: 'USD Coin (Sepolia)' }
    ]
  };

  // Minimum balances required for different operations
  private readonly MIN_BALANCES = {
    ETH: '0.01', // Minimum ETH for gas
    MATIC: '0.1', // Minimum MATIC for gas
    TRANSACTION_BUFFER: 1.2 // 20% buffer for gas price fluctuations
  };

  private providers: Map<number, ethers.JsonRpcProvider> = new Map();

  constructor() {
    this.databaseService = new DatabaseService();
    this.userProfileService = new UserProfileService();
    this.exchangeRateService = new ExchangeRateService();

    // Initialize default provider (valid fallback)
    const defaultRpc = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
    this.provider = new ethers.JsonRpcProvider(defaultRpc);
  }

  /**
   * Get a provider for a specific chain ID
   */
  private getProviderForChain(chainId: number): ethers.JsonRpcProvider {
    if (this.providers.has(chainId)) {
      return this.providers.get(chainId)!;
    }

    const networkConfig = NETWORK_CONFIGS[chainId];
    if (networkConfig) {
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      this.providers.set(chainId, provider);
      return provider;
    }

    // Fallback to default provider if no specific config found (or log warning)
    safeLogger.warn(`No specific RPC URL found for chain ${chainId}, using default provider`);
    return this.provider;
  }

  /**
   * Validate payment method and check availability
   */
  async validatePayment(request: PaymentValidationRequest): Promise<PaymentValidationResult> {
    try {
      const result: PaymentValidationResult = {
        isValid: false,
        hasSufficientBalance: false,
        errors: [],
        warnings: [],
        suggestedAlternatives: [],
        estimatedFees: undefined,
        exchangeRates: []
      };

      // Basic validation
      const basicValidation = this.validateBasicRequest(request);
      if (!basicValidation.isValid) {
        result.errors = basicValidation.errors;
        return result;
      }

      // Method-specific validation
      switch (request.paymentMethod) {
        case 'crypto':
          return await this.validateCryptoPayment(request, result);
        case 'fiat':
          return await this.validateFiatPayment(request, result);
        case 'escrow':
          return await this.validateEscrowPayment(request, result);
        default:
          result.errors.push('Invalid payment method');
          return result;
      }
    } catch (error) {
      safeLogger.error('Payment validation error:', error);
      return {
        isValid: false,
        hasSufficientBalance: false,
        errors: ['Payment validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        warnings: []
      };
    }
  }

  /**
   * Check crypto balance for user
   */
  async checkCryptoBalance(
    userAddress: string,
    tokenAddress: string,
    requiredAmount: string,
    chainId: number
  ): Promise<{ hasSufficientBalance: boolean; balance: BalanceInfo; gasBalance?: BalanceInfo }> {
    try {
      const token = this.getTokenInfo(tokenAddress, chainId);
      if (!token) {
        throw new Error('Unsupported token');
      }

      let balance: bigint;
      let gasBalance: bigint | undefined;

      const provider = this.getProviderForChain(chainId);

      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Native token (ETH, MATIC, etc.)
        balance = await provider.getBalance(userAddress);
        gasBalance = balance;
      } else {
        // ERC-20 token
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );
        balance = await tokenContract.balanceOf(userAddress);

        // Check native token balance for gas
        gasBalance = await provider.getBalance(userAddress);
      }

      const requiredAmountBigInt = ethers.parseUnits(requiredAmount, token.decimals);
      const balanceFormatted = ethers.formatUnits(balance, token.decimals);

      const balanceInfo: BalanceInfo = {
        tokenAddress,
        tokenSymbol: token.symbol,
        balance: balance.toString(),
        balanceFormatted,
        decimals: token.decimals
      };

      let gasBalanceInfo: BalanceInfo | undefined;
      if (gasBalance !== undefined && tokenAddress !== '0x0000000000000000000000000000000000000000') {
        const nativeToken = this.getNativeToken(chainId);
        if (nativeToken) {
          gasBalanceInfo = {
            tokenAddress: '0x0000000000000000000000000000000000000000',
            tokenSymbol: nativeToken.symbol,
            balance: gasBalance.toString(),
            balanceFormatted: ethers.formatUnits(gasBalance, nativeToken.decimals),
            decimals: nativeToken.decimals
          };
        }
      }

      // Check if balance is sufficient (with buffer for gas if needed)
      let hasSufficientBalance = balance >= requiredAmountBigInt;

      // For native tokens, ensure enough left for gas
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        const gasReserve = ethers.parseUnits(this.MIN_BALANCES.ETH, token.decimals);
        hasSufficientBalance = balance >= (requiredAmountBigInt + gasReserve);
      }

      return {
        hasSufficientBalance,
        balance: balanceInfo,
        gasBalance: gasBalanceInfo
      };
    } catch (error) {
      safeLogger.error('Error checking crypto balance:', error);
      throw new Error('Failed to check crypto balance');
    }
  }

  /**
   * Get payment alternatives when primary method fails
   */
  async getPaymentAlternatives(
    request: PaymentValidationRequest,
    primaryFailureReason: string
  ): Promise<PaymentAlternative[]> {
    const alternatives: PaymentAlternative[] = [];

    try {
      // If crypto payment failed due to insufficient balance, suggest fiat
      if (request.paymentMethod === 'crypto' || request.paymentMethod === 'escrow') {
        const fiatAlternative = await this.createFiatAlternative(request);
        if (fiatAlternative) {
          alternatives.push(fiatAlternative);
        }
      }

      // If fiat payment failed, suggest crypto alternatives
      if (request.paymentMethod === 'fiat') {
        const cryptoAlternatives = await this.createCryptoAlternatives(request);
        alternatives.push(...cryptoAlternatives);
      }

      // Always suggest escrow as a secure alternative (if not already selected)
      if (request.paymentMethod !== 'escrow') {
        const escrowAlternative = await this.createEscrowAlternative(request);
        if (escrowAlternative) {
          alternatives.push(escrowAlternative);
        }
      }

      // Suggest different tokens on the same chain
      if (request.paymentMethod === 'crypto' && 'chainId' in request.paymentDetails) {
        const tokenAlternatives = await this.createTokenAlternatives(request);
        alternatives.push(...tokenAlternatives);
      }

      return alternatives;
    } catch (error) {
      safeLogger.error('Error generating payment alternatives:', error);
      return [];
    }
  }

  /**
   * Estimate fees for different payment methods
   */
  async estimatePaymentFees(request: PaymentValidationRequest): Promise<PaymentFees> {
    try {
      switch (request.paymentMethod) {
        case 'crypto':
          return await this.estimateCryptoFees(request);
        case 'fiat':
          return await this.estimateFiatFees(request);
        case 'escrow':
          return await this.estimateEscrowFees(request);
        default:
          throw new Error('Invalid payment method');
      }
    } catch (error) {
      safeLogger.error('Error estimating payment fees:', error);
      return {
        processingFee: 0,
        platformFee: 0,
        totalFees: 0,
        currency: request.currency
      };
    }
  }

  // Private helper methods

  private validateBasicRequest(request: PaymentValidationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (!request.amount || request.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!request.currency) {
      errors.push('Currency is required');
    }

    if (!request.userAddress || !ethers.isAddress(request.userAddress)) {
      errors.push('Valid user address is required');
    }

    if (!request.paymentDetails) {
      errors.push('Payment details are required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async validateCryptoPayment(
    request: PaymentValidationRequest,
    result: PaymentValidationResult
  ): Promise<PaymentValidationResult> {
    const details = request.paymentDetails as CryptoPaymentDetails;

    // Validate crypto payment details
    if (!details.tokenAddress || !ethers.isAddress(details.tokenAddress)) {
      result.errors.push('Valid token address is required');
      return result;
    }

    if (!details.recipientAddress || !ethers.isAddress(details.recipientAddress)) {
      result.errors.push('Valid recipient address is required');
      return result;
    }

    if (!details.chainId || !this.SUPPORTED_TOKENS[details.chainId as keyof typeof this.SUPPORTED_TOKENS]) {
      result.errors.push('Unsupported chain');
      return result;
    }

    // Check token support
    const token = this.getTokenInfo(details.tokenAddress, details.chainId);
    if (!token) {
      result.errors.push('Unsupported token');
      return result;
    }

    // Check balance
    try {
      const balanceCheck = await this.checkCryptoBalance(
        request.userAddress,
        details.tokenAddress,
        request.amount.toString(),
        details.chainId
      );

      result.hasSufficientBalance = balanceCheck.hasSufficientBalance;

      if (!balanceCheck.hasSufficientBalance) {
        result.errors.push(`Insufficient ${token.symbol} balance. Required: ${request.amount}, Available: ${balanceCheck.balance.balanceFormatted}`);

        // Generate alternatives
        result.suggestedAlternatives = await this.getPaymentAlternatives(request, 'insufficient_balance');
      }

      // Check gas balance for ERC-20 tokens
      if (details.tokenAddress !== '0x0000000000000000000000000000000000000000' && balanceCheck.gasBalance) {
        const minGasBalance = ethers.parseUnits(this.MIN_BALANCES.ETH, balanceCheck.gasBalance.decimals);
        if (BigInt(balanceCheck.gasBalance.balance) < minGasBalance) {
          result.warnings.push(`Low ${balanceCheck.gasBalance.tokenSymbol} balance for gas fees. Consider adding more ${balanceCheck.gasBalance.tokenSymbol}.`);
        }
      }

      // Estimate fees
      result.estimatedFees = await this.estimatePaymentFees(request);

      result.isValid = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push('Failed to validate crypto payment: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return result;
    }
  }

  private async validateFiatPayment(
    request: PaymentValidationRequest,
    result: PaymentValidationResult
  ): Promise<PaymentValidationResult> {
    const details = request.paymentDetails as FiatPaymentDetails;

    // Validate fiat payment details
    if (!details.paymentMethodId) {
      result.errors.push('Payment method ID is required');
      return result;
    }

    if (!details.provider || !['stripe', 'paypal', 'bank_transfer'].includes(details.provider)) {
      result.errors.push('Valid payment provider is required');
      return result;
    }

    // Check currency support
    const supportedFiatCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
    if (!supportedFiatCurrencies.includes(request.currency)) {
      result.errors.push(`Unsupported fiat currency: ${request.currency}`);
      return result;
    }

    // Fiat payments don't require balance checks (handled by payment processor)
    result.hasSufficientBalance = true;

    // Estimate fees
    result.estimatedFees = await this.estimatePaymentFees(request);

    // Get exchange rates if crypto conversion is requested
    if (details.convertToCrypto) {
      try {
        const exchangeRate = await this.exchangeRateService.getExchangeRate(
          request.currency,
          details.convertToCrypto.targetToken
        );
        result.exchangeRates = [{
          fromCurrency: request.currency,
          toCurrency: details.convertToCrypto.targetToken,
          rate: exchangeRate.rate,
          lastUpdated: new Date(),
          source: 'exchange_service'
        }];
      } catch (error) {
        result.warnings.push('Unable to get current exchange rates for crypto conversion');
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  private async validateEscrowPayment(
    request: PaymentValidationRequest,
    result: PaymentValidationResult
  ): Promise<PaymentValidationResult> {
    const details = request.paymentDetails as EscrowPaymentDetails;

    // Validate escrow payment details
    if (!details.tokenAddress || !ethers.isAddress(details.tokenAddress)) {
      result.errors.push('Valid token address is required for escrow');
      return result;
    }

    if (!details.chainId || !this.SUPPORTED_TOKENS[details.chainId as keyof typeof this.SUPPORTED_TOKENS]) {
      result.errors.push('Unsupported chain for escrow');
      return result;
    }

    if (!details.escrowDuration || details.escrowDuration < 1 || details.escrowDuration > 30) {
      result.errors.push('Escrow duration must be between 1 and 30 days');
      return result;
    }

    // Check token support
    const token = this.getTokenInfo(details.tokenAddress, details.chainId);
    if (!token) {
      result.errors.push('Unsupported token for escrow');
      return result;
    }

    // Check balance (same as crypto payment)
    try {
      const balanceCheck = await this.checkCryptoBalance(
        request.userAddress,
        details.tokenAddress,
        request.amount.toString(),
        details.chainId
      );

      result.hasSufficientBalance = balanceCheck.hasSufficientBalance;

      if (!balanceCheck.hasSufficientBalance) {
        result.errors.push(`Insufficient ${token.symbol} balance for escrow. Required: ${request.amount}, Available: ${balanceCheck.balance.balanceFormatted}`);

        // Generate alternatives
        result.suggestedAlternatives = await this.getPaymentAlternatives(request, 'insufficient_balance');
      }

      // Estimate fees (higher than regular crypto due to escrow complexity)
      result.estimatedFees = await this.estimatePaymentFees(request);

      result.isValid = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push('Failed to validate escrow payment: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return result;
    }
  }

  private async estimateCryptoFees(request: PaymentValidationRequest): Promise<PaymentFees> {
    const details = request.paymentDetails as CryptoPaymentDetails;

    // Estimate gas fees
    let gasFee = 0;
    try {
      const gasPrice = await this.provider.getFeeData();
      const gasLimit = details.tokenAddress === '0x0000000000000000000000000000000000000000' ? 21000 : 65000;

      if (gasPrice.gasPrice) {
        const gasCost = gasPrice.gasPrice * BigInt(gasLimit);
        gasFee = parseFloat(ethers.formatEther(gasCost));
      }
    } catch (error) {
      safeLogger.error('Error estimating gas fees:', error);
      gasFee = 0.01; // Fallback estimate
    }

    const platformFee = request.amount * 0.005; // 0.5% platform fee

    return {
      processingFee: 0,
      platformFee,
      gasFee,
      totalFees: platformFee + gasFee,
      currency: details.tokenSymbol
    };
  }

  private async estimateFiatFees(request: PaymentValidationRequest): Promise<PaymentFees> {
    const details = request.paymentDetails as FiatPaymentDetails;

    let processingFee = 0;

    // Provider-specific fees
    switch (details.provider) {
      case 'stripe':
        processingFee = (request.amount * 0.029) + 0.30; // 2.9% + $0.30
        break;
      case 'paypal':
        processingFee = request.amount * 0.034; // 3.4%
        break;
      case 'bank_transfer':
        processingFee = 5.00; // Flat fee
        break;
    }

    const platformFee = request.amount * 0.01; // 1% platform fee
    let exchangeFee = 0;

    // Add exchange fee if converting to crypto
    if (details.convertToCrypto) {
      exchangeFee = request.amount * 0.005; // 0.5% exchange fee
    }

    return {
      processingFee,
      platformFee,
      exchangeFee,
      totalFees: processingFee + platformFee + exchangeFee,
      currency: request.currency
    };
  }

  private async estimateEscrowFees(request: PaymentValidationRequest): Promise<PaymentFees> {
    const cryptoFees = await this.estimateCryptoFees(request);

    // Escrow adds additional fees for security and dispute resolution
    const escrowFee = request.amount * 0.01; // 1% escrow fee

    return {
      ...cryptoFees,
      processingFee: escrowFee,
      totalFees: cryptoFees.totalFees + escrowFee
    };
  }

  private async createFiatAlternative(request: PaymentValidationRequest): Promise<PaymentAlternative | null> {
    try {
      const fiatFees = await this.estimateFiatFees({
        ...request,
        paymentMethod: 'fiat',
        paymentDetails: {
          paymentMethodId: 'stripe_default',
          provider: 'stripe',
          currency: 'USD'
        } as FiatPaymentDetails
      });

      return {
        method: 'fiat',
        description: 'Pay with credit card, bank transfer, or digital wallet',
        available: true,
        estimatedTotal: request.amount + fiatFees.totalFees,
        currency: 'USD',
        fees: fiatFees,
        processingTime: 'Instant',
        benefits: [
          'No crypto balance required',
          'Instant processing',
          'Familiar payment methods',
          'Buyer protection included'
        ]
      };
    } catch (error) {
      safeLogger.error('Error creating fiat alternative:', error);
      return null;
    }
  }

  private async createCryptoAlternatives(request: PaymentValidationRequest): Promise<PaymentAlternative[]> {
    const alternatives: PaymentAlternative[] = [];

    try {
      // Suggest stablecoins as crypto alternatives
      const stablecoins = [
        { address: getTokenAddress('USDC', 1), symbol: 'USDC', chainId: 1 },
        { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', chainId: 137 }
      ];

      for (const token of stablecoins) {
        try {
          const balanceCheck = await this.checkCryptoBalance(
            request.userAddress,
            token.address,
            request.amount.toString(),
            token.chainId
          );

          if (balanceCheck.hasSufficientBalance) {
            const cryptoFees = await this.estimateCryptoFees({
              ...request,
              paymentMethod: 'crypto',
              paymentDetails: {
                tokenAddress: token.address,
                tokenSymbol: token.symbol,
                tokenDecimals: 6,
                chainId: token.chainId,
                recipientAddress: request.userAddress
              } as CryptoPaymentDetails
            });

            alternatives.push({
              method: 'crypto',
              description: `Pay with ${token.symbol} on ${token.chainId === 1 ? 'Ethereum' : 'Polygon'}`,
              available: true,
              estimatedTotal: request.amount + cryptoFees.totalFees,
              currency: token.symbol,
              fees: cryptoFees,
              processingTime: '1-5 minutes',
              benefits: [
                'Lower fees than fiat',
                'Decentralized payment',
                'Fast settlement'
              ]
            });
          }
        } catch (error) {
          safeLogger.error(`Error checking ${token.symbol} balance:`, error);
        }
      }

      return alternatives;
    } catch (error) {
      safeLogger.error('Error creating crypto alternatives:', error);
      return [];
    }
  }

  private async createEscrowAlternative(request: PaymentValidationRequest): Promise<PaymentAlternative | null> {
    try {
      // Use the same token as the original request if it's crypto
      let tokenAddress = '0x0000000000000000000000000000000000000000';
      let tokenSymbol = 'ETH';
      let chainId = 1;

      if (request.paymentMethod === 'crypto') {
        const details = request.paymentDetails as CryptoPaymentDetails;
        tokenAddress = details.tokenAddress;
        tokenSymbol = details.tokenSymbol;
        chainId = details.chainId;
      }

      const escrowFees = await this.estimateEscrowFees({
        ...request,
        paymentMethod: 'escrow',
        paymentDetails: {
          tokenAddress,
          tokenSymbol,
          tokenDecimals: 18,
          chainId,
          escrowDuration: 7,
          requiresDeliveryConfirmation: true
        } as EscrowPaymentDetails
      });

      return {
        method: 'escrow',
        description: 'Secure escrow payment with buyer protection',
        available: true,
        estimatedTotal: request.amount + escrowFees.totalFees,
        currency: tokenSymbol,
        fees: escrowFees,
        processingTime: '1-5 minutes',
        benefits: [
          'Buyer protection',
          'Dispute resolution',
          'Funds held securely',
          'Automatic release on delivery'
        ],
        requirements: [
          'Sufficient crypto balance',
          'Delivery confirmation required'
        ]
      };
    } catch (error) {
      safeLogger.error('Error creating escrow alternative:', error);
      return null;
    }
  }

  private async createTokenAlternatives(request: PaymentValidationRequest): Promise<PaymentAlternative[]> {
    const alternatives: PaymentAlternative[] = [];
    const details = request.paymentDetails as CryptoPaymentDetails;

    try {
      const supportedTokens = this.SUPPORTED_TOKENS[details.chainId as keyof typeof this.SUPPORTED_TOKENS] || [];

      for (const token of supportedTokens) {
        if (token.address === details.tokenAddress) continue; // Skip current token

        try {
          const balanceCheck = await this.checkCryptoBalance(
            request.userAddress,
            token.address,
            request.amount.toString(),
            details.chainId
          );

          if (balanceCheck.hasSufficientBalance) {
            const tokenFees = await this.estimateCryptoFees({
              ...request,
              paymentDetails: {
                ...details,
                tokenAddress: token.address,
                tokenSymbol: token.symbol,
                tokenDecimals: token.decimals
              }
            });

            alternatives.push({
              method: 'crypto',
              description: `Pay with ${token.symbol} instead`,
              available: true,
              estimatedTotal: request.amount + tokenFees.totalFees,
              currency: token.symbol,
              fees: tokenFees,
              processingTime: '1-5 minutes',
              benefits: [
                `You have sufficient ${token.symbol} balance`,
                'Same network, lower switching cost'
              ]
            });
          }
        } catch (error) {
          safeLogger.error(`Error checking ${token.symbol} alternative:`, error);
        }
      }

      return alternatives;
    } catch (error) {
      safeLogger.error('Error creating token alternatives:', error);
      return [];
    }
  }

  private getTokenInfo(tokenAddress: string, chainId: number) {
    const tokens = this.SUPPORTED_TOKENS[chainId as keyof typeof this.SUPPORTED_TOKENS];
    return tokens?.find(token => token.address.toLowerCase() === tokenAddress.toLowerCase());
  }

  private getNativeToken(chainId: number) {
    const tokens = this.SUPPORTED_TOKENS[chainId as keyof typeof this.SUPPORTED_TOKENS];
    return tokens?.find(token => token.address === '0x0000000000000000000000000000000000000000');
  }
}
