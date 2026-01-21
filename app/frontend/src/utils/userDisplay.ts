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

/**
 * Get profile image URL with proper handling for Cloudinary URLs and IPFS CIDs
 * This function checks if the URL is already a full URL before constructing IPFS URLs
 * @param avatarCid - The avatar CID or URL from the database
 * @param walletAddress - Fallback wallet address for default avatar
 * @returns The avatar URL
 */
export const getProfileImageUrl = (avatarCid: string | undefined | null, walletAddress?: string): string => {
    if (!avatarCid) {
        return walletAddress
            ? `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}&backgroundColor=b6e3f4`
            : '/images/default-avatar.png';
    }

    // If it's already a full URL (Cloudinary, etc.), return it as-is
    if (avatarCid.startsWith('http://') || avatarCid.startsWith('https://')) {
        return avatarCid;
    }

    // If it's a blob URL, return it as-is
    if (avatarCid.startsWith('blob:')) {
        return avatarCid;
    }

    // Otherwise, treat it as an IPFS CID and construct the IPFS gateway URL
    return `https://ipfs.io/ipfs/${avatarCid}`;
};
