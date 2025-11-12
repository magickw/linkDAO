import { ethers } from 'ethers';
import WebSocketService from './webSocketService';
import { SubDAOService } from './subDAOService';
import { MarketplaceFeeService } from './marketplaceFeeService';
import { GovernanceRewardsService } from './governanceRewardsService';
import { APIAccessService } from './apiAccessService';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

// Create an instance of the WebSocket service
const webSocketService = new WebSocketService();

export interface RevenueSource {
  id: string;
  name: string;
  type: 'tipping' | 'marketplace' | 'boosting' | 'governance' | 'api_access' | 'advertising' | 'data_licensing' | 'other';
  description: string;
  isActive: boolean;
  feeStructure: {
    percentage: number;
    fixedFee?: string;
    currency: 'LDAO' | 'USDC' | 'ETH';
  };
  distributionRules: {
    daoTreasury: number;
    communityPool: number;
    subDAOs: number;
    rewards: number;
    development: number;
    reserves: number;
  };
}

export interface RevenueDistribution {
  id: string;
  period: string;
  totalRevenue: {
    LDAO: string;
    USDC: string;
    ETH: string;
  };
  sources: Array<{
    sourceId: string;
    amount: {
      LDAO: string;
      USDC: string;
      ETH: string;
    };
  }>;
  distributions: {
    daoTreasury: {
      amount: string;
      percentage: number;
      currency: string;
    };
    communityPool: {
      amount: string;
      percentage: number;
      currency: string;
    };
    subDAOs: Array<{
      subDAOId: string;
      amount: string;
      percentage: number;
      currency: string;
    }>;
    rewards: {
      governance: string;
      marketplace: string;
      api: string;
      currency: string;
    };
    development: {
      amount: string;
      percentage: number;
      currency: string;
    };
    reserves: {
      amount: string;
      percentage: number;
      currency: string;
    };
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  transactionHash?: string;
}

export interface TreasuryBalance {
  total: {
    LDAO: string;
    USDC: string;
    ETH: string;
    USD: string;
  };
  allocations: {
    daoTreasury: {
      LDAO: string;
      USDC: string;
      ETH: string;
    };
    communityPool: {
      LDAO: string;
      USDC: string;
      ETH: string;
    };
    subDAOs: {
      LDAO: string;
      USDC: string;
      ETH: string;
    };
    rewards: {
      LDAO: string;
      USDC: string;
      ETH: string;
    };
    development: {
      LDAO: string;
      USDC: string;
      ETH: string;
    };
    reserves: {
      LDAO: string;
      USDC: string;
      ETH: string;
    };
  };
  lastUpdated: Date;
}

export interface TreasuryTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'distribution' | 'transfer';
  amount: string;
  currency: 'LDAO' | 'USDC' | 'ETH';
  from: string;
  to: string;
  category: 'revenue' | 'expense' | 'distribution' | 'reallocation';
  description: string;
  metadata: {
    sourceId?: string;
    subDAOId?: string;
    userId?: string;
    proposalId?: string;
  };
  status: 'pending' | 'confirmed' | 'failed';
  transactionHash?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

export interface BudgetProposal {
  id: string;
  title: string;
  description: string;
  category: 'development' | 'marketing' | 'community' | 'operations' | 'research' | 'infrastructure';
  requestedAmount: {
    LDAO: string;
    USDC: string;
    ETH: string;
  };
  duration: number; // in days
  proposer: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'executed' | 'completed';
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    amount: string;
    currency: string;
    dueDate: Date;
    status: 'pending' | 'completed' | 'failed';
  }>;
  voting: {
    forVotes: string;
    againstVotes: string;
    quorum: string;
    endTime: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TreasuryReport {
  period: string;
  startDate: Date;
  endDate: Date;
  revenue: {
    total: {
      LDAO: string;
      USDC: string;
      ETH: string;
      USD: string;
    };
    bySource: Array<{
      source: string;
      amount: {
        LDAO: string;
        USDC: string;
        ETH: string;
      };
      percentage: number;
    }>;
  };
  expenses: {
    total: {
      LDAO: string;
      USDC: string;
      ETH: string;
      USD: string;
    };
    byCategory: Array<{
      category: string;
      amount: {
        LDAO: string;
        USDC: string;
        ETH: string;
      };
      percentage: number;
    }>;
  };
  distributions: {
    daoTreasury: string;
    communityPool: string;
    subDAOs: string;
    rewards: string;
    development: string;
    reserves: string;
  };
  netFlow: {
    LDAO: string;
    USDC: string;
    ETH: string;
    USD: string;
  };
  keyMetrics: {
    revenueGrowth: number;
    expenseGrowth: number;
    efficiency: number;
    sustainabilityScore: number;
  };
}

export class DAOTreasuryService {
  private static currentAddress: string | null = null;
  private static provider: ethers.providers.Web3Provider | null = null;
  private static revenueSources: RevenueSource[] | null = null;

  /**
   * Initialize the service with wallet connection
   */
  static async initialize(provider: ethers.providers.Web3Provider): Promise<void> {
    try {
      DAOTreasuryService.provider = provider;
      const signer = provider.getSigner();
      DAOTreasuryService.currentAddress = (await signer.getAddress()).toLowerCase();
      
      // Load revenue sources
      await DAOTreasuryService.loadRevenueSources();
    } catch (error) {
      console.error('Failed to initialize DAO treasury service:', error);
      throw error;
    }
  }

  /**
   * Load revenue sources from backend
   */
  private static async loadRevenueSources(): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/revenue-sources`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const sources = await response.json();
        DAOTreasuryService.revenueSources = sources;
      } else {
        // Use default revenue sources if API fails
        DAOTreasuryService.revenueSources = DAOTreasuryService.getDefaultRevenueSources();
      }
    } catch (error) {
      console.error('Error loading revenue sources, using defaults:', error);
      DAOTreasuryService.revenueSources = DAOTreasuryService.getDefaultRevenueSources();
    }
  }

  /**
   * Get default revenue sources
   */
  private static getDefaultRevenueSources(): RevenueSource[] {
    return [
      {
        id: 'tipping',
        name: 'Content Tipping',
        type: 'tipping',
        description: '5% fee from all tips and awards',
        isActive: true,
        feeStructure: {
          percentage: 5,
          currency: 'LDAO'
        },
        distributionRules: {
          daoTreasury: 40,
          communityPool: 30,
          subDAOs: 15,
          rewards: 10,
          development: 3,
          reserves: 2
        }
      },
      {
        id: 'marketplace',
        name: 'Marketplace Fees',
        type: 'marketplace',
        description: 'Transaction fees from marketplace activities',
        isActive: true,
        feeStructure: {
          percentage: 3.5,
          currency: 'LDAO'
        },
        distributionRules: {
          daoTreasury: 35,
          communityPool: 25,
          subDAOs: 20,
          rewards: 10,
          development: 5,
          reserves: 5
        }
      },
      {
        id: 'boosting',
        name: 'Post Boosting',
        type: 'boosting',
        description: 'Revenue from promoted posts and content boosting',
        isActive: true,
        feeStructure: {
          percentage: 10,
          currency: 'LDAO'
        },
        distributionRules: {
          daoTreasury: 30,
          communityPool: 30,
          subDAOs: 20,
          rewards: 10,
          development: 5,
          reserves: 5
        }
      },
      {
        id: 'governance',
        name: 'Governance Rewards',
        type: 'governance',
        description: 'Fees from governance participation and rewards',
        isActive: true,
        feeStructure: {
          percentage: 2,
          currency: 'LDAO'
        },
        distributionRules: {
          daoTreasury: 20,
          communityPool: 20,
          subDAOs: 30,
          rewards: 20,
          development: 5,
          reserves: 5
        }
      },
      {
        id: 'api_access',
        name: 'API Access',
        type: 'api_access',
        description: 'Revenue from API access subscriptions and usage fees',
        isActive: true,
        feeStructure: {
          percentage: 15,
          currency: 'LDAO'
        },
        distributionRules: {
          daoTreasury: 50,
          communityPool: 15,
          subDAOs: 10,
          rewards: 10,
          development: 10,
          reserves: 5
        }
      },
      {
        id: 'advertising',
        name: 'Advertising',
        type: 'advertising',
        description: 'Revenue from sponsored content and advertising',
        isActive: false,
        feeStructure: {
          percentage: 20,
          currency: 'LDAO'
        },
        distributionRules: {
          daoTreasury: 40,
          communityPool: 25,
          subDAOs: 15,
          rewards: 10,
          development: 5,
          reserves: 5
        }
      },
      {
        id: 'data_licensing',
        name: 'Data Licensing',
        type: 'data_licensing',
        description: 'Revenue from licensing analytics and data insights',
        isActive: false,
        feeStructure: {
          percentage: 25,
          currency: 'LDAO'
        },
        distributionRules: {
          daoTreasury: 45,
          communityPool: 20,
          subDAOs: 15,
          rewards: 10,
          development: 5,
          reserves: 5
        }
      }
    ];
  }

  /**
   * Get revenue sources
   */
  static async getRevenueSources(): Promise<RevenueSource[]> {
    if (!DAOTreasuryService.revenueSources) {
      await DAOTreasuryService.loadRevenueSources();
    }
    return DAOTreasuryService.revenueSources!;
  }

  /**
   * Get treasury balance
   */
  static async getTreasuryBalance(): Promise<TreasuryBalance> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/balance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch treasury balance');
      }

      const balance = await response.json();
      return {
        ...balance,
        lastUpdated: new Date(balance.lastUpdated)
      };
    } catch (error) {
      console.error('Error fetching treasury balance:', error);
      throw error;
    }
  }

  /**
   * Process revenue distribution
   */
  static async processRevenueDistribution(
    period: string,
    manualDistribution?: boolean
  ): Promise<RevenueDistribution> {
    if (!DAOTreasuryService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/distribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period,
          manualDistribution,
          processorAddress: DAOTreasuryService.currentAddress
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process revenue distribution');
      }

      const distribution = await response.json();
      
      // Send WebSocket notification
      webSocketService.send('treasury_distribution_processed', {
        period,
        distributionId: distribution.id,
        totalRevenue: distribution.totalRevenue
      });

      return {
        ...distribution,
        createdAt: new Date(distribution.createdAt),
        processedAt: distribution.processedAt ? new Date(distribution.processedAt) : undefined
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
   * Get revenue distribution history
   */
  static async getDistributionHistory(
    limit: number = 20,
    offset: number = 0
  ): Promise<RevenueDistribution[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/distributions?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch distribution history');
      }

      const distributions = await response.json();
      return distributions.map((dist: any) => ({
        ...dist,
        createdAt: new Date(dist.createdAt),
        processedAt: dist.processedAt ? new Date(dist.processedAt) : undefined
      }));
    } catch (error) {
      console.error('Error fetching distribution history:', error);
      return [];
    }
  }

  /**
   * Get treasury transactions
   */
  static async getTreasuryTransactions(
    category?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TreasuryTransaction[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/transactions?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch treasury transactions');
      }

      const transactions = await response.json();
      return transactions.map((tx: any) => ({
        ...tx,
        createdAt: new Date(tx.createdAt),
        confirmedAt: tx.confirmedAt ? new Date(tx.confirmedAt) : undefined
      }));
    } catch (error) {
      console.error('Error fetching treasury transactions:', error);
      return [];
    }
  }

  /**
   * Create budget proposal
   */
  static async createBudgetProposal(proposalData: {
    title: string;
    description: string;
    category: 'development' | 'marketing' | 'community' | 'operations' | 'research' | 'infrastructure';
    requestedAmount: {
      LDAO: string;
      USDC: string;
      ETH: string;
    };
    duration: number;
    milestones: Array<{
      title: string;
      description: string;
      amount: string;
      currency: string;
      dueDate: Date;
    }>;
  }): Promise<BudgetProposal> {
    if (!DAOTreasuryService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/budget-proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...proposalData,
          proposer: DAOTreasuryService.currentAddress
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create budget proposal');
      }

      const proposal = await response.json();
      
      // Send WebSocket notification
      webSocketService.send('budget_proposal_created', {
        proposalId: proposal.id,
        proposer: DAOTreasuryService.currentAddress,
        requestedAmount: proposal.requestedAmount
      });

      return {
        ...proposal,
        milestones: proposal.milestones.map((milestone: any) => ({
          ...milestone,
          dueDate: new Date(milestone.dueDate)
        })),
        voting: {
          ...proposal.voting,
          endTime: new Date(proposal.voting.endTime)
        },
        createdAt: new Date(proposal.createdAt),
        updatedAt: new Date(proposal.updatedAt)
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
   * Get budget proposals
   */
  static async getBudgetProposals(
    status?: string,
    category?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<BudgetProposal[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (status) {
        params.append('status', status);
      }
      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/budget-proposals?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch budget proposals');
      }

      const proposals = await response.json();
      return proposals.map((proposal: any) => ({
        ...proposal,
        milestones: proposal.milestones.map((milestone: any) => ({
          ...milestone,
          dueDate: new Date(milestone.dueDate)
        })),
        voting: {
          ...proposal.voting,
          endTime: new Date(proposal.voting.endTime)
        },
        createdAt: new Date(proposal.createdAt),
        updatedAt: new Date(proposal.updatedAt)
      }));
    } catch (error) {
      console.error('Error fetching budget proposals:', error);
      return [];
    }
  }

  /**
   * Execute budget proposal
   */
  static async executeBudgetProposal(
    proposalId: string,
    milestoneId?: string
  ): Promise<string> {
    if (!DAOTreasuryService.currentAddress || !DAOTreasuryService.provider) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/budget-proposals/${proposalId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          executorAddress: DAOTreasuryService.currentAddress,
          milestoneId
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute budget proposal');
      }

      const result = await response.json();
      
      // Send WebSocket notification
      webSocketService.send('budget_proposal_executed', {
        proposalId,
        executorAddress: DAOTreasuryService.currentAddress,
        milestoneId,
        amount: result.amount
      });

      return result.transactionHash;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get treasury report
   */
  static async getTreasuryReport(
    period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly',
    startDate?: Date,
    endDate?: Date
  ): Promise<TreasuryReport> {
    try {
      const params = new URLSearchParams({ period });

      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/report?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch treasury report');
      }

      const report = await response.json();
      return {
        ...report,
        startDate: new Date(report.startDate),
        endDate: new Date(report.endDate)
      };
    } catch (error) {
      console.error('Error fetching treasury report:', error);
      throw error;
    }
  }

  /**
   * Update revenue source configuration (admin only)
   */
  static async updateRevenueSource(
    sourceId: string,
    updates: Partial<RevenueSource>
  ): Promise<RevenueSource> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/revenue-sources/${sourceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update revenue source');
      }

      const updatedSource = await response.json();
      
      // Update local cache
      if (DAOTreasuryService.revenueSources) {
        const index = DAOTreasuryService.revenueSources.findIndex(s => s.id === sourceId);
        if (index !== -1) {
          DAOTreasuryService.revenueSources[index] = updatedSource;
        }
      }

      return updatedSource;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    numberOfPeriods: number = 12
  ): Promise<{
    totalRevenue: {
      LDAO: string;
      USDC: string;
      ETH: string;
      USD: string;
    };
    averageRevenue: {
      LDAO: string;
      USDC: string;
      ETH: string;
      USD: string;
    };
    growthRate: number;
    sourceBreakdown: Array<{
      source: string;
      revenue: {
        LDAO: string;
        USDC: string;
        ETH: string;
      };
      percentage: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    projections: Array<{
      period: string;
      projected: {
        LDAO: string;
        USDC: string;
        ETH: string;
      };
      confidence: number;
    }>;
  }> {
    try {
      const params = new URLSearchParams({
        period,
        numberOfPeriods: numberOfPeriods.toString()
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/revenue-analytics?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue analytics');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      throw error;
    }
  }

  /**
   * Withdraw funds from treasury (requires multi-sig approval)
   */
  static async withdrawFromTreasury(
    amount: string,
    currency: 'LDAO' | 'USDC' | 'ETH',
    recipient: string,
    reason: string,
    proposalId?: string
  ): Promise<string> {
    if (!DAOTreasuryService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/treasury/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          recipient,
          reason,
          proposalId,
          requesterAddress: DAOTreasuryService.currentAddress
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to withdraw from treasury');
      }

      const result = await response.json();
      
      // Send WebSocket notification
      webSocketService.send('treasury_withdrawal_requested', {
        amount,
        currency,
        recipient,
        reason,
        proposalId,
        requesterAddress: DAOTreasuryService.currentAddress
      });

      return result.transactionHash;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }
}