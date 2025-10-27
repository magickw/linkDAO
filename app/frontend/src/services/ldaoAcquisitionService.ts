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
  private provider: ethers.providers.Web3Provider | null = null;
  private initializationAttempted: boolean = false;

  constructor() {
    this.initializeContracts();
  }

  /**
   * Ensure contracts are initialized before use (lazy initialization)
   */
  private ensureContractsInitialized() {
    if (!this.treasuryContract && typeof window !== 'undefined' && window.ethereum) {
      const treasuryAddress = process.env.NEXT_PUBLIC_LDAO_TREASURY_ADDRESS;
      const ldaoAddress = process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS;

      if (treasuryAddress && ldaoAddress && !this.initializationAttempted) {
        this.initializeContracts();
      }
    }
  }

  private async initializeContracts() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.initializationAttempted = true;
      this.provider = new ethers.providers.Web3Provider(window.ethereum);

      // Initialize contracts with deployed addresses
      const treasuryAddress = process.env.NEXT_PUBLIC_LDAO_TREASURY_ADDRESS;
      const ldaoAddress = process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS;

      if (treasuryAddress && ldaoAddress) {
        const signer = this.provider.getSigner();

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

        this.treasuryContract = new ethers.Contract(treasuryAddress, treasuryABI, signer);
        this.ldaoContract = new ethers.Contract(ldaoAddress, ldaoABI, signer);
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

  /**
   * Purchase LDAO tokens with cryptocurrency
   */
  async purchaseWithCrypto(fromToken: 'ETH' | 'USDC', ldaoAmount: string): Promise<PurchaseResult> {
    try {
      // Ensure contracts are initialized
      this.ensureContractsInitialized();

      if (!this.treasuryContract || !this.provider) {
        throw new Error('Contracts not initialized. Please check your network connection and try again.');
      }

      const signer = this.provider.getSigner();
      const ldaoAmountWei = ethers.utils.parseEther(ldaoAmount);

      if (fromToken === 'ETH') {
        // Get quote for ETH purchase
        const quote = await this.getQuote(ldaoAmount);

        const tx = await this.treasuryContract.purchaseWithETH(ldaoAmountWei, {
          value: ethers.utils.parseEther(quote.ethAmount)
        });

        const receipt = await tx.wait();

        toast.success(`Successfully purchased ${ldaoAmount} LDAO tokens!`);

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
        const usdAmountWei = ethers.utils.parseEther(quote.usdAmount);
        const usdcAmountWei = usdAmountWei.div(ethers.BigNumber.from(10).pow(12));

        // Check current allowance
        const userAddress = await signer.getAddress();
        const currentAllowance = await usdcContract.allowance(userAddress, this.treasuryContract.address);

        // Approve USDC spending if needed
        if (currentAllowance.lt(usdcAmountWei)) {
          toast.info('Please approve USDC spending in your wallet...');

          const approveTx = await usdcContract.approve(this.treasuryContract.address, usdcAmountWei);

          toast.info('Waiting for approval confirmation...');
          await approveTx.wait();

          toast.success('USDC approved! Proceeding with purchase...');
        }

        // Purchase with USDC
        const purchaseTx = await this.treasuryContract.purchaseWithUSDC(ldaoAmountWei);
        const receipt = await purchaseTx.wait();

        toast.success(`Successfully purchased ${ldaoAmount} LDAO tokens with USDC!`);

        return {
          success: true,
          transactionHash: receipt.transactionHash,
          ldaoAmount
        };
      }

      throw new Error('Unsupported token');
    } catch (error) {
      console.error('Crypto purchase error:', error);

      // Handle user rejection
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
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
      this.ensureContractsInitialized();

      if (!this.treasuryContract) {
        throw new Error('Treasury contract not initialized');
      }

      const ldaoAmountWei = ethers.utils.parseEther(ldaoAmount);
      const [usdAmount, ethAmount, usdcAmount, discount] = await this.treasuryContract.getQuote(ldaoAmountWei);

      // Calculate fees
      const processingFee = ethers.utils.parseEther('0.01'); // $0.01 processing fee
      const gasFee = ethers.utils.parseEther('0.005'); // Estimated gas fee
      const totalFees = processingFee.add(gasFee);

      return {
        ldaoAmount,
        usdAmount: ethers.utils.formatEther(usdAmount),
        ethAmount: ethers.utils.formatEther(ethAmount),
        usdcAmount: ethers.utils.formatUnits(usdcAmount, 6),
        discount: discount.toNumber() / 10000, // Convert from basis points (10000 = 100%)
        fees: {
          processing: ethers.utils.formatEther(processingFee),
          gas: ethers.utils.formatEther(gasFee),
          total: ethers.utils.formatEther(totalFees)
        },
        estimatedTime: '2-5 minutes'
      };
    } catch (error) {
      console.error('Quote error:', error);
      throw error;
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
      this.ensureContractsInitialized();

      if (!this.ldaoContract) {
        throw new Error('LDAO contract not initialized');
      }

      const balance = await this.ldaoContract.balanceOf(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Balance error:', error);
      return '0';
    }
  }

  /**
   * Check if sales are active
   */
  async isSalesActive(): Promise<boolean> {
    try {
      // Ensure contracts are initialized
      this.ensureContractsInitialized();

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
}

export const ldaoAcquisitionService = new LDAOAcquisitionService();