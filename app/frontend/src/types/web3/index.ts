/**
 * Web3 integration foundation - main exports
 */

// Community and token types
export * from '../web3Community';
export * from '../tokenActivity';
export * from '../governance';
// Avoid re-export name collisions with web3Community
export type {
  Web3Reaction,
  Web3ReactionSummary,
  EngagementMetrics,
  PostVisibilityBoost,
  TrendingIndicator,
  PostInteractionOptions,
  PostCreationRequest,
  PostAttachment,
  AttachmentMetadata
} from '../web3Post';
export * from '../onChainVerification';

// Utilities
export * from '../../utils/web3ErrorHandling';
export * from '../../utils/progressiveEnhancement';

// Re-export commonly used types for convenience (from correct sources)
export type { CommunityWithWeb3Data } from '../web3Community';
export type { TokenActivity } from '../tokenActivity';
export type { Proposal } from '../governance';
export type { PostWithWeb3Data } from '../web3Post';
export type { OnChainProof } from '../onChainVerification';
export type { Web3Error } from '../../utils/web3ErrorHandling';
export type { FeatureConfig } from '../../utils/progressiveEnhancement';
