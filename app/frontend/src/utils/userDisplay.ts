/**
 * Utility functions for standardized user display across components
 */

/**
 * Get the display name for a user/author
 * Priority order:
 * 1. authorProfile.handle
 * 2. handle
 * 3. displayName
 * 4. Shortened wallet address
 */
export const getDisplayName = (author: any): string => {
    // Handle case where author is the entire post/comment object
    if (author?.authorProfile?.handle) {
        return author.authorProfile.handle;
    }

    if (author?.handle) {
        return author.handle;
    }

    if (author?.displayName) {
        return author.displayName;
    }

    // Fallback to wallet address
    const walletAddress = author?.walletAddress || author?.author || author;
    if (typeof walletAddress === 'string' && walletAddress.length > 10) {
        return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    }

    return 'Unknown User';
};

import { getProxiedIPFSUrl } from './ipfsProxy';

/**
 * Get the avatar URL for a user/author
 * Returns null if no avatar is available
 */
export const getAvatarUrl = (author: any): string | null => {
    const avatarSource = author?.authorProfile?.avatarCid ||
        author?.authorProfile?.avatar ||
        author?.avatar ||
        author?.avatarCid ||
        author?.profile?.avatarCid;

    if (!avatarSource) return null;

    // If it's already a URL (not IPFS specific), return it
    if ((avatarSource.startsWith('http') || avatarSource.startsWith('blob:')) &&
        !avatarSource.includes('/ipfs/') &&
        !avatarSource.includes('ipfs.io') &&
        !avatarSource.includes('pinata')) {
        return avatarSource;
    }

    // Use proxy for CIDs or IPFS URLs
    return getProxiedIPFSUrl(avatarSource);
};

/**
 * Get default avatar initials from display name
 * Returns 2 uppercase characters
 */
export const getDefaultAvatar = (displayName: string): string => {
    if (!displayName || displayName === 'Unknown User') {
        return 'U';
    }

    // Remove "u/" prefix if present
    const cleanName = displayName.startsWith('u/') ? displayName.slice(2) : displayName;

    // Take first 2 characters
    return cleanName.slice(0, 2).toUpperCase();
};

/**
 * Get the user's wallet address for linking purposes
 * Returns the raw wallet address or author field
 */
export const getUserAddress = (author: any): string => {
    return author?.walletAddress || author?.author || author || '';
};
