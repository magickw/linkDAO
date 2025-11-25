import { PostActionPermissions } from '@/components/PostActionsMenu';
import { EnhancedPost, AuthorProfile } from '@/types/feed';
import { CommunityMembership } from '@/models/CommunityMembership';

/**
 * Get post action permissions for the current user
 */
export function getPostActionPermissions(
    post: EnhancedPost,
    currentUserAddress?: string,
    userMembership?: CommunityMembership | null
): PostActionPermissions {
    const isAuthor = currentUserAddress && post.author.toLowerCase() === currentUserAddress.toLowerCase();
    const isModerator = userMembership?.role === 'moderator' || userMembership?.role === 'admin';
    const isAdmin = userMembership?.role === 'admin';

    return {
        canEdit: isAuthor,
        canDelete: isAuthor || isModerator || isAdmin,
        canPin: isModerator || isAdmin,
        canReport: !isAuthor, // Can't report own posts
        canHide: true // Everyone can hide posts from their feed
    };
}

/**
 * Check if user can edit a post
 */
export function canUserEditPost(
    post: EnhancedPost,
    currentUserAddress?: string
): boolean {
    if (!currentUserAddress) return false;
    return post.author.toLowerCase() === currentUserAddress.toLowerCase();
}

/**
 * Check if user can delete a post
 */
export function canUserDeletePost(
    post: EnhancedPost,
    currentUserAddress?: string,
    userMembership?: CommunityMembership | null
): boolean {
    if (!currentUserAddress) return false;

    const isAuthor = post.author.toLowerCase() === currentUserAddress.toLowerCase();
    const isModerator = userMembership?.role === 'moderator' || userMembership?.role === 'admin';

    return isAuthor || isModerator;
}

/**
 * Check if user can pin a post
 */
export function canUserPinPost(
    userMembership?: CommunityMembership | null
): boolean {
    return userMembership?.role === 'moderator' || userMembership?.role === 'admin';
}

/**
 * Check if user can report a post
 */
export function canUserReportPost(
    post: EnhancedPost,
    currentUserAddress?: string
): boolean {
    if (!currentUserAddress) return false;
    // Can't report own posts
    return post.author.toLowerCase() !== currentUserAddress.toLowerCase();
}
