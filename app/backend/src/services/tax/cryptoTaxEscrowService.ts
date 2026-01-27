import { ethers, Contract } from 'ethers';
import { db } from '../../db';
import { safeLogger } from '../../utils/safeLogger';
import { escrows, tax_liabilities } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Crypto Tax Escrow Service
 * Manages tax escrow for cryptocurrency transactions using smart contracts
 */
export class CryptoTaxEscrowService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;
  private taxEscrowContractAddress: string;
  private taxEscrowABI: any[];

  constructor(
    rpcUrl: string = process.env.WEB3_RPC_URL || '',
    privateKey: string = process.env.ADMIN_PRIVATE_KEY || '',
    contractAddress: string = process.env.TAX_ESCROW_CONTRACT_ADDRESS || ''
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    if (privateKey && privateKey !== '0xYOUR_PRIVATE_KEY' && privateKey.length > 0) {
      try {
        this.signer = new ethers.Wallet(privateKey, this.provider);
      } catch (error) {
        safeLogger.error('Failed to initialize signer in CryptoTaxEscrowService:', error);
      }
    } else {
      safeLogger.warn('No valid ADMIN_PRIVATE_KEY found for CryptoTaxEscrowService. On-chain features will be disabled.');
    }
    
    this.taxEscrowContractAddress = contractAddress;
    this.taxEscrowABI = this.getContractABI();
  }

  /**
   * Create a tax liability on the smart contract
   */
  async createTaxLiabilityOnChain(
    escrowId: string,
    taxAmount: number,
    jurisdiction: string,
    tokenAddress: string,
    dueDate: Date
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('CryptoTaxEscrowService: Signer not initialized. Check ADMIN_PRIVATE_KEY.');
    }
    try {
      safeLogger.info('Creating tax liability on chain:', {
        escrowId,
        taxAmount,
        jurisdiction,
      });

      const contract = new Contract(
        this.taxEscrowContractAddress,
        this.taxEscrowABI,
        this.signer
      );

      const tx = await contract.createTaxLiability(
        escrowId,
        ethers.parseEther(taxAmount.toString()),
        jurisdiction,
        tokenAddress === 'ETH' ? ethers.ZeroAddress : tokenAddress,
        Math.floor(dueDate.getTime() / 1000)
      );

      const receipt = await tx.wait();
      safeLogger.info('Tax liability created on chain:', {
        transactionHash: receipt?.transactionHash,
        blockNumber: receipt?.blockNumber,
      });

      return receipt?.transactionHash || '';
    } catch (error) {
      safeLogger.error('Error creating tax liability on chain:', error);
      throw error;
    }
  }

  /**
   * Fund tax liability (move funds to escrow)
   */
  async fundTaxLiability(
    liabilityId: number,
    amount: number,
    tokenAddress: string = 'ETH'
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('CryptoTaxEscrowService: Signer not initialized. Check ADMIN_PRIVATE_KEY.');
    }
    try {
      safeLogger.info('Funding tax liability:', {
        liabilityId,
        amount,
        tokenAddress,
      });

      const contract = new Contract(
        this.taxEscrowContractAddress,
        this.taxEscrowABI,
        this.signer
      );

      let tx;
      if (tokenAddress === 'ETH') {
        // Send native ETH
        tx = await contract.fundTaxLiability(
          liabilityId,
          ethers.parseEther(amount.toString()),
          ethers.ZeroAddress,
          {
            value: ethers.parseEther(amount.toString()),
          }
        );
      } else {
        // Send ERC20 token
        // First approve token transfer
        const tokenContract = new Contract(
          tokenAddress,
          ['function approve(address spender, uint256 amount) public returns (bool)'],
          this.signer
        );

        const approveTx = await tokenContract.approve(
          this.taxEscrowContractAddress,
          ethers.parseEther(amount.toString())
        );
        await approveTx.wait();

        // Then fund the tax liability
        tx = await contract.fundTaxLiability(
          liabilityId,
          ethers.parseEther(amount.toString()),
          tokenAddress
        );
      }

      const receipt = await tx.wait();
      safeLogger.info('Tax liability funded:', {
        transactionHash: receipt?.transactionHash,
      });

      return receipt?.transactionHash || '';
    } catch (error) {
      safeLogger.error('Error funding tax liability:', error);
      throw error;
    }
  }

  /**
   * Create a tax remittance batch on chain
   */
  async createTaxBatchOnChain(
    batchNumber: string,
    periodStart: Date,
    periodEnd: Date,
    totalAmount: number,
    liabilitiesCount: number
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('CryptoTaxEscrowService: Signer not initialized. Check ADMIN_PRIVATE_KEY.');
    }
    try {
      safeLogger.info('Creating tax batch on chain:', {
        batchNumber,
        totalAmount,
        liabilitiesCount,
      });

      const contract = new Contract(
        this.taxEscrowContractAddress,
        this.taxEscrowABI,
        this.signer
      );

      const tx = await contract.createTaxBatch(
        batchNumber,
        Math.floor(periodStart.getTime() / 1000),
        Math.floor(periodEnd.getTime() / 1000),
        ethers.parseEther(totalAmount.toString()),
        liabilitiesCount
      );

      const receipt = await tx.wait();
      safeLogger.info('Tax batch created on chain:', {
        transactionHash: receipt?.transactionHash,
      });

      return receipt?.transactionHash || '';
    } catch (error) {
      safeLogger.error('Error creating tax batch on chain:', error);
      throw error;
    }
  }

  /**
   * File tax batch with authorities
   */
  async fileTaxBatchOnChain(batchId: number): Promise<string> {
    if (!this.signer) {
      throw new Error('CryptoTaxEscrowService: Signer not initialized. Check ADMIN_PRIVATE_KEY.');
    }
    try {
      safeLogger.info('Filing tax batch on chain:', { batchId });

      const contract = new Contract(
        this.taxEscrowContractAddress,
        this.taxEscrowABI,
        this.signer
      );

      const tx = await contract.fileTaxBatch(batchId);
      const receipt = await tx.wait();

      safeLogger.info('Tax batch filed on chain:', {
        transactionHash: receipt?.transactionHash,
      });

      return receipt?.transactionHash || '';
    } catch (error) {
      safeLogger.error('Error filing tax batch on chain:', error);
      throw error;
    }
  }

  /**
   * Release tax funds to tax authority
   */
  async releaseTaxFunds(
    batchId: number,
    jurisdiction: string,
    recipient: string,
    amount: number,
    tokenAddress: string,
    remittanceReference: string
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('CryptoTaxEscrowService: Signer not initialized. Check ADMIN_PRIVATE_KEY.');
    }
    try {
      safeLogger.info('Releasing tax funds on chain:', {
        batchId,
        jurisdiction,
        recipient,
        amount,
      });

      const contract = new Contract(
        this.taxEscrowContractAddress,
        this.taxEscrowABI,
        this.signer
      );

      const tx = await contract.releaseTax(
        batchId,
        jurisdiction,
        recipient,
        ethers.parseEther(amount.toString()),
        tokenAddress === 'ETH' ? ethers.ZeroAddress : tokenAddress,
        remittanceReference
      );

      const receipt = await tx.wait();
      safeLogger.info('Tax funds released on chain:', {
        transactionHash: receipt?.transactionHash,
      });

      return receipt?.transactionHash || '';
    } catch (error) {
      safeLogger.error('Error releasing tax funds on chain:', error);
      throw error;
    }
  }

  /**
   * Get jurisdiction balance from smart contract
   */
  async getJurisdictionBalance(jurisdiction: string): Promise<number> {
    try {
      const contract = new Contract(
        this.taxEscrowContractAddress,
        this.taxEscrowABI,
        this.provider
      );

      const balance = await contract.getJurisdictionBalance(jurisdiction);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      safeLogger.error('Error getting jurisdiction balance:', error);
      throw error;
    }
  }

  /**
   * Get total tax collected
   */
  async getTotalTaxCollected(): Promise<number> {
    try {
      const contract = new Contract(
        this.taxEscrowContractAddress,
        this.taxEscrowABI,
        this.provider
      );

      const total = await contract.getTotalTaxCollected();
      return parseFloat(ethers.formatEther(total));
    } catch (error) {
      safeLogger.error('Error getting total tax collected:', error);
      throw error;
    }
  }

  /**
   * Check if tax is overdue
   */
  async isTaxOverdue(liabilityId: number): Promise<boolean> {
    try {
      const contract = new Contract(
        this.taxEscrowContractAddress,
        this.taxEscrowABI,
        this.provider
      );

      return await contract.isTaxOverdue(liabilityId);
    } catch (error) {
      safeLogger.error('Error checking if tax is overdue:', error);
      throw error;
    }
  }

  /**
   * Update escrow with tax information
   */
  async updateEscrowWithTaxInfo(
    escrowId: string,
    taxAmount: number,
    taxJurisdiction: string,
    cryptoTaxLiabilityId: string
  ): Promise<void> {
    try {
      await db
        .update(escrows)
        .set({
          tax_escrow_amount: taxAmount,
          tax_escrow_remitted: false,
          metadata: {
            taxJurisdiction,
            cryptoTaxLiabilityId,
            taxLiabilityCreatedAt: new Date().toISOString(),
          },
        })
        .where(eq(escrows.id, escrowId));

      safeLogger.info('Escrow updated with tax info:', {
        escrowId,
        taxAmount,
        taxJurisdiction,
      });
    } catch (error) {
      safeLogger.error('Error updating escrow with tax info:', error);
      throw error;
    }
  }

  /**
   * Mark tax as remitted in database
   */
  async markTaxAsRemitted(
    escrowId: string,
    transactionHash: string
  ): Promise<void> {
    try {
      await db
        .update(escrows)
        .set({
          tax_escrow_remitted: true,
          tax_escrow_remitted_at: new Date(),
          metadata: {
            taxRemittanceTransactionHash: transactionHash,
          },
        })
        .where(eq(escrows.id, escrowId));

      safeLogger.info('Tax marked as remitted:', {
        escrowId,
        transactionHash,
      });
    } catch (error) {
      safeLogger.error('Error marking tax as remitted:', error);
      throw error;
    }
  }

  /**
   * Get contract ABI (simplified)
   */
  private getContractABI(): any[] {
    return [
      {
        inputs: [
          { name: 'escrowId', type: 'uint256' },
          { name: 'taxAmount', type: 'uint256' },
          { name: 'jurisdiction', type: 'string' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'dueDate', type: 'uint256' },
        ],
        name: 'createTaxLiability',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          { name: 'liabilityId', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'tokenAddress', type: 'address' },
        ],
        name: 'fundTaxLiability',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
      },
      {
        inputs: [
          { name: 'jurisdiction', type: 'string' },
        ],
        name: 'getJurisdictionBalance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'getTotalTaxCollected',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [{ name: 'liabilityId', type: 'uint256' }],
        name: 'isTaxOverdue',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
      },
    ];
  }
}

export const cryptoTaxEscrowService = new CryptoTaxEscrowService();
