/**
 * Store Index
 * Export all Zustand stores
 */

export { useAuthStore } from './authStore';
export { usePostsStore } from './postsStore';
export { useCommunitiesStore } from './communitiesStore';
export { useMessagesStore } from './messagesStore';

export type { Post } from './postsStore';
export type { Community } from './communitiesStore';
export type { Message, Conversation } from './messagesStore';