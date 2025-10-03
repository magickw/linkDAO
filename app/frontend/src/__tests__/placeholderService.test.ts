/**
 * Tests for the placeholder service to ensure placehold.co URLs are properly replaced
 */

import { 
  getPlaceholderImage, 
  generateAvatarPlaceholder, 
  generateBannerPlaceholder,
  COMMON_PLACEHOLDERS 
} from '../utils/placeholderService';

describe('PlaceholderService', () => {
  describe('getPlaceholderImage', () => {
    it('should convert placehold.co URLs to SVG data URLs', () => {
      const result = getPlaceholderImage('https://placehold.co/40');
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('should handle placehold.co URLs with dimensions', () => {
      const result = getPlaceholderImage('https://placehold.co/300x200');
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
      
      // Decode and check dimensions
      const svgContent = atob(result.split(',')[1]);
      expect(svgContent).toContain('width="300"');
      expect(svgContent).toContain('height="200"');
    });

    it('should handle placehold.co URLs with colors and text', () => {
      const result = getPlaceholderImage('https://placehold.co/400x400/6366f1/ffffff?text=NFT+123');
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
      
      const svgContent = atob(result.split(',')[1]);
      expect(svgContent).toContain('NFT 123');
      expect(svgContent).toContain('#6366f1');
    });

    it('should pass through non-placehold.co URLs unchanged', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const result = getPlaceholderImage(originalUrl);
      expect(result).toBe(originalUrl);
    });

    it('should handle malformed placehold.co URLs gracefully', () => {
      const result = getPlaceholderImage('https://placehold.co/invalid');
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
    });
  });

  describe('generateAvatarPlaceholder', () => {
    it('should generate avatar with initials', () => {
      const result = generateAvatarPlaceholder('John Doe', 40);
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
      
      const svgContent = atob(result.split(',')[1]);
      expect(svgContent).toContain('JD');
      expect(svgContent).toContain('width="40"');
      expect(svgContent).toContain('height="40"');
    });

    it('should handle single names', () => {
      const result = generateAvatarPlaceholder('Alice', 48);
      const svgContent = atob(result.split(',')[1]);
      expect(svgContent).toContain('A');
    });

    it('should handle empty names', () => {
      const result = generateAvatarPlaceholder('', 40);
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
    });
  });

  describe('generateBannerPlaceholder', () => {
    it('should generate banner with specified dimensions', () => {
      const result = generateBannerPlaceholder(800, 200, 'Community Banner');
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
      
      const svgContent = atob(result.split(',')[1]);
      expect(svgContent).toContain('width="800"');
      expect(svgContent).toContain('height="200"');
      expect(svgContent).toContain('Community Banner');
    });
  });

  describe('COMMON_PLACEHOLDERS', () => {
    it('should provide pre-generated common placeholders', () => {
      expect(COMMON_PLACEHOLDERS.AVATAR_40).toMatch(/^data:image\/svg\+xml;base64,/);
      expect(COMMON_PLACEHOLDERS.AVATAR_48).toMatch(/^data:image\/svg\+xml;base64,/);
      expect(COMMON_PLACEHOLDERS.THUMBNAIL_300).toMatch(/^data:image\/svg\+xml;base64,/);
      expect(COMMON_PLACEHOLDERS.BANNER_800x200).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('should have different content for different sizes', () => {
      expect(COMMON_PLACEHOLDERS.AVATAR_40).not.toBe(COMMON_PLACEHOLDERS.AVATAR_48);
    });
  });

  describe('Color generation', () => {
    it('should generate consistent colors for same input', () => {
      const result1 = generateAvatarPlaceholder('TestUser', 40);
      const result2 = generateAvatarPlaceholder('TestUser', 40);
      expect(result1).toBe(result2);
    });

    it('should generate different colors for different inputs', () => {
      const result1 = generateAvatarPlaceholder('Alice Johnson', 40);
      const result2 = generateAvatarPlaceholder('Bob Smith', 40);
      expect(result1).not.toBe(result2);
    });
  });
});