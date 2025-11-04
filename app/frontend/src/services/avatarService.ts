import { API_BASE_URL } from '../config/api';

export interface AvatarUploadOptions {
  maxSize?: number;
  quality?: number;
  dimensions?: { width: number; height: number };
}

export interface AvatarUploadResult {
  success: boolean;
  ipfsHash?: string;
  cdnUrl?: string;
  error?: string;
}

export interface AvatarSizes {
  small: string;   // 40x40
  medium: string;  // 80x80
  large: string;   // 160x160
  xlarge: string;  // 320x320
}

class AvatarService {
  private baseUrl: string;
  private defaultOptions: AvatarUploadOptions;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/avatars`;
    this.defaultOptions = {
      maxSize: 5 * 1024 * 1024, // 5MB
      quality: 85,
      dimensions: { width: 400, height: 400 },
    };
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(
    userId: string,
    file: File,
    options: AvatarUploadOptions = {}
  ): Promise<AvatarUploadResult> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };

      // Validate file before upload
      const validation = this.validateFile(file, mergedOptions);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Process image on client side if needed
      const processedFile = await this.processImage(file, mergedOptions);

      // Create form data
      const formData = new FormData();
      formData.append('avatar', processedFile);
      formData.append('userId', userId);

      // Upload to server
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return { success: false, error: 'Failed to upload avatar' };
    }
  }

  /**
   * Get user avatar URL with fallback
   */
  async getUserAvatarUrl(
    userId: string,
    size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium',
    preferCDN = true
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}?size=${size}&preferCDN=${preferCDN}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
    } catch (error) {
      console.error('Error fetching avatar URL:', error);
    }

    // Return default avatar if fetch fails
    return this.generateDefaultAvatar(userId, size);
  }

  /**
   * Get all avatar sizes for a user
   */
  async getUserAvatarSizes(userId: string): Promise<AvatarSizes> {
    try {
      const [small, medium, large, xlarge] = await Promise.all([
        this.getUserAvatarUrl(userId, 'small'),
        this.getUserAvatarUrl(userId, 'medium'),
        this.getUserAvatarUrl(userId, 'large'),
        this.getUserAvatarUrl(userId, 'xlarge'),
      ]);

      return { small, medium, large, xlarge };
    } catch (error) {
      console.error('Error fetching avatar sizes:', error);
      const defaultAvatar = this.generateDefaultAvatar(userId);
      return {
        small: defaultAvatar,
        medium: defaultAvatar,
        large: defaultAvatar,
        xlarge: defaultAvatar,
      };
    }
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}`, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting avatar:', error);
      return false;
    }
  }

  /**
   * Generate default avatar URL
   */
  generateDefaultAvatar(
    identifier: string,
    size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium'
  ): string {
    const sizeMap = {
      small: 40,
      medium: 80,
      large: 160,
      xlarge: 320,
    };

    const pixelSize = sizeMap[size];
    
    // Use different avatar styles based on identifier hash
    const avatarStyles = ['identicon', 'bottts', 'avataaars', 'personas'];
    const hash = this.simpleHash(identifier);
    const styleIndex = hash % avatarStyles.length;
    const style = avatarStyles[styleIndex];

    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(identifier)}&size=${pixelSize}`;
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File, options: AvatarUploadOptions): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > (options.maxSize || this.defaultOptions.maxSize!)) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${(options.maxSize || this.defaultOptions.maxSize!) / (1024 * 1024)}MB`,
      };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Process image on client side
   */
  private async processImage(file: File, options: AvatarUploadOptions): Promise<File> {
    // For now, return the original file
    // In a real implementation, you might:
    // 1. Resize the image using Canvas API
    // 2. Compress the image
    // 3. Convert to optimal format
    return file;
  }

  /**
   * Simple hash function for consistent avatar generation
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Preload avatar images for better UX
   */
  async preloadAvatars(userIds: string[]): Promise<void> {
    const preloadPromises = userIds.map(async (userId) => {
      try {
        const avatarUrl = await this.getUserAvatarUrl(userId, 'medium');
        
        // Create image element to trigger browser preload
        const img = new Image();
        img.src = avatarUrl;
      } catch (error) {
        // Ignore preload errors
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get optimized avatar URL for different contexts
   */
  getOptimizedAvatarUrl(
    baseUrl: string,
    context: 'thumbnail' | 'profile' | 'header' | 'fullsize'
  ): string {
    const contextSizes = {
      thumbnail: 40,
      profile: 80,
      header: 160,
      fullsize: 400,
    };

    const size = contextSizes[context];
    
    // If it's already a dicebear URL, update the size parameter
    if (baseUrl.includes('dicebear.com')) {
      const url = new URL(baseUrl);
      url.searchParams.set('size', size.toString());
      return url.toString();
    }

    // For other URLs, append size parameter if supported
    const url = new URL(baseUrl);
    url.searchParams.set('w', size.toString());
    url.searchParams.set('h', size.toString());
    return url.toString();
  }

  /**
   * Create avatar placeholder while loading
   */
  createAvatarPlaceholder(
    identifier: string,
    size: number = 80
  ): string {
    // Create a simple colored circle SVG as placeholder
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    
    const hash = this.simpleHash(identifier);
    const color = colors[hash % colors.length];
    const initials = this.getInitials(identifier);

    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${color}"/>
        <text x="${size/2}" y="${size/2 + 6}" text-anchor="middle" fill="white" 
              font-family="Arial, sans-serif" font-size="${size/3}" font-weight="bold">
          ${initials}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Get initials from identifier
   */
  private getInitials(identifier: string): string {
    if (identifier.startsWith('0x')) {
      // For wallet addresses, use first and last character
      return (identifier.charAt(2) + identifier.charAt(identifier.length - 1)).toUpperCase();
    }
    
    // For handles or names, use first two characters or first letter of each word
    const words = identifier.split(/[\s_-]+/);
    if (words.length > 1) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    
    return identifier.substring(0, 2).toUpperCase();
  }
}

// Create and export singleton instance
export const avatarService = new AvatarService();
export default avatarService;