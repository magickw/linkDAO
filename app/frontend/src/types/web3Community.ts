/**
 * Web3-enhanced community data types with governance tokens, treasury, and staking
 */

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  logoUrl?: string;
  priceUSD?: number;
  priceChange24h?: number;
}

export interface TokenBalance {
  token: TokenInfo;
  balance: number;
  valueUSD?: number;
}

export interface GovernanceToken extends TokenInfo {
  totalSupply: number;
  circulatingSupply?: number;
  votingPower?: number;
}

export interface TreasuryBalance {
  tokens: TokenBalance[];
  totalValueUSD: number;
  lastUpdated: Date;
}

export interface StakingRequirement {
  minimumStake: number;
  stakingToken: string;
  benefits: string[];
  lockPeriod?: number;
  rewardRate?: number;
}

export interface OnChainData {
  contractAddress: string;
  chainId: number;
  governanceContract?: string;
  treasuryContract?: string;
  stakingContract?: string;
}

export interface CommunityWithWeb3Data {
  id: string;
  name: string;
  description: string;
  avatar: string;
  memberCount: number;
  isActive: boolean;
  
  // User-specific data
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  userTokenBalance?: number;
  userStakingStatus?: UserStakingStatus;
  governanceNotifications?: number;
  
  // Web3 specific fields
  governanceToken?: GovernanceToken;
  treasuryBalance?: TreasuryBalance;
  stakingRequirements?: StakingRequirement;
  onChainData?: OnChainData;
  
  // Activity indicators
  recentActivity?: ActivitySnapshot;
  trendingTopics?: string[];
}

export interface UserStakingStatus {
  totalStaked: number;
  stakingRewards: number;
  votingPower: number;
  lockEndDate?: Date;
  canUnstake: boolean;
}

export interface ActivitySnapshot {
  postsLast24h: number;
  commentsLast24h: number;
  newMembersLast24h: number;
  tokenActivityLast24h: number;
  governanceActivityLast24h: number;
}

export interface UserRoleMap {
  [communityId: string]: 'admin' | 'moderator' | 'member' | 'none';
}

export interface TokenBalanceMap {
  [tokenAddress: string]: number;
}

export interface TokenRequirement {
  token: TokenInfo;
  minimumAmount: number;
  purpose: 'membership' | 'voting' | 'staking';
}