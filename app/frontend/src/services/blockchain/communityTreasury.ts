/**
 * Community Treasury Management Service
 * Handles blockchain interactions for community treasury operations
 */

import { ethers } from 'ethers';
import { getProvider, getSigner } from '@/utils/web3';

// Use environment configuration for contract addresses
import { ENV_CONFIG } from '@/config/environment';
const GOVERNANCE_ADDRESS = ENV_CONFIG.GOVERNANCE_ADDRESS;
const LDAO_TOKEN_ADDRESS = ENV_CONFIG.LDAO_TOKEN_ADDRESS;

// Governance contract ABI - for proposal and execution
const GOVERNANCE_ABI = [
  'function propose(string calldata title, string calldata description, uint8 category, address[] calldata targets, uint256[] calldata values, string[] calldata signatures, bytes[] calldata calldatas) returns (uint256)',
  'function execute(uint256 proposalId) returns (bool)',
  'function castVote(uint256 proposalId, uint8 support, string calldata reason) returns (uint256)',
  'function getProposalInfo(uint256 proposalId) view returns (tuple(uint256 id, address proposer, string title, string description, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool executed, bool canceled))',
  'function state(uint256 proposalId) view returns (uint8)',
];

// ERC20 ABI for treasury token management
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

export interface TreasuryBalance {
  tokenAddress: string;
  tokenSymbol: string;
  balance: string;
  balanceUSD?: string;
}

export interface TreasuryProposal {
  id: string;
  proposer: string;
  title: string;
  description: string;
  targetAddress: string;
  amount: string;
  tokenAddress: string;
  status: 'pending' | 'active' | 'succeeded' | 'defeated' | 'executed' | 'canceled';
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  startTime: Date;
  endTime: Date;
  transactionHash?: string;
}

export interface TreasuryTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  tokenAddress: string;
  timestamp: Date;
  type: 'deposit' | 'withdrawal' | 'allocation';
  proposalId?: string;
}

export class CommunityTreasuryService {
  /**
   * Get treasury balance for a community
   */
  async getTreasuryBalance(treasuryAddress: string): Promise<TreasuryBalance[]> {
    try {
      const provider = await getProvider();
      if (!provider) {
        throw new Error('Web3 provider not available');
      }

      const balances: TreasuryBalance[] = [];

      // Get native ETH balance
      const ethBalance = await provider.getBalance(treasuryAddress);
      balances.push({
        tokenAddress: ethers.ZeroAddress,
        tokenSymbol: 'ETH',
        balance: ethers.formatEther(ethBalance),
      });

      // Get LDAO token balance
      const ldaoContract = new ethers.Contract(LDAO_TOKEN_ADDRESS, ERC20_ABI, provider);
      const ldaoBalance = await ldaoContract.balanceOf(treasuryAddress);
      balances.push({
        tokenAddress: LDAO_TOKEN_ADDRESS,
        tokenSymbol: 'LDAO',
        balance: ethers.formatEther(ldaoBalance),
      });

      return balances;
    } catch (error) {
      console.error('Error getting treasury balance:', error);
      return [];
    }
  }

  /**
   * Create a treasury spending proposal
   */
  async createTreasuryProposal(
    communityId: string,
    treasuryAddress: string,
    title: string,
    description: string,
    recipientAddress: string,
    amount: string,
    tokenAddress?: string
  ): Promise<string> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No signer available');
      }

      const provider = await getProvider();
      if (!provider) {
        throw new Error('Web3 provider not available');
      }

      const governanceContract = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, signer);

      // Prepare proposal actions
      const token = tokenAddress || LDAO_TOKEN_ADDRESS;
      const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);

      // Create calldata for token transfer
      const transferCalldata = tokenContract.interface.encodeFunctionData('transfer', [
        recipientAddress,
        ethers.parseEther(amount),
      ]);

      const targets = [token];
      const values = [0]; // No ETH sent
      const signatures = ['transfer(address,uint256)'];
      const calldatas = [transferCalldata];

      // Submit proposal
      const tx = await governanceContract.propose(
        title,
        description,
        2, // TREASURY category
        targets,
        values,
        signatures,
        calldatas
      );

      const receipt = await tx.wait();

      // Extract proposal ID from events
      const proposalCreatedEvent = receipt.events?.find(
        (e: any) => e.event === 'ProposalCreated'
      );
      const proposalId = proposalCreatedEvent?.args?.id?.toString() || receipt.transactionHash;

      return proposalId;
    } catch (error) {
      console.error('Error creating treasury proposal:', error);
      throw error;
    }
  }

  /**
   * Execute an approved treasury proposal
   */
  async executeTreasuryProposal(proposalId: string): Promise<string> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No signer available');
      }

      const governanceContract = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, signer);

      // Check proposal state
      const state = await governanceContract.state(proposalId);
      if (state !== 4) {
        // 4 = Succeeded
        throw new Error('Proposal has not succeeded and cannot be executed');
      }

      // Execute proposal
      const tx = await governanceContract.execute(proposalId);
      const receipt = await tx.wait();

      return receipt.transactionHash;
    } catch (error) {
      console.error('Error executing treasury proposal:', error);
      throw error;
    }
  }

  /**
   * Allocate funds from treasury to a recipient (requires governance approval)
   */
  async allocateTreasuryFunds(
    treasuryAddress: string,
    recipientAddress: string,
    amount: string,
    tokenAddress?: string
  ): Promise<string> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No signer available');
      }

      const token = tokenAddress || LDAO_TOKEN_ADDRESS;
      const tokenContract = new ethers.Contract(token, ERC20_ABI, signer);

      // Note: This function should only be callable by the treasury (multisig or governance contract)
      // In practice, this would be executed through a governance proposal
      const tx = await tokenContract.transfer(
        recipientAddress,
        ethers.parseEther(amount)
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error allocating treasury funds:', error);
      throw error;
    }
  }

  /**
   * Get treasury transaction history
   * Note: This is a simplified version. In production, you'd use event logs or a subgraph
   */
  async getTreasuryTransactions(
    treasuryAddress: string,
    limit: number = 50
  ): Promise<TreasuryTransaction[]> {
    try {
      const provider = await getProvider();
      if (!provider) {
        throw new Error('Web3 provider not available');
      }

      // Get LDAO token contract
      const ldaoContract = new ethers.Contract(LDAO_TOKEN_ADDRESS, ERC20_ABI, provider);

      // Get Transfer events
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks

      const transferFilter = ldaoContract.filters.Transfer(null, treasuryAddress);
      const transferEvents = await ldaoContract.queryFilter(transferFilter, fromBlock, currentBlock);

      const transactions: TreasuryTransaction[] = [];

      for (const event of transferEvents.slice(-limit)) {
        // In ethers v6, event data is accessed differently
        if (!event.data || !event.topics) continue;

        const block = await event.getBlock();
        
        // Parse the event data
        const parsedEvent = ldaoContract.interface.parseLog(event);
        if (!parsedEvent || !parsedEvent.args) continue;

        transactions.push({
          hash: event.transactionHash,
          from: parsedEvent.args.from,
          to: parsedEvent.args.to,
          amount: ethers.formatEther(parsedEvent.args.value),
          tokenAddress: LDAO_TOKEN_ADDRESS,
          timestamp: new Date(block.timestamp * 1000),
          type: 'deposit',
        });
      }

      // Also get outgoing transfers
      const outgoingFilter = ldaoContract.filters.Transfer(treasuryAddress, null);
      const outgoingEvents = await ldaoContract.queryFilter(outgoingFilter, fromBlock, currentBlock);

      for (const event of outgoingEvents.slice(-limit)) {
        // In ethers v6, event data is accessed differently
        if (!event.data || !event.topics) continue;

        const block = await event.getBlock();
        
        // Parse the event data
        const parsedEvent = ldaoContract.interface.parseLog(event);
        if (!parsedEvent || !parsedEvent.args) continue;

        transactions.push({
          hash: event.transactionHash,
          from: parsedEvent.args.from,
          to: parsedEvent.args.to,
          amount: ethers.formatEther(parsedEvent.args.value),
          tokenAddress: LDAO_TOKEN_ADDRESS,
          timestamp: new Date(block.timestamp * 1000),
          type: 'withdrawal',
        });
      }

      // Sort by timestamp descending
      transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return transactions.slice(0, limit);
    } catch (error) {
      console.error('Error getting treasury transactions:', error);
      return [];
    }
  }

  /**
   * Deposit tokens to treasury
   */
  async depositToTreasury(
    treasuryAddress: string,
    amount: string,
    tokenAddress?: string
  ): Promise<string> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No signer available');
      }

      const token = tokenAddress || LDAO_TOKEN_ADDRESS;
      const tokenContract = new ethers.Contract(token, ERC20_ABI, signer);

      // Transfer tokens to treasury
      const tx = await tokenContract.transfer(
        treasuryAddress,
        ethers.parseEther(amount)
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error depositing to treasury:', error);
      throw error;
    }
  }

  /**
   * Get treasury allocation by category
   * Returns breakdown of how treasury funds are allocated
   */
  async getTreasuryAllocation(treasuryAddress: string): Promise<{
    total: string;
    allocated: string;
    available: string;
    allocations: Array<{
      category: string;
      amount: string;
      percentage: number;
    }>;
  }> {
    try {
      const balances = await this.getTreasuryBalance(treasuryAddress);
      const ldaoBalance = balances.find(b => b.tokenSymbol === 'LDAO');
      const total = ldaoBalance?.balance || '0';

      // Mock allocation data - in production, this would come from governance proposals
      const allocations = [
        { category: 'Development', amount: (parseFloat(total) * 0.4).toFixed(2), percentage: 40 },
        { category: 'Marketing', amount: (parseFloat(total) * 0.2).toFixed(2), percentage: 20 },
        { category: 'Community Rewards', amount: (parseFloat(total) * 0.3).toFixed(2), percentage: 30 },
        { category: 'Reserve', amount: (parseFloat(total) * 0.1).toFixed(2), percentage: 10 },
      ];

      const allocated = allocations.reduce((sum, a) => sum + parseFloat(a.amount), 0).toFixed(2);
      const available = (parseFloat(total) - parseFloat(allocated)).toFixed(2);

      return {
        total,
        allocated,
        available,
        allocations,
      };
    } catch (error) {
      console.error('Error getting treasury allocation:', error);
      return {
        total: '0',
        allocated: '0',
        available: '0',
        allocations: [],
      };
    }
  }

  /**
   * Get pending treasury proposals
   */
  async getPendingTreasuryProposals(communityId: string): Promise<TreasuryProposal[]> {
    try {
      const provider = await getProvider();
      if (!provider) {
        throw new Error('Web3 provider not available');
      }

      const governanceContract = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, provider);

      // In production, you would query ProposalCreated events and filter by category
      // For now, return empty array as this requires indexed event tracking
      // TODO: Implement event indexing or subgraph integration

      return [];
    } catch (error) {
      console.error('Error getting pending treasury proposals:', error);
      return [];
    }
  }

  /**
   * Approve token spending for treasury operations
   */
  async approveTokenSpending(
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ): Promise<string> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No signer available');
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      const tx = await tokenContract.approve(
        spenderAddress,
        ethers.parseEther(amount)
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error approving token spending:', error);
      throw error;
    }
  }

  /**
   * Check token allowance
   */
  async checkTokenAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
  ): Promise<string> {
    try {
      const provider = await getProvider();
      if (!provider) {
        throw new Error('Web3 provider not available');
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);

      return ethers.formatEther(allowance);
    } catch (error) {
      console.error('Error checking token allowance:', error);
      return '0';
    }
  }
}

export const communityTreasuryService = new CommunityTreasuryService();
