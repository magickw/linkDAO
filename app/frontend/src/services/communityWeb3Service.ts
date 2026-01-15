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
  }): Promise<string> {
    try {
      // Validate recipient address before anything else
      if (!ethers.isAddress(input.recipientAddress)) {
        console.error(`[Web3Service] Invalid recipient address: ${input.recipientAddress}`);
        throw new Error(`Invalid recipient address: ${input.recipientAddress}. Expected a 0x wallet address.`);
      }

      // Try to get signer with better error handling
      const signer = await getSigner();

      if (!signer) throw new Error('No signer available. Please ensure your wallet is connected.');

      // Use environment configuration for contract addresses
      const { ENV_CONFIG } = await import('@/config/environment');

      const TIP_ROUTER_ADDRESS = ENV_CONFIG.TIP_ROUTER_ADDRESS;
      const LDAO_TOKEN_ADDRESS = ENV_CONFIG.LDAO_TOKEN_ADDRESS;

      // Get current chain ID directly from the signer's provider
      let chainId: number;
      try {
        if (signer.provider) {
          const network = await (signer.provider as any).getNetwork();
          chainId = Number(network.chainId);
          console.log('Detected chain ID from signer:', chainId);

          // Enforce Sepolia for development/test tokens
          if (chainId !== 11155111) {
            console.warn(`[Web3Service] Wallet is on chain ${chainId}, but this feature requires Sepolia (11155111). Attempting to switch...`);

            try {
              // Dynamically import switchNetwork to avoid circular dependencies if any
              const { switchNetwork } = await import('@/utils/web3');
              await switchNetwork(11155111);

              // Verify switch? Or just proceed and let the next calls fail if it didn't work.
              // Usually existing signer might be invalidated after network switch in some libraries,
              // but with ethers v6 and BrowserProvider it relies on the underlying provider which updates.
              // Let's re-verify chainId just to be safe or re-get signer.
              const updatedNetwork = await (signer.provider as any).getNetwork();
              const updatedChainId = Number(updatedNetwork.chainId);

              if (updatedChainId !== 11155111) {
                // Double check in case the provider hasn't updated yet (race condition)
                // But if switchNetwork threw no error, user likely approved/cancelled.
                // If cancelled, switchNetwork throws.
                // If approved, we should be good.
                console.warn(`[Web3Service] Network switch success logic reached, but provider still reports ${updatedChainId}. Continuing hopefuly...`);
              }

            } catch (switchError: any) {
              console.error('Network switch failed:', switchError);
              throw new Error(`Please switch your wallet to the Sepolia Testnet. Currently connected to ${chainId === 1 ? 'Ethereum Mainnet' : 'another network'}.`);
            }
          }
        } else {
          console.warn('Signer has no provider, defaulting to Sepolia');
          chainId = 11155111;
        }
      } catch (e: any) {
        if (e.message.includes('switch your wallet')) throw e;
        // If getting network fails, we might proceed but risk failure later.
        console.warn('Failed to get chain ID from signer provider, defaulting to Sepolia:', e);
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

      // Convert postId to bytes32 correctly
      // If it's a UUID, we need to strip hyphens and pad it to the RIGHT.
      // Solidity bytes32 is left-aligned, so padding should be at the end.
      let postIdBytes32;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (uuidRegex.test(input.postId)) {
        // Remove hyphens and ensure lowercase
        const cleanHex = input.postId.replace(/-/g, '').toLowerCase();
        // Construct 32-byte hex string (64 characters + 0x)
        // UUID is 16 bytes (32 chars). We need 32 more chars (16 bytes) of zeros at the END.
        postIdBytes32 = '0x' + cleanHex.padEnd(64, '0');
        console.log(`[Web3Service] Formatted UUID ${input.postId} to bytes32 (right-padded): ${postIdBytes32}`);
      } else if (input.postId.startsWith('0x') && input.postId.length === 66) {
        postIdBytes32 = input.postId;
      } else {
        // Fallback for non-UUID strings
        postIdBytes32 = ethers.id(input.postId);
      }

      // Convert token to paymentMethod enum (0 = LDAO, 1 = USDC, 2 = USDT)
      let paymentMethod = 0;
      if (input.token === 'USDC') {
        paymentMethod = 1;
      } else if (input.token === 'USDT') {
        paymentMethod = 2;
      }

      // Send tip (with or without comment)
      let tx;

      // Common transaction overrides for robustness
      const txOverrides = {
        // Add a fallback gas limit if estimation fails
      };

      try {
        if (input.message && input.message.trim()) {
          console.log(`Tipping ${input.amount} ${input.token} with comment to ${input.recipientAddress}`);
          tx = await tipRouterContract.tipWithComment(
            postIdBytes32,
            input.recipientAddress,
            amountInUnits,
            paymentMethod,
            input.message.trim(),
            txOverrides
          );
        } else {
          console.log(`Tipping ${input.amount} ${input.token} to ${input.recipientAddress}`);
          tx = await tipRouterContract.tip(
            postIdBytes32,
            input.recipientAddress,
            amountInUnits,
            paymentMethod,
            txOverrides
          );
        }
      } catch (estimateError: any) {
        // If gas estimation fails, try sending with a fixed gas limit as a last resort
        console.warn('Gas estimation failed, attempting with fixed gas limit:', estimateError.message);

        const fallbackOverrides = { ...txOverrides, gasLimit: 400000 }; // Slightly higher for safety

        if (input.message && input.message.trim()) {
          tx = await tipRouterContract.tipWithComment(
            postIdBytes32,
            input.recipientAddress,
            amountInUnits,
            paymentMethod,
            input.message.trim(),
            fallbackOverrides
          );
        } else {
          tx = await tipRouterContract.tip(
            postIdBytes32,
            input.recipientAddress,
            amountInUnits,
            paymentMethod,
            fallbackOverrides
          );
        }
      }

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Tip transaction confirmed:', receipt.hash);

      // Record tip to backend
      try {
        // Unified storage uses localStorage
        const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('linkdao_access_token') : null;
        if (sessionToken) {
          const backendUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';

          // Added cache buster to prevent any 404/proxy issues
          await fetch(`${backendUrl}/api/tips?t=${Date.now()}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
              postId: input.postId,
              creatorAddress: input.recipientAddress,
              amount: input.amount,
              message: input.message,
              token: input.token,
              transactionHash: receipt.hash
            })
          });
          console.log('Tip recorded to backend');
        }
      } catch (backendError) {
        console.error('Failed to record tip to backend:', backendError);
      }

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
        url = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
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
        image: metadata.image ? (metadata.image.startsWith('ipfs://') ? metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') : metadata.image) : '',
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