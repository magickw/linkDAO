import React from 'react';
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
  // Handle IPFS CIDs
  const isIpfsCid = src.startsWith('Qm') || src.startsWith('baf');
  const finalSrc = isIpfsCid ? `https://gateway.pinata.cloud/ipfs/${src}` : src;

  // Handle external URLs by using img tag with loading optimization
  if (finalSrc.startsWith('http')) {
    return (
      <div className={className} style={{ position: 'relative', width, height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={finalSrc}
          alt={alt}
          width={width}
          height={height}
          loading={lazy ? 'lazy' : 'eager'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={onError}
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
        onError={onError as any}
      />
    </div>
  );
};

export default OptimizedImage;