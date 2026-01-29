/**
 * Validation Schemas for Community Enhancement Data
 * Provides runtime validation for enhanced data structures
 */

import { 
  EnhancedCommunityData, 
  EnhancedPost, 
  UserProfile,
  PostType,
  FilterConfiguration,
  GovernanceProposal,
  WalletActivity
} from '../types/communityEnhancements';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Base validation utilities
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Enhanced Community Data Validation Schema
 */
export class EnhancedCommunityValidator {
  static validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required fields validation
      if (!data.id || typeof data.id !== 'string') {
        errors.push('Community ID is required and must be a string');
      }

      if (!data.name || typeof data.name !== 'string') {
        errors.push('Community name is required and must be a string');
      }

      if (typeof data.memberCount !== 'number' || data.memberCount < 0) {
        errors.push('Member count must be a non-negative number');
      }

      // Visual enhancements validation
      if (!data.icon || typeof data.icon !== 'string') {
        warnings.push('Community icon is missing or invalid');
      }

      if (data.brandColors) {
        if (!this.isValidColor(data.brandColors.primary)) {
          warnings.push('Primary brand color is invalid');
        }
        if (!this.isValidColor(data.brandColors.secondary)) {
          warnings.push('Secondary brand color is invalid');
        }
        if (!this.isValidColor(data.brandColors.accent)) {
          warnings.push('Accent brand color is invalid');
        }
      }

      // User membership validation
      if (!data.userMembership) {
        errors.push('User membership data is required');
      } else {
        if (typeof data.userMembership.isJoined !== 'boolean') {
          errors.push('User membership isJoined must be a boolean');
        }
        
        if (data.userMembership.joinDate && !(data.userMembership.joinDate instanceof Date)) {
          errors.push('Join date must be a valid Date object');
        }

        if (typeof data.userMembership.reputation !== 'number') {
          warnings.push('User reputation should be a number');
        }

        if (data.userMembership.role && !['member', 'moderator', 'admin'].includes(data.userMembership.role)) {
          errors.push('User role must be member, moderator, or admin');
        }
      }

      // Activity metrics validation
      if (!data.activityMetrics) {
        warnings.push('Activity metrics are missing');
      } else {
        const metrics = data.activityMetrics;
        if (typeof metrics.postsToday !== 'number' || metrics.postsToday < 0) {
          warnings.push('Posts today should be a non-negative number');
        }
        if (typeof metrics.activeMembers !== 'number' || metrics.activeMembers < 0) {
          warnings.push('Active members should be a non-negative number');
        }
        if (typeof metrics.engagementRate !== 'number' || metrics.engagementRate < 0 || metrics.engagementRate > 1) {
          warnings.push('Engagement rate should be a number between 0 and 1');
        }
      }

      // Governance validation
      if (!data.governance) {
        warnings.push('Governance data is missing');
      } else {
        const governance = data.governance;
        if (typeof governance.activeProposals !== 'number' || governance.activeProposals < 0) {
          warnings.push('Active proposals should be a non-negative number');
        }
        if (typeof governance.userVotingPower !== 'number' || governance.userVotingPower < 0) {
          warnings.push('User voting power should be a non-negative number');
        }
        if (typeof governance.participationRate !== 'number' || governance.participationRate < 0 || governance.participationRate > 1) {
          warnings.push('Participation rate should be a number between 0 and 1');
        }
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static isValidColor(color: string): boolean {
    // Check for hex color format
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }
}

/**
 * Enhanced Post Data Validation Schema
 */
export class EnhancedPostValidator {
  static validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required fields validation
      if (!data.id || typeof data.id !== 'string') {
        errors.push('Post ID is required and must be a string');
      }

      if (!data.title || typeof data.title !== 'string') {
        errors.push('Post title is required and must be a string');
      }

      if (!data.content || typeof data.content !== 'string') {
        errors.push('Post content is required and must be a string');
      }

      if (!data.author) {
        errors.push('Post author is required');
      } else {
        const authorValidation = UserProfileValidator.validate(data.author);
        if (!authorValidation.isValid) {
          errors.push(...authorValidation.errors.map(e => `Author: ${e}`));
        }
      }

      if (!data.timestamp || !(data.timestamp instanceof Date)) {
        errors.push('Post timestamp must be a valid Date object');
      }

      // Post type validation
      const validPostTypes: PostType[] = ['proposal', 'analysis', 'showcase', 'discussion', 'announcement'];
      if (!data.postType || !validPostTypes.includes(data.postType)) {
        errors.push(`Post type must be one of: ${validPostTypes.join(', ')}`);
      }

      // Priority validation
      const validPriorities = ['pinned', 'featured', 'normal'];
      if (!data.priority || !validPriorities.includes(data.priority)) {
        warnings.push(`Post priority should be one of: ${validPriorities.join(', ')}`);
      }

      // Engagement validation
      if (!data.engagement) {
        errors.push('Post engagement data is required');
      } else {
        const engagement = data.engagement;
        if (typeof engagement.upvotes !== 'number' || engagement.upvotes < 0) {
          warnings.push('Upvotes should be a non-negative number');
        }
        if (typeof engagement.downvotes !== 'number' || engagement.downvotes < 0) {
          warnings.push('Downvotes should be a non-negative number');
        }
        if (typeof engagement.comments !== 'number' || engagement.comments < 0) {
          warnings.push('Comments count should be a non-negative number');
        }
      }

      // Preview validation
      if (data.previews) {
        if (data.previews.nft) {
          const nftValidation = this.validateNFTPreview(data.previews.nft);
          if (!nftValidation.isValid) {
            warnings.push(...nftValidation.errors.map(e => `NFT Preview: ${e}`));
          }
        }

        if (data.previews.proposal) {
          const proposalValidation = this.validateProposalPreview(data.previews.proposal);
          if (!proposalValidation.isValid) {
            warnings.push(...proposalValidation.errors.map(e => `Proposal Preview: ${e}`));
          }
        }
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static validateNFTPreview(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (!data.tokenId || typeof data.tokenId !== 'string') {
      errors.push('NFT token ID is required');
    }
    if (!data.collection || typeof data.collection !== 'string') {
      errors.push('NFT collection is required');
    }
    if (!data.image || typeof data.image !== 'string') {
      errors.push('NFT image URL is required');
    }

    return { isValid: errors.length === 0, errors, warnings: [] };
  }

  private static validateProposalPreview(data: any): ValidationResult {
    const errors: string[] = [];
    
    if (!data.id || typeof data.id !== 'string') {
      errors.push('Proposal ID is required');
    }
    if (!data.title || typeof data.title !== 'string') {
      errors.push('Proposal title is required');
    }
    if (typeof data.votingProgress !== 'number' || data.votingProgress < 0 || data.votingProgress > 100) {
      errors.push('Voting progress must be a number between 0 and 100');
    }

    const validStatuses = ['active', 'passed', 'failed', 'pending'];
    if (!data.currentStatus || !validStatuses.includes(data.currentStatus)) {
      errors.push(`Proposal status must be one of: ${validStatuses.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors, warnings: [] };
  }
}

/**
 * User Profile Validation Schema
 */
export class UserProfileValidator {
  static validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!data.id || typeof data.id !== 'string') {
        errors.push('User ID is required and must be a string');
      }

      if (!data.handle || typeof data.handle !== 'string') {
        errors.push('Username is required and must be a string');
      }

      if (data.ensName && typeof data.ensName !== 'string') {
        warnings.push('ENS name should be a string');
      }

      if (!data.avatar || typeof data.avatar !== 'string') {
        warnings.push('User avatar is missing or invalid');
      }

      if (typeof data.reputation !== 'number') {
        warnings.push('User reputation should be a number');
      }

      if (data.walletAddress && !this.isValidWalletAddress(data.walletAddress)) {
        warnings.push('Wallet address format is invalid');
      }

      if (typeof data.mutualConnections !== 'number' || data.mutualConnections < 0) {
        warnings.push('Mutual connections should be a non-negative number');
      }

      if (typeof data.isFollowing !== 'boolean') {
        warnings.push('isFollowing should be a boolean');
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static isValidWalletAddress(address: string): boolean {
    // Basic Ethereum address validation
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethRegex.test(address);
  }
}

/**
 * Filter Configuration Validation Schema
 */
export class FilterConfigurationValidator {
  static validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!data.id || typeof data.id !== 'string') {
        errors.push('Filter configuration ID is required');
      }

      if (!data.name || typeof data.name !== 'string') {
        errors.push('Filter configuration name is required');
      }

      if (!Array.isArray(data.filters)) {
        errors.push('Filters must be an array');
      } else {
        data.filters.forEach((filter: any, index: number) => {
          if (!filter.type || typeof filter.type !== 'string') {
            errors.push(`Filter ${index}: type is required`);
          }
          if (filter.value === undefined || filter.value === null) {
            errors.push(`Filter ${index}: value is required`);
          }
          if (!filter.operator || typeof filter.operator !== 'string') {
            errors.push(`Filter ${index}: operator is required`);
          }
        });
      }

      const validSortOptions = ['hot', 'new', 'top', 'rising', 'mostTipped', 'controversial', 'trending'];
      if (!data.sortOrder || !validSortOptions.includes(data.sortOrder)) {
        errors.push(`Sort order must be one of: ${validSortOptions.join(', ')}`);
      }

      if (typeof data.isDefault !== 'boolean') {
        warnings.push('isDefault should be a boolean');
      }

      if (typeof data.isCustom !== 'boolean') {
        warnings.push('isCustom should be a boolean');
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Wallet Activity Validation Schema
 */
export class WalletActivityValidator {
  static validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!data.id || typeof data.id !== 'string') {
        errors.push('Activity ID is required');
      }

      const validTypes = ['tip_received', 'transaction', 'badge_earned', 'reward_claimed'];
      if (!data.type || !validTypes.includes(data.type)) {
        errors.push(`Activity type must be one of: ${validTypes.join(', ')}`);
      }

      if (data.amount !== undefined && (typeof data.amount !== 'number' || data.amount < 0)) {
        warnings.push('Activity amount should be a non-negative number');
      }

      if (!data.timestamp || !(data.timestamp instanceof Date)) {
        errors.push('Activity timestamp must be a valid Date object');
      }

      if (!data.description || typeof data.description !== 'string') {
        warnings.push('Activity description is missing or invalid');
      }

      if (typeof data.celebratory !== 'boolean') {
        warnings.push('celebratory should be a boolean');
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Batch validation utilities
 */
export function validateCommunityList(data: any[]): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  data.forEach((community, index) => {
    const result = EnhancedCommunityValidator.validate(community);
    if (!result.isValid) {
      allErrors.push(...result.errors.map(e => `Community ${index}: ${e}`));
    }
    allWarnings.push(...result.warnings.map(w => `Community ${index}: ${w}`));
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

export function validatePostList(data: any[]): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  data.forEach((post, index) => {
    const result = EnhancedPostValidator.validate(post);
    if (!result.isValid) {
      allErrors.push(...result.errors.map(e => `Post ${index}: ${e}`));
    }
    allWarnings.push(...result.warnings.map(w => `Post ${index}: ${w}`));
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Runtime type guards
 */
export function isEnhancedCommunityData(data: any): data is EnhancedCommunityData {
  const result = EnhancedCommunityValidator.validate(data);
  return result.isValid;
}

export function isEnhancedPost(data: any): data is EnhancedPost {
  const result = EnhancedPostValidator.validate(data);
  return result.isValid;
}

export function isUserProfile(data: any): data is UserProfile {
  const result = UserProfileValidator.validate(data);
  return result.isValid;
}

/**
 * Sanitization utilities
 */
export function sanitizeEnhancedCommunity(data: any): Partial<EnhancedCommunityData> {
  const sanitized: any = {};

  if (data.id && typeof data.id === 'string') sanitized.id = data.id;
  if (data.name && typeof data.name === 'string') sanitized.name = data.name.trim();
  if (data.description && typeof data.description === 'string') sanitized.description = data.description.trim();
  if (typeof data.memberCount === 'number' && data.memberCount >= 0) sanitized.memberCount = data.memberCount;

  // Add other sanitization logic as needed
  return sanitized;
}

export function sanitizeEnhancedPost(data: any): Partial<EnhancedPost> {
  const sanitized: any = {};

  if (data.id && typeof data.id === 'string') sanitized.id = data.id;
  if (data.title && typeof data.title === 'string') sanitized.title = data.title.trim();
  if (data.content && typeof data.content === 'string') sanitized.content = data.content.trim();

  // Add other sanitization logic as needed
  return sanitized;
}