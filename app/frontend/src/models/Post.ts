import { EnhancedPost, Reaction, Tip, ContentPreview } from '@/types/feed';

// Standardized Post interface that matches backend schema
export interface Post extends EnhancedPost {
  // All properties inherited from EnhancedPost
  media?: string[]; // Additional property specific to frontend Post
}

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

// Utility function to convert backend post to frontend post
export function convertBackendPostToPost(backendPost: any): Post {
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

  // Helper function to safely convert to Date
  const toDate = (value: any): Date => {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return new Date();
  };

  return {
    id: backendPost.id?.toString() || '',
    author: backendPost.walletAddress || backendPost.authorId || '',
    walletAddress: backendPost.walletAddress || '', // Ensure walletAddress is explicitly provided
    parentId: backendPost.parentId ? backendPost.parentId.toString() : null,
    title: backendPost.title || '',
    content: content, // Use parsed content
    contentCid: backendPost.contentCid || '',
    shareId: backendPost.shareId || '', // Include shareId for share URLs
    mediaCids: backendPost.mediaCids ? JSON.parse(backendPost.mediaCids) : [],
    tags: backendPost.tags ? JSON.parse(backendPost.tags) : [],
    createdAt: toDate(backendPost.createdAt),
    updatedAt: toDate(backendPost.updatedAt || backendPost.createdAt),
    onchainRef: backendPost.onchainRef || '',
    stakedValue: parseFloat(backendPost.stakedValue || backendPost.staked_value || 0),
    reputationScore: parseInt(backendPost.reputationScore || backendPost.reputation_score || 0),

    // Engagement data (will be populated by services)
    reactions: [] as Reaction[], // Reactions will be fetched separately to avoid overfetching
    tips: [] as Tip[],
    comments: backendPost.commentCount || 0,
    reposts: backendPost.reposts || 0,
    views: backendPost.views || 0,
    upvotes: backendPost.upvotes || 0,
    downvotes: backendPost.downvotes || 0,
    engagementScore: backendPost.engagementScore || 0,
    reactionCount: backendPost.reactionCount || 0, // Include reaction count for display

    // Enhanced features (will be populated by services)
    previews: [] as ContentPreview[],
    hashtags: [],  // Required field
    mentions: [],  // Required field
    socialProof: undefined,
    trendingStatus: backendPost.trendingScore > 0 ? 'trending' : null,
    trendingScore: backendPost.trendingScore || 0,
    isBookmarked: false,
    communityId: backendPost.communityId || backendPost.community_id || '',
    communityName: backendPost.communityName || backendPost.community_name || '',
    contentType: detectContentType(backendPost),

    // Add author profile information including avatar
    authorProfile: {
      handle: backendPost.displayName || backendPost.handle || backendPost.walletAddress?.slice(0, 8) || 'Unknown',
      verified: false,
      avatarCid: backendPost.avatarCid || backendPost.profileCid,  // Prefer avatarCid, fallback to profileCid
      reputationTier: undefined
    },

    // Add media property for frontend Post interface
    media: backendPost.mediaCids ? JSON.parse(backendPost.mediaCids) : [],

    // All posts now belong to a community
    isStatus: backendPost.isStatus || false,

    // Repost info
    isRepost: backendPost.isRepost || false,
    isRepostedByMe: backendPost.isRepostedByMe || false
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

export interface CreatePostInput {
  author: string;
  parentId?: string;
  content: string; // This would be uploaded to IPFS and the CID stored
  media?: string[]; // Media files would be uploaded to IPFS and CIDs stored
  tags?: string[];
  onchainRef?: string;
  title?: string;
  communityId?: string; // Optional - for quick posts on timeline, can be added later
  poll?: any; // Poll data for poll posts
  proposal?: any; // Proposal data for governance posts
  shareToSocialMedia?: {
    twitter?: boolean;
    facebook?: boolean;
    linkedin?: boolean;
    threads?: boolean;
  };
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  communityId?: string;
  tags?: string[];
  media?: string[];
  poll?: any;
  proposal?: any;
}