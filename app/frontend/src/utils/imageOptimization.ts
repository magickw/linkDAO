/**
 * Image Optimization Utilities for S3/CloudFront Integration
 * Handles auto-optimization, lazy loading, and CDN delivery
 */

interface ImageOptimizationConfig {
  cdnBaseUrl: string;
  s3Bucket: string;
  cloudFrontDistribution: string;
  enableWebP: boolean;
  enableAVIF: boolean;
  qualitySettings: {
    thumbnail: number;
    medium: number;
    large: number;
    original: number;
  };
}

const config: ImageOptimizationConfig = {
  cdnBaseUrl: process.env.NEXT_PUBLIC_CDN_BASE_URL || 'https://d1234567890.cloudfront.net',
  s3Bucket: process.env.NEXT_PUBLIC_S3_BUCKET || 'linkdao-marketplace-assets',
  cloudFrontDistribution: process.env.NEXT_PUBLIC_CLOUDFRONT_DISTRIBUTION || 'd1234567890',
  enableWebP: true,
  enableAVIF: true,
  qualitySettings: {
    thumbnail: 70,
    medium: 80,
    large: 85,
    original: 95,
  },
};

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
}

export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

const sizePresets: Record<ImageSize, { width: number; height: number; quality: number }> = {
  thumbnail: { width: 150, height: 150, quality: config.qualitySettings.thumbnail },
  small: { width: 300, height: 300, quality: config.qualitySettings.medium },
  medium: { width: 600, height: 400, quality: config.qualitySettings.medium },
  large: { width: 1200, height: 800, quality: config.qualitySettings.large },
  original: { width: 0, height: 0, quality: config.qualitySettings.original },
};

/**
 * Generate optimized image URL with CloudFront transformations
 */
export const getOptimizedImageUrl = (
  imagePath: string,
  options: ImageTransformOptions = {}
): string => {
  if (!imagePath) return '';
  
  // Handle external URLs
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  
  // Build transformation parameters
  const params = new URLSearchParams();
  
  if (options.width) params.append('w', options.width.toString());
  if (options.height) params.append('h', options.height.toString());
  if (options.quality) params.append('q', options.quality.toString());
  if (options.format && options.format !== 'auto') params.append('f', options.format);
  if (options.fit) params.append('fit', options.fit);
  if (options.position) params.append('pos', options.position);
  if (options.blur) params.append('blur', options.blur.toString());
  if (options.sharpen) params.append('sharpen', '1');
  if (options.grayscale) params.append('grayscale', '1');

  // Auto-detect best format based on browser support
  if (!options.format || options.format === 'auto') {
    if (config.enableAVIF && typeof window !== 'undefined') {
      // Check AVIF support
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const avifSupported = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
      if (avifSupported) {
        params.append('f', 'avif');
      } else if (config.enableWebP) {
        params.append('f', 'webp');
      }
    } else if (config.enableWebP) {
      params.append('f', 'webp');
    }
  }

  const queryString = params.toString();
  const separator = queryString ? '?' : '';
  
  return `${config.cdnBaseUrl}/${cleanPath}${separator}${queryString}`;
};

/**
 * Generate responsive image URLs for different screen sizes
 */
export const getResponsiveImageUrls = (
  imagePath: string,
  baseOptions: ImageTransformOptions = {}
): Record<string, string> => {
  return {
    '320w': getOptimizedImageUrl(imagePath, { ...baseOptions, width: 320 }),
    '640w': getOptimizedImageUrl(imagePath, { ...baseOptions, width: 640 }),
    '768w': getOptimizedImageUrl(imagePath, { ...baseOptions, width: 768 }),
    '1024w': getOptimizedImageUrl(imagePath, { ...baseOptions, width: 1024 }),
    '1280w': getOptimizedImageUrl(imagePath, { ...baseOptions, width: 1280 }),
    '1920w': getOptimizedImageUrl(imagePath, { ...baseOptions, width: 1920 }),
  };
};

/**
 * Generate srcSet string for responsive images
 */
export const generateSrcSet = (
  imagePath: string,
  baseOptions: ImageTransformOptions = {}
): string => {
  const urls = getResponsiveImageUrls(imagePath, baseOptions);
  return Object.entries(urls)
    .map(([size, url]) => `${url} ${size}`)
    .join(', ');
};

/**
 * Get preset image URL for common sizes
 */
export const getPresetImageUrl = (
  imagePath: string,
  size: ImageSize,
  additionalOptions: Partial<ImageTransformOptions> = {}
): string => {
  const preset = sizePresets[size];
  const options: ImageTransformOptions = {
    ...preset,
    ...additionalOptions,
  };

  // Don't apply dimensions for original size unless explicitly provided
  if (size === 'original' && !additionalOptions.width && !additionalOptions.height) {
    delete options.width;
    delete options.height;
  }

  return getOptimizedImageUrl(imagePath, options);
};

/**
 * Preload critical images
 */
export const preloadImage = (
  imagePath: string,
  options: ImageTransformOptions = {},
  priority: 'high' | 'low' = 'low'
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
    
    // Set fetchpriority for modern browsers
    if ('fetchPriority' in img) {
      (img as any).fetchPriority = priority;
    }
    
    img.src = getOptimizedImageUrl(imagePath, options);
  });
};

/**
 * Batch preload multiple images
 */
export const preloadImages = async (
  images: Array<{ path: string; options?: ImageTransformOptions; priority?: 'high' | 'low' }>
): Promise<void> => {
  const preloadPromises = images.map(({ path, options = {}, priority = 'low' }) =>
    preloadImage(path, options, priority)
  );

  try {
    await Promise.allSettled(preloadPromises);
  } catch (error) {
    console.warn('Some images failed to preload:', error);
  }
};

/**
 * Generate placeholder blur data URL
 */
export const generatePlaceholderDataUrl = (
  width: number = 400,
  height: number = 300,
  color: string = '#1f2937'
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, adjustBrightness(color, -20));
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add subtle pattern
  ctx.fillStyle = adjustBrightness(color, 10);
  for (let i = 0; i < width; i += 20) {
    for (let j = 0; j < height; j += 20) {
      if ((i + j) % 40 === 0) {
        ctx.fillRect(i, j, 10, 10);
      }
    }
  }
  
  return canvas.toDataURL('image/jpeg', 0.1);
};

/**
 * Adjust color brightness
 */
const adjustBrightness = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Image upload utilities for S3
 */
export interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
}

export const uploadImageToS3 = async (
  file: File,
  options: UploadOptions = {}
): Promise<{ url: string; key: string; cdnUrl: string }> => {
  const {
    folder = 'products',
    filename = `${Date.now()}-${file.name}`,
    contentType = file.type,
    metadata = {},
    tags = {},
  } = options;

  const key = folder ? `${folder}/${filename}` : filename;

  // This would typically use AWS SDK or a signed upload URL
  // For now, return a mock response
  const mockS3Url = `https://${config.s3Bucket}.s3.amazonaws.com/${key}`;
  const mockCdnUrl = getOptimizedImageUrl(key);

  // In a real implementation, you would:
  // 1. Get signed upload URL from your backend
  // 2. Upload file directly to S3
  // 3. Return the S3 URL and CDN URL

  return {
    url: mockS3Url,
    key,
    cdnUrl: mockCdnUrl,
  };
};

/**
 * Delete image from S3
 */
export const deleteImageFromS3 = async (key: string): Promise<void> => {
  // This would typically use AWS SDK to delete the object
  // Implementation depends on your backend setup
  console.log(`Would delete image with key: ${key}`);
};

/**
 * Get image metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  aspectRatio: number;
}

export const getImageMetadata = (file: File): Promise<ImageMetadata> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: file.type,
        size: file.size,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      });
    };
    
    img.onerror = () => reject(new Error('Failed to load image for metadata'));
    
    img.src = URL.createObjectURL(file);
  });
};

export default {
  getOptimizedImageUrl,
  getResponsiveImageUrls,
  generateSrcSet,
  getPresetImageUrl,
  preloadImage,
  preloadImages,
  generatePlaceholderDataUrl,
  uploadImageToS3,
  deleteImageFromS3,
  getImageMetadata,
};