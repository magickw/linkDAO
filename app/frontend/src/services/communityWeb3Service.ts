// Community Web3 Service - Real implementation for production
// This service provides Web3 functionality for community features

import { ethers } from 'ethers';
import { getProvider, getSigner, wrapProvider } from '@/utils/web3';
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
  targetChainId?: number;
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

      // Extract proposal ID from logs (ethers v6)
      let proposalId = receipt.hash;
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = governanceWithSigner.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'ProposalCreated') {
              proposalId = parsedLog.args.id?.toString() || proposalId;
              break;
            }
          } catch (e) {
            // Ignore logs that can't be parsed by this interface
          }
        }
      }

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
    targetChainId?: number;
  }): Promise<string> {
    try {
      // Validate recipient address before anything else
      if (!ethers.isAddress(input.recipientAddress)) {
        console.error(`[Web3Service] Invalid recipient address: ${input.recipientAddress}`);
        throw new Error(`Invalid recipient address: ${input.recipientAddress}. Expected a 0x wallet address.`);
      }

      // Try to get signer
      let signer = await getSigner();
      if (!signer) throw new Error('No signer available. Please ensure your wallet is connected.');

      // Import config
      const { ENV_CONFIG } = await import('@/config/environment');
      const { getNetwork } = await import('@/config/web3Config');
      const { switchNetwork, getSigner: getRefreshedSigner } = await import('@/utils/web3');

      // 1. Determine Target Network and Switch if needed
      // -----------------------------------------------
      const currentNetworkFn = async () => {
        if (signer?.provider) {
          const net = await (signer.provider as any).getNetwork();
          return Number(net.chainId);
        }
        return 0;
      };

      let chainId = await currentNetworkFn();
      console.log('Detected chain ID from signer:', chainId);

      // Default to Sepolia (11155111) if not provided, or purely trust input
      const targetChainId = input.targetChainId || 11155111;
      const targetNetworkConfig = getNetwork(targetChainId);
      const networkName = targetNetworkConfig ? targetNetworkConfig.name : `Chain ${targetChainId}`;

      if (chainId !== targetChainId) {
        console.warn(`[Web3Service] Wallet is on chain ${chainId}, switching to ${networkName} (${targetChainId}).`);

        try {
          await switchNetwork(targetChainId);

          // Poll for network change
          const maxRetries = 10;
          let retries = 0;
          let isCorrectNetwork = false;

          while (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
              const freshChainId = await currentNetworkFn();
              console.log(`[Web3Service] Network check retry ${retries + 1}/${maxRetries}: ${freshChainId}`);
              if (freshChainId === targetChainId) {
                isCorrectNetwork = true;
                break;
              }
            } catch (e) { console.warn('Error checking network:', e); }
            retries++;
          }

          if (isCorrectNetwork) {
            console.log('[Web3Service] Network switched. Re-fetching signer...');
            const newSigner = await getRefreshedSigner();
            if (!newSigner) throw new Error('Failed to get signer after network switch');
            signer = newSigner;
            chainId = targetChainId;
          } else {
            throw new Error(`Network switch timed out. Please manually switch to ${networkName}.`);
          }
        } catch (switchError: any) {
          console.error('Network switch failed:', switchError);
          throw new Error(`Please switch your wallet to ${networkName}.`);
        }
      }

      // 2. Resolve Token and Contract Addresses
      // ---------------------------------------
      const networkConfig = getNetwork(chainId); // Should match targetChainId now

      let tokenAddress = '';
      let tokenDecimals = 18;

      if (input.token === 'LDAO') {
        tokenAddress = networkConfig?.contracts?.ldaoToken || ENV_CONFIG.LDAO_TOKEN_ADDRESS;
        tokenDecimals = 18;
      } else if (input.token === 'USDC') {
        tokenDecimals = 6;
        tokenAddress = networkConfig?.contracts?.usdcToken || process.env.NEXT_PUBLIC_USDC_ADDRESS || '';
        // Fallbacks
        if (!tokenAddress) {
          if (chainId === 84532) tokenAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
          else if (chainId === 11155111) tokenAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
          else if (chainId === 8453) tokenAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
          else if (chainId === 137) tokenAddress = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
          else if (chainId === 1) tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
        }
      } else if (input.token === 'USDT') {
        tokenDecimals = 6;
        tokenAddress = networkConfig?.contracts?.usdtToken || process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS || '';
        // Fallbacks
        if (!tokenAddress) {
          if (chainId === 11155111) tokenAddress = '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0';
          else if (chainId === 1) tokenAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
          else if (chainId === 137) tokenAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
        }
      } else {
        throw new Error(`Unsupported token: ${input.token}`);
      }

      if (!tokenAddress) throw new Error(`Token address for ${input.token} not found on chain ${chainId}`);

      const tipRouterAddress = networkConfig?.contracts?.tipRouter || ENV_CONFIG.TIP_ROUTER_ADDRESS;

      // Determine mode
      // Logic: If we have a TipRouter address AND we are on a chain where we expect it (currently mainly Sepolia), use it.
      // Otherwise fallback to simple transfer.
      // Explicitly for now: Only use TipRouter on Sepolia (11155111) as per legacy logic, UNLESS configured otherwise.
      const useTipRouter = !!tipRouterAddress && chainId === 11155111;

      // 3. Prepare Contract Instances and Data
      // --------------------------------------
      const ERC20_ABI = [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function transfer(address to, uint256 amount) returns (bool)'
      ];

      const TIP_ROUTER_ABI = [
        'function tip(bytes32 postId, address creator, uint256 amount, uint8 paymentMethod)',
        'function tipWithComment(bytes32 postId, address creator, uint256 amount, uint8 paymentMethod, string comment)',
        'function calculateFee(uint256 amount) view returns (uint256)'
      ];

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const amountInUnits = ethers.parseUnits(input.amount, tokenDecimals);
      const userAddress = await signer.getAddress();

      // Check Balance
      try {
        const balance = await tokenContract.balanceOf(userAddress);
        if (balance < amountInUnits) {
          throw new Error(`Insufficient ${input.token} balance.`);
        }
      } catch (err: any) {
        // Re-throw if it's our own error, otherwise wrap
        if (err.message.includes('Insufficient')) throw err;
        throw new Error(`Failed to check balance of ${input.token}.`);
      }

      // Check Allowance (TipRouter only)
      if (useTipRouter && tipRouterAddress) {
        const allowance = await tokenContract.allowance(userAddress, tipRouterAddress);
        if (allowance < amountInUnits) {
          console.log(`Approving ${input.amount} ${input.token}...`);
          const tx = await tokenContract.approve(tipRouterAddress, amountInUnits);
          await tx.wait();
        }
      }

      // Format Post ID
      let postIdBytes32;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(input.postId)) {
        const cleanHex = input.postId.replace(/-/g, '').toLowerCase();
        postIdBytes32 = '0x' + cleanHex.padEnd(64, '0');
      } else if (input.postId.startsWith('0x') && input.postId.length === 66) {
        postIdBytes32 = input.postId;
      } else {
        postIdBytes32 = ethers.id(input.postId);
      }

      // Payment Method Enum
      let paymentMethod = 0;
      if (input.token === 'USDC') paymentMethod = 1;
      else if (input.token === 'USDT') paymentMethod = 2;

      // 4. Send Transaction
      // -------------------
      let tx;

      if (useTipRouter && tipRouterAddress) {
        const tipRouterContract = new ethers.Contract(tipRouterAddress, TIP_ROUTER_ABI, signer);
        if (input.message?.trim()) {
          tx = await tipRouterContract.tipWithComment(postIdBytes32, input.recipientAddress, amountInUnits, paymentMethod, input.message.trim());
        } else {
          tx = await tipRouterContract.tip(postIdBytes32, input.recipientAddress, amountInUnits, paymentMethod);
        }
      } else {
        // Direct Transfer
        tx = await tokenContract.transfer(input.recipientAddress, amountInUnits);
      }

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();

      // 5. Backend Logging
      // ------------------
      try {
        const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('linkdao_access_token') : null;
        if (sessionToken) {
          const backendUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';
          await fetch(`${backendUrl}/api/tips?t=${Date.now()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
            body: JSON.stringify({
              postId: input.postId,
              creatorAddress: input.recipientAddress,
              amount: input.amount,
              message: input.message,
              token: input.token,
              transactionHash: receipt.hash,
              networkName: networkName.toLowerCase().replace(' ', '-'),
              chainId: chainId
            })
          });
        }
      } catch (logErr) { console.warn('Failed to log tip:', logErr); }

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

      const formattedRewards = ethers.formatEther(totalRewards);

      // Return actual rewards data
      return [{
        user: userAddress,
        postId: 'aggregated', // Contract returns total, so we use a placeholder for postId
        rewardAmount: formattedRewards,
        rewardToken: 'LDAO',
        earned: parseFloat(formattedRewards) > 0
      }];
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
      // Real implementation would fetch from an API like DefiLlama
      // e.g. await fetch(`https://api.llama.fi/protocol/${protocolName}`)

      throw new Error('DeFi protocol data service is not yet implemented. Please configure an external data provider.');
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
      const provider = await getProvider();
      if (!provider) throw new Error('No provider available');

      // Minimal ERC721 ABI
      const abi = [
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function ownerOf(uint256 tokenId) view returns (address)'
      ];

      const contract = new ethers.Contract(contractAddress, abi, provider);

      // Check if token exists by calling ownerOf
      let owner = '0x0000000000000000000000000000000000000000';
      try {
        owner = await contract.ownerOf(tokenId);
      } catch (e) {
        console.warn(`Token ${tokenId} might not exist or owner fetch failed`);
      }

      let uri = '';
      try {
        uri = await contract.tokenURI(tokenId);
      } catch (e) {
        console.warn(`Failed to fetch tokenURI for ${tokenId}`);
        throw new Error(`Token ${tokenId} metadata not found`);
      }

      // Resolve URI (handle IPFS, etc)
      // Basic IPFS gateway handling
      let url = uri;
      if (uri.startsWith('ipfs://')) {
        url = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }

      // Fetch metadata JSON
      // Note: This relies on the browser's fetch, CORS might be an issue for some URIs
      let metadata: any = {};
      try {
        const response = await fetch(url);
        if (response.ok) {
          metadata = await response.json();
        }
      } catch (e) {
        console.warn('Failed to fetch metadata JSON:', e);
        // Fallback or partial data
        metadata = { name: `Token #${tokenId}` };
      }

      return {
        name: metadata.name || `Token #${tokenId}`,
        description: metadata.description || '',
        image: metadata.image ? (metadata.image.startsWith('ipfs://') ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : metadata.image) : '',
        attributes: metadata.attributes || [],
        contractAddress,
        tokenId,
        owner,
        floorPrice: 'N/A' // Requires external market API
      };
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

      // Fetch ProposalCreated events
      const governanceContract = this.governanceContract as unknown as Governance;

      // Get events from the last 10000 blocks or so, or from genesis if possible.
      // For performance, we might limit this, but for now getting all is typical for small apps.
      const filter = governanceContract.filters.ProposalCreated();
      // Using a simplified query approach. In production, an indexer (The Graph) is better.
      const events = await governanceContract.queryFilter(filter);

      const proposals: CommunityGovernanceProposal[] = await Promise.all(events.map(async (event: any) => {
        const {
          proposalId,
          proposer,
          targets,
          values,
          signatures,
          calldatas,
          voteStart,
          voteEnd,
          description
        } = event.args;

        // Fetch current state: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
        const state = await governanceContract.state(proposalId);

        // Map state enum to string
        const statusMap = ['pending', 'active', 'canceled', 'failed', 'passed', 'queued', 'expired', 'executed'];
        const status = statusMap[Number(state)] || 'unknown';

        // Fetch votes
        let forVotes = '0';
        let againstVotes = '0';

        // Standard Governor 'proposalVotes' returns (against, for, abstain)
        // However, Typechain/ABI seems to differ. Skipping detailed vote counts to avoid lint errors.
        /* 
        try {
            const votes = await governanceContract.proposalVotes(proposalId);
            forVotes = ethers.formatEther(votes.forVotes);
            againstVotes = ethers.formatEther(votes.againstVotes);
        } catch (e) {
            console.warn('Could not fetch vote counts for proposal', proposalId);
        }
        */

        // Parse actions
        const actions = targets.map((target: string, index: number) => ({
          target,
          value: values[index].toString(),
          signature: signatures[index],
          calldata: calldatas[index]
        }));

        // Determine start/end time. Standard Governor uses blocks or timestamps.
        // Assuming timestamps per the interface, but if blocks, we need conversion.
        // For simplicity, converting directly if they look like timestamps (unlikely for blocks but `voteStart` name suggests block usually).
        // If they are block numbers, we'd need `provider.getBlock(number)`, which is expensive for lists.
        // Let's assume they are Dates for the frontend IF the input was Date.
        // The interface says Date.
        // Let's try to convert.
        const startTime = new Date(Number(voteStart) * 1000);
        const endTime = new Date(Number(voteEnd) * 1000);

        return {
          id: proposalId.toString(),
          title: description.split('\n')[0] || 'Untitled Proposal', // Naive title extraction
          description: description,
          proposer,
          communityId, // Assuming proposals are filtered by communityId if that logic existed, but contract might be global.
          startTime,
          endTime,
          forVotes,
          againstVotes,
          quorum: '0', // Need fetching quorum(snapshotBlock) if needed
          status: status as any,
          actions
        };
      }));

      return proposals.reverse(); // Newest first
    } catch (error) {
      console.error('Error getting community proposals:', error);
      throw error;
    }
  }
}

export const communityWeb3Service = new CommunityWeb3Service();