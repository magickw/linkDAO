import { Community } from '../models/Community';
import { CommunityMembership } from '../models/CommunityMembership';
import { CommunityPost } from '../models/CommunityPost';

/**
 * Mock data for community development and testing
 */

export const mockCommunities: Community[] = [
  {
    id: '1',
    name: 'defi-discussion',
    displayName: 'DeFi Discussion',
    description: 'A community for discussing decentralized finance protocols, yield farming, and DeFi strategies.',
    rules: [
      'Be respectful to all members',
      'No financial advice - only educational content',
      'Use appropriate flair for posts',
      'No spam or promotional content without approval'
    ],
    memberCount: 15420,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-20'),
    avatar: 'https://via.placeholder.com/64x64/4F46E5/FFFFFF?text=DF',
    banner: 'https://via.placeholder.com/800x200/4F46E5/FFFFFF?text=DeFi+Discussion',
    category: 'Finance',
    tags: ['defi', 'yield-farming', 'protocols', 'ethereum'],
    isPublic: true,
    moderators: ['0x1234...5678', '0xabcd...efgh'],
    treasuryAddress: '0x9876...5432',
    governanceToken: '0xdef1...2345',
    settings: {
      allowedPostTypes: [
        { id: 'discussion', name: 'Discussion', description: 'General discussion posts', enabled: true },
        { id: 'news', name: 'News', description: 'DeFi news and updates', enabled: true },
        { id: 'tutorial', name: 'Tutorial', description: 'Educational content', enabled: true }
      ],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: [
        {
          action: 'post',
          tokenAddress: '0xdef1...2345',
          minimumAmount: '100',
          lockDuration: 86400 // 24 hours
        }
      ]
    }
  },
  {
    id: '2',
    name: 'nft-creators',
    displayName: 'NFT Creators',
    description: 'A space for NFT artists, collectors, and enthusiasts to share their work and discuss the latest trends.',
    rules: [
      'Original content only',
      'Credit all collaborators',
      'No price discussion in main posts',
      'Use appropriate content warnings'
    ],
    memberCount: 8750,
    createdAt: new Date('2023-03-10'),
    updatedAt: new Date('2024-01-18'),
    avatar: 'https://via.placeholder.com/64x64/EC4899/FFFFFF?text=NC',
    banner: 'https://via.placeholder.com/800x200/EC4899/FFFFFF?text=NFT+Creators',
    category: 'Art',
    tags: ['nft', 'art', 'creators', 'digital-art'],
    isPublic: true,
    moderators: ['0x2468...1357', '0xbcde...fghi'],
    treasuryAddress: '0x8765...4321',
    settings: {
      allowedPostTypes: [
        { id: 'showcase', name: 'Showcase', description: 'Show off your NFT creations', enabled: true },
        { id: 'feedback', name: 'Feedback', description: 'Request feedback on work', enabled: true },
        { id: 'collaboration', name: 'Collaboration', description: 'Find collaborators', enabled: true }
      ],
      requireApproval: false,
      minimumReputation: 10,
      stakingRequirements: []
    }
  },
  {
    id: '3',
    name: 'dao-governance',
    displayName: 'DAO Governance',
    description: 'Discuss DAO governance proposals, voting mechanisms, and decentralized organization best practices.',
    rules: [
      'Constructive criticism only',
      'Back claims with evidence',
      'No brigading or vote manipulation',
      'Respect different governance models'
    ],
    memberCount: 12300,
    createdAt: new Date('2023-02-20'),
    updatedAt: new Date('2024-01-22'),
    avatar: 'https://via.placeholder.com/64x64/10B981/FFFFFF?text=DG',
    banner: 'https://via.placeholder.com/800x200/10B981/FFFFFF?text=DAO+Governance',
    category: 'Governance',
    tags: ['dao', 'governance', 'voting', 'proposals'],
    isPublic: true,
    moderators: ['0x3579...2468', '0xcdef...ghij'],
    treasuryAddress: '0x7654...3210',
    governanceToken: '0xgov1...2345',
    settings: {
      allowedPostTypes: [
        { id: 'proposal', name: 'Proposal', description: 'Governance proposals', enabled: true },
        { id: 'discussion', name: 'Discussion', description: 'General governance discussion', enabled: true },
        { id: 'analysis', name: 'Analysis', description: 'Governance analysis and research', enabled: true }
      ],
      requireApproval: true,
      minimumReputation: 50,
      stakingRequirements: [
        {
          action: 'post',
          tokenAddress: '0xgov1...2345',
          minimumAmount: '1000',
          lockDuration: 172800 // 48 hours
        },
        {
          action: 'vote',
          tokenAddress: '0xgov1...2345',
          minimumAmount: '100',
          lockDuration: 86400 // 24 hours
        }
      ]
    }
  }
];

export const mockMemberships: CommunityMembership[] = [
  {
    id: '1',
    userId: '0x1234...5678',
    communityId: '1',
    role: 'moderator',
    joinedAt: new Date('2023-01-20'),
    reputation: 850,
    contributions: 45,
    isActive: true,
    lastActivityAt: new Date('2024-01-22')
  },
  {
    id: '2',
    userId: '0x1234...5678',
    communityId: '2',
    role: 'member',
    joinedAt: new Date('2023-04-15'),
    reputation: 320,
    contributions: 12,
    isActive: true,
    lastActivityAt: new Date('2024-01-21')
  },
  {
    id: '3',
    userId: '0x1234...5678',
    communityId: '3',
    role: 'admin',
    joinedAt: new Date('2023-02-25'),
    reputation: 1250,
    contributions: 78,
    isActive: true,
    lastActivityAt: new Date('2024-01-23')
  }
];

export const mockCommunityPosts: CommunityPost[] = [
  {
    id: 'cp1',
    author: '0x1234...5678',
    parentId: undefined,
    contentCid: 'QmTest1...',
    mediaCids: [],
    tags: ['defi', 'yield-farming'],
    createdAt: new Date('2024-01-22T10:30:00Z'),
    onchainRef: '0xtx1...',
    communityId: '1',
    flair: 'Discussion',
    isPinned: false,
    isLocked: false,
    upvotes: 45,
    downvotes: 3,
    comments: [],
    depth: 0,
    sortOrder: 1
  },
  {
    id: 'cp2',
    author: '0x2468...1357',
    parentId: undefined,
    contentCid: 'QmTest2...',
    mediaCids: ['QmImage1...'],
    tags: ['nft', 'art'],
    createdAt: new Date('2024-01-21T15:45:00Z'),
    onchainRef: '0xtx2...',
    communityId: '2',
    flair: 'Showcase',
    isPinned: true,
    isLocked: false,
    upvotes: 128,
    downvotes: 5,
    comments: [],
    depth: 0,
    sortOrder: 1
  },
  {
    id: 'cp3',
    author: '0x3579...2468',
    parentId: undefined,
    contentCid: 'QmTest3...',
    mediaCids: [],
    tags: ['dao', 'governance'],
    createdAt: new Date('2024-01-20T09:15:00Z'),
    onchainRef: '0xtx3...',
    communityId: '3',
    flair: 'Proposal',
    isPinned: false,
    isLocked: false,
    upvotes: 89,
    downvotes: 12,
    comments: [],
    depth: 0,
    sortOrder: 1
  }
];

/**
 * Mock service functions for development
 */
export class MockCommunityService {
  static async getAllCommunities(): Promise<Community[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockCommunities;
  }

  static async getCommunityById(id: string): Promise<Community | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockCommunities.find(c => c.id === id) || null;
  }

  static async getUserMemberships(userId: string): Promise<CommunityMembership[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockMemberships.filter(m => m.userId === userId);
  }

  static async getCommunityPosts(communityId: string): Promise<CommunityPost[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockCommunityPosts.filter(p => p.communityId === communityId);
  }

  static async joinCommunity(communityId: string, userId: string): Promise<CommunityMembership> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newMembership: CommunityMembership = {
      id: `mock-${Date.now()}`,
      userId,
      communityId,
      role: 'member',
      joinedAt: new Date(),
      reputation: 0,
      contributions: 0,
      isActive: true,
      lastActivityAt: new Date()
    };
    
    mockMemberships.push(newMembership);
    
    // Update community member count
    const community = mockCommunities.find(c => c.id === communityId);
    if (community) {
      community.memberCount++;
    }
    
    return newMembership;
  }

  static async leaveCommunity(communityId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const membershipIndex = mockMemberships.findIndex(
      m => m.communityId === communityId && m.userId === userId
    );
    
    if (membershipIndex !== -1) {
      mockMemberships.splice(membershipIndex, 1);
      
      // Update community member count
      const community = mockCommunities.find(c => c.id === communityId);
      if (community) {
        community.memberCount--;
      }
      
      return true;
    }
    
    return false;
  }
}

/**
 * Helper functions for testing
 */
export const createMockCommunity = (overrides: Partial<Community> = {}): Community => ({
  id: `mock-${Date.now()}`,
  name: 'test-community',
  displayName: 'Test Community',
  description: 'A test community for development',
  rules: ['Be nice', 'No spam'],
  memberCount: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: 'Test',
  tags: ['test'],
  isPublic: true,
  moderators: [],
  settings: {
    allowedPostTypes: [
      { id: 'discussion', name: 'Discussion', description: 'General discussion', enabled: true }
    ],
    requireApproval: false,
    minimumReputation: 0,
    stakingRequirements: []
  },
  ...overrides
});

export const createMockMembership = (overrides: Partial<CommunityMembership> = {}): CommunityMembership => ({
  id: `mock-${Date.now()}`,
  userId: '0xtest...user',
  communityId: '1',
  role: 'member',
  joinedAt: new Date(),
  reputation: 0,
  contributions: 0,
  isActive: true,
  lastActivityAt: new Date(),
  ...overrides
});

export const createMockCommunityPost = (overrides: Partial<CommunityPost> = {}): CommunityPost => ({
  id: `mock-${Date.now()}`,
  author: '0xtest...user',
  parentId: undefined,
  contentCid: 'QmTest...',
  mediaCids: [],
  tags: ['test'],
  createdAt: new Date(),
  onchainRef: '0xtest...',
  communityId: '1',
  isPinned: false,
  isLocked: false,
  upvotes: 0,
  downvotes: 0,
  comments: [],
  depth: 0,
  sortOrder: 1,
  ...overrides
});