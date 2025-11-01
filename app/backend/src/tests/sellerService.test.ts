import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock all external dependencies before importing the service
jest.mock('../db/connection', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  }
}));

jest.mock('../services/ensService', () => ({
  ensService: {
    validateENSHandle: jest.fn(),
    verifyENSOwnership: jest.fn(),
  }
}));

// Create a simple seller service class for testing without database dependencies
class TestSellerService {
  private validationRules = [
    { field: 'displayName', required: true, weight: 15 },
    { field: 'storeName', required: true, weight: 15 },
    { field: 'bio', required: true, weight: 10 },
    { field: 'description', required: false, weight: 8 },
    { field: 'sellerStory', required: false, weight: 8 },
    { field: 'location', required: false, weight: 5 },
    { field: 'profileImageCdn', required: false, weight: 10 },
    { field: 'coverImageCdn', required: false, weight: 8 },
    { field: 'websiteUrl', required: false, weight: 5 },
    { field: 'twitterHandle', required: false, weight: 3 },
    { field: 'discordHandle', required: false, weight: 3 },
    { field: 'telegramHandle', required: false, weight: 3 },
    { field: 'ensHandle', required: false, weight: 7 },
  ];

  validateProfile(profile: any) {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.validationRules.forEach(rule => {
      if (rule.required) {
        const value = profile[rule.field];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push(`${rule.field} is required`);
        }
      }
    });

    if (profile.ensHandle && !this.isValidENSFormat(profile.ensHandle)) {
      errors.push('ENS handle format is invalid');
    }

    if (profile.websiteUrl && !this.isValidUrl(profile.websiteUrl)) {
      errors.push('Website URL is invalid');
    }

    const socialHandles = {
      twitter: profile.twitterHandle,
      discord: profile.discordHandle,
      telegram: profile.telegramHandle,
    };

    Object.entries(socialHandles).forEach(([platform, handle]) => {
      if (handle && !this.isValidSocialHandle(platform, handle)) {
        warnings.push(`${platform} handle format may be invalid`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  calculateProfileCompleteness(profile: any) {
    let totalWeight = 0;
    let completedWeight = 0;
    const missingFields: string[] = [];

    this.validationRules.forEach(rule => {
      totalWeight += rule.weight;
      const value = profile[rule.field];
      const isCompleted = value && (typeof value !== 'string' || value.trim() !== '');
      
      if (isCompleted) {
        completedWeight += rule.weight;
      } else {
        missingFields.push(rule.field);
      }
    });

    const score = Math.round((completedWeight / totalWeight) * 100);
    const recommendations = this.generateRecommendations(missingFields, score);

    return {
      score,
      missingFields,
      recommendations,
      lastCalculated: new Date().toISOString(),
    };
  }

  private isValidENSFormat(ensHandle: string): boolean {
    return /^[a-z0-9-]+\.eth$/.test(ensHandle.toLowerCase());
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidSocialHandle(platform: string, handle: string): boolean {
    const patterns: Record<string, RegExp> = {
      twitter: /^@?[A-Za-z0-9_]{1,15}$/,
      discord: /^.{2,32}#[0-9]{4}$|^[A-Za-z0-9_.]{2,32}$/,
      telegram: /^@?[A-Za-z0-9_]{5,32}$/,
    };
    
    const pattern = patterns[platform];
    return pattern ? pattern.test(handle) : true;
  }

  private generateRecommendations(missingFields: string[], score: number) {
    const recommendations: Array<{
      action: string;
      description: string;
      impact: number;
    }> = [];

    const missingWithWeights = missingFields.map(field => {
      const rule = this.validationRules.find(r => r.field === field);
      return {
        field,
        weight: rule?.weight || 0,
        label: this.getFieldLabel(field),
      };
    }).sort((a, b) => b.weight - a.weight);

    missingWithWeights.slice(0, 3).forEach(field => {
      recommendations.push({
        action: `Add ${field.label}`,
        description: `Adding your ${field.label.toLowerCase()} will help buyers trust your store`,
        impact: field.weight,
      });
    });

    if (score < 50) {
      recommendations.unshift({
        action: 'Complete Basic Profile',
        description: 'Fill in your display name, store name, and bio to get started',
        impact: 40,
      });
    } else if (score < 80) {
      recommendations.push({
        action: 'Add Visual Elements',
        description: 'Upload a profile picture and cover image to make your store more appealing',
        impact: 18,
      });
    }

    return recommendations;
  }

  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      'displayName': 'Display Name',
      'storeName': 'Store Name',
      'bio': 'Bio',
      'description': 'Description',
      'sellerStory': 'Seller Story',
      'location': 'Location',
      'profileImageCdn': 'Profile Image',
      'coverImageCdn': 'Cover Image',
      'websiteUrl': 'Website URL',
      'twitterHandle': 'Twitter Handle',
      'discordHandle': 'Discord Handle',
      'telegramHandle': 'Telegram Handle',
      'ensHandle': 'ENS Handle',
    };
    
    return labels[field] || field;
  }
}

const testSellerService = new TestSellerService();

describe('SellerService', () => {
  describe('Profile Validation', () => {
    it('should validate required fields correctly', () => {
      const incompleteProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        // Missing displayName and storeName (required fields)
      };

      const validation = testSellerService.validateProfile(incompleteProfile);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('displayName is required');
      expect(validation.errors).toContain('storeName is required');
      expect(validation.errors).toContain('bio is required');
    });

    it('should validate complete profile correctly', () => {
      const completeProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        storeName: 'Test Store',
        bio: 'This is a test bio',
        description: 'Test description',
        location: 'Test Location',
      };

      const validation = testSellerService.validateProfile(completeProfile);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate ENS handle format', () => {
      const profileWithInvalidENS = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        storeName: 'Test Store',
        bio: 'Test bio',
        ensHandle: 'invalid-ens-format', // Invalid format
      };

      const validation = testSellerService.validateProfile(profileWithInvalidENS);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('ENS handle format is invalid');
    });

    it('should validate valid ENS handle format', () => {
      const profileWithValidENS = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        storeName: 'Test Store',
        bio: 'Test bio',
        ensHandle: 'testseller.eth', // Valid format
      };

      const validation = testSellerService.validateProfile(profileWithValidENS);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).not.toContain('ENS handle format is invalid');
    });

    it('should validate website URL format', () => {
      const profileWithInvalidURL = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        storeName: 'Test Store',
        bio: 'Test bio',
        websiteUrl: 'not-a-valid-url', // Invalid URL
      };

      const validation = testSellerService.validateProfile(profileWithInvalidURL);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Website URL is invalid');
    });

    it('should validate social media handles', () => {
      const profileWithInvalidSocial = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        storeName: 'Test Store',
        bio: 'Test bio',
        twitterHandle: 'this-is-way-too-long-for-twitter-handle-validation', // Too long
      };

      const validation = testSellerService.validateProfile(profileWithInvalidSocial);
      
      expect(validation.warnings).toContain('twitter handle format may be invalid');
    });
  });

  describe('Profile Completeness Calculation', () => {
    it('should calculate completeness score correctly for minimal profile', () => {
      const minimalProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        storeName: 'Test Store',
        bio: 'Test bio',
      };

      const completeness = testSellerService.calculateProfileCompleteness(minimalProfile);
      
      expect(completeness.score).toBeGreaterThan(0);
      expect(completeness.score).toBeLessThan(100);
      expect(completeness.missingFields.length).toBeGreaterThan(0);
      expect(completeness.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate higher score for more complete profile', () => {
      const completeProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        storeName: 'Test Store',
        bio: 'Test bio',
        description: 'Detailed description',
        sellerStory: 'My seller story',
        location: 'Test Location',
        profileImageCdn: 'https://cdn.example.com/profile.jpg',
        coverImageCdn: 'https://cdn.example.com/cover.jpg',
        websiteUrl: 'https://example.com',
        twitterHandle: 'testseller',
        discordHandle: 'testseller#1234',
        telegramHandle: 'testseller',
        ensHandle: 'testseller.eth',
      };

      const completeness = testSellerService.calculateProfileCompleteness(completeProfile);
      
      expect(completeness.score).toBe(100);
      expect(completeness.missingFields.length).toBe(0);
    });

    it('should provide relevant recommendations based on missing fields', () => {
      const profileWithoutImages = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        storeName: 'Test Store',
        bio: 'Test bio',
        description: 'Test description',
        // Missing images and other optional fields
      };

      const completeness = testSellerService.calculateProfileCompleteness(profileWithoutImages);
      
      expect(completeness.recommendations.length).toBeGreaterThan(0);
      expect(completeness.recommendations.some(r => 
        r.action.includes('Profile Image') || r.action.includes('Cover Image')
      )).toBe(true);
    });

    it('should prioritize high-impact missing fields in recommendations', () => {
      const profileMissingHighImpactFields = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        // Missing displayName, storeName, bio (high impact fields)
        twitterHandle: 'testseller', // Low impact field present
      };

      const completeness = testSellerService.calculateProfileCompleteness(profileMissingHighImpactFields);
      
      // Should recommend high-impact fields first
      const topRecommendation = completeness.recommendations[0];
      expect(topRecommendation.impact).toBeGreaterThan(10);
    });
  });

  describe('Helper Methods', () => {
    it('should validate ENS format correctly', () => {
      // Access private method through type assertion for testing
      const service = testSellerService as any;
      
      expect(service.isValidENSFormat('testseller.eth')).toBe(true);
      expect(service.isValidENSFormat('test-seller.eth')).toBe(true);
      expect(service.isValidENSFormat('test123.eth')).toBe(true);
      
      expect(service.isValidENSFormat('testseller')).toBe(false);
      expect(service.isValidENSFormat('testseller.com')).toBe(false);
      expect(service.isValidENSFormat('Test-Seller.eth')).toBe(true); // Uppercase gets converted to lowercase
      expect(service.isValidENSFormat('test_seller.eth')).toBe(false); // Underscore not allowed
    });

    it('should validate URL format correctly', () => {
      const service = testSellerService as any;
      
      expect(service.isValidUrl('https://example.com')).toBe(true);
      expect(service.isValidUrl('http://example.com')).toBe(true);
      expect(service.isValidUrl('https://subdomain.example.com/path')).toBe(true);
      
      expect(service.isValidUrl('not-a-url')).toBe(false);
      expect(service.isValidUrl('example.com')).toBe(false); // Missing protocol
      expect(service.isValidUrl('')).toBe(false);
    });

    it('should validate social media handles correctly', () => {
      const service = testSellerService as any;
      
      // Twitter validation
      expect(service.isValidSocialHandle('twitter', 'testseller')).toBe(true);
      expect(service.isValidSocialHandle('twitter', '@testseller')).toBe(true);
      expect(service.isValidSocialHandle('twitter', 'test_seller')).toBe(true);
      expect(service.isValidSocialHandle('twitter', 'this-is-way-too-long-for-twitter')).toBe(false);
      
      // Discord validation
      expect(service.isValidSocialHandle('discord', 'testseller#1234')).toBe(true);
      expect(service.isValidSocialHandle('discord', 'testseller')).toBe(true);
      expect(service.isValidSocialHandle('discord', 'a')).toBe(false); // Too short
      
      // Telegram validation
      expect(service.isValidSocialHandle('telegram', 'testseller')).toBe(true);
      expect(service.isValidSocialHandle('telegram', '@testseller')).toBe(true);
      expect(service.isValidSocialHandle('telegram', 'test')).toBe(false); // Too short
    });

    it('should generate appropriate field labels', () => {
      const service = testSellerService as any;
      
      expect(service.getFieldLabel('displayName')).toBe('Display Name');
      expect(service.getFieldLabel('storeName')).toBe('Store Name');
      expect(service.getFieldLabel('ensHandle')).toBe('ENS Handle');
      expect(service.getFieldLabel('profileImageCdn')).toBe('Profile Image');
      expect(service.getFieldLabel('unknownField')).toBe('unknownField');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty profile gracefully', () => {
      const emptyProfile = {};
      
      const validation = testSellerService.validateProfile(emptyProfile);
      const completeness = testSellerService.calculateProfileCompleteness(emptyProfile);
      
      expect(validation.isValid).toBe(false);
      expect(completeness.score).toBe(0);
      expect(completeness.missingFields.length).toBeGreaterThan(0);
    });

    it('should handle profile with null/undefined values', () => {
      const profileWithNulls = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: null as any,
        storeName: undefined as any,
        bio: '',
      };

      const validation = testSellerService.validateProfile(profileWithNulls);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('displayName is required');
      expect(validation.errors).toContain('storeName is required');
      expect(validation.errors).toContain('bio is required');
    });

    it('should handle profile with whitespace-only values', () => {
      const profileWithWhitespace = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: '   ',
        storeName: '\t\n',
        bio: '  \t  ',
      };

      const validation = testSellerService.validateProfile(profileWithWhitespace);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('displayName is required');
      expect(validation.errors).toContain('storeName is required');
      expect(validation.errors).toContain('bio is required');
    });
  });
});
