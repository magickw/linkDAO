import { ethers } from 'ethers';
import { useWeb3 } from '@/context/Web3Context';

const GOVERNANCE_TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function stake(uint256 amount) returns (bool)',
  'function unstake(uint256 amount) returns (bool)',
  'function getStakedBalance(address user) view returns (uint256)',
  'function vote(uint256 proposalId, bool support, uint256 amount) returns (bool)',
  'function createProposal(string memory description, uint256 votingPeriod) returns (uint256)',
  'function executeProposal(uint256 proposalId) returns (bool)'
];

export class GovernanceContractService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.providers.Web3Provider | null = null;

  async initialize(tokenAddress: string, provider: ethers.providers.Web3Provider) {
    this.provider = provider;
    const signer = provider.getSigner();
    this.contract = new ethers.Contract(tokenAddress, GOVERNANCE_TOKEN_ABI, signer);
  }

  async getTokenBalance(userAddress: string): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');
    const balance = await this.contract.balanceOf(userAddress);
    return ethers.utils.formatEther(balance);
  }

  async getStakedBalance(userAddress: string): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');
    const balance = await this.contract.getStakedBalance(userAddress);
    return ethers.utils.formatEther(balance);
  }

  async stakeTokens(amount: string): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');
    const tx = await this.contract.stake(ethers.utils.parseEther(amount));
    await tx.wait();
    return tx.hash;
  }

  async unstakeTokens(amount: string): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');
    const tx = await this.contract.unstake(ethers.utils.parseEther(amount));
    await tx.wait();
    return tx.hash;
  }

  async voteOnProposal(proposalId: number, support: boolean, amount: string): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');
    const tx = await this.contract.vote(proposalId, support, ethers.utils.parseEther(amount));
    await tx.wait();
    return tx.hash;
  }

  async createProposal(description: string, votingPeriodDays: number): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');
    const votingPeriod = votingPeriodDays * 24 * 60 * 60; // Convert to seconds
    const tx = await this.contract.createProposal(description, votingPeriod);
    await tx.wait();
    return tx.hash;
  }
}

export const governanceContract = new GovernanceContractService();