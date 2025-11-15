import { EnhancedPost } from '@/types/feed';

// Standardized Post interface that matches backend schema
export interface Post extends EnhancedPost {
  // All properties inherited from EnhancedPost
}

export interface CreatePostInput {
  author: string;
  parentId?: string;
  content: string; // This would be uploaded to IPFS and the CID stored
  media?: string[]; // Media files would be uploaded to IPFS and CIDs stored
  tags?: string[];
  onchainRef?: string;
  title?: string; // Optional for quickPosts
  dao?: string; // Optional for quickPosts
  poll?: any; // Poll data for poll posts
  proposal?: any; // Proposal data for governance posts
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  dao?: string;
  tags?: string[];
  media?: string[];
}

// Utility function to convert backend post to frontend post
export function convertBackendPostToPost(backendPost: any): Post {
  return {
    id: backendPost.id?.toString() || '',
    author: backendPost.walletAddress || backendPost.authorId || '',
    parentId: backendPost.parentId ? backendPost.parentId.toString() : null,
    title: backendPost.title || '', // Optional for quickPosts
    contentCid: backendPost.contentCid || '',
    mediaCids: backendPost.mediaCids ? JSON.parse(backendPost.mediaCids) : [],
    tags: backendPost.tags ? JSON.parse(backendPost.tags) : [],
    createdAt: new Date(backendPost.createdAt || Date.now()),
    updatedAt: new Date(backendPost.updatedAt || backendPost.createdAt || Date.now()),
    onchainRef: backendPost.onchainRef || '',
    stakedValue: parseFloat(backendPost.stakedValue || backendPost.staked_value || 0),
    reputationScore: parseInt(backendPost.reputationScore || backendPost.reputation_score || 0),
    dao: backendPost.dao || '', // Optional for quickPosts
    
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
    communityId: backendPost.dao || backendPost.communityId,
    contentType: detectContentType(backendPost),
    
    // Add author profile information including avatar
    authorProfile: {
      handle: backendPost.handle || backendPost.walletAddress?.slice(0, 8) || 'Unknown',
      verified: false,
      avatar: backendPost.profileCid || undefined,  // Use profileCid as avatar if available
      reputationTier: undefined
    },
    
    // Flag to distinguish quickPosts from regular posts
    isQuickPost: !backendPost.title && !backendPost.dao && !backendPost.communityId
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