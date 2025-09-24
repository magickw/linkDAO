import React, { useState, useEffect } from 'react';

// Local placeholder image paths
const PLACEHOLDER_IMAGES = {
  product: '/images/placeholders/product-placeholder.svg',
  avatar: '/images/placeholders/avatar-placeholder.svg',
  banner: '/images/placeholders/banner-placeholder.svg'
} as const;

type ImageType = keyof typeof PLACEHOLDER_IMAGES;

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
  
  // If it's already a local path or data URL, return as is
  if (src.startsWith('/') || src.startsWith('data:image')) {
    return src;
  }

  // Check if the image loads successfully with a timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(src, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return src;
    }
  } catch (error) {
    console.warn(`Error loading image ${src}:`, error);
  }
  
  // Return fallback if there's an error or the image doesn't load
  return getFallbackImage(fallbackType);
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
          <div className="animate-pulse w-full h-full bg-gray-700/50" />
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