import React, { useState, useRef, useId } from 'react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { 
  UserGroupIcon, 
  EyeIcon, 
  PhotoIcon,
  CheckIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { useAccessibilityContext } from '@/components/Accessibility/AccessibilityProvider';

// Types based on design document
interface Community {
  id: string;
  name: string;
  displayName: string;
  description: string;
  bannerImage?: string;
  avatarImage?: string;
  memberCount: number;
  onlineCount: number;
  createdAt: Date;
  isJoined: boolean;
  canModerate: boolean;
}

interface CommunityHeaderProps {
  community: Community;
  isJoined: boolean;
  onJoinToggle: () => void;
  onBannerUpload?: (file: File) => void;
  canModerate: boolean;
  loading?: boolean;
}

const CommunityHeader: React.FC<CommunityHeaderProps> = ({
  community,
  isJoined,
  onJoinToggle,
  onBannerUpload,
  canModerate,
  loading = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Accessibility hooks
  const { announceToScreenReader, generateId } = useAccessibilityContext();
  const headerId = useId();
  const bannerUploadId = generateId('banner-upload');

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onBannerUpload) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      announceToScreenReader('Error: Please select an image file', 'assertive');
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      announceToScreenReader('Error: Image must be smaller than 5MB', 'assertive');
      alert('Image must be smaller than 5MB');
      return;
    }

    setIsUploading(true);
    announceToScreenReader('Uploading banner image...');
    
    try {
      await onBannerUpload(file);
      announceToScreenReader('Banner uploaded successfully');
    } catch (error) {
      console.error('Banner upload failed:', error);
      announceToScreenReader('Banner upload failed. Please try again.', 'assertive');
      alert('Failed to upload banner. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerBannerUpload = () => {
    fileInputRef.current?.click();
  };

  const formatMemberCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const generateGradientBackground = (communityName: string): string => {
    // Generate a consistent gradient based on community name
    const hash = communityName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 60) % 360;
    
    return `linear-gradient(135deg, hsl(${hue1}, 70%, 60%) 0%, hsl(${hue2}, 70%, 40%) 100%)`;
  };

  return (
    <header 
      id={headerId}
      className="relative w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
      role="banner"
      aria-labelledby={`${headerId}-title`}
    >
      {/* Banner Section */}
      <div 
        className="relative h-32 sm:h-40 md:h-48 overflow-hidden"
        role="img"
        aria-label={community.bannerImage ? `${community.displayName} community banner` : `${community.displayName} community gradient background`}
      >
        {community.bannerImage ? (
          <img
            src={community.bannerImage}
            alt={`${community.displayName} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: generateGradientBackground(community.name) }}
            aria-hidden="true"
          />
        )}
        
        {/* Banner Upload Button for Moderators */}
        {canModerate && onBannerUpload && (
          <div className="absolute top-4 right-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={triggerBannerUpload}
              disabled={isUploading}
              className="bg-black/50 hover:bg-black/70 text-white border-0"
              aria-describedby={bannerUploadId}
              aria-label={isUploading ? 'Uploading banner image' : 'Change community banner image'}
            >
              <PhotoIcon className="w-4 h-4 mr-2" aria-hidden="true" />
              {isUploading ? 'Uploading...' : 'Change Banner'}
            </Button>
            <input
              ref={fileInputRef}
              id={bannerUploadId}
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="sr-only"
              aria-label="Upload banner image file"
            />
          </div>
        )}
      </div>

      {/* Community Info Section */}
      <div className="relative px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          {/* Left Side - Community Info */}
          <div className="flex items-end gap-4">
            {/* Community Avatar */}
            <div className="relative -mt-8 sm:-mt-12">
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 overflow-hidden"
                role="img"
                aria-label={community.avatarImage ? `${community.displayName} community avatar` : `${community.displayName} default avatar`}
              >
                {community.avatarImage ? (
                  <img
                    src={community.avatarImage}
                    alt={`${community.displayName} avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <UserGroupIcon className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>

            {/* Community Details */}
            <div className="flex-1 min-w-0 pt-2">
              <h1 
                id={`${headerId}-title`}
                className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate"
              >
                {community.displayName}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                r/{community.name}
              </p>
              
              {/* Member Stats */}
              <div 
                className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400"
                role="group"
                aria-label="Community statistics"
              >
                <div className="flex items-center gap-1">
                  <UserGroupIcon className="w-4 h-4" aria-hidden="true" />
                  <span aria-label={`${community.memberCount} total members`}>
                    {formatMemberCount(community.memberCount)} members
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 bg-green-500 rounded-full" 
                    aria-hidden="true"
                    role="img"
                    aria-label="Online indicator"
                  ></div>
                  <span aria-label={`${community.onlineCount} members currently online`}>
                    {formatMemberCount(community.onlineCount)} online
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Join Button */}
          <div className="flex-shrink-0">
            <Button
              onClick={() => {
                onJoinToggle();
                announceToScreenReader(
                  isJoined 
                    ? `Left ${community.displayName} community` 
                    : `Joined ${community.displayName} community`
                );
              }}
              disabled={loading}
              variant={isJoined ? "outline" : "default"}
              size="lg"
              className={cn(
                "min-w-[120px] transition-all duration-200",
                isJoined 
                  ? "hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:border-red-700 dark:hover:text-red-400" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
              aria-pressed={isJoined}
              aria-label={
                loading 
                  ? 'Processing membership change' 
                  : isJoined 
                    ? `Leave ${community.displayName} community` 
                    : `Join ${community.displayName} community`
              }
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" 
                    aria-hidden="true"
                  />
                  <span>Loading...</span>
                </div>
              ) : isJoined ? (
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4" aria-hidden="true" />
                  <span>Joined</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="w-4 h-4" aria-hidden="true" />
                  <span>Join</span>
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Community Description */}
        {community.description && (
          <div className="mt-4 max-w-3xl">
            <p 
              className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed"
              aria-label="Community description"
            >
              {community.description}
            </p>
          </div>
        )}
      </div>
    </header>
  );
};

export default CommunityHeader;