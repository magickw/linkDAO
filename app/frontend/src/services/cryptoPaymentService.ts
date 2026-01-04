import {
  PublicClient,
  WalletClient,
  parseUnits,
  formatUnits,

  erc20Abi,
  Hash
} from 'viem';
import {
  PaymentRequest,
  PaymentTransaction,
  PaymentStatus,
  PaymentReceipt,
  PaymentError as OldPaymentError,
  PaymentToken,
  GasFeeEstimate
} from '../types/payment';
import { PaymentError } from './paymentErrorHandler';
import { GasFeeService } from './gasFeeService';
import { PAYMENT_CONFIG } from '../config/payment';
import { enhancedEscrowABI } from '../contracts/EnhancedEscrow';


export class CryptoPaymentService {
  private gasFeeService?: GasFeeService;
  private activeTransactions = new Map<string, PaymentTransaction>();

  constructor(
    private publicClient?: PublicClient,
    private walletClient?: WalletClient
  ) {
    if (publicClient) {
      this.gasFeeService = new GasFeeService(publicClient);
    }
  }

  /**
   * Process a cryptocurrency payment
   */
  async processPayment(request: PaymentRequest): Promise<PaymentTransaction> {
    try {
      // Validate payment request
      await this.validatePaymentRequest(request);

      // Create transaction record
      const transaction = await this.createTransactionRecord(request);
      this.activeTransactions.set(transaction.id, transaction);

      // Check token balance
      await this.checkTokenBalance(request.token, request.amount);

      // For ERC-20 tokens, check and request approval if needed
      if (!request.token.isNative) {
        await this.ensureTokenApproval(request.token, request.recipient, request.amount);
      }

      // Estimate gas fees
      const gasEstimate = await this.estimateTransactionGas(request);

      // Execute the payment
      const hash = await this.executePayment(request, gasEstimate);

      // Update transaction with hash
      transaction.hash = hash;
      transaction.status = PaymentStatus.CONFIRMING;
      transaction.updatedAt = new Date();

      // Start monitoring transaction
      this.monitorTransaction(transaction);

      return transaction;
    } catch (error) {
      console.error('Payment processing failed:', error);
      // Use PaymentError.fromError for intelligent error handling
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Process an escrow payment
   */
  async processEscrowPayment(request: PaymentRequest): Promise<PaymentTransaction> {
    try {
      // Validate payment request
      await this.validatePaymentRequest(request);

      // Create transaction record
      const transaction = await this.createTransactionRecord(request);
      this.activeTransactions.set(transaction.id, transaction);

      // Check token balance
      await this.checkTokenBalance(request.token, request.amount);

      // For ERC-20 tokens, check and request approval for escrow contract if needed
      if (!request.token.isNative) {
        const escrowAddress = (PAYMENT_CONFIG.ESCROW_CONTRACT_ADDRESS as Record<number, string>)[request.chainId];
        if (!escrowAddress) {
          throw new Error(`Escrow contract not deployed on chain ID ${request.chainId}`);
        }
        await this.ensureTokenApproval(request.token, escrowAddress, request.amount);
      }

      // Estimate gas fees
      const gasEstimate = await this.estimateTransactionGas(request);

      // Execute the escrow payment
      const hash = await this.executeEscrowPayment(request, gasEstimate);

      // Update transaction with hash
      transaction.hash = hash;
      transaction.status = PaymentStatus.CONFIRMING;
      transaction.updatedAt = new Date();

      // Start monitoring transaction
      this.monitorTransaction(transaction);

      return transaction;
    } catch (error) {
      console.error('Escrow payment processing failed:', error);
      // Use PaymentError.fromError for intelligent error handling
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Execute the actual escrow payment transaction
   */
  private async executeEscrowPayment(
    request: PaymentRequest,
    gasEstimate: GasFeeEstimate
  ): Promise<Hash> {
    const { token, amount, recipient, orderId, chainId } = request;

    // Validate gas limit against network and security constraints before executing transaction
    const securityMaxGasLimit = 500000n; // Security limit from token transaction security config
    const networkMaxGasLimit = 16777215n; // Maximum safe gas limit (just under 16,777,216 block limit)
    const maxGasLimit = securityMaxGasLimit < networkMaxGasLimit ? securityMaxGasLimit : networkMaxGasLimit;

    if (gasEstimate.gasLimit > maxGasLimit) {
      throw new Error(`Gas limit ${gasEstimate.gasLimit} exceeds maximum allowable limit of ${maxGasLimit}. Please try again.`);
    }

    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    const escrowAddress = (PAYMENT_CONFIG.ESCROW_CONTRACT_ADDRESS as Record<number, string>)[chainId];
    if (!escrowAddress) {
      throw new Error(`Escrow contract not deployed on chain ID ${chainId}`);
    }

    const accounts = await this.walletClient.getAddresses();
    const buyerAddress = accounts[0];

    // Use configurable escrow parameters or defaults
    const deliveryDeadline = request.deliveryDeadline || 0; // 0 means no deadline
    const resolutionMethod = request.resolutionMethod ?? 0; // Default to arbitrator
    const arbiter = request.arbiter || recipient; // Default to seller as arbiter (will be changed by smart contract)

    return await this.walletClient.writeContract({
      address: escrowAddress as `0x${string}`,
      abi: enhancedEscrowABI,
      functionName: "createEscrow",
      args: [
        BigInt(orderId),
        recipient as `0x${string}`,
        token.address as `0x${string}`,
        amount,
        BigInt(deliveryDeadline),
        resolutionMethod,
      ],
      value: token.isNative ? amount : 0n,
      gas: gasEstimate.gasLimit,
      chain: undefined,
      account: buyerAddress,
    });
  }

  /**
   * Release funds from escrow
   */
  async releaseFromEscrow(escrowId: number, chainId: number): Promise<void> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    const escrowAddress = (PAYMENT_CONFIG.ESCROW_CONTRACT_ADDRESS as Record<number, string>)[chainId];
    if (!escrowAddress) {
      throw new Error(`Escrow contract not deployed on chain ID ${chainId}`);
    }

    // Estimate gas for the release transaction to ensure it's within limits
    const gasEstimate = await this.estimateGasLimit(escrowAddress, '0x');
    // Validate gas limit against network and security constraints
    const securityMaxGasLimit = 500000n; // Security limit from token transaction security config
    const networkMaxGasLimit = 16777215n; // Maximum safe gas limit (just under 16,777,216 block limit)
    const maxGasLimit = securityMaxGasLimit < networkMaxGasLimit ? securityMaxGasLimit : networkMaxGasLimit;

    if (gasEstimate > maxGasLimit) {
      throw new Error(`Gas limit ${gasEstimate} exceeds maximum allowable limit of ${maxGasLimit}. Please try again.`);
    }

    await this.walletClient.writeContract({
      address: escrowAddress as `0x${string}`,
      abi: enhancedEscrowABI,
      functionName: "confirmDelivery",
      args: [BigInt(escrowId), "Delivery confirmed"],
      gas: gasEstimate,
      chain: undefined,
      account: undefined,
    });
  }

  /**
   * Refund funds from escrow
   */
  async refundFromEscrow(escrowId: number, chainId: number): Promise<void> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    const escrowAddress = (PAYMENT_CONFIG.ESCROW_CONTRACT_ADDRESS as Record<number, string>)[chainId];
    if (!escrowAddress) {
      throw new Error(`Escrow contract not deployed on chain ID ${chainId}`);
    }

    // Estimate gas for the refund transaction to ensure it's within limits
    const gasEstimate = await this.estimateGasLimit(escrowAddress, '0x');
    // Validate gas limit against network and security constraints
    const securityMaxGasLimit = 500000n; // Security limit from token transaction security config
    const networkMaxGasLimit = 16777215n; // Maximum safe gas limit (just under 16,777,216 block limit)
    const maxGasLimit = securityMaxGasLimit < networkMaxGasLimit ? securityMaxGasLimit : networkMaxGasLimit;

    if (gasEstimate > maxGasLimit) {
      throw new Error(`Gas limit ${gasEstimate} exceeds maximum allowable limit of ${maxGasLimit}. Please try again.`);
    }

    await this.walletClient.writeContract({
      address: escrowAddress as `0x${string}`,
      abi: enhancedEscrowABI,
      functionName: "executeEmergencyRefund",
      args: [BigInt(escrowId)],
      gas: gasEstimate,
      chain: undefined,
      account: undefined,
    });
  }

  /**
   * Execute the actual payment transaction
   */
  private async executePayment(
    request: PaymentRequest,
    gasEstimate: GasFeeEstimate
  ): Promise<Hash> {
    const { token, amount, recipient } = request;

    // Validate gas limit against network and security constraints before executing transaction
    const securityMaxGasLimit = 500000n; // Security limit from token transaction security config
    const networkMaxGasLimit = 16777215n; // Maximum safe gas limit (just under 16,777,216 block limit)
    const maxGasLimit = securityMaxGasLimit < networkMaxGasLimit ? securityMaxGasLimit : networkMaxGasLimit;

    if (gasEstimate.gasLimit > maxGasLimit) {
      throw new Error(`Gas limit ${gasEstimate.gasLimit} exceeds maximum allowable limit of ${maxGasLimit}. Please try again.`);
    }

    if (token.isNative) {
      // Native token transfer (ETH, MATIC, etc.)
      const txParams: any = {
        to: recipient as `0x${string}`,
        value: amount,
        gas: gasEstimate.gasLimit,
      };

      // Add gas pricing based on network support
      if (gasEstimate.maxFeePerGas) {
        txParams.maxFeePerGas = gasEstimate.maxFeePerGas;
        txParams.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas;
      } else if (gasEstimate.gasPrice) {
        txParams.gasPrice = gasEstimate.gasPrice;
      }

      // Check if walletClient is available
      if (!this.walletClient) {
        throw new Error('Wallet client not initialized');
      }

      return await this.walletClient.sendTransaction(txParams);
    } else {
      // ERC-20 token transfer
      // Check if walletClient is available
      if (!this.walletClient) {
        throw new Error('Wallet client not initialized');
      }

      // Use writeContract directly instead of getContract
      const contractParams: any = {
        gas: gasEstimate.gasLimit,
      };

      // Add gas pricing based on network support
      if (gasEstimate.maxFeePerGas) {
        contractParams.maxFeePerGas = gasEstimate.maxFeePerGas;
        contractParams.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas;
      } else if (gasEstimate.gasPrice) {
        contractParams.gasPrice = gasEstimate.gasPrice;
      }

      return await this.walletClient.writeContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "transfer",
        args: [
          recipient as `0x${string}`,
          amount
        ],
        ...contractParams
      });
    }
  }

  /**
   * Monitor transaction status and confirmations
   */
  private async monitorTransaction(transaction: PaymentTransaction): Promise<void> {
    if (!transaction.hash) return;

    // Check if publicClient is available
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    const requiredConfirmations = (PAYMENT_CONFIG.CONFIRMATION_BLOCKS as Record<number, number>)[transaction.chainId] || 12;
    let attempts = 0;
    const maxAttempts = PAYMENT_CONFIG.TRANSACTION_TIMEOUT / 5000; // Check every 5 seconds

    const checkStatus = async () => {
      try {
        attempts++;

        const receipt = await this.publicClient!.getTransactionReceipt({
          hash: transaction.hash as Hash
        });

        if (receipt) {
          transaction.blockNumber = Number(receipt.blockNumber);
          transaction.gasUsed = receipt.gasUsed;
          transaction.gasFee = receipt.gasUsed * receipt.effectiveGasPrice;

          // Get current block number for confirmation count
          const currentBlock = await this.publicClient!.getBlockNumber();
          transaction.confirmations = Number(currentBlock) - transaction.blockNumber;

          if (receipt.status === 'success') {
            if (transaction.confirmations >= requiredConfirmations) {
              transaction.status = PaymentStatus.CONFIRMED;
              transaction.updatedAt = new Date();
              this.activeTransactions.delete(transaction.id);
              return;
            } else {
              transaction.status = PaymentStatus.CONFIRMING;
            }
          } else {
            transaction.status = PaymentStatus.FAILED;
            transaction.failureReason = 'Transaction reverted';
            transaction.updatedAt = new Date();
            this.activeTransactions.delete(transaction.id);
            return;
          }
        }

        // Continue monitoring if not confirmed and not timed out
        if (attempts < maxAttempts && transaction.status !== PaymentStatus.CONFIRMED) {
          setTimeout(checkStatus, 5000);
        } else if (attempts >= maxAttempts) {
          // Timeout - but transaction might still be pending
          transaction.status = PaymentStatus.PENDING;
          transaction.failureReason = 'Monitoring timeout';
          transaction.updatedAt = new Date();
        }
      } catch (error) {
        console.error('Transaction monitoring error:', error);

        // Retry if we haven't exceeded max attempts
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Wait longer on error
        } else {
          transaction.status = PaymentStatus.FAILED;
          transaction.failureReason = 'Monitoring failed';
          transaction.updatedAt = new Date();
          this.activeTransactions.delete(transaction.id);
        }
      }
    };

    // Start monitoring
    setTimeout(checkStatus, 5000);
  }

  /**
   * Retry a failed payment
   */
  async retryPayment(transactionId: string): Promise<PaymentTransaction> {
    const transaction = this.activeTransactions.get(transactionId);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.retryCount >= transaction.maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    // Increment retry count
    transaction.retryCount++;
    transaction.status = PaymentStatus.PENDING;
    transaction.updatedAt = new Date();

    // Create new payment request from transaction
    const request: PaymentRequest = {
      orderId: transaction.orderId,
      amount: transaction.amount,
      token: transaction.token,
      recipient: transaction.recipient,
      chainId: transaction.chainId
    };

    // Process payment again
    return await this.processPayment(request);
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(transactionId: string): Promise<void> {
    const transaction = this.activeTransactions.get(transactionId);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status === PaymentStatus.CONFIRMED) {
      throw new Error('Cannot cancel confirmed transaction');
    }

    transaction.status = PaymentStatus.CANCELLED;
    transaction.updatedAt = new Date();
    this.activeTransactions.delete(transactionId);
  }

  /**
   * Generate payment receipt
   */
  generateReceipt(transaction: PaymentTransaction): PaymentReceipt {
    if (!transaction.hash || !transaction.blockNumber) {
      throw new Error('Transaction not confirmed');
    }

    return {
      transactionId: transaction.id,
      orderId: transaction.orderId,
      amount: formatUnits(transaction.amount, transaction.token.decimals),
      token: transaction.token,
      sender: transaction.sender,
      recipient: transaction.recipient,
      transactionHash: transaction.hash,
      blockNumber: transaction.blockNumber,
      gasUsed: transaction.gasUsed?.toString() || '0',
      gasFee: transaction.gasFee ? formatUnits(transaction.gasFee, 18) : '0',
      timestamp: transaction.createdAt,
      confirmations: transaction.confirmations,
      status: transaction.status
    };
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): PaymentTransaction | null {
    return this.activeTransactions.get(transactionId) || null;
  }

  /**
   * Validate payment request
   */
  private async validatePaymentRequest(request: PaymentRequest): Promise<void> {
    if (!request.orderId || !request.amount || !request.token || !request.recipient) {
      throw new Error('Invalid payment request: missing required fields');
    }

    if (request.amount <= 0n) {
      throw new Error('Invalid payment amount');
    }

    if (!request.recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid recipient address');
    }

    // Check if deadline has passed
    if (request.deadline && Date.now() / 1000 > request.deadline) {
      throw new Error('Payment deadline has passed');
    }
  }

  /**
   * Check token balance
   */
  private async checkTokenBalance(token: PaymentToken, amount: bigint): Promise<void> {
    // Check if walletClient is available
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    const accounts = await this.walletClient.getAddresses();
    const userAddress = accounts[0];

    if (!userAddress) {
      throw new Error('No wallet connected');
    }

    let balance: bigint;

    // Check if publicClient is available
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    if (token.isNative) {
      balance = await this.publicClient.getBalance({ address: userAddress });
    } else {
      // Use readContract directly instead of getContract
      balance = await this.publicClient.readContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [userAddress],
        authorizationList: undefined
      });
    }

    if (balance < amount) {
      throw new Error(`Insufficient ${token.symbol} balance`);
    }
  }

  /**
   * Ensure ERC-20 token approval for spending
   */
  private async ensureTokenApproval(
    token: PaymentToken,
    spender: string,
    amount: bigint
  ): Promise<void> {
    if (!this.walletClient || !this.publicClient) {
      throw new Error('Wallet or public client not initialized');
    }

    const accounts = await this.walletClient.getAddresses();
    const userAddress = accounts[0];

    if (!userAddress) {
      throw new Error('No wallet connected');
    }

    // Check current allowance
    const currentAllowance = await this.publicClient.readContract({
      address: token.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [userAddress, spender as `0x${string}`],
      authorizationList: undefined
    }) as bigint;

    // If allowance is sufficient, no need to approve
    if (currentAllowance >= amount) {
      return;
    }

    // Request approval for the exact amount needed
    // Note: Some users prefer infinite approval for UX, but exact amount is safer
    const approvalHash = await this.walletClient.writeContract({
      address: token.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender as `0x${string}`, amount],
      chain: undefined,
      account: userAddress
    });

    // Wait for approval transaction to be mined
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: approvalHash
    });

    if (receipt.status !== 'success') {
      throw new Error('Token approval failed');
    }
  }

  /**
   * Estimate gas for transaction
   */
  private async estimateTransactionGas(request: PaymentRequest): Promise<GasFeeEstimate> {
    // Check if gasFeeService is available
    if (!this.gasFeeService) {
      throw new Error('Gas fee service not initialized');
    }

    const { token, amount, recipient } = request;

    let gasEstimate;
    if (token.isNative) {
      gasEstimate = await this.gasFeeService.estimateGasFees(recipient, '0x', amount);
    } else {
      // ERC-20 transfer data
      const transferData = `0xa9059cbb${recipient.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;
      gasEstimate = await this.gasFeeService.estimateGasFees(token.address, transferData);
    }

    // Ensure gas limit doesn't exceed security or network limits
    const securityMaxGasLimit = 500000n; // Security limit from token transaction security config
    const networkMaxGasLimit = 16777215n; // Maximum safe gas limit (just under 16,777,216 block limit)
    const maxGasLimit = securityMaxGasLimit < networkMaxGasLimit ? securityMaxGasLimit : networkMaxGasLimit;

    if (gasEstimate.gasLimit > maxGasLimit) {
      console.warn(`Gas limit ${gasEstimate.gasLimit} exceeds maximum ${maxGasLimit}, reducing to maximum`);
      gasEstimate.gasLimit = maxGasLimit;
      gasEstimate.totalCost = maxGasLimit * gasEstimate.gasPrice;
    }

    return gasEstimate;
  }

  /**
   * Estimate gas limit for a transaction
   */
  private async estimateGasLimit(to: string, data: string, value: bigint = 0n): Promise<bigint> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const gasEstimate = await this.publicClient.estimateGas({
        to: to as `0x${string}`,
        data: data as `0x${string}`,
        value
      });

      // Add buffer to gas estimate but ensure it doesn't exceed the block gas limit
      let gasLimitWithBuffer = BigInt(Math.floor(Number(gasEstimate) * PAYMENT_CONFIG.GAS_LIMIT_BUFFER));

      // Ensure gas limit doesn't exceed the network's block gas limit (16,777,216 on most Ethereum networks)
      const maxGasLimit = 16777215n; // Just under the limit to be safe

      if (gasLimitWithBuffer > maxGasLimit) {
        console.warn(`Gas limit ${gasLimitWithBuffer} exceeds maximum ${maxGasLimit}, reducing to maximum`);
        return maxGasLimit;
      }

      return gasLimitWithBuffer;
    } catch (error) {
      console.error('Gas limit estimation failed:', error);
      // Return a reasonable default for simple transfers
      let defaultGasLimit = BigInt(21000 * PAYMENT_CONFIG.GAS_LIMIT_BUFFER);

      // Ensure default doesn't exceed the network's block gas limit
      const maxGasLimit = 16777215n;
      if (defaultGasLimit > maxGasLimit) {
        defaultGasLimit = maxGasLimit;
      }

      return defaultGasLimit;
    }
  }

  /**
   * Create transaction record
   */
  private async createTransactionRecord(request: PaymentRequest): Promise<PaymentTransaction> {
    // Check if walletClient is available
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    const accounts = await this.walletClient.getAddresses();

    return {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: request.orderId,
      amount: request.amount,
      token: request.token,
      sender: accounts[0] || '',
      recipient: request.recipient,
      chainId: request.chainId,
      status: PaymentStatus.PENDING,
      confirmations: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: PAYMENT_CONFIG.MAX_RETRY_ATTEMPTS
    };
  }
}