/**
 * Multi-Seller Escrow Service
 * Handles separate escrow contracts per seller with automated release mechanisms
 */

import { ethers } from 'ethers';
import { useAccount, useContractWrite, useContractRead } from 'wagmi';

// Escrow contract ABI (simplified for demo)
const ESCROW_ABI = [
  'function createEscrow(address seller, address buyer, uint256 amount, bytes32 orderId) external payable returns (address)',
  'function releaseEscrow(address escrowContract) external',
  'function disputeEscrow(address escrowContract, string reason) external',
  'function resolveDispute(address escrowContract, bool releaseToBuyer) external',
  'function getEscrowStatus(address escrowContract) external view returns (uint8)',
  'function getEscrowDetails(address escrowContract) external view returns (address, address, uint256, uint256, uint8)',
  'event EscrowCreated(address indexed escrowContract, address indexed seller, address indexed buyer, uint256 amount)',
  'event EscrowReleased(address indexed escrowContract, address indexed recipient, uint256 amount)',
  'event EscrowDisputed(address indexed escrowContract, string reason)',
];

const ESCROW_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS || '0x1234567890123456789012345678901234567890';

export enum EscrowStatus {
  PENDING = 0,
  FUNDED = 1,
  RELEASED = 2,
  DISPUTED = 3,
  RESOLVED = 4,
  CANCELLED = 5,
}

export interface EscrowContract {
  address: string;
  seller: string;
  buyer: string;
  amount: string;
  orderId: string;
  status: EscrowStatus;
  createdAt: Date;
  expiresAt: Date;
  disputeReason?: string;
  transactionHash: string;
}

export interface CreateEscrowParams {
  sellerId: string;
  sellerAddress: string;
  buyerAddress: string;
  amount: string;
  orderId: string;
  items: Array<{
    id: string;
    title: string;
    price: string;
    quantity: number;
  }>;
  autoReleaseHours?: number;
}

export interface EscrowGroup {
  sellerId: string;
  sellerName: string;
  sellerAddress: string;
  contracts: EscrowContract[];
  totalAmount: string;
  status: 'pending' | 'funded' | 'partial' | 'completed' | 'disputed';
}

class EscrowService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private factoryContract: ethers.Contract | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.initializeSigner();
    }
  }

  private async initializeSigner() {
    if (this.provider) {
      try {
        this.signer = this.provider.getSigner();
        if (this.signer) {
          this.factoryContract = new ethers.Contract(
            ESCROW_FACTORY_ADDRESS,
            ESCROW_ABI,
            this.signer
          );
        }
      } catch (error) {
        console.error('Failed to initialize signer:', error);
      }
    }
  }

  /**
   * Create multiple escrow contracts for multi-seller order
   */
  async createMultiSellerEscrow(
    sellerGroups: Array<{
      sellerId: string;
      sellerAddress: string;
      items: Array<{ id: string; title: string; price: string; quantity: number }>;
      totalAmount: string;
    }>,
    buyerAddress: string,
    orderId: string
  ): Promise<EscrowGroup[]> {
    if (!this.factoryContract || !this.signer) {
      throw new Error('Wallet not connected');
    }

    const escrowGroups: EscrowGroup[] = [];

    try {
      // Create escrow contract for each seller
      for (const group of sellerGroups) {
        const escrowParams: CreateEscrowParams = {
          sellerId: group.sellerId,
          sellerAddress: group.sellerAddress,
          buyerAddress,
          amount: group.totalAmount,
          orderId: `${orderId}_${group.sellerId}`,
          items: group.items,
          autoReleaseHours: 168, // 7 days default
        };

        const escrowContract = await this.createSingleEscrow(escrowParams);
        
        escrowGroups.push({
          sellerId: group.sellerId,
          sellerName: `Seller ${group.sellerId.slice(0, 6)}`,
          sellerAddress: group.sellerAddress,
          contracts: [escrowContract],
          totalAmount: group.totalAmount,
          status: 'funded',
        });
      }

      return escrowGroups;
    } catch (error) {
      console.error('Error creating multi-seller escrow:', error);
      throw new Error('Failed to create escrow contracts');
    }
  }

  /**
   * Create single escrow contract
   */
  async createSingleEscrow(params: CreateEscrowParams): Promise<EscrowContract> {
    if (!this.factoryContract || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const amountWei = ethers.utils.parseEther(params.amount);
      const orderIdBytes = ethers.utils.formatBytes32String(params.orderId);

      // Call factory contract to create escrow
      const tx = await this.factoryContract.createEscrow(
        params.sellerAddress,
        params.buyerAddress,
        amountWei,
        orderIdBytes,
        { value: amountWei }
      );

      const receipt = await tx.wait();
      
      // Extract escrow contract address from events
      const escrowCreatedEvent = receipt.events?.find(
        (event: any) => event.event === 'EscrowCreated'
      );
      
      if (!escrowCreatedEvent) {
        throw new Error('Escrow creation event not found');
      }

      const escrowAddress = escrowCreatedEvent.args.escrowContract;
      
      const escrowContract: EscrowContract = {
        address: escrowAddress,
        seller: params.sellerAddress,
        buyer: params.buyerAddress,
        amount: params.amount,
        orderId: params.orderId,
        status: EscrowStatus.FUNDED,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (params.autoReleaseHours || 168) * 60 * 60 * 1000),
        transactionHash: tx.hash,
      };

      // Store escrow details locally
      this.storeEscrowContract(escrowContract);

      return escrowContract;
    } catch (error) {
      console.error('Error creating escrow contract:', error);
      throw new Error('Failed to create escrow contract');
    }
  }

  /**
   * Release escrow funds to seller
   */
  async releaseEscrow(escrowAddress: string, buyerAddress: string): Promise<string> {
    if (!this.factoryContract || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signerAddress = await this.signer.getAddress();
      
      // Only buyer can release escrow
      if (signerAddress.toLowerCase() !== buyerAddress.toLowerCase()) {
        throw new Error('Only buyer can release escrow');
      }

      const tx = await this.factoryContract.releaseEscrow(escrowAddress);
      await tx.wait();

      // Update local storage
      this.updateEscrowStatus(escrowAddress, EscrowStatus.RELEASED);

      return tx.hash;
    } catch (error) {
      console.error('Error releasing escrow:', error);
      throw new Error('Failed to release escrow');
    }
  }

  /**
   * Create dispute for escrow
   */
  async disputeEscrow(escrowAddress: string, reason: string): Promise<string> {
    if (!this.factoryContract || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.factoryContract.disputeEscrow(escrowAddress, reason);
      await tx.wait();

      // Update local storage
      this.updateEscrowStatus(escrowAddress, EscrowStatus.DISPUTED, reason);

      return tx.hash;
    } catch (error) {
      console.error('Error creating dispute:', error);
      throw new Error('Failed to create dispute');
    }
  }

  /**
   * Get escrow contract details
   */
  async getEscrowDetails(escrowAddress: string): Promise<EscrowContract | null> {
    if (!this.factoryContract) {
      return this.getStoredEscrowContract(escrowAddress);
    }

    try {
      const details = await this.factoryContract.getEscrowDetails(escrowAddress);
      const [seller, buyer, amount, createdTimestamp, status] = details;

      return {
        address: escrowAddress,
        seller,
        buyer,
        amount: ethers.utils.formatEther(amount),
        orderId: '', // Would need to be stored separately
        status: status as EscrowStatus,
        createdAt: new Date(createdTimestamp * 1000),
        expiresAt: new Date(createdTimestamp * 1000 + 7 * 24 * 60 * 60 * 1000), // 7 days
        transactionHash: '',
      };
    } catch (error) {
      console.error('Error getting escrow details:', error);
      return null;
    }
  }

  /**
   * Get all escrow contracts for a user
   */
  async getUserEscrowContracts(userAddress: string): Promise<EscrowContract[]> {
    const stored = this.getStoredEscrowContracts();
    return stored.filter(
      contract => 
        contract.buyer.toLowerCase() === userAddress.toLowerCase() ||
        contract.seller.toLowerCase() === userAddress.toLowerCase()
    );
  }

  /**
   * Get escrow contracts grouped by seller
   */
  async getEscrowGroupsBySeller(userAddress: string): Promise<EscrowGroup[]> {
    const contracts = await this.getUserEscrowContracts(userAddress);
    const groupedBySeller = contracts.reduce((groups, contract) => {
      const sellerId = contract.seller;
      if (!groups[sellerId]) {
        groups[sellerId] = {
          sellerId,
          sellerName: `Seller ${sellerId.slice(0, 6)}`,
          sellerAddress: sellerId,
          contracts: [],
          totalAmount: '0',
          status: 'pending' as const,
        };
      }
      groups[sellerId].contracts.push(contract);
      return groups;
    }, {} as Record<string, EscrowGroup>);

    // Calculate totals and status for each group
    Object.values(groupedBySeller).forEach(group => {
      group.totalAmount = group.contracts
        .reduce((sum, contract) => sum + parseFloat(contract.amount), 0)
        .toString();
      
      // Determine group status
      const statuses = group.contracts.map(c => c.status);
      if (statuses.every(s => s === EscrowStatus.RELEASED)) {
        group.status = 'completed';
      } else if (statuses.some(s => s === EscrowStatus.DISPUTED)) {
        group.status = 'disputed';
      } else if (statuses.every(s => s === EscrowStatus.FUNDED)) {
        group.status = 'funded';
      } else {
        group.status = 'partial';
      }
    });

    return Object.values(groupedBySeller);
  }

  /**
   * Auto-release expired escrows
   */
  async processExpiredEscrows(): Promise<void> {
    const contracts = this.getStoredEscrowContracts();
    const now = new Date();

    for (const contract of contracts) {
      if (
        contract.status === EscrowStatus.FUNDED &&
        contract.expiresAt < now
      ) {
        try {
          await this.releaseEscrow(contract.address, contract.buyer);
          console.log(`Auto-released expired escrow: ${contract.address}`);
        } catch (error) {
          console.error(`Failed to auto-release escrow ${contract.address}:`, error);
        }
      }
    }
  }

  /**
   * Local storage helpers
   */
  private storeEscrowContract(contract: EscrowContract): void {
    const stored = this.getStoredEscrowContracts();
    stored.push(contract);
    localStorage.setItem('escrow_contracts', JSON.stringify(stored));
  }

  private getStoredEscrowContracts(): EscrowContract[] {
    try {
      const stored = localStorage.getItem('escrow_contracts');
      if (!stored) return [];
      
      const contracts = JSON.parse(stored);
      return contracts.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        expiresAt: new Date(c.expiresAt),
      }));
    } catch {
      return [];
    }
  }

  private getStoredEscrowContract(address: string): EscrowContract | null {
    const contracts = this.getStoredEscrowContracts();
    return contracts.find(c => c.address.toLowerCase() === address.toLowerCase()) || null;
  }

  private updateEscrowStatus(
    address: string, 
    status: EscrowStatus, 
    disputeReason?: string
  ): void {
    const contracts = this.getStoredEscrowContracts();
    const contractIndex = contracts.findIndex(
      c => c.address.toLowerCase() === address.toLowerCase()
    );
    
    if (contractIndex >= 0) {
      contracts[contractIndex].status = status;
      if (disputeReason) {
        contracts[contractIndex].disputeReason = disputeReason;
      }
      localStorage.setItem('escrow_contracts', JSON.stringify(contracts));
    }
  }

  /**
   * Calculate escrow fees
   */
  calculateEscrowFee(amount: string, feePercentage: number = 1): string {
    const amountNum = parseFloat(amount);
    const fee = amountNum * (feePercentage / 100);
    return fee.toString();
  }

  /**
   * Estimate gas costs for escrow operations
   */
  async estimateGasCosts(): Promise<{
    createEscrow: string;
    releaseEscrow: string;
    disputeEscrow: string;
  }> {
    if (!this.provider) {
      return {
        createEscrow: '0.001',
        releaseEscrow: '0.0005',
        disputeEscrow: '0.0007',
      };
    }

    try {
      const gasPrice = await this.provider.getGasPrice();
      const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
      
      // Estimated gas limits for each operation
      const gasLimits = {
        createEscrow: 150000,
        releaseEscrow: 50000,
        disputeEscrow: 70000,
      };

      return {
        createEscrow: ethers.utils.formatEther(gasPrice.mul(gasLimits.createEscrow)),
        releaseEscrow: ethers.utils.formatEther(gasPrice.mul(gasLimits.releaseEscrow)),
        disputeEscrow: ethers.utils.formatEther(gasPrice.mul(gasLimits.disputeEscrow)),
      };
    } catch (error) {
      console.error('Error estimating gas costs:', error);
      return {
        createEscrow: '0.001',
        releaseEscrow: '0.0005',
        disputeEscrow: '0.0007',
      };
    }
  }
}

export const escrowService = new EscrowService();
export default escrowService;