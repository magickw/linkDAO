import { Post } from './Post';

// Omit 'parentId' and 'comments' from base Post so CommunityPost can
// define comments as a structured Comment[] instead of the numeric count
export interface CommunityPost extends Omit<Post, 'parentId' | 'comments'> {
  communityId: string;
  flair?: string;
  isPinned: boolean;
  isLocked: boolean;
  upvotes: number;
  downvotes: number;
  comments: Comment[];
  parentId?: string; // For threaded discussions
  depth: number; // Thread depth for nested comments
  sortOrder: number; // For custom sorting
  
  // Performance tracking fields
  viewCount?: number;
  engagementScore: number;
  lastViewedAt?: Date;
  trendingScore?: number;
}

export interface Comment {
  id: string;
  postId: string;
  parentId?: string;
  author: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  upvotes: number;
  downvotes: number;
  replies: Comment[];
  depth: number;
  isDeleted: boolean;
  isEdited: boolean;
}

export interface CreateCommunityPostInput {
  author: string;
  communityId: string;
  content: string;
  media?: string[];
  tags?: string[];
  flair?: string;
  parentId?: string; // For replies/comments
  onchainRef?: string;
}

export interface UpdateCommunityPostInput {
  content?: string;
  media?: string[];
  tags?: string[];
  flair?: string;
  isPinned?: boolean;
  isLocked?: boolean;
}

export interface CreateCommentInput {
  postId: string;
  parentId?: string;
  author: string;
  content: string;
}

export interface UpdateCommentInput {
  content?: string;
}

export interface VoteInput {
  postId: string;
  userId: string;
  voteType: 'upvote' | 'downvote' | 'remove';
}

export interface CommunityPostStats {
  totalPosts: number;
  totalComments: number;
  totalVotes: number;
  activeDiscussions: number;
  pinnedPosts: number;
}