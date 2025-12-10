import React, { useState, useEffect } from 'react';
import { VideoInfo, extractVideoInfo, getVideoEmbedHtml } from '@/utils/videoUtils';
import { Youtube, Play, ExternalLink, X } from 'lucide-react';

interface VideoEmbedProps {
  url: string;
  width?: number;
  height?: number;
  className?: string;
  showPlaceholder?: boolean;
  onVideoLoad?: () => void;
  allowFullscreen?: boolean;
}

const VideoEmbed: React.FC<VideoEmbedProps> = ({
  url,
  width = 560,
  height = 315,
  className = '',
  showPlaceholder = true,
  onVideoLoad,
  allowFullscreen = true
}) => {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPlaceholderState, setShowPlaceholderState] = useState(showPlaceholder);
  const [embedHtml, setEmbedHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const info = extractVideoInfo(url);
    if (info) {
      setVideoInfo(info);
      setEmbedHtml(getVideoEmbedHtml(info, width, height));
      setError(null);
    } else {
      console.error('Invalid video URL provided:', url);
      setError('Invalid video URL');
    }
  }, [url, width, height]);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onVideoLoad) {
      onVideoLoad();
    }
  };

  const handleThumbnailClick = () => {
    setShowPlaceholderState(false);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'vimeo':
        return <Play className="w-4 h-4" />;
      case 'twitch':
        return <Play className="w-4 h-4" />;
      case 'tiktok':
        return <Play className="w-4 h-4" />;
      case 'instagram':
        return <Play className="w-4 h-4" />;
      case 'twitter':
        return <Play className="w-4 h-4" />;
      case 'facebook':
        return <Play className="w-4 h-4" />;
      default:
        return <Play className="w-4 h-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return 'bg-red-600';
      case 'vimeo':
        return 'bg-blue-600';
      case 'twitch':
        return 'bg-purple-600';
      case 'tiktok':
        return 'bg-black';
      case 'instagram':
        return 'bg-gradient-to-br from-purple-600 to-pink-600';
      case 'twitter':
        return 'bg-blue-400';
      case 'facebook':
        return 'bg-blue-700';
      default:
        return 'bg-gray-600';
    }
  };

  if (error) {
    return (
      <div className={`bg-gray-100 border border-gray-300 rounded-lg p-4 ${className}`}>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!videoInfo) {
    return (
      <div className={`bg-gray-100 border border-gray-300 rounded-lg p-4 ${className}`}>
        <p className="text-gray-500 text-sm">Loading video...</p>
      </div>
    );
  }

  if (showPlaceholderState) {
    return (
      <div 
        className={`relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer group ${className}`}
        onClick={handleThumbnailClick}
      >
        <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
          {/* Video thumbnail */}
          {videoInfo.thumbnail ? (
            <img
              src={videoInfo.thumbnail}
              alt={`${videoInfo.platform} video thumbnail`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to default thumbnail if available
                (e.target as HTMLImageElement).src = '';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              {getPlatformIcon(videoInfo.platform)}
            </div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-20 transition-all">
            <div className={`w-16 h-16 ${getPlatformColor(videoInfo.platform)} rounded-full flex items-center justify-center transform hover:scale-110 transition-all`}>
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
          
          {/* Platform branding */}
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            {getPlatformIcon(videoInfo.platform)}
            <span className="capitalize">{videoInfo.platform}</span>
          </div>
        </div>
      </div>
    );
  }

  // Show the actual embedded video
  return (
    <div className={`relative ${className}`}>
      {/* For platforms that need custom embed handling */}
      {videoInfo.platform === 'tiktok' || videoInfo.platform === 'instagram' || videoInfo.platform === 'twitter' || videoInfo.platform === 'facebook' ? (
        <div 
          className="video-embed-container"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
          onLoad={handleLoad}
        />
      ) : (
        // Standard iframe for YouTube, Vimeo, Twitch
        <iframe
          width={width}
          height={height}
          src={videoInfo.embedUrl}
          title={`${videoInfo.platform} video player`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen={allowFullscreen}
          onLoad={handleLoad}
          className="rounded-lg w-full max-w-full"
        />
      )}
      
      {/* Video info overlay */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
        {getPlatformIcon(videoInfo.platform)}
        <span className="capitalize">{videoInfo.platform}</span>
      </div>
    </div>
  );
};

export default VideoEmbed;