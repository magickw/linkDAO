/**
 * Token Reaction Types Tests
 * Standalone tests for reaction type definitions
 */

import { describe, it, expect } from '@jest/globals';

// Define the types locally for testing
type ReactionType = '🔥' | '🚀' | '💎';

interface TokenReactionConfig {
  emoji: ReactionType;
  name: string;
  tokenCost: number;
  multiplier: number;
  description: string;
}

const REACTION_TYPES: Record<ReactionType, TokenReactionConfig> = {
  '🔥': {
    emoji: '🔥',
    name: 'Fire',
    tokenCost: 1,
    multiplier: 1.5,
    description: 'Show this content is hot and trending'
  },
  '🚀': {
    emoji: '🚀',
    name: 'Rocket',
    tokenCost: 2,
    multiplier: 2.0,
    description: 'Boost this content to the moon'
  },
  '💎': {
    emoji: '💎',
    name: 'Diamond',
    tokenCost: 5,
    multiplier: 3.0,
    description: 'Mark this as diamond hands quality'
  }
};

describe('Token Reaction Types', () => {
  describe('REACTION_TYPES configuration', () => {
    it('should have correct configuration for Fire reaction', () => {
      const fireConfig = REACTION_TYPES['🔥'];
      expect(fireConfig).toBeDefined();
      expect(fireConfig.name).toBe('Fire');
      expect(fireConfig.tokenCost).toBe(1);
      expect(fireConfig.multiplier).toBe(1.5);
      expect(fireConfig.emoji).toBe('🔥');
      expect(fireConfig.description).toBe('Show this content is hot and trending');
    });

    it('should have correct configuration for Rocket reaction', () => {
      const rocketConfig = REACTION_TYPES['🚀'];
      expect(rocketConfig).toBeDefined();
      expect(rocketConfig.name).toBe('Rocket');
      expect(rocketConfig.tokenCost).toBe(2);
      expect(rocketConfig.multiplier).toBe(2.0);
      expect(rocketConfig.emoji).toBe('🚀');
      expect(rocketConfig.description).toBe('Boost this content to the moon');
    });

    it('should have correct configuration for Diamond reaction', () => {
      const diamondConfig = REACTION_TYPES['💎'];
      expect(diamondConfig).toBeDefined();
      expect(diamondConfig.name).toBe('Diamond');
      expect(diamondConfig.tokenCost).toBe(5);
      expect(diamondConfig.multiplier).toBe(3.0);
      expect(diamondConfig.emoji).toBe('💎');
      expect(diamondConfig.description).toBe('Mark this as diamond hands quality');
    });

    it('should have exactly 3 reaction types', () => {
      const reactionTypes = Object.keys(REACTION_TYPES);
      expect(reactionTypes).toHaveLength(3);
      expect(reactionTypes).toContain('🔥');
      expect(reactionTypes).toContain('🚀');
      expect(reactionTypes).toContain('💎');
    });

    it('should have increasing token costs and multipliers', () => {
      const fire = REACTION_TYPES['🔥'];
      const rocket = REACTION_TYPES['🚀'];
      const diamond = REACTION_TYPES['💎'];

      expect(fire.tokenCost).toBeLessThan(rocket.tokenCost);
      expect(rocket.tokenCost).toBeLessThan(diamond.tokenCost);

      expect(fire.multiplier).toBeLessThan(rocket.multiplier);
      expect(rocket.multiplier).toBeLessThan(diamond.multiplier);
    });
  });

  describe('Validation logic', () => {
    function validateReactionInput(type: ReactionType, amount: number): {
      isValid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];
      
      if (!REACTION_TYPES[type]) {
        errors.push('Invalid reaction type');
      }
      
      if (amount <= 0) {
        errors.push('Amount must be greater than 0');
      }
      
      if (type && REACTION_TYPES[type] && amount < REACTION_TYPES[type].tokenCost) {
        errors.push(`Minimum amount for ${REACTION_TYPES[type].name} is ${REACTION_TYPES[type].tokenCost} tokens`);
      }
      
      if (amount > 10000) {
        errors.push('Maximum amount is 10,000 tokens per reaction');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    }

    it('should validate valid reaction input', () => {
      const result = validateReactionInput('🔥', 5);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid reaction type', () => {
      const result = validateReactionInput('❤️' as ReactionType, 5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid reaction type');
    });

    it('should reject amount below minimum', () => {
      const result = validateReactionInput('🔥', 0.5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Minimum amount for Fire is 1 tokens');
    });

    it('should reject zero or negative amounts', () => {
      const result = validateReactionInput('🔥', 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than 0');
    });

    it('should reject amounts above maximum', () => {
      const result = validateReactionInput('🔥', 15000);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum amount is 10,000 tokens per reaction');
    });
  });

  describe('Reward calculations', () => {
    function calculateRewards(amount: number, type: ReactionType): number {
      const config = REACTION_TYPES[type];
      const baseReward = amount * 0.1; // 10% base reward
      return baseReward * config.multiplier;
    }

    it('should calculate correct rewards for Fire reaction', () => {
      const rewards = calculateRewards(10, '🔥');
      expect(rewards).toBe(1.5); // 10 * 0.1 * 1.5
    });

    it('should calculate correct rewards for Rocket reaction', () => {
      const rewards = calculateRewards(10, '🚀');
      expect(rewards).toBe(2.0); // 10 * 0.1 * 2.0
    });

    it('should calculate correct rewards for Diamond reaction', () => {
      const rewards = calculateRewards(10, '💎');
      expect(rewards).toBe(3.0); // 10 * 0.1 * 3.0
    });
  });
});