import { ethers } from 'ethers';

// ERC20 ABI (minimal interface for approve, balanceOf, allowance)
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)'
];

export enum PaymentMethod {
  ETH = 0,
  USDC = 1,
  USDT = 2
}

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
}

// Token addresses by network
export const TOKEN_ADDRESSES: Record<number, { usdc: string; usdt: string }> = {
  // Ethereum Mainnet
  1: {
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
  },
  // Sepolia Testnet
  11155111: {
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    usdt: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0'
  },
  // Base Mainnet
  8453: {
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdt: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'
  }
};

export class TokenService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  /**
   * Initialize the token service with provider and signer
   */
  async initialize() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Ethereum provider not found');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
  }

  /**
   * Get token contract instance
   */
  getTokenContract(tokenAddress: string): ethers.Contract {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }
    return new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
  }

  /**
   * Get token address by payment method
   */
  async getTokenAddress(paymentMethod: PaymentMethod): Promise<string> {
    if (paymentMethod === PaymentMethod.ETH) {
      return ethers.ZeroAddress;
    }

    if (!this.provider) {
      await this.initialize();
    }

    const network = await this.provider!.getNetwork();
    const chainId = Number(network.chainId);

    if (!TOKEN_ADDRESSES[chainId]) {
      throw new Error(`Token addresses not configured for chain ${chainId}`);
    }

    return paymentMethod === PaymentMethod.USDC
      ? TOKEN_ADDRESSES[chainId].usdc
      : TOKEN_ADDRESSES[chainId].usdt;
  }

  /**
   * Get token info (symbol, decimals)
   */
  async getTokenInfo(paymentMethod: PaymentMethod): Promise<TokenInfo> {
    if (paymentMethod === PaymentMethod.ETH) {
      return {
        address: ethers.ZeroAddress,
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum'
      };
    }

    const tokenAddress = await this.getTokenAddress(paymentMethod);
    const contract = this.getTokenContract(tokenAddress);

    const [symbol, decimals] = await Promise.all([
      contract.symbol(),
      contract.decimals()
    ]);

    return {
      address: tokenAddress,
      symbol,
      decimals: Number(decimals),
      name: symbol === 'USDC' ? 'USD Coin' : 'Tether USD'
    };
  }

  /**
   * Check if user has sufficient balance
   */
  async checkBalance(
    paymentMethod: PaymentMethod,
    amount: bigint
  ): Promise<{ hasBalance: boolean; balance: bigint }> {
    if (!this.signer) {
      await this.initialize();
    }

    const userAddress = await this.signer!.getAddress();

    if (paymentMethod === PaymentMethod.ETH) {
      const balance = await this.provider!.getBalance(userAddress);
      return {
        hasBalance: balance >= amount,
        balance
      };
    }

    const tokenAddress = await this.getTokenAddress(paymentMethod);
    const contract = this.getTokenContract(tokenAddress);
    const balance = await contract.balanceOf(userAddress);

    return {
      hasBalance: balance >= amount,
      balance
    };
  }

  /**
   * Check token allowance
   */
  async checkAllowance(
    paymentMethod: PaymentMethod,
    spender: string
  ): Promise<bigint> {
    if (paymentMethod === PaymentMethod.ETH) {
      return ethers.MaxUint256; // ETH doesn't need allowance
    }

    if (!this.signer) {
      await this.initialize();
    }

    const tokenAddress = await this.getTokenAddress(paymentMethod);
    const contract = this.getTokenContract(tokenAddress);
    const userAddress = await this.signer!.getAddress();

    return await contract.allowance(userAddress, spender);
  }

  /**
   * Approve token spending
   */
  async approveToken(
    paymentMethod: PaymentMethod,
    spender: string,
    amount: bigint
  ): Promise<ethers.TransactionReceipt> {
    if (paymentMethod === PaymentMethod.ETH) {
      throw new Error('ETH does not require approval');
    }

    if (!this.signer) {
      await this.initialize();
    }

    const tokenAddress = await this.getTokenAddress(paymentMethod);
    const contract = this.getTokenContract(tokenAddress);

    const tx = await contract.approve(spender, amount);
    return await tx.wait();
  }

  /**
   * Approve unlimited token spending (max uint256)
   */
  async approveUnlimited(
    paymentMethod: PaymentMethod,
    spender: string
  ): Promise<ethers.TransactionReceipt> {
    return await this.approveToken(paymentMethod, spender, ethers.MaxUint256);
  }

  /**
   * Format token amount for display
   */
  formatAmount(amount: bigint, decimals: number): string {
    return ethers.formatUnits(amount, decimals);
  }

  /**
   * Parse token amount from user input
   */
  parseAmount(amount: string, decimals: number): bigint {
    return ethers.parseUnits(amount, decimals);
  }

  /**
   * Get formatted balance display
   */
  async getFormattedBalance(paymentMethod: PaymentMethod): Promise<string> {
    const tokenInfo = await this.getTokenInfo(paymentMethod);
    const { balance } = await this.checkBalance(paymentMethod, 0n);
    return `${this.formatAmount(balance, tokenInfo.decimals)} ${tokenInfo.symbol}`;
  }

  /**
   * Check if approval is needed and get approval amount
   */
  async needsApproval(
    paymentMethod: PaymentMethod,
    spender: string,
    amount: bigint
  ): Promise<boolean> {
    if (paymentMethod === PaymentMethod.ETH) {
      return false;
    }

    const allowance = await this.checkAllowance(paymentMethod, spender);
    return allowance < amount;
  }
}

// Singleton instance
export const tokenService = new TokenService();
