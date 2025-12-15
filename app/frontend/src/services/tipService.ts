import { ethers } from 'ethers';
import { webSocketService } from './webSocketService';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface Tip {
  id: string;
  from: string;
  to: string;
  postId?: string;
  commentId?: string;
  amount: string;
  currency: 'LDAO' | 'USDC' | 'USDT';
  message?: string;
  timestamp: Date;
  isPublic: boolean;
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  fee?: string; // 5% DAO fee
  netAmount?: string; // Amount after fee
}

export interface Award {
  id: string;
  type: 'silver' | 'gold' | 'platinum' | 'diamond';
  cost: {
    LDAO: number;
    USDC?: number;
  };
  icon: string;
  label: string;
  description: string;
  benefits: string[];
}

export interface UserEarnings {
  totalEarned: string;
  claimable: string;
  rank: number;
  totalCreators: number;
  totalTips: number;
  totalEarnedByCurrency: {
    LDAO: string;
    USDC: string;
    USDT: string;
  };
}

export const AWARDS: Award[] = [
  {
    id: 'silver',
    type: 'silver',
    cost: { LDAO: 10 },
    icon: '🥈',
    label: 'Silver',
    description: 'Show appreciation for good content',
    benefits: ['Visible badge', 'Increased visibility']
  },
  {
    id: 'gold',
    type: 'gold',
    cost: { LDAO: 25 },
    icon: '🥇',
    label: 'Gold',
    description: 'Reward exceptional content',
    benefits: ['Prominent badge', 'Higher visibility', 'Creator gets 80%']
  },
  {
    id: 'platinum',
    type: 'platinum',
    cost: { LDAO: 50 },
    icon: '💎',
    label: 'Platinum',
    description: 'Recognize outstanding contributions',
    benefits: ['Special badge', 'Top visibility', 'Creator gets 85%']
  },
  {
    id: 'diamond',
    type: 'diamond',
    cost: { LDAO: 100 },
    icon: '💠',
    label: 'Diamond',
    description: 'Ultimate recognition for legendary content',
    benefits: ['Animated badge', 'Maximum visibility', 'Creator gets 90%']
  }
];

export class TipService {
  private static currentAddress: string | null = null;
  private static provider: ethers.BrowserProvider | null = null;

  /**
   * Validate that all required environment variables are present
   */
  static validateEnvironment(): { isValid: boolean; missingVars: string[] } {
    const requiredVars = [
      'NEXT_PUBLIC_TIP_ROUTER_ADDRESS',
      'NEXT_PUBLIC_LDAO_TOKEN_ADDRESS'
    ];

    // Check USDC and USDT only if they are intended to be supported
    // For now, we'll make them optional but log warnings
    const optionalVars = [
      'NEXT_PUBLIC_USDC_ADDRESS',
      'NEXT_PUBLIC_USDT_TOKEN_ADDRESS'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    // Warn about missing optional vars
    const missingOptionalVars = optionalVars.filter(varName => !process.env[varName]);
    if (missingOptionalVars.length > 0) {
      console.warn('Missing optional environment variables:', missingOptionalVars);
    }
    
    return {
      isValid: missingVars.length === 0,
      missingVars
    };
  }

  /**
   * Initialize the service with wallet connection
   */
  static async initialize(provider: ethers.BrowserProvider): Promise<void> {
    try {
      if (!provider) {
        throw new Error('Provider is required');
      }
      
      TipService.provider = provider;
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      TipService.currentAddress = address.toLowerCase();
      
      console.log('TipService initialized with address:', TipService.currentAddress);
    } catch (error) {
      console.error('Failed to initialize tip service:', error);
      // Reset state on error
      TipService.currentAddress = null;
      TipService.provider = null;
      throw error;
    }
  }

  /**
   * Create a new tip using smart contract
   */
  static async createTip(
    postId: string,
    creatorAddress: string,
    amount: string,
    currency: 'LDAO' | 'USDC' | 'USDT' = 'LDAO',
    message?: string,
    fromAddress?: string
  ): Promise<any> {
    if (!TipService.currentAddress || !TipService.provider) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Calculate fee (5% for DAO treasury)
      const feeAmount = TipService.calculateFee(amount, currency);
      const netAmount = TipService.subtractFee(amount, feeAmount, currency);

      // Get signer
      const signer = await TipService.provider.getSigner();

      // Get token contract
      const tokenContract = (await TipService.getTokenContract(currency)) as any;
      
      // Get the correct decimals for the token (USDC and USDT use 6 decimals, others use 18)
      const tokenDecimals = currency === 'USDC' || currency === 'USDT' ? 6 : 18;
      
      // Convert amount to proper units
      const amountInUnits = ethers.parseUnits(amount, tokenDecimals);

      // Approve tokens for spending by the TipRouter contract
      console.log('Approving tokens for spending...', {
        spender: process.env.NEXT_PUBLIC_TIP_ROUTER_ADDRESS,
        amount: amountInUnits.toString()
      });
      
      const approveTx = await tokenContract.connect(signer).approve(
        process.env.NEXT_PUBLIC_TIP_ROUTER_ADDRESS,
        amountInUnits
      );
      console.log('Approval transaction sent:', approveTx.hash);
      await approveTx.wait();
      console.log('Approval confirmed');

      // Send tip through TipRouter contract
      const tipRouterContract = await TipService.getTipRouterContract();
      
      // Convert currency string to PaymentMethod enum (0 = LDAO, 1 = USDC, 2 = USDT)
      let paymentMethod = 0; // Default to LDAO
      if (currency === 'USDC') {
        paymentMethod = 1;
      } else if (currency === 'USDT') {
        paymentMethod = 2;
      }
      
      // Convert postId string to bytes32
      const postIdBytes32 = ethers.id(postId);
      
      // Use the correct contract method with individual parameters
      let tipTx;
      if (message && message.trim()) {
        console.log('Sending tip with comment...', {
          postId: postIdBytes32,
          creatorAddress,
          amount: amountInUnits.toString(),
          paymentMethod,
          comment: message.trim()
        });
        
        tipTx = await (tipRouterContract.connect(signer) as any).tipWithComment(
          postIdBytes32,
          creatorAddress,
          amountInUnits,
          paymentMethod,
          message.trim()
        );
      } else {
        console.log('Sending tip...', {
          postId: postIdBytes32,
          creatorAddress,
          amount: amountInUnits.toString(),
          paymentMethod
        });
        
        tipTx = await (tipRouterContract.connect(signer) as any).tip(
          postIdBytes32,
          creatorAddress,
          amountInUnits,
          paymentMethod
        );
      }
      
      console.log('Tip transaction sent:', tipTx.hash);

      // Wait for transaction confirmation
      const receipt = await tipTx.wait();
      console.log('Tip transaction confirmed:', receipt);

      // Create tip record in database
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          creatorAddress,
          amount,
          currency,
          message,
          fromAddress: TipService.currentAddress,
          transactionHash: tipTx.hash,
          fee: feeAmount,
          netAmount,
          status: 'confirmed'
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tip record');
      }

      const tip = await response.json();

      // Send through WebSocket for real-time updates
      webSocketService.send('tip_sent', {
        tipId: tip.id,
        toAddress: creatorAddress,
        postId: postId,
        amount,
        currency,
        message
      });

      return { ...tip, transactionHash: tipTx.hash };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      console.error('Error in createTip:', error);
      throw error;
    }
  }

  /**
   * Send an award to a post or comment
   */
  static async sendAward(params: {
    toAddress: string;
    postId?: string;
    commentId?: string;
    awardType: 'silver' | 'gold' | 'platinum' | 'diamond';
    message?: string;
  }): Promise<any> {
    const award = AWARDS.find(a => a.type === params.awardType);
    if (!award) {
      throw new Error('Invalid award type');
    }

    return TipService.createTip(
      params.postId || '',
      params.toAddress,
      award.cost.LDAO.toString(),
      'LDAO',
      params.message
    );
  }

  /**
   * Get earnings for a user
   */
  static async getUserEarnings(userId: string): Promise<UserEarnings> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/tips/users/${userId}/earnings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user earnings');
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get detailed earnings for a user including currency breakdown
   */
  static async getUserDetailedEarnings(userId: string): Promise<Omit<UserEarnings, 'totalEarnedByCurrency'> & { totalEarnedByCurrency: { LDAO: string; USDC: string; USDT: string } }> {
    try {
      const [earnings, totalTips] = await Promise.all([
        TipService.getUserEarnings(userId),
        TipService.getUserTotalTips(userId)
      ]);

      // Calculate total earned by currency
      const totalEarnedByCurrency = {
        LDAO: '0',
        USDC: '0',
        USDT: '0'
      };

      // This would need to be calculated from the backend
      // For now, we'll use the totalTips data
      if (totalTips.LDAO !== '0') {
        totalEarnedByCurrency.LDAO = totalTips.LDAO;
      }
      if (totalTips.USDC !== '0') {
        totalEarnedByCurrency.USDC = totalTips.USDC;
      }
      if (totalTips.USDT !== '0') {
        totalEarnedByCurrency.USDT = totalTips.USDT;
      }

      return {
        ...earnings,
        totalTips: parseInt(totalTips.LDAO) || 0,
        totalEarnedByCurrency
      } as Omit<UserEarnings, 'totalEarnedByCurrency'> & { totalEarnedByCurrency: { LDAO: string; USDC: string; USDT: string } };
    } catch (error) {
      console.error('Error fetching user detailed earnings:', error);
      throw error;
    }
  }

  /**
   * Claim rewards
   */
  static async claimRewards(userAddress: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/tips/rewards/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim rewards');
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get tips for a post
   */
  static async getPostTips(postId: string): Promise<Tip[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/tips/posts/${postId}/tips`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch post tips');
      }

      const tips = await response.json();
      // Convert string dates to Date objects
      return tips.map((tip: any) => ({
        ...tip,
        timestamp: new Date(tip.timestamp)
      }));
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Calculate DAO fee (5%)
   */
  private static calculateFee(amount: string, currency: string): string {
    const amountNum = parseFloat(amount);
    const fee = amountNum * 0.05;
    return fee.toString();
  }

  /**
   * Subtract fee from amount
   */
  private static subtractFee(amount: string, fee: string, currency: string): string {
    const amountNum = parseFloat(amount);
    const feeNum = parseFloat(fee);
    return (amountNum - feeNum).toString();
  }

  /**
   * Get token contract instance
   */
  private static async getTokenContract(currency: string): Promise<ethers.Contract> {
    // Map currency to environment variable names
    const tokenEnvVars = {
      LDAO: 'NEXT_PUBLIC_LDAO_TOKEN_ADDRESS',
      USDC: 'NEXT_PUBLIC_USDC_ADDRESS', // Changed from NEXT_PUBLIC_USDC_TOKEN_ADDRESS
      USDT: 'NEXT_PUBLIC_USDT_TOKEN_ADDRESS'
    };

    const envVarName = tokenEnvVars[currency as keyof typeof tokenEnvVars];
    if (!envVarName) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    const address = process.env[envVarName];
    if (!address) {
      throw new Error(`Token address not configured for ${currency} (${envVarName})`);
    }

    // Standard ERC20 ABI with common functions needed for tipping
    return new ethers.Contract(
      address,
      [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function transferFrom(address from, address to, uint256 amount) returns (bool)'
      ],
      TipService.provider!
    );
  }

  /**
   * Get TipRouter contract instance
   */
  private static async getTipRouterContract(): Promise<ethers.Contract> {
    const address = process.env.NEXT_PUBLIC_TIP_ROUTER_ADDRESS;
    if (!address) {
      throw new Error('TipRouter contract address not configured');
    }

    // Make sure the ABI matches the actual contract methods
    return new ethers.Contract(
      address,
      [
        'function tip(bytes32 postId, address creator, uint256 amount, uint8 paymentMethod) payable',
        'function tipWithComment(bytes32 postId, address creator, uint256 amount, uint8 paymentMethod, string comment) payable',
        'function getTipCount(address user) view returns (uint256)',
        'function getTotalTipsReceived(address user) view returns (uint256)',
        'function getTotalTipsSent(address user) view returns (uint256)'
      ],
      TipService.provider!
    );
  }

  /**
   * Get LDAO balance for the current user
   */
  static async getLdaoBalance(): Promise<string> {
    if (!TipService.currentAddress || !TipService.provider) {
      throw new Error('Wallet not connected');
    }

    const ldaoAddress = process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS;
    if (!ldaoAddress) {
      throw new Error('LDAO token address not configured');
    }

    const ldaoContract = new ethers.Contract(
      ldaoAddress,
      ['function balanceOf(address) view returns (uint256)'],
      TipService.provider
    );

    const balance = await ldaoContract.balanceOf(TipService.currentAddress);
    return ethers.formatEther(balance);
  }

  /**
   * Get tips received by the current user
   */
  static async getReceivedTips(limit: number = 50, offset: number = 0): Promise<Tip[]> {
    if (!TipService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/tips/received`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: TipService.currentAddress,
          limit,
          offset
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch received tips');
      }

      const data = await response.json();
      return data.tips || [];
    } catch (error) {
      console.error('Error fetching received tips:', error);
      return [];
    }
  }

  /**
   * Get tips sent by the current user
   */
  static async getSentTips(limit: number = 50, offset: number = 0): Promise<Tip[]> {
    if (!TipService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/tips/sent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: TipService.currentAddress,
          limit,
          offset
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sent tips');
      }

      const data = await response.json();
      return data.tips || [];
    } catch (error) {
      console.error('Error fetching sent tips:', error);
      return [];
    }
  }

  /**
   * Get total tips received by a user
   */
  static async getUserTotalTips(address: string): Promise<{ LDAO: string; USDC: string; USDT: string }> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/tips/total/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user total tips');
      }

      const data = await response.json();
      return data.totals || { LDAO: '0', USDC: '0', USDT: '0' };
    } catch (error) {
      console.error('Error fetching user total tips:', error);
      return { LDAO: '0', USDC: '0', USDT: '0' };
    }
  }
}