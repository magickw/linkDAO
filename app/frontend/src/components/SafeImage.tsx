import React, { useState, useCallback } from 'react';
import { useAvatarImage } from '../hooks/usePlaceholder';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallbackName?: string;
  size?: number;
  isAvatar?: boolean;
}

/**
 * Safe image component that handles loading errors and placeholder conversion
 */
export function SafeImage({ 
  src, 
  fallbackName, 
  size = 40, 
  isAvatar = false,
  onError,
  ...props 
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const fallbackSrc = useAvatarImage(hasError ? undefined : src, fallbackName, size);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    onError?.(event);
  }, [onError]);

  return (
    <img
      {...props}
      src={fallbackSrc}
      onError={handleError}
      loading="lazy"
    />
  );
}

/**
 * Specialized avatar component
 */
export function SafeAvatar({
  src,
  name,
  size = 40,
  className = '',
  ...props
}: {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'className'>) {
  return (
    <SafeImage
      src={src}
      fallbackName={name}
      size={size}
      isAvatar={true}
      className={`rounded-full ${className}`}
      {...props}
    />
  );
}