import { ethers } from 'ethers';
import { webSocketService } from './webSocketService';
import { SubDAOService } from './subDAOService';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface TransactionFee {
  id: string;
  type: 'listing' | 'sale' | 'offer' | 'auction' | 'escrow' | 'dispute';
  amount: string;
  currency: 'LDAO' | 'USDC' | 'ETH';
  percentage: number;
  baseFee: string;
  recipient: string;
  status: 'pending' | 'collected' | 'distributed' | 'refunded';
  transactionId: string;
  createdAt: Date;
  distributedAt?: Date;
}

export interface FeeStructure {
  listingFee: {
    enabled: boolean;
    baseFee: {
      LDAO: string;
      USDC: string;
      ETH: string;
    };
    percentage: number;
    waivers: {
      daoApproved: boolean;
      reputationThreshold: number;
      volumeThreshold: string;
    };
  };
  saleFee: {
    enabled: boolean;
    buyerFee: number;
    sellerFee: number;
    totalFee: number;
    distribution: {
      daoTreasury: number;
      communityPool: number;
      subDAO: number;
      insurance: number;
    };
  };
  auctionFee: {
    enabled: boolean;
    listingFee: string;
    successFee: number;
    reserveFee: number;
  };
  escrowFee: {
    enabled: boolean;
    percentage: number;
    maxFee: string;
    minFee: string;
  };
  disputeFee: {
    enabled: boolean;
    initiatorFee: string;
    resolutionFee: string;
  };
}

export interface FeeDiscount {
  id: string;
  userId: string;
  type: 'percentage' | 'fixed' | 'waiver';
  value: number | string;
  applicableFees: string[];
  conditions: {
    minReputation?: number;
    minVolume?: string;
    daoMember?: boolean;
    subDAOStaker?: boolean;
    validUntil?: Date;
  };
  isActive: boolean;
  createdAt: Date;
}

export interface RevenueShare {
  period: string;
  totalRevenue: {
    LDAO: string;
    USDC: string;
    ETH: string;
  };
  distributions: {
    daoTreasury: {
      amount: string;
      percentage: number;
    };
    communityPool: {
      amount: string;
      percentage: number;
    };
    subDAOs: Array<{
      subDAOId: string;
      amount: string;
      percentage: number;
    }>;
    insurance: {
      amount: string;
      percentage: number;
    };
  };
  createdAt: Date;
}

export class MarketplaceFeeService {
  private static currentAddress: string | null = null;
  private static provider: ethers.BrowserProvider | null = null;
  private static feeStructure: FeeStructure | null = null;

  /**
   * Initialize the service with wallet connection
   */
  static async initialize(provider: ethers.BrowserProvider): Promise<void> {
    try {
      MarketplaceFeeService.provider = provider;
      const signer = await provider.getSigner();
      MarketplaceFeeService.currentAddress = (await signer.getAddress()).toLowerCase();

      // Load fee structure
      await MarketplaceFeeService.loadFeeStructure();
    } catch (error) {
      console.error('Failed to initialize marketplace fee service:', error);
      throw error;
    }
  }

  /**
   * Load fee structure from backend
   */
  private static async loadFeeStructure(): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/fees/structure`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const structure = await response.json();
        MarketplaceFeeService.feeStructure = structure;
      } else {
        // Use default fee structure if API fails
        MarketplaceFeeService.feeStructure = MarketplaceFeeService.getDefaultFeeStructure();
      }
    } catch (error) {
      console.error('Error loading fee structure, using defaults:', error);
      MarketplaceFeeService.feeStructure = MarketplaceFeeService.getDefaultFeeStructure();
    }
  }

  /**
   * Get default fee structure
   */
  private static getDefaultFeeStructure(): FeeStructure {
    return {
      listingFee: {
        enabled: true,
        baseFee: {
          LDAO: '5',
          USDC: '2',
          ETH: '0.001'
        },
        percentage: 0.5,
        waivers: {
          daoApproved: true,
          reputationThreshold: 100,
          volumeThreshold: '10000'
        }
      },
      saleFee: {
        enabled: true,
        buyerFee: 1,
        sellerFee: 2.5,
        totalFee: 3.5,
        distribution: {
          daoTreasury: 40,
          communityPool: 30,
          subDAO: 20,
          insurance: 10
        }
      },
      auctionFee: {
        enabled: true,
        listingFee: '10',
        successFee: 2.5,
        reserveFee: 1
      },
      escrowFee: {
        enabled: true,
        percentage: 1,
        maxFee: '100',
        minFee: '1'
      },
      disputeFee: {
        enabled: true,
        initiatorFee: '5',
        resolutionFee: '10'
      }
    };
  }

  /**
   * Calculate listing fee
   */
  static async calculateListingFee(
    sellerAddress: string,
    price: string,
    currency: 'LDAO' | 'USDC' | 'ETH'
  ): Promise<{ fee: string; discounts: FeeDiscount[]; waivers: string[] }> {
    if (!MarketplaceFeeService.feeStructure) {
      await MarketplaceFeeService.loadFeeStructure();
    }

    const structure = MarketplaceFeeService.feeStructure!;
    let fee = structure.listingFee.baseFee[currency];
    const discounts: FeeDiscount[] = [];
    const waivers: string[] = [];

    // Check for waivers
    if (structure.listingFee.waivers.daoApproved) {
      const isApproved = await MarketplaceFeeService.checkDAOApproval(sellerAddress);
      if (isApproved) {
        waivers.push('DAO Approved Seller');
      }
    }

    // Calculate percentage fee if not waived
    if (waivers.length === 0) {
      const percentageFee = (parseFloat(price) * structure.listingFee.percentage / 100).toString();
      fee = (parseFloat(fee) + parseFloat(percentageFee)).toString();
    }

    // Apply discounts
    const userDiscounts = await MarketplaceFeeService.getUserDiscounts(sellerAddress);
    for (const discount of userDiscounts) {
      if (discount.applicableFees.includes('listing')) {
        discounts.push(discount);
        if (discount.type === 'percentage') {
          fee = (parseFloat(fee) * (1 - Number(discount.value) / 100)).toString();
        } else if (discount.type === 'fixed') {
          fee = Math.max(0, parseFloat(fee) - parseFloat(String(discount.value))).toString();
        }
      }
    }

    return { fee, discounts, waivers };
  }

  /**
   * Calculate sale fee
   */
  static async calculateSaleFee(
    salePrice: string,
    currency: 'LDAO' | 'USDC' | 'ETH',
    buyerAddress: string,
    sellerAddress: string
  ): Promise<{
    buyerFee: string;
    sellerFee: string;
    totalFee: string;
    distributions: Record<string, string>;
  }> {
    if (!MarketplaceFeeService.feeStructure) {
      await MarketplaceFeeService.loadFeeStructure();
    }

    const structure = MarketplaceFeeService.feeStructure!;
    const price = parseFloat(salePrice);

    let buyerFeeAmount = (price * structure.saleFee.buyerFee / 100).toString();
    let sellerFeeAmount = (price * structure.saleFee.sellerFee / 100).toString();
    const totalFeeAmount = (price * structure.saleFee.totalFee / 100).toString();

    // Apply buyer discounts
    const buyerDiscounts = await MarketplaceFeeService.getUserDiscounts(buyerAddress);
    for (const discount of buyerDiscounts) {
      if (discount.applicableFees.includes('sale_buyer')) {
        if (discount.type === 'percentage') {
          buyerFeeAmount = (parseFloat(buyerFeeAmount) * (1 - Number(discount.value) / 100)).toString();
        } else if (discount.type === 'fixed') {
          buyerFeeAmount = Math.max(0, parseFloat(buyerFeeAmount) - parseFloat(String(discount.value))).toString();
        }
      }
    }

    // Apply seller discounts
    const sellerDiscounts = await MarketplaceFeeService.getUserDiscounts(sellerAddress);
    for (const discount of sellerDiscounts) {
      if (discount.applicableFees.includes('sale_seller')) {
        if (discount.type === 'percentage') {
          sellerFeeAmount = (parseFloat(sellerFeeAmount) * (1 - Number(discount.value) / 100)).toString();
        } else if (discount.type === 'fixed') {
          sellerFeeAmount = Math.max(0, parseFloat(sellerFeeAmount) - parseFloat(String(discount.value))).toString();
        }
      }
    }

    // Calculate distributions
    const distributions: Record<string, string> = {};
    const actualTotalFee = parseFloat(buyerFeeAmount) + parseFloat(sellerFeeAmount);

    distributions.daoTreasury = (actualTotalFee * structure.saleFee.distribution.daoTreasury / 100).toString();
    distributions.communityPool = (actualTotalFee * structure.saleFee.distribution.communityPool / 100).toString();
    distributions.subDAO = (actualTotalFee * structure.saleFee.distribution.subDAO / 100).toString();
    distributions.insurance = (actualTotalFee * structure.saleFee.distribution.insurance / 100).toString();

    return {
      buyerFee: buyerFeeAmount,
      sellerFee: sellerFeeAmount,
      totalFee: actualTotalFee.toString(),
      distributions
    };
  }

  /**
   * Collect and distribute fees
   */
  static async collectAndDistributeFees(feeData: {
    transactionId: string;
    type: 'listing' | 'sale' | 'auction';
    amount: string;
    currency: 'LDAO' | 'USDC' | 'ETH';
    buyerAddress?: string;
    sellerAddress: string;
    communityId?: string;
    subDAOId?: string;
  }): Promise<TransactionFee> {
    if (!MarketplaceFeeService.currentAddress || !MarketplaceFeeService.provider) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Create fee record
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/fees/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...feeData,
          collectorAddress: MarketplaceFeeService.currentAddress
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to collect fees');
      }

      const feeRecord = await response.json();

      // Distribute to community pool if applicable
      if (feeData.communityId && feeData.subDAOId) {
        await SubDAOService.distributeRevenue({
          subDAOId: feeData.subDAOId,
          amount: feeRecord.distributions?.communityPool || '0',
          currency: feeData.currency,
          source: 'marketplace'
        });
      }

      // Send WebSocket notification
      webSocketService.send('fee_collected', {
        feeId: feeRecord.id,
        transactionId: feeData.transactionId,
        amount: feeData.amount,
        currency: feeData.currency
      });

      return feeRecord;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get fee history for a user
   */
  static async getUserFeeHistory(
    userAddress?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionFee[]> {
    const address = userAddress || MarketplaceFeeService.currentAddress;
    if (!address) {
      throw new Error('No address provided');
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/fees/user/${address}?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch fee history');
      }

      const fees = await response.json();
      return fees.map((fee: any) => ({
        ...fee,
        createdAt: new Date(fee.createdAt),
        distributedAt: fee.distributedAt ? new Date(fee.distributedAt) : undefined
      }));
    } catch (error) {
      console.error('Error fetching fee history:', error);
      return [];
    }
  }

  /**
   * Get revenue share report
   */
  static async getRevenueShareReport(period: 'daily' | 'weekly' | 'monthly'): Promise<RevenueShare[]> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/fees/revenue-share?period=${period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue share report');
      }

      const reports = await response.json();
      return reports.map((report: any) => ({
        ...report,
        createdAt: new Date(report.createdAt)
      }));
    } catch (error) {
      console.error('Error fetching revenue share report:', error);
      return [];
    }
  }

  /**
   * Check if user has DAO approval
   */
  private static async checkDAOApproval(userAddress: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/users/${userAddress}/dao-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.isApproved || false;
      }
      return false;
    } catch (error) {
      console.error('Error checking DAO approval:', error);
      return false;
    }
  }

  /**
   * Get user discounts
   */
  private static async getUserDiscounts(userAddress: string): Promise<FeeDiscount[]> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/fees/discounts/${userAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const discounts = await response.json();
        return discounts.map((discount: any) => ({
          ...discount,
          conditions: {
            ...discount.conditions,
            validUntil: discount.conditions.validUntil ? new Date(discount.conditions.validUntil) : undefined
          },
          createdAt: new Date(discount.createdAt)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching user discounts:', error);
      return [];
    }
  }

  /**
   * Create fee discount (admin only)
   */
  static async createFeeDiscount(discountData: Omit<FeeDiscount, 'id' | 'createdAt'>): Promise<FeeDiscount> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/fees/discounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discountData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create fee discount');
      }

      const discount = await response.json();
      return {
        ...discount,
        conditions: {
          ...discount.conditions,
          validUntil: discount.conditions.validUntil ? new Date(discount.conditions.validUntil) : undefined
        },
        createdAt: new Date(discount.createdAt)
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Update fee structure (admin only)
   */
  static async updateFeeStructure(structure: Partial<FeeStructure>): Promise<FeeStructure> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/marketplace/fees/structure`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(structure),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update fee structure');
      }

      const updatedStructure = await response.json();
      MarketplaceFeeService.feeStructure = updatedStructure;
      return updatedStructure;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get current fee structure
   */
  static async getFeeStructure(): Promise<FeeStructure> {
    if (!MarketplaceFeeService.feeStructure) {
      await MarketplaceFeeService.loadFeeStructure();
    }
    return MarketplaceFeeService.feeStructure!;
  }

  /**
   * Calculate escrow fee
   */
  static async calculateEscrowFee(
    amount: string,
    currency: 'LDAO' | 'USDC' | 'ETH'
  ): Promise<string> {
    if (!MarketplaceFeeService.feeStructure) {
      await MarketplaceFeeService.loadFeeStructure();
    }

    const structure = MarketplaceFeeService.feeStructure!;
    const escrowFee = parseFloat(amount) * structure.escrowFee.percentage / 100;

    // Apply min/max limits
    const minFee = parseFloat(structure.escrowFee.minFee);
    const maxFee = parseFloat(structure.escrowFee.maxFee);

    const finalFee = Math.max(minFee, Math.min(maxFee, escrowFee));
    return finalFee.toString();
  }
}