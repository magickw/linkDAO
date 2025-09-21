/**
 * Thumbnail Generation Service
 * Handles thumbnail generation for links, images, and videos
 */

export interface ThumbnailData {
  url: string;
  width?: number;
  height?: number;
  type: 'image' | 'video' | 'link' | 'fallback';
  title?: string;
  description?: string;
  siteName?: string;
  error?: string;
}

export interface MediaMetadata {
  type: 'image' | 'video' | 'link';
  url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  siteName?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
}

class ThumbnailService {
  private cache = new Map<string, ThumbnailData>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate thumbnail for various media types
   */
  async generateThumbnail(url: string, type?: 'image' | 'video' | 'link'): Promise<ThumbnailData> {
    // Check cache first
    const cached = this.getCachedThumbnail(url);
    if (cached) {
      return cached;
    }

    try {
      let thumbnailData: ThumbnailData;

      // Auto-detect type if not provided
      if (!type) {
        type = this.detectMediaType(url);
      }

      switch (type) {
        case 'image':
          thumbnailData = await this.generateImageThumbnail(url);
          break;
        case 'video':
          thumbnailData = await this.generateVideoThumbnail(url);
          break;
        case 'link':
          thumbnailData = await this.generateLinkThumbnail(url);
          break;
        default:
          thumbnailData = this.getFallbackThumbnail(url, type);
      }

      // Cache the result
      this.cacheThumbnail(url, thumbnailData);
      return thumbnailData;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      const fallback = this.getFallbackThumbnail(url, type, error instanceof Error ? error.message : 'Unknown error');
      this.cacheThumbnail(url, fallback);
      return fallback;
    }
  }

  /**
   * Generate thumbnail for image URLs
   */
  private async generateImageThumbnail(url: string): Promise<ThumbnailData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // For images, the thumbnail is the image itself
          // In a real implementation, you might resize it
          resolve({
            url: url,
            width: img.naturalWidth,
            height: img.naturalHeight,
            type: 'image'
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Set a timeout for loading
      setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 10000);

      img.src = url;
    });
  }

  /**
   * Generate thumbnail for video URLs
   */
  private async generateVideoThumbnail(url: string): Promise<ThumbnailData> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        try {
          // Seek to 10% of the video duration for thumbnail
          video.currentTime = Math.min(video.duration * 0.1, 10);
        } catch (error) {
          reject(error);
        }
      };

      video.onseeked = () => {
        try {
          // Create canvas to capture frame
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          ctx.drawImage(video, 0, 0);
          
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          resolve({
            url: thumbnailUrl,
            width: video.videoWidth,
            height: video.videoHeight,
            type: 'video'
          });
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      // Set a timeout for loading
      setTimeout(() => {
        reject(new Error('Video load timeout'));
      }, 15000);

      video.src = url;
    });
  }

  /**
   * Generate thumbnail for link URLs using Open Graph data
   */
  private async generateLinkThumbnail(url: string): Promise<ThumbnailData> {
    try {
      // In a real implementation, this would call a backend service
      // that fetches and parses Open Graph meta tags
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch link preview');
      }

      const data = await response.json();
      
      return {
        url: data.image || this.getDefaultLinkThumbnail(),
        width: data.imageWidth,
        height: data.imageHeight,
        type: 'link',
        title: data.title,
        description: data.description,
        siteName: data.siteName
      };
    } catch (error) {
      // Fallback to domain favicon or default
      return this.getFallbackThumbnail(url, 'link', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Detect media type from URL
   */
  private detectMediaType(url: string): 'image' | 'video' | 'link' {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;
    const videoExtensions = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)(\?.*)?$/i;

    if (imageExtensions.test(url)) {
      return 'image';
    } else if (videoExtensions.test(url)) {
      return 'video';
    } else {
      return 'link';
    }
  }

  /**
   * Get fallback thumbnail for failed generations
   */
  private getFallbackThumbnail(url: string, type?: string, error?: string): ThumbnailData {
    const fallbackThumbnails = {
      image: '/icons/image-placeholder.svg',
      video: '/icons/video-placeholder.svg',
      link: '/icons/link-placeholder.svg',
      default: '/icons/file-placeholder.svg'
    };

    return {
      url: fallbackThumbnails[type as keyof typeof fallbackThumbnails] || fallbackThumbnails.default,
      type: 'fallback',
      error
    };
  }

  /**
   * Get default link thumbnail (favicon or generic)
   */
  private getDefaultLinkThumbnail(): string {
    return '/icons/link-placeholder.svg';
  }

  /**
   * Cache thumbnail data
   */
  private cacheThumbnail(url: string, data: ThumbnailData): void {
    this.cache.set(url, {
      ...data,
      // Add timestamp for cache expiration
      timestamp: Date.now()
    } as ThumbnailData & { timestamp: number });
  }

  /**
   * Get cached thumbnail if valid
   */
  private getCachedThumbnail(url: string): ThumbnailData | null {
    const cached = this.cache.get(url) as (ThumbnailData & { timestamp: number }) | undefined;
    
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(url);
      return null;
    }

    // Remove timestamp before returning
    const { timestamp, ...thumbnailData } = cached;
    return thumbnailData;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Preload thumbnails for multiple URLs
   */
  async preloadThumbnails(urls: string[]): Promise<ThumbnailData[]> {
    const promises = urls.map(url => this.generateThumbnail(url));
    return Promise.allSettled(promises).then(results =>
      results.map((result, index) =>
        result.status === 'fulfilled'
          ? result.value
          : this.getFallbackThumbnail(urls[index], undefined, 'Preload failed')
      )
    );
  }

  /**
   * Extract media metadata from URL
   */
  async extractMediaMetadata(url: string): Promise<MediaMetadata> {
    const type = this.detectMediaType(url);
    const thumbnail = await this.generateThumbnail(url, type);

    const metadata: MediaMetadata = {
      type,
      url,
      thumbnail: thumbnail.url,
      title: thumbnail.title,
      description: thumbnail.description,
      siteName: thumbnail.siteName,
      width: thumbnail.width,
      height: thumbnail.height
    };

    // Add additional metadata for videos
    if (type === 'video') {
      try {
        const videoMetadata = await this.getVideoMetadata(url);
        metadata.duration = videoMetadata.duration;
        metadata.size = videoMetadata.size;
      } catch (error) {
        console.warn('Failed to get video metadata:', error);
      }
    }

    return metadata;
  }

  /**
   * Get video metadata
   */
  private async getVideoMetadata(url: string): Promise<{ duration: number; size?: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;

      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration
        });
      };

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };

      setTimeout(() => {
        reject(new Error('Video metadata timeout'));
      }, 10000);

      video.src = url;
    });
  }
}

export const thumbnailService = new ThumbnailService();