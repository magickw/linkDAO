export interface Post {
  id: string;
  author: string;
  parentId: string | null;
  content?: string; // Direct content from DB to avoid IPFS fetch
  contentCid: string;
  shareId: string; // Share ID for generating share URLs
  mediaCids: string[];
  tags: string[];
  createdAt: Date;
  onchainRef: string;
  // Moderation fields
  moderationStatus?: 'active' | 'limited' | 'pending_review' | 'blocked';
  moderationWarning?: string | null;
  riskScore?: number;
  moderationCategories?: string[];
  isRepost?: boolean;
  isRepostedByMe?: boolean;
  isStatus?: boolean;
  shares?: number;
  mediaUrls?: string[];
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  communityId?: string | null;
  communityName?: string;
  communitySlug?: string;
  title?: string;
}

export interface CreatePostInput {
  author: string;
  parentId?: string;
  content: string; // This would be uploaded to IPFS and the CID stored
  media?: string[]; // Media files would be uploaded to IPFS and CIDs stored
  tags?: string[];
  onchainRef?: string;
  communityId?: string;
  isRepost?: boolean;
  mediaUrls?: string[];
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  shareToSocialMedia?: {
    twitter?: boolean;
    facebook?: boolean;
    linkedin?: boolean;
    threads?: boolean;
  };
}

export interface UpdatePostInput {
  content?: string;
  media?: string[];
  tags?: string[];
}
