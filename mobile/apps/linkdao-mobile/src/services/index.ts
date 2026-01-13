/**
 * Services Index
 * Export all API services
 */

export { postsService } from './postsService';
export { communitiesService } from './communitiesService';

export type { CreatePostData, PostsResponse } from './postsService';
export type { CreateCommunityData, JoinCommunityResponse } from './communitiesService';