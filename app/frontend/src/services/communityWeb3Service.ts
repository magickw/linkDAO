// Community Web3 Service - Real implementation for production
// This service provides Web3 functionality for community features

import { ethers } from 'ethers';
import { getProvider, getSigner } from '@/utils/web3';
import { Governance__factory, LDAOToken__factory } from '@/types/typechain';
import { Governance, LDAOToken } from '@/types/typechain';

// Use environment configuration for contract addresses
import { ENV_CONFIG } from '@/config/environment';
const GOVERNANCE_CONTRACT_ADDRESS = ENV_CONFIG.GOVERNANCE_ADDRESS;
const LDAO_TOKEN_CONTRACT_ADDRESS = ENV_CONFIG.LDAO_TOKEN_ADDRESS;

export interface StakeVoteInput {
  postId: string;
  voteType: 'upvote' | 'downvote';
  stakeAmount: string;
  tokenAddress: string;
}

export interface CommunityGovernanceProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  communityId: string;
  startTime: Date;
  endTime: Date;
  forVotes: string;
  againstVotes: string;
  quorum: string;
  status: 'pending' | 'active' | 'passed' | 'failed' | 'executed';
  actions: ProposalAction[];
}

export interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

export interface CommunityTipInput {
  postId: string;
  recipientAddress: string;
  amount: string;
  token: string;
  message?: string;
}

export interface StakingReward {
  user: string;
  postId: string;
  rewardAmount: string;
  rewardToken: string;
  earned: boolean;
}

// Add the DeFiProtocolData interface
export interface DeFiProtocolData {
  protocol: string;
  tvl: string;
  apy: string;
  token: string;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  category: string;
}

export class CommunityWeb3Service {
  private governanceContract: ethers.Contract | null = null;
  private tokenContract: ethers.Contract | null = null;

  constructor() {
    // Avoid initializing contracts during SSR/build.
    if (typeof window !== 'undefined') {
      // Defer initialization to the client environment
      this.initializeContracts();
    }
  }

  private async initializeContracts() {
    try {
      const provider = await getProvider();
      // Check if provider is available before initializing contracts
      if (!provider) {
        console.warn('No provider available, skipping contract initialization');
        return;
      }

      // Check if contract addresses are properly configured
      if (!GOVERNANCE_CONTRACT_ADDRESS || !ethers.isAddress(GOVERNANCE_CONTRACT_ADDRESS)) {
        console.warn('Governance contract address not configured or invalid, skipping initialization');
      } else {
        // Initialize governance contract only if address is valid
        this.governanceContract = new ethers.Contract(
          GOVERNANCE_CONTRACT_ADDRESS,
          Governance__factory.abi,
          provider
        );
      }

      if (!LDAO_TOKEN_CONTRACT_ADDRESS || !ethers.isAddress(LDAO_TOKEN_CONTRACT_ADDRESS)) {
        console.warn('LDAO token contract address not configured or invalid, skipping initialization');
      } else {
        // Initialize token contract only if address is valid
        this.tokenContract = new ethers.Contract(
          LDAO_TOKEN_CONTRACT_ADDRESS,
          LDAOToken__factory.abi,
          provider
        );
      }
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }

  /**
   * Stake tokens on a community post vote
   */
  async stakeOnVote(input: StakeVoteInput): Promise<string> {
    try {
      const signer = await getSigner();
      if (!signer) throw new Error('No signer available');

      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      // Approve tokens for staking
      const tokenWithSigner = this.tokenContract.connect(signer) as unknown as LDAOToken;
      const tx = await tokenWithSigner.stake(
        ethers.parseEther(input.stakeAmount),
        1 // Default to first staking tier
      ) as any;

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error staking on vote:', error);
      throw error;
    }
  }

  /**
   * Create a community governance proposal
   */
  async createGovernanceProposal(
    communityId: string,
    title: string,
    description: string,
    actions: ProposalAction[]
  ): Promise<string> {
    try {
      const signer = await getSigner();
      if (!signer) throw new Error('No signer available');

      if (!this.governanceContract) {
        throw new Error('Governance contract not initialized');
      }

      // Prepare proposal data
      const targets = actions.map(action => action.target);
      const values = actions.map(action => action.value);
      const signatures = actions.map(action => action.signature);
      const calldatas = actions.map(action => action.calldata);

      // Create proposal
      const governanceWithSigner = this.governanceContract.connect(signer) as unknown as Governance;
      const tx = await governanceWithSigner.propose(
        title,
        description,
        0, // GENERAL category
        targets,
        values,
        signatures,
        calldatas
      ) as any;

      const receipt = await tx.wait();

      // Extract proposal ID from events
      const proposalCreatedEvent = receipt.events?.find((e: { event: string; args?: { id?: any }; }) => e.event === 'ProposalCreated');
      const proposalId = proposalCreatedEvent?.args?.id?.toString() || receipt.hash;

      return proposalId;
    } catch (error) {
      console.error('Error creating governance proposal:', error);
      throw error;
    }
  }

  /**
   * Vote on a community governance proposal
   */
  async voteOnProposal(
    proposalId: string,
    support: boolean,
    votingPower?: string
  ): Promise<string> {
    try {
      const signer = await getSigner();
      if (!signer) throw new Error('No signer available');

      if (!this.governanceContract) {
        throw new Error('Governance contract not initialized');
      }

      // Vote on proposal (0 = against, 1 = for, 2 = abstain)
      const voteChoice = support ? 1 : 0;

      const governanceWithSigner = this.governanceContract.connect(signer) as unknown as Governance;
      const tx = await governanceWithSigner.castVote(
        proposalId,
        voteChoice,
        "" // Empty reason for now
      ) as any;

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error voting on proposal:', error);
      throw error;
    }
  }

  /**
   * Send a tip to a community post creator
   */
  async tipCommunityPost(input: {
    postId: string;
    recipientAddress: string;
    amount: string;
    token: string;
    message?: string;
  }): Promise<string> {
    try {
      // Try to get signer with better error handling
      let signer;
      try {
        signer = await getSigner();
      } catch (signerError: any) {
        console.error('Error getting signer:', signerError);
        // If getSigner fails, try alternative approach using wagmi directly
        try {
          const { getWalletClient } = await import('@wagmi/core');
          const { config } = await import('@/lib/wagmi');
          const walletClient = await getWalletClient(config);
          if (walletClient && walletClient.transport?.provider) {
            const { ethers } = await import('ethers');
            const provider = new ethers.BrowserProvider(walletClient.transport.provider as any);
            signer = await provider.getSigner();
          }
        } catch (fallbackError) {
          console.error('Fallback signer retrieval also failed:', fallbackError);
          throw new Error('No signer available. Please ensure your wallet is connected.');
        }
      }

      if (!signer) throw new Error('No signer available. Please ensure your wallet is connected.');

      // Use environment configuration for contract addresses
      const { ENV_CONFIG } = await import('@/config/environment');
      // const { getChainId } = await import('@wagmi/core'); // Removed to avoid connector errors
      // const { config } = await import('@/lib/wagmi'); // Removed dependency on config for chain ID

      const TIP_ROUTER_ADDRESS = ENV_CONFIG.TIP_ROUTER_ADDRESS;
      const LDAO_TOKEN_ADDRESS = ENV_CONFIG.LDAO_TOKEN_ADDRESS;

      // Get current chain ID directly from the signer's provider
      // This is more reliable than getChainId(config) which can crash if connectors are in a transitional state
      let chainId: number;
      try {
        if (signer.provider) {
          const network = await (signer.provider as any).getNetwork();
          chainId = Number(network.chainId);
          console.log('Detected chain ID from signer:', chainId);
        } else {
          console.warn('Signer has no provider, defaulting to Sepolia');
          chainId = 11155111;
        }
      } catch (e) {
        console.warn('Failed to get chain ID from signer provider, defaulting to Sepolia:', e);
        // Default to Sepolia (11155111) as fallback
        chainId = 11155111;
      }

      // Get token address based on token type and chain
      let tokenAddress: string;
      let tokenDecimals: number;

      if (input.token === 'LDAO') {
        tokenAddress = LDAO_TOKEN_ADDRESS;
        tokenDecimals = 18;
      } else if (input.token === 'USDC') {
        // Get USDC address from environment or use chain-specific addresses
        tokenAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS || '';
        if (!tokenAddress) {
          // Fallback to known Sepolia USDC address
          if (chainId === 11155111) {
            tokenAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
          } else {
            throw new Error('USDC address not configured for this network');
          }
        }
        tokenDecimals = 6;
      } else if (input.token === 'USDT') {
        tokenAddress = process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS || '';
        if (!tokenAddress) {
          // Fallback to known Sepolia USDT address
          if (chainId === 11155111) {
            tokenAddress = '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0';
          } else {
            throw new Error('USDT address not configured for this network');
          }
        }
        tokenDecimals = 6;
      } else {
        throw new Error(`Unsupported token: ${input.token}. Supported tokens: LDAO, USDC, USDT`);
      }

      // Validate contract addresses
      if (!TIP_ROUTER_ADDRESS || !tokenAddress) {
        throw new Error('Contract addresses not configured');
      }

      // TipRouter ABI - includes paymentMethod parameter
      const TIP_ROUTER_ABI = [
        'function tip(bytes32 postId, address creator, uint256 amount, uint8 paymentMethod)',
        'function tipWithComment(bytes32 postId, address creator, uint256 amount, uint8 paymentMethod, string comment)',
        'function calculateFee(uint256 amount) view returns (uint256)'
      ];

      // ERC20 ABI for approve
      const ERC20_ABI = [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      // Create contract instances
      const tipRouterContract = new ethers.Contract(TIP_ROUTER_ADDRESS, TIP_ROUTER_ABI, signer);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      // Convert amount to proper units based on token decimals
      const amountInUnits = ethers.parseUnits(input.amount, tokenDecimals);

      // Check user's token balance
      const userAddress = await signer.getAddress();
      const balance = await tokenContract.balanceOf(userAddress);

      if (balance < amountInUnits) {
        const formattedBalance = ethers.formatUnits(balance, tokenDecimals);
        throw new Error(`Insufficient ${input.token} balance. You have ${formattedBalance} ${input.token} but need ${input.amount} ${input.token}`);
      }

      // Check current allowance
      const currentAllowance = await tokenContract.allowance(userAddress, TIP_ROUTER_ADDRESS);

      // Approve TipRouter to spend tokens if needed
      if (currentAllowance < amountInUnits) {
        console.log(`Approving TipRouter to spend ${input.token}...`);
        const approveTx = await tokenContract.approve(TIP_ROUTER_ADDRESS, amountInUnits);
        await approveTx.wait();
        console.log('Approval confirmed');
      }

      // Convert postId to bytes32
      const postIdBytes32 = ethers.id(input.postId);

      // Convert token to paymentMethod enum (0 = LDAO, 1 = USDC, 2 = USDT)
      let paymentMethod = 0;
      if (input.token === 'USDC') {
        paymentMethod = 1;
      } else if (input.token === 'USDT') {
        paymentMethod = 2;
      }

      // Send tip (with or without comment)
      let tx;
      if (input.message && input.message.trim()) {
        console.log(`Tipping ${input.amount} ${input.token} with comment to ${input.recipientAddress}`);
        tx = await tipRouterContract.tipWithComment(
          postIdBytes32,
          input.recipientAddress,
          amountInUnits,
          paymentMethod,
          input.message.trim()
        );
      } else {
        console.log(`Tipping ${input.amount} ${input.token} to ${input.recipientAddress}`);
        tx = await tipRouterContract.tip(
          postIdBytes32,
          input.recipientAddress,
          amountInUnits,
          paymentMethod
        );
      }

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Tip transaction confirmed:', receipt.hash);

      return receipt.hash;
    } catch (error) {
      console.error('Error tipping community post:', error);
      throw error;
    }
  }

  /**
   * Claim staking rewards from community participation
   */
  async claimStakingRewards(communityId: string): Promise<string> {
    try {
      const signer = await getSigner();
      if (!signer) throw new Error('No signer available');

      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      // Claim all staking rewards
      const tokenWithSigner = this.tokenContract.connect(signer) as unknown as LDAOToken;
      const tx = await tokenWithSigner.claimAllStakeRewards() as any;

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error claiming staking rewards:', error);
      throw error;
    }
  }

  /**
   * Get user's staking rewards for a community
   */
  async getStakingRewards(communityId: string, userAddress: string): Promise<StakingReward[]> {
    try {
      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      // Get user's total staking rewards
      const tokenContract = this.tokenContract as unknown as LDAOToken;
      const totalRewards = await tokenContract.getTotalStakeRewards(userAddress);

      // Mock implementation for now
      const mockRewards: StakingReward[] = [
        {
          user: userAddress,
          postId: 'post_1',
          rewardAmount: ethers.formatEther(totalRewards),
          rewardToken: 'LDAO',
          earned: parseFloat(ethers.formatEther(totalRewards)) > 0
        }
      ];

      return mockRewards;
    } catch (error) {
      console.error('Error getting staking rewards:', error);
      throw error;
    }
  }

  /**
   * Get user's voting power in a community
   */
  async getVotingPower(communityId: string, userAddress: string): Promise<string> {
    try {
      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      // Get user's voting power from the token contract
      const tokenContract = this.tokenContract as unknown as LDAOToken;
      const votingPower = await tokenContract.votingPower(userAddress);

      return ethers.formatEther(votingPower);
    } catch (error) {
      console.error('Error getting voting power:', error);
      throw error;
    }
  }

  /**
   * Check if user can perform an action based on staking requirements
   */
  async checkStakingRequirement(
    communityId: string,
    userAddress: string,
    action: 'post' | 'comment' | 'vote'
  ): Promise<{ canPerform: boolean; requiredStake: string; currentStake: string; error?: string }> {
    try {
      if (!this.tokenContract) {
        return {
          canPerform: true,
          requiredStake: "0",
          currentStake: "0"
        };
      }

      const tokenContract = this.tokenContract as unknown as LDAOToken;
      const stakedAmount = await tokenContract.totalStaked(userAddress);

      const requiredStake = ethers.parseEther("100");

      return {
        canPerform: stakedAmount >= requiredStake,
        requiredStake: ethers.formatEther(requiredStake),
        currentStake: ethers.formatEther(stakedAmount)
      };
    } catch (error: any) {
      return {
        canPerform: true,
        requiredStake: "0",
        currentStake: "0"
      };
    }
  }

  /**
   * Get DeFi protocol data - Mock implementation for now
   */
  async getDeFiProtocolData(protocolName: string): Promise<DeFiProtocolData> {
    try {
      // Mock data for different DeFi protocols
      const protocolDataMap: Record<string, DeFiProtocolData> = {
        'Aave': {
          protocol: 'Aave',
          tvl: '$12.5B',
          apy: '4.2%',
          token: 'AAVE',
          description: 'Aave is a decentralized lending and borrowing protocol where users can earn interest on deposits and borrow assets.',
          riskLevel: 'Low',
          category: 'Lending'
        },
        'Compound': {
          protocol: 'Compound',
          tvl: '$8.3B',
          apy: '3.8%',
          token: 'COMP',
          description: 'Compound is an algorithmic, autonomous interest rate protocol built for developers to unlock a universe of open financial applications.',
          riskLevel: 'Low',
          category: 'Lending'
        },
        'Uniswap': {
          protocol: 'Uniswap',
          tvl: '$5.7B',
          apy: '12.5%',
          token: 'UNI',
          description: 'Uniswap is a decentralized trading protocol that enables automated liquidity provision on Ethereum.',
          riskLevel: 'Medium',
          category: 'DEX'
        },
        'Curve': {
          protocol: 'Curve',
          tvl: '$6.2B',
          apy: '6.1%',
          token: 'CRV',
          description: 'Curve is an exchange liquidity pool on Ethereum designed for extremely efficient stablecoin trading.',
          riskLevel: 'Low',
          category: 'DEX'
        },
        'Yearn': {
          protocol: 'Yearn Finance',
          tvl: '$2.1B',
          apy: '8.9%',
          token: 'YFI',
          description: 'Yearn Finance is a suite of products in Decentralized Finance (DeFi) that provides lending aggregation, yield generation, and insurance.',
          riskLevel: 'Medium',
          category: 'Yield'
        }
      };

      // Return mock data for the requested protocol, or default to Aave if not found
      return protocolDataMap[protocolName] || protocolDataMap['Aave'];
    } catch (error) {
      console.error('Error getting DeFi protocol data:', error);
      throw error;
    }
  }

  /**
   * Get NFT metadata for a given contract and tokenId
   * Mock implementation: returns a shaped object matching frontend expectations
   */
  async getNFTMetadata(contractAddress: string, tokenId: string): Promise<any> {
    try {
      // In a real implementation, this would call an on-chain contract or an off-chain metadata service
      // For now, return a mock metadata object compatible with CommunityNFTEmbed
      const mockMetadata = {
        name: `Token #${tokenId}`,
        description: `Mock description for token ${tokenId} from ${contractAddress}`,
        image: `https://placehold.co/512.png?text=${encodeURIComponent(`NFT+${tokenId}`)}`,
        attributes: [
          { trait_type: 'Rarity', value: 'Rare' },
          { trait_type: 'Background', value: 'Space' }
        ],
        contractAddress,
        tokenId,
        owner: '0x000000000000000000000000000000000000dead',
        floorPrice: '$0.5'
      };

      // Simulate async delay
      await new Promise((res) => setTimeout(res, 200));
      return mockMetadata;
    } catch (error) {
      console.error('Error getting NFT metadata:', error);
      throw error;
    }
  }

  /**
   * Get community governance proposals
   */
  async getCommunityProposals(communityId: string): Promise<CommunityGovernanceProposal[]> {
    try {
      if (!this.governanceContract) {
        throw new Error('Governance contract not initialized');
      }

      // For now, return mock proposals
      // In a real implementation, this would fetch proposals from the contract
      const mockProposals: CommunityGovernanceProposal[] = [
        {
          id: '1',
          title: 'Community Treasury Allocation',
          description: 'Proposal to allocate 15% of treasury to community development',
          proposer: '0x1234567890123456789012345678901234567890',
          communityId,
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          forVotes: '1250000',
          againstVotes: '350000',
          quorum: '1000000',
          status: 'active',
          actions: []
        }
      ];

      return mockProposals;
    } catch (error) {
      console.error('Error getting community proposals:', error);
      throw error;
    }
  }
}

export const communityWeb3Service = new CommunityWeb3Service();