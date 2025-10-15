import { EnhancedCommunityData } from '../types/communityEnhancements';

export interface TokenHolding {
  contractAddress: string;
  symbol: string;
  name: string;
  balance: number;
  value: number;
  category: 'defi' | 'nft' | 'governance' | 'gaming' | 'utility' | 'meme';
}

export interface TransactionHistory {
  hash: string;
  from: string;
  to: string;
  value: number;
  timestamp: Date;
  contractAddress?: string;
  tokenSymbol?: string;
  type: 'transfer' | 'swap' | 'stake' | 'vote' | 'mint' | 'burn';
  protocol?: string;
}

export interface Web3Profile {
  walletAddress: string;
  ensName?: string;
  tokenHoldings: TokenHolding[];
  transactionHistory: TransactionHistory[];
  interactedProtocols: string[];
  nftCollections: string[];
  daoMemberships: string[];
  stakingPositions: {
    protocol: string;
    amount: number;
    apy: number;
  }[];
}

export interface RecommendationScore {
  overall: number;
  tokenSimilarity: number;
  protocolOverlap: number;
  activityPattern: number;
  communityFit: number;
}

export class Web3RecommendationService {
  /**
   * Analyze user's Web3 profile to generate community recommendations
   */
  static async analyzeWeb3Profile(walletAddress: string): Promise<Web3Profile> {
    try {
      // Mock Web3 profile - replace with actual blockchain data fetching
      const mockProfile: Web3Profile = {
        walletAddress,
        ensName: 'user.eth',
        tokenHoldings: [
          {
            contractAddress: '0x...',
            symbol: 'UNI',
            name: 'Uniswap',
            balance: 1500,
            value: 12000,
            category: 'defi'
          },
          {
            contractAddress: '0x...',
            symbol: 'AAVE',
            name: 'Aave',
            balance: 250,
            value: 8500,
            category: 'defi'
          },
          {
            contractAddress: '0x...',
            symbol: 'ENS',
            name: 'Ethereum Name Service',
            balance: 100,
            value: 2000,
            category: 'governance'
          }
        ],
        transactionHistory: [
          {
            hash: '0x123...',
            from: walletAddress,
            to: '0xabc...',
            value: 1000,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            contractAddress: '0x...',
            tokenSymbol: 'UNI',
            type: 'swap',
            protocol: 'Uniswap'
          }
        ],
        interactedProtocols: ['Uniswap', 'Aave', 'Compound', 'OpenSea'],
        nftCollections: ['CryptoPunks', 'Bored Ape Yacht Club', 'Azuki'],
        daoMemberships: ['Uniswap DAO', 'Aave DAO'],
        stakingPositions: [
          {
            protocol: 'Ethereum 2.0',
            amount: 32,
            apy: 4.5
          }
        ]
      };

      return mockProfile;
    } catch (error) {
      console.error('Error analyzing Web3 profile:', error);
      throw new Error('Failed to analyze Web3 profile');
    }
  }

  /**
   * Generate community recommendations based on token holdings
   */
  static generateTokenBasedRecommendations(
    profile: Web3Profile,
    communities: EnhancedCommunityData[]
  ): Array<{ community: EnhancedCommunityData; score: RecommendationScore; reason: string }> {
    return communities.map(community => {
      const score = this.calculateTokenSimilarityScore(profile, community);
      const reason = this.generateTokenRecommendationReason(profile, community);
      
      return { community, score, reason };
    }).sort((a, b) => b.score.overall - a.score.overall);
  }

  /**
   * Generate recommendations based on transaction history and protocol interactions
   */
  static generateProtocolBasedRecommendations(
    profile: Web3Profile,
    communities: EnhancedCommunityData[]
  ): Array<{ community: EnhancedCommunityData; score: RecommendationScore; reason: string }> {
    return communities.map(community => {
      const score = this.calculateProtocolOverlapScore(profile, community);
      const reason = this.generateProtocolRecommendationReason(profile, community);
      
      return { community, score, reason };
    }).sort((a, b) => b.score.overall - a.score.overall);
  }

  /**
   * Calculate token similarity score between user and community
   */
  private static calculateTokenSimilarityScore(
    profile: Web3Profile,
    community: EnhancedCommunityData
  ): RecommendationScore {
    // Mock scoring algorithm - replace with actual logic
    const userTokenCategories = profile.tokenHoldings.map(h => h.category);
    const communityCategory = this.getCommunityTokenCategory(community);
    
    const tokenSimilarity = userTokenCategories.includes(communityCategory) ? 80 : 20;
    const protocolOverlap = this.calculateProtocolOverlap(profile, community);
    const activityPattern = this.calculateActivityPatternMatch(profile, community);
    const communityFit = this.calculateCommunityFit(profile, community);
    
    const overall = (tokenSimilarity * 0.3 + protocolOverlap * 0.25 + 
                    activityPattern * 0.25 + communityFit * 0.2);

    return {
      overall,
      tokenSimilarity,
      protocolOverlap,
      activityPattern,
      communityFit
    };
  }

  /**
   * Calculate protocol overlap score
   */
  private static calculateProtocolOverlapScore(
    profile: Web3Profile,
    community: EnhancedCommunityData
  ): RecommendationScore {
    const protocolOverlap = this.calculateProtocolOverlap(profile, community);
    const tokenSimilarity = this.calculateTokenSimilarity(profile, community);
    const activityPattern = this.calculateActivityPatternMatch(profile, community);
    const communityFit = this.calculateCommunityFit(profile, community);
    
    const overall = (protocolOverlap * 0.4 + tokenSimilarity * 0.2 + 
                    activityPattern * 0.2 + communityFit * 0.2);

    return {
      overall,
      tokenSimilarity,
      protocolOverlap,
      activityPattern,
      communityFit
    };
  }

  /**
   * Helper methods for scoring calculations
   */
  private static getCommunityTokenCategory(community: EnhancedCommunityData): 'defi' | 'nft' | 'governance' | 'gaming' | 'utility' | 'meme' {
    const name = community.name.toLowerCase();
    if (name.includes('defi') || name.includes('yield') || name.includes('farming')) return 'defi';
    if (name.includes('nft') || name.includes('art') || name.includes('collectible')) return 'nft';
    if (name.includes('dao') || name.includes('governance') || name.includes('voting')) return 'governance';
    if (name.includes('gaming') || name.includes('game') || name.includes('play')) return 'gaming';
    if (name.includes('meme') || name.includes('doge') || name.includes('shib')) return 'meme';
    return 'utility';
  }

  private static calculateProtocolOverlap(profile: Web3Profile, community: EnhancedCommunityData): number {
    // Mock calculation - replace with actual protocol matching logic
    const communityProtocols = this.getCommunityRelatedProtocols(community);
    const overlap = profile.interactedProtocols.filter(p => 
      communityProtocols.some(cp => cp.toLowerCase().includes(p.toLowerCase()))
    ).length;
    
    return Math.min(100, (overlap / Math.max(1, communityProtocols.length)) * 100);
  }

  private static calculateTokenSimilarity(profile: Web3Profile, community: EnhancedCommunityData): number {
    // Mock calculation
    return Math.random() * 100;
  }

  private static calculateActivityPatternMatch(profile: Web3Profile, community: EnhancedCommunityData): number {
    // Mock calculation based on transaction frequency and types
    const recentTransactions = profile.transactionHistory.filter(tx => 
      tx.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    
    const activityScore = Math.min(100, (recentTransactions / 10) * 100);
    return activityScore;
  }

  private static calculateCommunityFit(profile: Web3Profile, community: EnhancedCommunityData): number {
    // Mock calculation based on community size, activity level, etc.
    let score = 50; // Base score
    
    // Bonus for active communities
    if (community.activityMetrics.activityLevel === 'very-high') score += 20;
    else if (community.activityMetrics.activityLevel === 'high') score += 10;
    
    // Bonus for governance participation if user has DAO memberships
    if (profile.daoMemberships.length > 0 && community.governance.activeProposals > 0) {
      score += 15;
    }
    
    return Math.min(100, score);
  }

  private static getCommunityRelatedProtocols(community: EnhancedCommunityData): string[] {
    // Mock protocol mapping based on community name/description
    const name = community.name.toLowerCase();
    const description = community.description.toLowerCase();
    
    const protocols: string[] = [];
    
    if (name.includes('defi') || description.includes('defi')) {
      protocols.push('Uniswap', 'Aave', 'Compound', 'Curve');
    }
    if (name.includes('nft') || description.includes('nft')) {
      protocols.push('OpenSea', 'LooksRare', 'Foundation');
    }
    if (name.includes('layer') || description.includes('scaling')) {
      protocols.push('Arbitrum', 'Optimism', 'Polygon');
    }
    
    return protocols;
  }

  /**
   * Generate human-readable recommendation reasons
   */
  private static generateTokenRecommendationReason(
    profile: Web3Profile,
    community: EnhancedCommunityData
  ): string {
    const userTokens = profile.tokenHoldings.slice(0, 3).map(h => h.symbol);
    return `Based on your ${userTokens.join(', ')} holdings`;
  }

  private static generateProtocolRecommendationReason(
    profile: Web3Profile,
    community: EnhancedCommunityData
  ): string {
    const protocols = profile.interactedProtocols.slice(0, 2);
    return `Active on ${protocols.join(' and ')}`;
  }

  /**
   * Get upcoming community events that might interest the user
   */
  static async getRelevantCommunityEvents(
    profile: Web3Profile,
    communities: EnhancedCommunityData[]
  ): Promise<Array<{
    community: EnhancedCommunityData;
    event: {
      id: string;
      type: string;
      title: string;
      description: string;
      date: Date;
      importance: string;
    };
  }>> {
    // Mock events - replace with actual event fetching
    return [
      {
        community: communities[0],
        event: {
          id: '1',
          type: 'governance_vote',
          title: 'Protocol Upgrade Proposal',
          description: 'Vote on the next major protocol upgrade',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          importance: 'high'
        }
      }
    ];
  }
}

export default Web3RecommendationService;