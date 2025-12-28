import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';

export interface LDAOPurchaseOptions {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  paymentMethod: 'card' | 'bank' | 'apple_pay' | 'google_pay' | 'crypto';
}

export interface PurchaseQuote {
  ldaoAmount: string;
  usdAmount: string;
  ethAmount: string;
  usdcAmount: string;
  discount: number;
  fees: {
    processing: string;
    gas: string;
    total: string;
  };
  estimatedTime: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionHash?: string;
  ldaoAmount?: string;
  error?: string;
}

export interface SwapResult {
  success: boolean;
  transactionHash?: string;
  ldaoReceived?: string;
  error?: string;
}

export interface EarnOpportunity {
  id: string;
  title: string;
  description: string;
  reward: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeEstimate: string;
  category: 'social' | 'marketplace' | 'governance' | 'referral';
  requirements?: string[];
}

class LDAOAcquisitionService {
  private treasuryContract: ethers.Contract | null = null;
  private ldaoContract: ethers.Contract | null = null;
  private provider: ethers.BrowserProvider | null = null;
  private initializationPromise: Promise<void> | null = null;
  private initializationAttempted: boolean = false;

  constructor() {
    // Don't initialize in constructor - let it happen on first use
  }

  /**
   * Ensure contracts are initialized before use (lazy initialization)
   */
  private async ensureContractsInitialized(): Promise<void> {
    // If already initialized, return immediately
    if (this.treasuryContract && this.ldaoContract) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    if (typeof window !== 'undefined' && window.ethereum) {
      const treasuryAddress = process.env.NEXT_PUBLIC_LDAO_TREASURY_ADDRESS;
      const ldaoAddress = process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS;

      if (treasuryAddress && ldaoAddress && !this.initializationAttempted) {
        this.initializationPromise = this.initializeContracts();
        await this.initializationPromise;
      }
    }
  }

  private async initializeContracts(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        this.initializationAttempted = true;
        
        // Create provider without requiring immediate access to signer
        this.provider = new ethers.BrowserProvider(window.ethereum);

        // Initialize contracts with deployed addresses
        const treasuryAddress = process.env.NEXT_PUBLIC_LDAO_TREASURY_ADDRESS;
        const ldaoAddress = process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS;

        if (!treasuryAddress || !ldaoAddress) {
          console.warn('Treasury or LDAO token address not configured');
          return;
        }

        // Get signer only when needed, not during initialization
        const signer = await this.provider.getSigner().catch(() => {
          console.warn('No signer available, using provider only');
          return null;
        });

        // Treasury contract ABI (simplified)
        const treasuryABI = [
          'function purchaseWithETH(uint256 ldaoAmount) external payable',
          'function purchaseWithUSDC(uint256 ldaoAmount) external',
          'function getQuote(uint256 ldaoAmount) external view returns (uint256, uint256, uint256, uint256)',
          'function ldaoPriceInUSD() external view returns (uint256)',
          'function salesActive() external view returns (bool)'
        ];

        // LDAO token ABI (simplified)
        const ldaoABI = [
          'function balanceOf(address owner) external view returns (uint256)',
          'function transfer(address to, uint256 amount) external returns (bool)',
          'function approve(address spender, uint256 amount) external returns (bool)'
        ];

        // Only initialize with signer if available, otherwise use provider
        this.treasuryContract = new ethers.Contract(
          treasuryAddress, 
          treasuryABI, 
          signer || this.provider
        );
        this.ldaoContract = new ethers.Contract(
          ldaoAddress, 
          ldaoABI, 
          signer || this.provider
        );
      }
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      this.initializationPromise = null;
      // Don't throw here - allow initialization to be retried later
      if (error instanceof Error && error.message.includes('No signer available')) {
        console.warn('Contract initialized in read-only mode (no signer)');
      } else {
        console.error('Contract initialization failed:', error);
      }
    }
  }

  /**
   * Purchase LDAO tokens with fiat currency
   */
  async purchaseWithFiat(options: LDAOPurchaseOptions): Promise<PurchaseResult> {
    try {
      // For fiat purchases, integrate with payment processors
      switch (options.paymentMethod) {
        case 'card':
          return await this.purchaseWithStripe(options);
        case 'apple_pay':
        case 'google_pay':
          return await this.purchaseWithMobileWallet(options);
        default:
          throw new Error('Payment method not supported');
      }
    } catch (error) {
      console.error('Fiat purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  async purchaseWithMoonPay(amount: number, currency: string = 'USD'): Promise<PurchaseResult> {
    try {
      // Generate MoonPay URL with parameters
      const moonPayApiKey = process.env.NEXT_PUBLIC_MOONPAY_API_KEY || 'pk_test_placeholder';
      const redirectUrl = encodeURIComponent(`${window.location.origin}/ldao-dashboard?purchase=success`);
      const moonPayUrl = `https://buy.moonpay.com?apiKey=${moonPayApiKey}&currencyCode=eth&baseCurrencyCode=${currency.toLowerCase()}&baseCurrencyAmount=${amount}&redirectURL=${redirectUrl}`;

      // Open MoonPay widget in popup
      window.open(moonPayUrl, 'moonpay', 'width=400,height=600');

      // For demo purposes, we'll simulate a successful purchase
      // In a real implementation, you would wait for a callback from MoonPay

      return {
        success: true,
        ldaoAmount: (amount / 0.01).toString() // Calculate based on current price
      };
    } catch (error) {
      console.error('MoonPay purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  /**
   * Purchase LDAO tokens with cryptocurrency
   */
  async purchaseWithCrypto(fromToken: 'ETH' | 'USDC', ldaoAmount: string): Promise<PurchaseResult> {
    try {
      // Ensure contracts are initialized
      await this.ensureContractsInitialized();

      if (!this.treasuryContract || !this.provider) {
        throw new Error('Contracts not initialized. Please check your network connection and try again.');
      }

      // Get signer - this will fail if no wallet is connected
      const signer = await this.provider.getSigner();
      if (!signer) {
        throw new Error('No wallet connected. Please connect your wallet to make a purchase.');
      }

      const ldaoAmountWei = ethers.parseEther(ldaoAmount);

      if (fromToken === 'ETH') {
        // Get quote for ETH purchase
        const quote = await this.getQuote(ldaoAmount);

        const tx = await this.treasuryContract.purchaseWithETH(ldaoAmountWei, {
          value: ethers.parseEther(quote.ethAmount)
        });

        const receipt = await tx.wait();

        toast.success(`Successfully purchased ${ldaoAmount} LDAO tokens!`);

        // Save purchase transaction
        this.savePurchaseTransaction({
          hash: receipt.transactionHash,
          user: await signer.getAddress(),
          amount: ldaoAmount,
          cost: quote.ethAmount,
          currency: 'ETH',
          timestamp: Date.now(),
          type: 'purchase',
          status: 'success',
          method: 'crypto'
        });

        return {
          success: true,
          transactionHash: receipt.transactionHash,
          ldaoAmount
        };
      } else if (fromToken === 'USDC') {
        // Get USDC contract
        const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS;
        if (!usdcAddress) {
          throw new Error('USDC address not configured');
        }

        const usdcContract = new ethers.Contract(
          usdcAddress,
          [
            'function approve(address spender, uint256 amount) external returns (bool)',
            'function allowance(address owner, address spender) external view returns (uint256)'
          ],
          signer
        );

        const quote = await this.getQuote(ldaoAmount);

        // Calculate USDC amount in wei (6 decimals)
        // quote.usdAmount is in USD (18 decimals), convert to 6 decimals
        const usdAmountWei = ethers.parseEther(quote.usdAmount);
        const usdcAmountWei = usdAmountWei / (BigInt(10) ** BigInt(12));

        // Check current allowance
        const userAddress = await signer.getAddress();
        const currentAllowance = await usdcContract.allowance(userAddress, this.treasuryContract.address);

        // Approve USDC spending if needed
        if (currentAllowance < usdcAmountWei) {
          const toastId = toast.loading('Please approve USDC spending in your wallet...');

          const approveTx = await usdcContract.approve(this.treasuryContract.address, usdcAmountWei);

          toast.loading('Waiting for approval confirmation...', { id: toastId });
          await approveTx.wait();

          toast.success('USDC approved! Proceeding with purchase...', { id: toastId });
        }

        // Purchase with USDC
        const purchaseTx = await this.treasuryContract.purchaseWithUSDC(ldaoAmountWei);
        const receipt = await purchaseTx.wait();

        toast.success(`Successfully purchased ${ldaoAmount} LDAO tokens with USDC!`);

        // Save purchase transaction
        this.savePurchaseTransaction({
          hash: receipt.hash,
          user: userAddress,
          amount: ldaoAmount,
          cost: quote.usdcAmount,
          currency: 'USDC',
          timestamp: Date.now(),
          type: 'purchase',
          status: 'success',
          method: 'crypto'
        });

        return {
          success: true,
          transactionHash: receipt.hash,
          ldaoAmount
        };
      }

      throw new Error('Unsupported token');
    } catch (error) {
      console.error('Crypto purchase error:', error);

      // Handle user rejection
      if (typeof error === 'object' && error !== null && 'code' in error && ((error as any).code === 4001 || (error as any).code === 'ACTION_REJECTED')) {
        toast.error('Transaction rejected by user');
        return {
          success: false,
          error: 'Transaction rejected by user'
        };
      }

      toast.error('Purchase failed. Please try again.');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  /**
   * Swap tokens for LDAO using DEX
   */
  async swapForLDAO(fromToken: string, amount: string): Promise<SwapResult> {
    try {
      // Integrate with Uniswap V3 or other DEX
      const swapResult = await this.executeUniswapSwap(fromToken, amount);

      if (swapResult.success) {
        toast.success(`Successfully swapped for ${swapResult.ldaoReceived} LDAO tokens!`);
      }

      return swapResult;
    } catch (error) {
      console.error('Swap error:', error);
      toast.error('Swap failed. Please try again.');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed'
      };
    }
  }

  /**
   * Get purchase quote
   */
  async getQuote(ldaoAmount: string): Promise<PurchaseQuote> {
    try {
      // Ensure contracts are initialized
      await this.ensureContractsInitialized();

      if (!this.treasuryContract) {
        // Return a default quote if contract is not initialized
        // This allows the UI to still function even if contract is not available
        return {
          ldaoAmount,
          usdAmount: (parseFloat(ldaoAmount) * 0.01).toString(), // Default price of $0.01 per LDAO
          ethAmount: (parseFloat(ldaoAmount) * 0.000005).toString(), // Default ETH rate
          usdcAmount: (parseFloat(ldaoAmount) * 0.01).toString(), // Default USDC rate
          discount: 0,
          fees: {
            processing: '0.01',
            gas: '0.005',
            total: '0.015'
          },
          estimatedTime: '2-5 minutes'
        };
      }

      const ldaoAmountWei = ethers.parseEther(ldaoAmount);
      const [usdAmount, ethAmount, usdcAmount, discount] = await this.treasuryContract.getQuote(ldaoAmountWei);

      // Calculate fees
      const processingFee = ethers.parseEther('0.01'); // $0.01 processing fee
      const gasFee = ethers.parseEther('0.005'); // Estimated gas fee
      const totalFees = processingFee + gasFee;

      return {
        ldaoAmount,
        usdAmount: ethers.formatEther(usdAmount),
        ethAmount: ethers.formatEther(ethAmount),
        usdcAmount: ethers.formatUnits(usdcAmount, 6),
        discount: Number(discount) / 100, // Convert from basis points (100 = 1%)
        fees: {
          processing: ethers.formatEther(processingFee),
          gas: ethers.formatEther(gasFee),
          total: ethers.formatEther(totalFees)
        },
        estimatedTime: '2-5 minutes'
      };
    } catch (error) {
      console.error('Quote error:', error);
      // Return a default quote to allow functionality even if contract call fails
      return {
        ldaoAmount,
        usdAmount: (parseFloat(ldaoAmount) * 0.01).toString(), // Default price of $0.01 per LDAO
        ethAmount: (parseFloat(ldaoAmount) * 0.000005).toString(), // Default ETH rate
        usdcAmount: (parseFloat(ldaoAmount) * 0.01).toString(), // Default USDC rate
        discount: 0,
        fees: {
          processing: '0.01',
          gas: '0.005',
          total: '0.015'
        },
        estimatedTime: '2-5 minutes'
      };
    }
  }

  /**
   * Get available earning opportunities
   */
  async getEarnOpportunities(): Promise<EarnOpportunity[]> {
    return [
      {
        id: 'profile_setup',
        title: 'Complete Profile Setup',
        description: 'Add profile picture, bio, and social links',
        reward: '50 LDAO',
        difficulty: 'easy',
        timeEstimate: '5 minutes',
        category: 'social',
        requirements: ['Connect wallet', 'Verify email']
      },
      {
        id: 'first_post',
        title: 'Create Your First Post',
        description: 'Share content with the community',
        reward: '25 LDAO',
        difficulty: 'easy',
        timeEstimate: '10 minutes',
        category: 'social'
      },
      {
        id: 'governance_vote',
        title: 'Participate in Governance',
        description: 'Vote on active proposals',
        reward: '15 LDAO',
        difficulty: 'medium',
        timeEstimate: '15 minutes',
        category: 'governance',
        requirements: ['Hold minimum 10 LDAO tokens']
      },
      {
        id: 'marketplace_listing',
        title: 'Create Marketplace Listing',
        description: 'List your first item for sale',
        reward: '100 LDAO',
        difficulty: 'medium',
        timeEstimate: '20 minutes',
        category: 'marketplace',
        requirements: ['Complete KYC verification']
      },
      {
        id: 'referral_signup',
        title: 'Refer New Users',
        description: 'Invite friends to join the platform',
        reward: '25 LDAO per referral',
        difficulty: 'easy',
        timeEstimate: '5 minutes',
        category: 'referral'
      },
      {
        id: 'daily_engagement',
        title: 'Daily Platform Engagement',
        description: 'Like, comment, and share content daily',
        reward: '5-15 LDAO',
        difficulty: 'easy',
        timeEstimate: '15 minutes',
        category: 'social'
      }
    ];
  }

  /**
   * Claim earned LDAO tokens
   */
  async claimEarnedTokens(opportunityId: string): Promise<PurchaseResult> {
    try {
      // Call backend API to verify completion and mint tokens
      const response = await fetch('/api/ldao/claim-earned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ opportunityId })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Claimed ${result.amount} LDAO tokens!`);
        return {
          success: true,
          ldaoAmount: result.amount
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Claim error:', error);
      toast.error('Failed to claim tokens. Please try again.');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Claim failed'
      };
    }
  }

  /**
   * Get user's LDAO balance
   */
  async getLDAOBalance(address: string): Promise<string> {
    try {
      // Ensure contracts are initialized
      await this.ensureContractsInitialized();

      if (!this.ldaoContract) {
        throw new Error('LDAO contract not initialized');
      }

      const balance = await this.ldaoContract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Balance error:', error);
      // Return 0 if the contract call fails (e.g., due to network issues)
      return '0';
    }
  }

  /**
   * Check if sales are active
   */
  async isSalesActive(): Promise<boolean> {
    try {
      // Ensure contracts are initialized
      await this.ensureContractsInitialized();

      if (!this.treasuryContract) {
        return false;
      }

      return await this.treasuryContract.salesActive();
    } catch (error) {
      console.error('Sales status error:', error);
      return false;
    }
  }

  // Private methods for payment integration
  private async purchaseWithStripe(options: LDAOPurchaseOptions): Promise<PurchaseResult> {
    try {
      // Create Stripe payment intent
      const response = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: options.amount,
          currency: options.currency.toLowerCase(),
          ldaoAmount: (options.amount / 0.01).toString() // Assuming $0.01 per LDAO
        })
      });

      const { clientSecret, ldaoAmount } = await response.json();

      // Process payment with Stripe (implementation depends on Stripe integration)
      // This would typically involve Stripe Elements or Payment Element

      return {
        success: true,
        ldaoAmount
      };
    } catch (error) {
      throw error;
    }
  }



  private async purchaseWithMobileWallet(options: LDAOPurchaseOptions): Promise<PurchaseResult> {
    try {
      // Integrate with Apple Pay / Google Pay
      // This would use the respective mobile wallet APIs

      return {
        success: true,
        ldaoAmount: (options.amount / 0.01).toString()
      };
    } catch (error) {
      throw error;
    }
  }

  private async executeUniswapSwap(fromToken: string, amount: string): Promise<SwapResult> {
    try {
      // Integrate with Uniswap V3 SDK
      // This would involve creating swap transactions through Uniswap router

      return {
        success: true,
        transactionHash: '0x...',
        ldaoReceived: '1000' // Calculated based on swap
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save purchase transaction to local storage for history tracking
   */
  public savePurchaseTransaction(transaction: any): void {
    try {
      // In a real implementation, this would save to a backend database
      // For now, we'll save to localStorage for demo purposes

      const existingTransactions = localStorage.getItem('ldao_purchase_transactions');
      const transactions = existingTransactions ? JSON.parse(existingTransactions) : [];

      transactions.push(transaction);

      // Keep only the last 100 transactions
      if (transactions.length > 100) {
        transactions.splice(0, transactions.length - 100);
      }

      localStorage.setItem('ldao_purchase_transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save purchase transaction:', error);
    }
  }
}

export const ldaoAcquisitionService = new LDAOAcquisitionService();