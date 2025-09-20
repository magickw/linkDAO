import { MediaFile } from '../types/enhancedPost';

export interface MediaProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  enableWatermark?: boolean;
  watermarkText?: string;
  enableCompression?: boolean;
}

export interface ImageEditingOptions {
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  blur?: number; // 0 to 10
  sharpen?: number; // 0 to 10
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rotate?: number; // degrees
  flip?: 'horizontal' | 'vertical' | 'both';
}

export interface ProcessingResult {
  success: boolean;
  processedFile?: File;
  processedPreview?: string;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  error?: string;
}

class MediaProcessingService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Process and optimize media file
   */
  async processMedia(
    file: File,
    options: MediaProcessingOptions = {}
  ): Promise<ProcessingResult> {
    try {
      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
        format = 'jpeg',
        enableCompression = true
      } = options;

      if (!file.type.startsWith('image/')) {
        // For non-image files, just return as-is for now
        return {
          success: true,
          processedFile: file,
          processedPreview: URL.createObjectURL(file),
          originalSize: file.size,
          processedSize: file.size,
          compressionRatio: 1
        };
      }

      const image = await this.loadImage(file);
      const { width, height } = this.calculateDimensions(
        image.width,
        image.height,
        maxWidth,
        maxHeight
      );

      // Set canvas dimensions
      this.canvas.width = width;
      this.canvas.height = height;

      // Clear canvas
      this.ctx.clearRect(0, 0, width, height);

      // Draw image
      this.ctx.drawImage(image, 0, 0, width, height);

      // Apply watermark if enabled
      if (options.enableWatermark && options.watermarkText) {
        this.applyWatermark(options.watermarkText);
      }

      // Convert to blob
      const blob = await this.canvasToBlob(format, quality);
      const processedFile = new File([blob], file.name, {
        type: `image/${format}`,
        lastModified: Date.now()
      });

      const processedPreview = URL.createObjectURL(blob);
      const compressionRatio = file.size / blob.size;

      return {
        success: true,
        processedFile,
        processedPreview,
        originalSize: file.size,
        processedSize: blob.size,
        compressionRatio
      };
    } catch (error) {
      console.error('Media processing error:', error);
      return {
        success: false,
        originalSize: file.size,
        processedSize: file.size,
        compressionRatio: 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Apply image editing effects
   */
  async editImage(
    file: File,
    options: ImageEditingOptions
  ): Promise<ProcessingResult> {
    try {
      const image = await this.loadImage(file);
      
      // Set canvas to original image size
      this.canvas.width = image.width;
      this.canvas.height = image.height;
      
      // Clear canvas
      this.ctx.clearRect(0, 0, image.width, image.height);
      
      // Apply transformations
      this.ctx.save();
      
      // Handle rotation
      if (options.rotate) {
        const centerX = image.width / 2;
        const centerY = image.height / 2;
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate((options.rotate * Math.PI) / 180);
        this.ctx.translate(-centerX, -centerY);
      }
      
      // Handle flipping
      if (options.flip) {
        const scaleX = options.flip === 'horizontal' || options.flip === 'both' ? -1 : 1;
        const scaleY = options.flip === 'vertical' || options.flip === 'both' ? -1 : 1;
        this.ctx.scale(scaleX, scaleY);
        
        if (scaleX === -1) this.ctx.translate(-image.width, 0);
        if (scaleY === -1) this.ctx.translate(0, -image.height);
      }
      
      // Draw image
      this.ctx.drawImage(image, 0, 0);
      this.ctx.restore();
      
      // Apply filters
      this.applyImageFilters(options);
      
      // Handle cropping
      if (options.crop) {
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d')!;
        
        croppedCanvas.width = options.crop.width;
        croppedCanvas.height = options.crop.height;
        
        croppedCtx.drawImage(
          this.canvas,
          options.crop.x,
          options.crop.y,
          options.crop.width,
          options.crop.height,
          0,
          0,
          options.crop.width,
          options.crop.height
        );
        
        // Replace main canvas with cropped version
        this.canvas.width = options.crop.width;
        this.canvas.height = options.crop.height;
        this.ctx.clearRect(0, 0, options.crop.width, options.crop.height);
        this.ctx.drawImage(croppedCanvas, 0, 0);
      }
      
      // Convert to blob
      const blob = await this.canvasToBlob('png', 1.0);
      const processedFile = new File([blob], file.name, {
        type: 'image/png',
        lastModified: Date.now()
      });
      
      const processedPreview = URL.createObjectURL(blob);
      
      return {
        success: true,
        processedFile,
        processedPreview,
        originalSize: file.size,
        processedSize: blob.size,
        compressionRatio: file.size / blob.size
      };
    } catch (error) {
      console.error('Image editing error:', error);
      return {
        success: false,
        originalSize: file.size,
        processedSize: file.size,
        compressionRatio: 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate thumbnail for media file
   */
  async generateThumbnail(
    file: File,
    size: number = 200
  ): Promise<string | null> {
    try {
      if (file.type.startsWith('image/')) {
        const image = await this.loadImage(file);
        const { width, height } = this.calculateDimensions(
          image.width,
          image.height,
          size,
          size
        );

        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(image, 0, 0, width, height);

        return this.canvas.toDataURL('image/jpeg', 0.7);
      } else if (file.type.startsWith('video/')) {
        return this.generateVideoThumbnail(file);
      }
      
      return null;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      return null;
    }
  }

  /**
   * Extract metadata from media file
   */
  async extractMetadata(file: File): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified)
    };

    try {
      if (file.type.startsWith('image/')) {
        const image = await this.loadImage(file);
        metadata.width = image.width;
        metadata.height = image.height;
        metadata.aspectRatio = image.width / image.height;
      } else if (file.type.startsWith('video/')) {
        const video = await this.loadVideo(file);
        metadata.width = video.videoWidth;
        metadata.height = video.videoHeight;
        metadata.duration = video.duration;
        metadata.aspectRatio = video.videoWidth / video.videoHeight;
      }
    } catch (error) {
      console.error('Metadata extraction error:', error);
    }

    return metadata;
  }

  /**
   * Validate media file
   */
  validateMedia(file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
    maxWidth?: number;
    maxHeight?: number;
  } = {}): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const {
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
      maxWidth = 4096,
      maxHeight = 4096
    } = options;

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not supported');
    }

    // Additional validation would require loading the file
    // For now, we'll do basic validation

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Private helper methods

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private loadVideo(file: File): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => resolve(video);
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  private applyWatermark(text: string): void {
    const fontSize = Math.min(this.canvas.width, this.canvas.height) * 0.05;
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';

    const x = this.canvas.width - 20;
    const y = this.canvas.height - 20;

    this.ctx.strokeText(text, x, y);
    this.ctx.fillText(text, x, y);
  }

  private applyImageFilters(options: ImageEditingOptions): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply brightness
      if (options.brightness !== undefined) {
        const brightness = options.brightness * 2.55; // Convert to 0-255 range
        r = Math.max(0, Math.min(255, r + brightness));
        g = Math.max(0, Math.min(255, g + brightness));
        b = Math.max(0, Math.min(255, b + brightness));
      }

      // Apply contrast
      if (options.contrast !== undefined) {
        const contrast = (options.contrast + 100) / 100;
        r = Math.max(0, Math.min(255, ((r - 128) * contrast) + 128));
        g = Math.max(0, Math.min(255, ((g - 128) * contrast) + 128));
        b = Math.max(0, Math.min(255, ((b - 128) * contrast) + 128));
      }

      // Apply saturation
      if (options.saturation !== undefined) {
        const saturation = (options.saturation + 100) / 100;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = Math.max(0, Math.min(255, gray + saturation * (r - gray)));
        g = Math.max(0, Math.min(255, gray + saturation * (g - gray)));
        b = Math.max(0, Math.min(255, gray + saturation * (b - gray)));
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private canvasToBlob(format: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        `image/${format}`,
        quality
      );
    });
  }

  private async generateVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        video.currentTime = Math.min(1, video.duration / 2); // Seek to middle or 1 second
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };

      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }
}

export const mediaProcessingService = new MediaProcessingService();