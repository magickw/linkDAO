import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ExternalLink, Image as ImageIcon, Film, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { thumbnailService, ThumbnailData, MediaMetadata } from '@/services/thumbnailService';

interface MediaPreviewProps {
  url: string;
  type?: 'image' | 'video' | 'link';
  lazy?: boolean;
  className?: string;
  onClick?: () => void;
  showPlayButton?: boolean;
  showLinkIcon?: boolean;
}

export default function MediaPreview({
  url,
  type,
  lazy = true,
  className = '',
  onClick,
  showPlayButton = true,
  showLinkIcon = true
}: MediaPreviewProps) {
  const [thumbnail, setThumbnail] = useState<ThumbnailData | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(!lazy);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || isVisible) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, isVisible]);

  // Generate thumbnail when visible
  useEffect(() => {
    if (!isVisible || !url) return;

    const generateThumbnail = async () => {
      setLoading(true);
      setError(null);

      try {
        const [thumbnailData, metadataData] = await Promise.all([
          thumbnailService.generateThumbnail(url, type),
          thumbnailService.extractMediaMetadata(url)
        ]);

        setThumbnail(thumbnailData);
        setMetadata(metadataData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load media';
        setError(errorMessage);
        setThumbnail({
          url: '/icons/error-placeholder.svg',
          type: 'fallback',
          error: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };

    generateThumbnail();
  }, [isVisible, url, type]);

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Handle image error
  const handleImageError = () => {
    setError('Failed to load image');
    setImageLoaded(true);
  };

  // Format duration for videos
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get media type icon
  const getMediaTypeIcon = () => {
    switch (metadata?.type || type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Film className="w-4 h-4" />;
      case 'link':
        return <LinkIcon className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg aspect-video flex items-center justify-center">
      <div className="text-gray-400 dark:text-gray-500">
        {getMediaTypeIcon()}
      </div>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg aspect-video flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600">
      <AlertCircle className="w-8 h-8 mb-2" />
      <span className="text-sm text-center px-4">
        {error || 'Failed to load media'}
      </span>
    </div>
  );

  // Render image preview
  const renderImagePreview = () => (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <motion.img
        src={thumbnail!.url}
        alt={metadata?.title || 'Media preview'}
        className={`w-full h-auto rounded-lg object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        initial={{ opacity: 0 }}
        animate={{ opacity: imageLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      {!imageLoaded && renderSkeleton()}
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg"
        >
          <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </motion.div>
      </div>
    </div>
  );

  // Render video preview
  const renderVideoPreview = () => (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <motion.img
        src={thumbnail!.url}
        alt={metadata?.title || 'Video preview'}
        className={`w-full h-auto rounded-lg object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        initial={{ opacity: 0 }}
        animate={{ opacity: imageLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      {!imageLoaded && renderSkeleton()}
      
      {/* Video overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center">
        {showPlayButton && (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="bg-black bg-opacity-70 rounded-full p-3 text-white"
          >
            <Play className="w-6 h-6 ml-1" fill="currentColor" />
          </motion.div>
        )}
      </div>
      
      {/* Duration badge */}
      {metadata?.duration && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(metadata.duration)}
        </div>
      )}
    </div>
  );

  // Render link preview
  const renderLinkPreview = () => (
    <div 
      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex">
        {/* Thumbnail */}
        {thumbnail && thumbnail.url && thumbnail.type !== 'fallback' && (
          <div className="w-24 h-24 flex-shrink-0">
            <img
              src={thumbnail.url}
              alt={metadata?.title || 'Link preview'}
              className="w-full h-full object-cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {metadata?.title && (
                <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
                  {metadata.title}
                </h4>
              )}
              
              {metadata?.description && (
                <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2 mb-2">
                  {metadata.description}
                </p>
              )}
              
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
                {showLinkIcon && <LinkIcon className="w-3 h-3 mr-1" />}
                <span className="truncate">
                  {metadata?.siteName || new URL(url).hostname}
                </span>
              </div>
            </div>
            
            <ExternalLink className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`${className}`}>
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderSkeleton()}
          </motion.div>
        )}
        
        {error && !thumbnail && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderError()}
          </motion.div>
        )}
        
        {thumbnail && !loading && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {metadata?.type === 'image' && renderImagePreview()}
            {metadata?.type === 'video' && renderVideoPreview()}
            {metadata?.type === 'link' && renderLinkPreview()}
            {!metadata?.type && thumbnail.type === 'fallback' && renderError()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}