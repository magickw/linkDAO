import { useMemo } from 'react';
import { getPlaceholderImage, generateAvatarPlaceholder, COMMON_PLACEHOLDERS } from '../utils/placeholderService';

/**
 * Hook for managing placeholder images
 */
export function usePlaceholder() {
  return useMemo(() => ({
    /**
     * Get a placeholder image, converting placehold.co URLs to local SVGs
     */
    getImage: (url: string) => getPlaceholderImage(url),
    
    /**
     * Generate an avatar placeholder with initials
     */
    getAvatar: (name: string, size: number = 40) => generateAvatarPlaceholder(name, size),
    
    /**
     * Common pre-generated placeholders
     */
    common: COMMON_PLACEHOLDERS,
  }), []);
}

/**
 * Hook specifically for avatar images with fallback handling
 */
export function useAvatarImage(
  imageUrl?: string, 
  fallbackName?: string, 
  size: number = 40
) {
  return useMemo(() => {
    if (imageUrl && !imageUrl.includes('placehold.co')) {
      return imageUrl;
    }
    
    if (imageUrl?.includes('placehold.co')) {
      return getPlaceholderImage(imageUrl);
    }
    
    if (fallbackName) {
      return generateAvatarPlaceholder(fallbackName, size);
    }
    
    return size === 40 ? COMMON_PLACEHOLDERS.AVATAR_40 : 
           size === 48 ? COMMON_PLACEHOLDERS.AVATAR_48 :
           generateAvatarPlaceholder('U', size);
  }, [imageUrl, fallbackName, size]);
}