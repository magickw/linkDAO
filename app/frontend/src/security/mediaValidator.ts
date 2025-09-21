/**
 * Secure Media Upload Validation with Type, Size, and Content Checking
 * Comprehensive validation for all media uploads in the enhanced social dashboard
 */

export interface MediaValidationConfig {
  maxFileSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  maxDimensions?: { width: number; height: number };
  minDimensions?: { width: number; height: number };
  requireImageOptimization?: boolean;
  scanForMalware?: boolean;
}

export interface MediaValidationResult {
  valid: boolean;
  file?: File;
  errors: string[];
  warnings: string[];
  metadata: {
    size: number;
    type: string;
    dimensions?: { width: number; height: number };
    hash?: string;
  };
}

export interface ProcessedMedia {
  original: File;
  optimized?: Blob;
  thumbnail?: Blob;
  metadata: MediaMetadata;
}

export interface MediaMetadata {
  filename: string;
  size: number;
  type: string;
  dimensions?: { width: number; height: number };
  hash: string;
  uploadedAt: Date;
  processedAt?: Date;
}

export class MediaValidator {
  private static readonly DEFAULT_CONFIG: MediaValidationConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mp3',
      'audio/wav',
      'audio/ogg'
    ],
    allowedExtensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.mp4', '.webm',
      '.mp3', '.wav', '.ogg'
    ],
    maxDimensions: { width: 4096, height: 4096 },
    minDimensions: { width: 32, height: 32 },
    requireImageOptimization: true,
    scanForMalware: true
  };

  private static readonly MALICIOUS_SIGNATURES = [
    // Common malware signatures in hex
    '4D5A', // PE executable
    '7F454C46', // ELF executable
    'CAFEBABE', // Java class file
    'FEEDFACE', // Mach-O binary
    '504B0304', // ZIP file (could contain malware)
    '52617221', // RAR archive
    '377ABCAF271C' // 7-Zip archive
  ];

  /**
   * Validate uploaded media file
   */
  static async validateMedia(
    file: File,
    config: Partial<MediaValidationConfig> = {}
  ): Promise<MediaValidationResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic file validation
      const basicValidation = this.validateBasicProperties(file, finalConfig);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // File type validation
      const typeValidation = await this.validateFileType(file, finalConfig);
      errors.push(...typeValidation.errors);
      warnings.push(...typeValidation.warnings);

      // Content validation
      const contentValidation = await this.validateFileContent(file, finalConfig);
      errors.push(...contentValidation.errors);
      warnings.push(...contentValidation.warnings);

      // Dimension validation for images
      let dimensions: { width: number; height: number } | undefined;
      if (file.type.startsWith('image/')) {
        const dimensionValidation = await this.validateImageDimensions(file, finalConfig);
        errors.push(...dimensionValidation.errors);
        warnings.push(...dimensionValidation.warnings);
        dimensions = dimensionValidation.dimensions;
      }

      // Generate file hash
      const hash = await this.generateFileHash(file);

      const metadata = {
        size: file.size,
        type: file.type,
        dimensions,
        hash
      };

      return {
        valid: errors.length === 0,
        file: errors.length === 0 ? file : undefined,
        errors,
        warnings,
        metadata
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        metadata: {
          size: file.size,
          type: file.type
        }
      };
    }
  }

  /**
   * Process and optimize media file
   */
  static async processMedia(file: File): Promise<ProcessedMedia> {
    const metadata: MediaMetadata = {
      filename: file.name,
      size: file.size,
      type: file.type,
      hash: await this.generateFileHash(file),
      uploadedAt: new Date()
    };

    let optimized: Blob | undefined;
    let thumbnail: Blob | undefined;

    try {
      if (file.type.startsWith('image/')) {
        const imageProcessing = await this.processImage(file);
        optimized = imageProcessing.optimized;
        thumbnail = imageProcessing.thumbnail;
        metadata.dimensions = imageProcessing.dimensions;
      } else if (file.type.startsWith('video/')) {
        const videoProcessing = await this.processVideo(file);
        optimized = videoProcessing.optimized;
        thumbnail = videoProcessing.thumbnail;
      }

      metadata.processedAt = new Date();

      return {
        original: file,
        optimized,
        thumbnail,
        metadata
      };

    } catch (error) {
      console.error('Media processing error:', error);
      return {
        original: file,
        metadata
      };
    }
  }

  /**
   * Validate basic file properties
   */
  private static validateBasicProperties(
    file: File,
    config: MediaValidationConfig
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // File size validation
    if (file.size > config.maxFileSize) {
      errors.push(`File size ${this.formatFileSize(file.size)} exceeds maximum allowed size ${this.formatFileSize(config.maxFileSize)}`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    // File name validation
    if (!file.name || file.name.trim() === '') {
      errors.push('File name is required');
    }

    if (file.name.length > 255) {
      warnings.push('File name is very long and may be truncated');
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|pif|com)$/i,
      /\.(js|vbs|jar|app)$/i,
      /\.(php|asp|jsp|cgi)$/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('File type not allowed for security reasons');
    }

    return { errors, warnings };
  }

  /**
   * Validate file type and extension
   */
  private static async validateFileType(
    file: File,
    config: MediaValidationConfig
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // MIME type validation
    if (!config.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Extension validation
    const extension = this.getFileExtension(file.name);
    if (!config.allowedExtensions.includes(extension.toLowerCase())) {
      errors.push(`File extension ${extension} is not allowed`);
    }

    // Verify MIME type matches file content
    try {
      const actualType = await this.detectActualFileType(file);
      if (actualType && actualType !== file.type) {
        warnings.push(`File type mismatch: declared as ${file.type}, detected as ${actualType}`);
      }
    } catch (error) {
      warnings.push('Could not verify file type');
    }

    return { errors, warnings };
  }

  /**
   * Validate file content for malicious patterns
   */
  private static async validateFileContent(
    file: File,
    config: MediaValidationConfig
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.scanForMalware) {
      return { errors, warnings };
    }

    try {
      // Read first 1KB of file for signature analysis
      const buffer = await this.readFileBuffer(file, 0, 1024);
      const hex = this.bufferToHex(buffer);

      // Check for malicious signatures
      for (const signature of this.MALICIOUS_SIGNATURES) {
        if (hex.toUpperCase().includes(signature)) {
          errors.push('File contains potentially malicious content');
          break;
        }
      }

      // Check for embedded scripts in images
      if (file.type.startsWith('image/')) {
        const text = new TextDecoder().decode(buffer);
        if (/<script|javascript:|vbscript:/i.test(text)) {
          errors.push('Image contains embedded scripts');
        }
      }

    } catch (error) {
      warnings.push('Could not scan file content for malware');
    }

    return { errors, warnings };
  }

  /**
   * Validate image dimensions
   */
  private static async validateImageDimensions(
    file: File,
    config: MediaValidationConfig
  ): Promise<{ errors: string[]; warnings: string[]; dimensions?: { width: number; height: number } }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const dimensions = await this.getImageDimensions(file);

      if (config.maxDimensions) {
        if (dimensions.width > config.maxDimensions.width || dimensions.height > config.maxDimensions.height) {
          errors.push(`Image dimensions ${dimensions.width}x${dimensions.height} exceed maximum allowed ${config.maxDimensions.width}x${config.maxDimensions.height}`);
        }
      }

      if (config.minDimensions) {
        if (dimensions.width < config.minDimensions.width || dimensions.height < config.minDimensions.height) {
          errors.push(`Image dimensions ${dimensions.width}x${dimensions.height} below minimum required ${config.minDimensions.width}x${config.minDimensions.height}`);
        }
      }

      return { errors, warnings, dimensions };

    } catch (error) {
      errors.push('Could not read image dimensions');
      return { errors, warnings };
    }
  }

  /**
   * Process and optimize image
   */
  private static async processImage(file: File): Promise<{
    optimized: Blob;
    thumbnail: Blob;
    dimensions: { width: number; height: number };
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      img.onload = () => {
        const { width, height } = img;
        
        // Create optimized version (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        
        const optimizedWidth = Math.floor(width * ratio);
        const optimizedHeight = Math.floor(height * ratio);

        canvas.width = optimizedWidth;
        canvas.height = optimizedHeight;
        ctx.drawImage(img, 0, 0, optimizedWidth, optimizedHeight);

        canvas.toBlob((optimizedBlob) => {
          if (!optimizedBlob) {
            reject(new Error('Could not create optimized image'));
            return;
          }

          // Create thumbnail (max 300x300)
          const thumbSize = 300;
          const thumbRatio = Math.min(thumbSize / width, thumbSize / height);
          const thumbWidth = Math.floor(width * thumbRatio);
          const thumbHeight = Math.floor(height * thumbRatio);

          canvas.width = thumbWidth;
          canvas.height = thumbHeight;
          ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

          canvas.toBlob((thumbnailBlob) => {
            if (!thumbnailBlob) {
              reject(new Error('Could not create thumbnail'));
              return;
            }

            resolve({
              optimized: optimizedBlob,
              thumbnail: thumbnailBlob,
              dimensions: { width, height }
            });
          }, 'image/jpeg', 0.8);
        }, 'image/jpeg', 0.85);
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Process video file
   */
  private static async processVideo(file: File): Promise<{
    optimized?: Blob;
    thumbnail: Blob;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      video.onloadedmetadata = () => {
        video.currentTime = 1; // Seek to 1 second for thumbnail
      };

      video.onseeked = () => {
        const { videoWidth, videoHeight } = video;
        
        // Create thumbnail
        const thumbSize = 300;
        const ratio = Math.min(thumbSize / videoWidth, thumbSize / videoHeight);
        const thumbWidth = Math.floor(videoWidth * ratio);
        const thumbHeight = Math.floor(videoHeight * ratio);

        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);

        canvas.toBlob((thumbnailBlob) => {
          if (!thumbnailBlob) {
            reject(new Error('Could not create video thumbnail'));
            return;
          }

          resolve({
            thumbnail: thumbnailBlob
          });
        }, 'image/jpeg', 0.8);
      };

      video.onerror = () => reject(new Error('Could not load video'));
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Utility methods
   */
  private static getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private static async readFileBuffer(file: File, start: number, length: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file.slice(start, start + length));
    });
  }

  private static bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private static async detectActualFileType(file: File): Promise<string | null> {
    try {
      const buffer = await this.readFileBuffer(file, 0, 12);
      const bytes = new Uint8Array(buffer);

      // Check common file signatures
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return 'image/jpeg';
      }
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return 'image/png';
      }
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        return 'image/gif';
      }
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        return 'image/webp';
      }

      return null;
    } catch {
      return null;
    }
  }

  private static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private static async generateFileHash(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return 'hash-unavailable';
    }
  }
}

export default MediaValidator;