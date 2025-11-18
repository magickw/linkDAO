import { Post, CreatePostInput } from '../models/Post';

// Unified content type - all posts support mixed content (text, images, videos, links, etc.)
export enum ContentType {
  POST = 'post', // Standard post with any combination of text, media, links
  POLL = 'poll', // Poll-specific post
  PROPOSAL = 'proposal' // Governance proposal post
}

export interface RichPostInput extends Omit<CreatePostInput, 'media'> {
  contentType: ContentType;
  title?: string;
  media?: MediaFile[]; // Can contain images, videos, audio simultaneously
  links?: LinkPreview[]; // Can have multiple links with previews
  poll?: PollData; // Optional poll data
  proposal?: ProposalData; // Optional proposal data
  hashtags: string[];
  mentions: string[];
  communityId?: string;
  scheduledAt?: Date;
}

// Media file interface for uploads
export interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video' | 'audio';
  size: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed' | 'error';
  uploadProgress?: number;
  error?: string;
  cid?: string; // IPFS CID after upload
  metadata?: Record<string, any>;
}

// Link preview data
export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  siteName?: string;
  type: 'article' | 'video' | 'product' | 'website';
  metadata?: Record<string, any>;
}

// Poll data structure
export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  tokenWeighted: boolean;
  endDate?: Date;
  minTokens?: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  tokenVotes: number;
}

// Proposal data structure
export interface ProposalData {
  title: string;
  description: string;
  type: 'governance' | 'funding' | 'parameter' | 'upgrade';
  votingPeriod: number; // in days
  quorum: number; // percentage
  threshold: number; // percentage
  executionDelay?: number; // in days
}

// Draft management
export interface PostDraft {
  id: string;
  contentType: ContentType;
  title?: string;
  content: string;
  media: MediaFile[];
  links: LinkPreview[];
  poll?: PollData;
  proposal?: ProposalData;
  hashtags: string[];
  mentions: string[];
  communityId?: string;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  autoSaved: boolean;
}

// Hashtag and mention suggestions
export interface HashtagSuggestion {
  tag: string;
  count: number;
  trending: boolean;
  category?: string;
}

export interface MentionSuggestion {
  address: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  reputation?: number;
  verified: boolean;
  mutualConnections?: number;
}

// Content validation results
export interface ContentValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Enhanced post composer props
export interface EnhancedPostComposerProps {
  context: 'feed' | 'community';
  communityId?: string;
  initialContentType?: ContentType;
  initialDraft?: PostDraft;
  onSubmit: (post: RichPostInput) => Promise<void>;
  onDraftSave: (draft: PostDraft) => void;
  onDraftLoad: (draftId: string) => PostDraft | null;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

// Content type tab configuration
export interface ContentTypeTab {
  type: ContentType;
  label: string;
  icon: string;
  description: string;
  enabled: boolean;
  requiresAuth?: boolean;
  requiresCommunity?: boolean;
}

// Media upload configuration
export interface MediaUploadConfig {
  maxFileSize: number; // in bytes
  maxFiles: number;
  allowedTypes: string[];
  enablePreview: boolean;
  enableEditing: boolean;
  enableProgress: boolean;
}

// Auto-complete configuration
export interface AutoCompleteConfig {
  hashtags: {
    enabled: boolean;
    minChars: number;
    maxSuggestions: number;
    showTrending: boolean;
  };
  mentions: {
    enabled: boolean;
    minChars: number;
    maxSuggestions: number;
    showMutualConnections: boolean;
  };
}