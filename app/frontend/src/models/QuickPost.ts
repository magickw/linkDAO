import { EnhancedPost } from '@/types/feed';

// QuickPost interface for home/feed posts (no title or community required)
export interface QuickPost extends EnhancedPost {
  // Inherit all properties from EnhancedPost
  // QuickPosts don't have titles or community associations
  // The isQuickPost flag will be set to true
}

export interface CreateQuickPostInput {
  author: string;
  parentId?: string;
  content: string; // This would be uploaded to IPFS and the CID stored
  media?: string[]; // Media files would be uploaded to IPFS and CIDs stored
  tags?: string[];
  onchainRef?: string;
  poll?: any; // Poll data for poll posts
  proposal?: any; // Proposal data for governance posts
}

export interface UpdateQuickPostInput {
  content?: string;
  tags?: string[];
  media?: string[];
}

// Utility function to convert backend quick post to frontend quick post
export function convertBackendQuickPostToQuickPost(backendPost: any): QuickPost {
  return {
    id: backendPost.id?.toString() || '',
    author: backendPost.walletAddress || backendPost.authorId || '',
    parentId: backendPost.parentId ? backendPost.parentId.toString() : null,
    contentCid: backendPost.contentCid || '',
    mediaCids: backendPost.mediaCids ? JSON.parse(backendPost.mediaCids) : [],
    tags: backendPost.tags ? JSON.parse(backendPost.tags) : [],
    createdAt: new Date(backendPost.createdAt || Date.now()),
    updatedAt: new Date(backendPost.updatedAt || backendPost.createdAt || Date.now()),
    onchainRef: backendPost.onchainRef || '',
    stakedValue: parseFloat(backendPost.stakedValue || backendPost.staked_value || 0),
    reputationScore: parseInt(backendPost.reputationScore || backendPost.reputation_score || 0),
    
    // Engagement data (will be populated by services)
    reactions: [],
    tips: [],
    comments: backendPost.commentCount || 0,
    shares: backendPost.shareCount || 0,
    views: backendPost.viewCount || 0,
    engagementScore: backendPost.engagementScore || 0,
    
    // Enhanced features (will be populated by services)
    previews: [],
    socialProof: undefined,
    trendingStatus: backendPost.trendingScore > 0 ? 'trending' : null,
    trendingScore: backendPost.trendingScore || 0,
    isBookmarked: false,
    contentType: detectContentType(backendPost),
    
    // Flag to distinguish quickPosts from regular posts
    isQuickPost: true
  };
}

// Helper function to detect content type
function detectContentType(post: any): 'text' | 'media' | 'link' | 'poll' | 'proposal' {
  if (post.mediaCids && JSON.parse(post.mediaCids || '[]').length > 0) {
    return 'media';
  }
  
  if (post.contentCid && post.contentCid.includes('http')) {
    return 'link';
  }
  
  if (post.tags && JSON.parse(post.tags || '[]').includes('poll')) {
    return 'poll';
  }
  
  if (post.tags && JSON.parse(post.tags || '[]').includes('proposal')) {
    return 'proposal';
  }
  
  return 'text';
}