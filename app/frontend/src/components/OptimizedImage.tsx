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
  onError
}) => {
  // Handle IPFS CIDs with multiple gateway fallbacks
  const isIpfsCid = src.startsWith('Qm') || src.startsWith('baf');
  
  // List of IPFS gateways to try in order (prioritize more reliable gateways)
  const ipfsGateways = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/'
  ];
  
  // Generate URLs for all gateways if it's an IPFS CID
  const generateUrls = () => {
    if (isIpfsCid) {
      return ipfsGateways.map(gateway => `${gateway}${src}`);
    }
    return [src];
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
  };
  
  // If all gateways failed, show error state
  if (hasError) {
    return (
      <div className={className} style={{ position: 'relative', width, height }}>
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
  if (currentSrc.startsWith('http')) {
    return (
      <div className={className} style={{ position: 'relative', width, height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          loading={lazy ? 'lazy' : 'eager'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={handleImageError}
        />
      </div>
    );
  }
  
  // For local images, use Next.js Image component
  return (
    <div className={className} style={{ position: 'relative', width, height }}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        quality={quality}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={handleImageError as any}
      />
    </div>
  );
};

export default OptimizedImage;