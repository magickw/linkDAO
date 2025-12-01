import { ethers } from 'ethers';
import { safeLogger } from '../../utils/logger';

/**
 * Blockchain Refund Provider
 * Handles blockchain-specific refund operations (ETH, USDC, USDT, etc.)
 */
export class BlockchainRefundProvider {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;

  constructor() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Initialize wallet if private key is provided
    const privateKey = process.env.BLOCKCHAIN_REFUND_WALLET_PRIVATE_KEY;
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    }
  }

  /**
   * Process a native token refund (ETH, MATIC, etc.)
   * @param toAddress - Recipient address
   * @param amount - Amount to refund in ETH
   * @param gasPrice - Optional gas price in gwei
   * @returns Refund transaction result
   */
  async processNativeTokenRefund(
    toAddress: string,
    amount: number,
    gasPrice?: number
  ): Promise<{
    success: boolean;
    transactionHash: string;
    status: string;
    amount: number;
    currency: string;
    processingTime: number;
    gasUsed?: number;
    errorMessage?: string;
  }> {
    const startTime = Date.now();

    if (!this.wallet) {
      return {
        success: false,
        transactionHash: '',
        status: 'failed',
        amount: 0,
        currency: 'ETH',
        processingTime: Date.now() - startTime,
        errorMessage: 'Blockchain wallet not configured'
      };
    }

    try {
      // Validate address
      if (!ethers.isAddress(toAddress)) {
        throw new Error('Invalid recipient address');
      }

      // Convert amount to wei
      const amountWei = ethers.parseEther(amount.toString());

      // Prepare transaction
      const tx: ethers.TransactionRequest = {
        to: toAddress,
        value: amountWei
      };

      // Set gas price if provided
      if (gasPrice) {
        tx.gasPrice = ethers.parseUnits(gasPrice.toString(), 'gwei');
      }

      // Send transaction
      const transaction = await this.wallet.sendTransaction(tx);
      
      safeLogger.info(`Blockchain refund transaction sent: ${transaction.hash}`, {
        toAddress,
        amount
      });

      // Wait for confirmation
      const receipt = await transaction.wait();

      const processingTime = Date.now() - startTime;

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      return {
        success: receipt.status === 1,
        transactionHash: transaction.hash,
        status: receipt.status === 1 ? 'completed' : 'failed',
        amount,
        currency: 'ETH',
        processingTime,
        gasUsed: Number(receipt.gasUsed)
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      safeLogger.error('Blockchain refund failed:', error);
      
      return {
        success: false,
        transactionHash: '',
        status: 'failed',
        amount: 0,
        currency: 'ETH',
        processingTime,
        errorMessage: error.message || 'Unknown blockchain error'
      };
    }
  }

  /**
   * Process an ERC20 token refund (USDC, USDT, DAI, etc.)
   * @param tokenAddress - ERC20 token contract address
   * @param toAddress - Recipient address
   * @param amount - Amount to refund
   * @param decimals - Token decimals (default 18)
   * @returns Refund transaction result
   */
  async processERC20TokenRefund(
    tokenAddress: string,
    toAddress: string,
    amount: number,
    decimals: number = 18
  ): Promise<{
    success: boolean;
    transactionHash: string;
    status: string;
    amount: number;
    currency: string;
    processingTime: number;
    gasUsed?: number;
    errorMessage?: string;
  }> {
    const startTime = Date.now();

    if (!this.wallet) {
      return {
        success: false,
        transactionHash: '',
        status: 'failed',
        amount: 0,
        currency: 'TOKEN',
        processingTime: Date.now() - startTime,
        errorMessage: 'Blockchain wallet not configured'
      };
    }

    try {
      // Validate addresses
      if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(toAddress)) {
        throw new Error('Invalid token or recipient address');
      }

      // ERC20 ABI for transfer function
      const erc20Abi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
      ];

      // Create contract instance
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.wallet);

      // Get token symbol
      const symbol = await tokenContract.symbol();

      // Convert amount to token units
      const amountUnits = ethers.parseUnits(amount.toString(), decimals);

      // Send transfer transaction
      const transaction = await tokenContract.transfer(toAddress, amountUnits);
      
      safeLogger.info(`ERC20 refund transaction sent: ${transaction.hash}`, {
        tokenAddress,
        toAddress,
        amount,
        symbol
      });

      // Wait for confirmation
      const receipt = await transaction.wait();

      const processingTime = Date.now() - startTime;

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      return {
        success: receipt.status === 1,
        transactionHash: transaction.hash,
        status: receipt.status === 1 ? 'completed' : 'failed',
        amount,
        currency: symbol,
        processingTime,
        gasUsed: Number(receipt.gasUsed)
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      safeLogger.error('ERC20 refund failed:', error);
      
      return {
        success: false,
        transactionHash: '',
        status: 'failed',
        amount: 0,
        currency: 'TOKEN',
        processingTime,
        errorMessage: error.message || 'Unknown ERC20 error'
      };
    }
  }

  /**
   * Get transaction status
   * @param transactionHash - Transaction hash
   * @returns Transaction status information
   */
  async getTransactionStatus(transactionHash: string): Promise<{
    status: string;
    confirmations: number;
    blockNumber?: number;
    gasUsed?: number;
    timestamp?: Date;
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(transactionHash);

      if (!receipt) {
        return {
          status: 'pending',
          confirmations: 0
        };
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      // Get block timestamp
      const block = await this.provider.getBlock(receipt.blockNumber);

      return {
        status: receipt.status === 1 ? 'completed' : 'failed',
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed),
        timestamp: block ? new Date(block.timestamp * 1000) : undefined
      };
    } catch (error: any) {
      safeLogger.error('Error retrieving transaction status:', error);
      throw new Error(`Failed to retrieve transaction status: ${error.message}`);
    }
  }

  /**
   * Get wallet balance
   * @param address - Wallet address (defaults to refund wallet)
   * @returns Balance in ETH
   */
  async getWalletBalance(address?: string): Promise<number> {
    try {
      const targetAddress = address || this.wallet?.address;
      
      if (!targetAddress) {
        throw new Error('No address provided and wallet not configured');
      }

      const balance = await this.provider.getBalance(targetAddress);
      return parseFloat(ethers.formatEther(balance));
    } catch (error: any) {
      safeLogger.error('Error retrieving wallet balance:', error);
      throw new Error(`Failed to retrieve wallet balance: ${error.message}`);
    }
  }

  /**
   * Get ERC20 token balance
   * @param tokenAddress - ERC20 token contract address
   * @param walletAddress - Wallet address (defaults to refund wallet)
   * @returns Token balance
   */
  async getTokenBalance(tokenAddress: string, walletAddress?: string): Promise<{
    balance: number;
    symbol: string;
    decimals: number;
  }> {
    try {
      const targetAddress = walletAddress || this.wallet?.address;
      
      if (!targetAddress) {
        throw new Error('No address provided and wallet not configured');
      }

      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
      ];

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);

      const [balance, symbol, decimals] = await Promise.all([
        tokenContract.balanceOf(targetAddress),
        tokenContract.symbol(),
        tokenContract.decimals()
      ]);

      return {
        balance: parseFloat(ethers.formatUnits(balance, decimals)),
        symbol,
        decimals: Number(decimals)
      };
    } catch (error: any) {
      safeLogger.error('Error retrieving token balance:', error);
      throw new Error(`Failed to retrieve token balance: ${error.message}`);
    }
  }

  /**
   * Estimate gas for a transaction
   * @param toAddress - Recipient address
   * @param amount - Amount to send
   * @param isERC20 - Whether this is an ERC20 transfer
   * @param tokenAddress - Token address (for ERC20)
   * @returns Estimated gas cost in ETH
   */
  async estimateGasCost(
    toAddress: string,
    amount: number,
    isERC20: boolean = false,
    tokenAddress?: string
  ): Promise<{
    gasLimit: number;
    gasPrice: number;
    estimatedCost: number;
  }> {
    try {
      if (!this.wallet) {
        throw new Error('Wallet not configured');
      }

      let gasLimit: bigint;

      if (isERC20 && tokenAddress) {
        const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)'];
        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.wallet);
        const amountUnits = ethers.parseUnits(amount.toString(), 18);
        gasLimit = await tokenContract.transfer.estimateGas(toAddress, amountUnits);
      } else {
        const amountWei = ethers.parseEther(amount.toString());
        gasLimit = await this.provider.estimateGas({
          to: toAddress,
          value: amountWei
        });
      }

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('50', 'gwei');

      const estimatedCost = parseFloat(ethers.formatEther(gasLimit * gasPrice));

      return {
        gasLimit: Number(gasLimit),
        gasPrice: parseFloat(ethers.formatUnits(gasPrice, 'gwei')),
        estimatedCost
      };
    } catch (error: any) {
      safeLogger.error('Error estimating gas cost:', error);
      throw new Error(`Failed to estimate gas cost: ${error.message}`);
    }
  }

  /**
   * Get current network information
   * @returns Network details
   */
  async getNetworkInfo(): Promise<{
    chainId: number;
    name: string;
    blockNumber: number;
  }> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();

      return {
        chainId: Number(network.chainId),
        name: network.name,
        blockNumber
      };
    } catch (error: any) {
      safeLogger.error('Error retrieving network info:', error);
      throw new Error(`Failed to retrieve network info: ${error.message}`);
    }
  }
}

// Export singleton instance
export const blockchainRefundProvider = new BlockchainRefundProvider();
