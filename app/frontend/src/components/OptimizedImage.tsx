import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  lazy?: boolean;
  quality?: number;
  fill?: boolean;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 400,
  height = 300,
  className = '',
  lazy = true,
  quality = 75,
  fill = false,
  onError
}) => {
  // Handle empty or invalid src
  if (!src || src.trim() === '') {
    return (
      <div className={className} style={{ position: 'relative', width: fill ? '100%' : width, height: fill ? '100%' : height }}>
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-500 dark:text-gray-400">No image</span>
          </div>
        </div>
      </div>
    );
  }

  // Handle IPFS CIDs with multiple gateway fallbacks
  const isIpfsCid = (() => {
    // Handle various IPFS formats:
    // 1. Raw CID: Qm..., baf...
    // 2. Full IPFS URL: https://gateway.pinata.cloud/ipfs/Qm...
    // 3. Path-based IPFS: /ipfs/Qm...
    try {
      if (src.startsWith('Qm') || src.startsWith('baf')) return true;
      if (src.includes('/ipfs/') && (src.includes('Qm') || src.includes('baf'))) return true;
      return false;
    } catch (error) {
      console.warn('Error checking IPFS CID:', error);
      return false;
    }
  })();

  // List of IPFS gateways to try in order (prioritize more reliable gateways)
  const ipfsGateways = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/'
  ];

  // Generate URLs for all gateways if it's an IPFS CID
  const generateUrls = () => {
    try {
      if (isIpfsCid) {
        // Extract the actual CID from various formats
        let cid = src;

        // Handle full URLs: https://gateway.pinata.cloud/ipfs/Qm...
        if (src.includes('/ipfs/')) {
          const parts = src.split('/ipfs/');
          if (parts.length > 1) {
            cid = parts[1].replace(/^\/\/+/, ''); // Remove leading slashes
          }
        }

        // Handle path-based: /ipfs/Qm...
        if (src.startsWith('/ipfs/')) {
          cid = src.substring(6).replace(/^\/\/+/, ''); // Remove '/ipfs/' and leading slashes
        }

        return ipfsGateways.map(gateway => `${gateway}${cid}`);
      }
      return [src];
    } catch (error) {
      console.warn('Error generating URLs:', error);
      return [src];
    }
  };

  const [urls, setUrls] = useState<string[]>(generateUrls());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(urls[0]);
  const [hasError, setHasError] = useState(false);

  // Reset when src changes
  useEffect(() => {
    const newUrls = generateUrls();
    setUrls(newUrls);
    setCurrentIndex(0);
    setCurrentSrc(newUrls[0]);
    setHasError(false);
  }, [src]);

  // Handle image error and try next gateway
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    try {
      // If we have more gateways to try, try the next one
      if (isIpfsCid && currentIndex < urls.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setCurrentSrc(urls[nextIndex]);
      } else {
        // No more gateways to try or not an IPFS CID
        setHasError(true);
        if (onError) {
          onError(e);
        }
      }
    } catch (error) {
      console.warn('Error handling image error:', error);
      setHasError(true);
      if (onError) {
        onError(e);
      }
    }
  };

  // Add timeout to prevent hanging
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleImageLoad = () => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
  };

  const handleImageLoadStart = () => {
    // Set a timeout to show error if image takes too long to load
    const timeout = setTimeout(() => {
      console.warn('Image loading timeout, skipping to next gateway or showing error');
      if (isIpfsCid && currentIndex < urls.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setCurrentSrc(urls[nextIndex]);
      } else {
        setHasError(true);
      }
    }, 5000); // 5 second timeout
    setLoadTimeout(timeout);
  };

  // If all gateways failed, show error state
  if (hasError) {
    return (
      <div className={className} style={{ position: 'relative', width: fill ? '100%' : width, height: fill ? '100%' : height }}>
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-500 dark:text-gray-400">Image unavailable</span>
          </div>
        </div>
      </div>
    );
  }

  // Handle external URLs by using img tag with loading optimization
  try {
    if (currentSrc.startsWith('http')) {
      return (
        <div className={className} style={{ position: 'relative', width: fill ? '100%' : width, height: fill ? '100%' : height }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={alt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            loading={lazy ? 'lazy' : 'eager'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: fill ? 'absolute' : undefined, inset: fill ? 0 : undefined }}
            onError={handleImageError}
            onLoad={handleImageLoad}
            onLoadStart={handleImageLoadStart}
          />
        </div>
      );
    }
  } catch (error) {
    console.warn('Error handling external URL:', error);
    // Fall back to local image handling
  }

  // For local images, use Next.js Image component
  try {
    return (
      <div className={className} style={{ position: 'relative', width: fill ? '100%' : width, height: fill ? '100%' : height }}>
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          loading={lazy ? 'lazy' : 'eager'}
          quality={quality}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={handleImageError as any}
        />
      </div>
    );
  } catch (error) {
    console.warn('Error handling local image:', error);
    // Show error state
    return (
      <div className={className} style={{ position: 'relative', width: fill ? '100%' : width, height: fill ? '100%' : height }}>
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-500 dark:text-gray-400">Image error</span>
          </div>
        </div>
      </div>
    );
  }
};

export default OptimizedImage;