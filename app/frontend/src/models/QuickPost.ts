import { EnhancedPost, Reaction, Tip, ContentPreview } from '@/types/feed';

// QuickPost interface for home/feed posts (no title or community required)
export interface QuickPost extends EnhancedPost {
  // Inherit all properties from EnhancedPost
  // QuickPosts don't have titles or community associations
  // The isQuickPost flag will be set to true
  media?: string[]; // Additional property specific to frontend QuickPost
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
// Helper function to validate IPFS CID and construct proper URL
function getAvatarUrl(profileCid: string | undefined): string | undefined {
  if (!profileCid) return undefined;
  
  // Check if it's already a valid URL
  try {
    new URL(profileCid);
    return profileCid;
  } catch {
    // Not a valid URL, check if it's a valid IPFS CID
    if (profileCid.startsWith('Qm') || profileCid.startsWith('bafy')) {
      return `https://ipfs.io/ipfs/${profileCid}`;
    }
    // If it's not a valid URL or IPFS CID, return undefined
    return undefined;
  }
}

export function convertBackendQuickPostToQuickPost(backendPost: any): QuickPost {
  // Parse content if it's stored as JSON string
  let content = '';
  if (backendPost.content) {
    if (typeof backendPost.content === 'string') {
      try {
        // Try to parse as JSON in case it's stored as a JSON string
        const parsedContent = JSON.parse(backendPost.content);
        if (typeof parsedContent === 'string') {
          content = parsedContent;
        } else if (typeof parsedContent === 'object' && parsedContent.content) {
          content = parsedContent.content;
        } else {
          content = backendPost.content;
        }
      } catch {
        // If parsing fails, use the content as is
        content = backendPost.content;
      }
    } else {
      // If it's already an object, convert to string
      content = JSON.stringify(backendPost.content);
    }
  }
  
  return {
    id: backendPost.id?.toString() || '',
    author: backendPost.walletAddress || backendPost.authorId || '',
    parentId: backendPost.parentId ? backendPost.parentId.toString() : null,
    title: backendPost.title || '', // Optional for quickPosts
    content: content, // Use parsed content
    contentCid: backendPost.contentCid || '',
    mediaCids: backendPost.mediaCids ? JSON.parse(backendPost.mediaCids) : [],
    tags: backendPost.tags ? JSON.parse(backendPost.tags) : [],
    createdAt: new Date(backendPost.createdAt || Date.now()),
    updatedAt: new Date(backendPost.updatedAt || backendPost.createdAt || Date.now()),
    onchainRef: backendPost.onchainRef || '',
    stakedValue: parseFloat(backendPost.stakedValue || backendPost.staked_value || 0),
    reputationScore: parseInt(backendPost.reputationScore || backendPost.reputation_score || 0),

    // Engagement data (will be populated by services)
    reactions: [] as Reaction[],
    tips: [] as Tip[],
    comments: backendPost.commentCount || 0,
    shares: backendPost.shareCount || 0,
    views: backendPost.viewCount || 0,
    engagementScore: backendPost.engagementScore || 0,
    
    // Enhanced features (will be populated by services)
    previews: [] as ContentPreview[],
    hashtags: [],  // Required field
    mentions: [],  // Required field
    socialProof: undefined,
    trendingStatus: backendPost.trendingScore > 0 ? 'trending' : null,
    trendingScore: backendPost.trendingScore || 0,
    isBookmarked: false,
    communityId: backendPost.communityId || '',
    contentType: detectContentType(backendPost),
    
    // Add author profile information including avatar
    authorProfile: {
      handle: backendPost.displayName || backendPost.handle || backendPost.walletAddress?.slice(0, 8) || 'Unknown',
      verified: false,
      avatar: getAvatarUrl(backendPost.avatarCid) || getAvatarUrl(backendPost.profileCid),  // Prefer avatarCid, fallback to profileCid
      reputationTier: undefined
    },
    
    // Add media property for frontend QuickPost interface
    media: backendPost.mediaCids ? JSON.parse(backendPost.mediaCids) : [],
    
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