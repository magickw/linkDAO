/**
 * Image Optimization Service
 * Handles image optimization for community content
 */

interface ImageOptimizationOptions {
  width: number;
  height: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
}

interface OptimizedImageResult {
  url: string;
  width: number;
  height: number;
  format: string;
  size?: number;
}

class ImageOptimizationService {
  private cache = new Map<string, OptimizedImageResult>();

  /**
   * Optimize an image with the given parameters
   */
  async optimizeImage(
    originalUrl: string, 
    options: ImageOptimizationOptions
  ): Promise<string> {
    const cacheKey = `${originalUrl}_${options.width}x${options.height}_${options.quality}_${options.format}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.url;
    }

    try {
      // For now, use a simple URL parameter approach
      // In production, this would integrate with a proper image optimization service
      // like Cloudinary, ImageKit, or a custom service
      const optimizedUrl = this.buildOptimizedUrl(originalUrl, options);
      
      // Cache the result
      this.cache.set(cacheKey, {
        url: optimizedUrl,
        width: options.width,
        height: options.height,
        format: options.format
      });

      return optimizedUrl;
    } catch (error) {
      console.error('Error optimizing image:', error);
      // Fallback to original URL if optimization fails
      return originalUrl;
    }
  }

  /**
   * Build optimized URL with parameters
   * This is a basic implementation - in production you'd use a proper service
   */
  private buildOptimizedUrl(originalUrl: string, options: ImageOptimizationOptions): string {
    // Check if it's already an optimized URL to avoid double optimization
    if (originalUrl.includes('w=') || originalUrl.includes('width=')) {
      return originalUrl;
    }

    // For external URLs, try to use their optimization parameters if available
    if (originalUrl.includes('unsplash.com')) {
      return `${originalUrl}?w=${options.width}&h=${options.height}&q=${options.quality}&fm=${options.format}&fit=crop`;
    }
    
    if (originalUrl.includes('cloudinary.com')) {
      // Cloudinary URL transformation
      const parts = originalUrl.split('/upload/');
      if (parts.length === 2) {
        return `${parts[0]}/upload/w_${options.width},h_${options.height},q_${options.quality},f_${options.format},c_fill/${parts[1]}`;
      }
    }

    // For other URLs, append query parameters (works with many CDNs)
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}w=${options.width}&h=${options.height}&q=${options.quality}&f=${options.format}`;
  }

  /**
   * Preload an optimized image
   */
  async preloadImage(url: string, options: ImageOptimizationOptions): Promise<void> {
    const optimizedUrl = await this.optimizeImage(url, options);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to preload image: ${optimizedUrl}`));
      img.src = optimizedUrl;
    });
  }

  /**
   * Get responsive image URLs for different screen sizes
   */
  async getResponsiveUrls(originalUrl: string, sizes: number[]): Promise<{ [key: string]: string }> {
    const urls: { [key: string]: string } = {};
    
    for (const size of sizes) {
      const options: ImageOptimizationOptions = {
        width: size,
        height: Math.round(size * 0.75), // 4:3 aspect ratio
        quality: 80,
        format: 'webp'
      };
      
      urls[`${size}w`] = await this.optimizeImage(originalUrl, options);
    }
    
    return urls;
  }

  /**
   * Clear the optimization cache
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
}

export const imageOptimizationService = new ImageOptimizationService();
export default imageOptimizationService;