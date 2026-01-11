import { EnhancedPost, Reaction, Tip, ContentPreview } from '@/types/feed';

// Status interface for home/feed posts (no title or community required)
export interface Status extends EnhancedPost {
  // Inherit all properties from EnhancedPost
  // Statuses don't have titles or community associations
  // The isStatus flag will be set to true
  media?: string[]; // Additional property specific to frontend Status
}

export interface CreateStatusInput {
  author: string;
  parentId?: string;
  content: string; // This would be uploaded to IPFS and the CID stored
  media?: string[]; // Media files would be uploaded to IPFS and CIDs stored
  tags?: string[];
  onchainRef?: string;
  poll?: any; // Poll data for poll posts
  proposal?: any; // Proposal data for governance posts
}

export interface UpdateStatusInput {
  content?: string;
  tags?: string[];
  media?: string[];
}

// Utility function to convert backend status to frontend status
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

/**
 * Format author display name consistently
 * Returns user's handle if available, otherwise returns shortened wallet address
 * @param handle - User's custom handle (may be null/undefined)
 * @param walletAddress - User's wallet address
 * @returns Formatted display name (handle or "0xABCD...1234" format)
 */
function formatAuthorDisplay(handle: string | null | undefined, walletAddress: string | null | undefined): string {
  // If handle exists and is not empty, use it
  if (handle && handle.trim() !== '') {
    return handle;
  }

  // Otherwise, format wallet address as "0xABCD...1234"
  if (walletAddress && walletAddress.length >= 10) {
    const prefix = walletAddress.slice(0, 6);  // "0xABCD"
    const suffix = walletAddress.slice(-4);     // "1234"
    return `${prefix}...${suffix}`;
  }

  // Fallback if both are missing
  return 'Unknown';
}


export function convertBackendStatusToStatus(backendPost: any): Status {
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

  // Helper function to safely parse JSON fields that might already be parsed
  const safeJsonParse = (field: any, fallback: any = []) => {
    if (!field) return fallback;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return fallback;
      }
    }
    // If it's already an array or object, return as is
    return field;
  };

  return {
    id: backendPost.id?.toString() || '',
    author: backendPost.walletAddress || backendPost.authorId || '',
    parentId: backendPost.parentId ? backendPost.parentId.toString() : null,
    title: backendPost.title || '', // Optional for statuses
    content: content, // Use parsed content
    contentCid: backendPost.contentCid || '',
    shareId: backendPost.shareId || '', // Include shareId for share URLs
    mediaCids: safeJsonParse(backendPost.mediaCids, []),
    tags: safeJsonParse(backendPost.tags, []),
    createdAt: new Date(backendPost.createdAt || Date.now()),
    updatedAt: new Date(backendPost.updatedAt || backendPost.createdAt || Date.now()),
    onchainRef: backendPost.onchainRef || '',
    stakedValue: parseFloat(backendPost.stakedValue || backendPost.staked_value || 0),
    reputationScore: parseInt(backendPost.reputationScore || backendPost.reputation_score || 0),

    // Engagement data (will be populated by services)
    reactions: [] as Reaction[], // Reactions will be fetched separately to avoid overfetching
    tips: [] as Tip[],
    comments: backendPost.commentCount || 0,
    reposts: backendPost.reposts || 0,
    views: backendPost.viewCount || 0,
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
    communityId: backendPost.communityId || '',
    contentType: detectContentType(backendPost),

    // Add author profile information including avatar
    authorProfile: {
      handle: formatAuthorDisplay(backendPost.handle, backendPost.walletAddress),
      displayName: backendPost.displayName || backendPost.handle || backendPost.author || '',
      verified: false,
      avatarCid: backendPost.avatarCid || backendPost.profileCid,  // Prefer avatarCid, fallback to profileCid
      reputationTier: undefined
    },

    // Add media property for frontend Status interface
    media: safeJsonParse(backendPost.mediaCids, []),

    // CRITICAL: Preserve originalPost for reposts
    // Recursively convert the original post if this is a repost
    originalPost: backendPost.originalPost ? convertBackendStatusToStatus(backendPost.originalPost) : undefined,

    // Repost flags
    isRepost: backendPost.isRepost || false,
    isRepostedByMe: backendPost.isRepostedByMe || false,

    // Flag to distinguish statuses from regular posts
    isStatus: true
  };
}

// Helper function to detect content type
function detectContentType(post: any): 'text' | 'media' | 'link' | 'poll' | 'proposal' {
  // Safely parse mediaCids
  const safeParseArray = (field: any): any[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const mediaCids = safeParseArray(post.mediaCids);
  const tags = safeParseArray(post.tags);

  if (mediaCids.length > 0) {
    return 'media';
  }

  if (post.contentCid && post.contentCid.includes('http')) {
    return 'link';
  }

  if (tags.includes('poll')) {
    return 'poll';
  }

  if (tags.includes('proposal')) {
    return 'proposal';
  }

  return 'text';
}