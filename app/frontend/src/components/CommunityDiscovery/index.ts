export { default as TrendingCommunitiesSection } from './TrendingCommunitiesSection';
export { default as CommunityComparisonTool } from './CommunityComparisonTool';
export { default as AdvancedSearchInterface } from './AdvancedSearchInterface';
export { default as TagAutocompleteInput } from './TagAutocompleteInput';
export { default as ActivityLevelFilter } from './ActivityLevelFilter';
export { default as ConnectionBasedRecommendations } from './ConnectionBasedRecommendations';
export { default as CommunityEventHighlights } from './CommunityEventHighlights';

// Re-export services
export { default as CommunityRankingService } from '../../services/communityRankingService';
export { default as Web3RecommendationService } from '../../services/web3RecommendationService';

// Types
export type { TrendingCommunityData, CommunityRankingMetrics } from '../../services/communityRankingService';
export type { Web3Profile, TokenHolding, TransactionHistory } from '../../services/web3RecommendationService';