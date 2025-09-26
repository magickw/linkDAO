import React, { useState, useEffect } from 'react';

// Local placeholder image paths
const PLACEHOLDER_IMAGES = {
  product: '/images/placeholders/product-placeholder.svg',
  avatar: '/images/placeholders/avatar-placeholder.svg',
  banner: '/images/placeholders/banner-placeholder.svg'
} as const;

type ImageType = keyof typeof PLACEHOLDER_IMAGES;

// Simple cache to reduce excessive API calls
const imageCache = new Map<string, string>();
const failedImageCache = new Set<string>();

// Periodically clean up caches to prevent memory issues
setInterval(() => {
  // Keep successful image cache for 5 minutes
  imageCache.clear();
  // Keep failed image cache for 10 minutes
  failedImageCache.clear();
}, 5 * 60 * 1000); // 5 minutes

/**
 * Get a fallback image URL based on type
 * @param type The type of placeholder image needed
 * @returns URL string for the fallback image
 */
export const getFallbackImage = (type: ImageType = 'product'): string => {
  return PLACEHOLDER_IMAGES[type] || PLACEHOLDER_IMAGES.product;
};

/**
 * Creates an image with error handling and fallback
 * @param src The source URL of the image
 * @param fallbackType Type of fallback image to use
 * @returns A promise that resolves to the image URL (original or fallback)
 */
export const getImageWithFallback = async (
  src: string | undefined, 
  fallbackType: ImageType = 'product'
): Promise<string> => {
  if (!src) return getFallbackImage(fallbackType);
  
  // Check cache first
  if (imageCache.has(src)) {
    return imageCache.get(src)!;
  }
  
  // If we've already tried and failed, return fallback immediately
  if (failedImageCache.has(src)) {
    return getFallbackImage(fallbackType);
  }
  
  // If it's already a local path or data URL, return as is
  if (src.startsWith('/') || src.startsWith('data:image')) {
    imageCache.set(src, src);
    return src;
  }

  // Check if the image loads successfully with a timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch(src, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      imageCache.set(src, src);
      return src;
    } else {
      // Mark as failed to avoid repeated attempts
      failedImageCache.add(src);
    }
  } catch (error) {
    console.warn(`Error loading image ${src}:`, error);
    // Mark as failed to avoid repeated attempts
    failedImageCache.add(src);
  }
  
  // Return fallback if there's an error or the image doesn't load
  const fallback = getFallbackImage(fallbackType);
  imageCache.set(src, fallback);
  return fallback;
};

/**
 * Image component with built-in error handling and fallback
 */
interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackType?: ImageType;
  fallbackSrc?: string;
  className?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = '',
  fallbackType = 'product',
  fallbackSrc,
  onError,
  className = '',
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset state when src changes
    setImgSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc || getFallbackImage(fallbackType));
    }
    
    if (onError) {
      onError(e);
    }
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const finalSrc = imgSrc || fallbackSrc || getFallbackImage(fallbackType);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center">
          {/* Simplified loading indicator to reduce overhead */}
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={finalSrc}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        {...props}
      />
    </div>
  );
};

export default {
  getFallbackImage,
  getImageWithFallback,
  ImageWithFallback
};