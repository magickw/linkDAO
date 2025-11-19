import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { onboardingService } from '../services/onboardingService';
import { apiResponse } from '../utils/apiResponse';
import { safeLogger } from '../utils/safeLogger';

export class OnboardingController {
    /**
     * Get user's onboarding preferences
     */
    async getUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userAddress = req.user?.address;

            if (!userAddress) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const preferences = await onboardingService.getUserPreferences(userAddress);

            if (!preferences) {
                res.status(404).json(apiResponse.error('Preferences not found', 404));
                return;
            }

            res.json(apiResponse.success(preferences, 'Preferences retrieved successfully'));
        } catch (error) {
            safeLogger.error('Error getting user preferences:', error);
            res.status(500).json(apiResponse.error('Failed to retrieve preferences'));
        }
    }

    /**
     * Save user's onboarding preferences
     */
    async saveUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userAddress = req.user?.address;

            if (!userAddress) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const { preferredCategories, preferredTags } = req.body;

            // Validate input
            if (!Array.isArray(preferredCategories) || !Array.isArray(preferredTags)) {
                res.status(400).json(apiResponse.error('Invalid preferences format', 400));
                return;
            }

            const savedPreferences = await onboardingService.saveUserPreferences(userAddress, {
                preferredCategories,
                preferredTags
            });

            res.json(apiResponse.success(savedPreferences, 'Preferences saved successfully'));
        } catch (error) {
            safeLogger.error('Error saving user preferences:', error);
            res.status(500).json(apiResponse.error('Failed to save preferences'));
        }
    }

    /**
     * Skip onboarding for the user
     */
    async skipOnboarding(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userAddress = req.user?.address;

            if (!userAddress) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const savedPreferences = await onboardingService.skipOnboarding(userAddress);

            res.json(apiResponse.success(savedPreferences, 'Onboarding skipped successfully'));
        } catch (error) {
            safeLogger.error('Error skipping onboarding:', error);
            res.status(500).json(apiResponse.error('Failed to skip onboarding'));
        }
    }

    /**
     * Check if user needs onboarding
     */
    async needsOnboarding(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userAddress = req.user?.address;

            if (!userAddress) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const needsOnboarding = await onboardingService.needsOnboarding(userAddress);

            res.json(apiResponse.success({ needsOnboarding }, 'Onboarding status retrieved successfully'));
        } catch (error) {
            safeLogger.error('Error checking onboarding status:', error);
            res.status(500).json(apiResponse.error('Failed to check onboarding status'));
        }
    }

    /**
     * Get available categories for onboarding selection
     */
    async getAvailableCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // Define available categories for user selection
            const categories = [
                { id: 'defi', name: 'DeFi', description: 'Decentralized Finance protocols and trading', icon: '💰' },
                { id: 'nft', name: 'NFTs', description: 'Non-fungible tokens and digital art', icon: '🎨' },
                { id: 'dao', name: 'DAOs', description: 'Decentralized Autonomous Organizations', icon: '🏛️' },
                { id: 'gaming', name: 'Gaming', description: 'Blockchain gaming and metaverse', icon: '🎮' },
                { id: 'development', name: 'Development', description: 'Web3 development and smart contracts', icon: '💻' },
                { id: 'social', name: 'Social', description: 'Decentralized social networks', icon: '👥' },
                { id: 'infrastructure', name: 'Infrastructure', description: 'Layer 1/2 protocols and infrastructure', icon: '🔧' },
                { id: 'education', name: 'Education', description: 'Web3 learning and resources', icon: '📚' },
            ];

            res.json(apiResponse.success({ categories }, 'Categories retrieved successfully'));
        } catch (error) {
            safeLogger.error('Error getting available categories:', error);
            res.status(500).json(apiResponse.error('Failed to retrieve categories'));
        }
    }

    /**
     * Get available tags for onboarding selection
     */
    async getAvailableTags(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // Define available tags grouped by category
            const tags = {
                defi: ['trading', 'yield-farming', 'lending', 'dex', 'staking', 'liquid-staking'],
                nft: ['art', 'collectibles', 'pfp', 'gaming-nft', 'music', 'photography'],
                dao: ['governance', 'voting', 'treasury', 'proposals', 'community'],
                gaming: ['play-to-earn', 'metaverse', 'virtual-worlds', 'esports', 'game-fi'],
                development: ['solidity', 'ethereum', 'smart-contracts', 'web3', 'security', 'audit'],
                social: ['decentralized-social', 'content-creation', 'creator-economy', 'messaging'],
                infrastructure: ['layer-2', 'scaling', 'consensus', 'node-operation', 'validators'],
                education: ['tutorials', 'courses', 'documentation', 'beginner-friendly', 'research']
            };

            res.json(apiResponse.success({ tags }, 'Tags retrieved successfully'));
        } catch (error) {
            safeLogger.error('Error getting available tags:', error);
            res.status(500).json(apiResponse.error('Failed to retrieve tags'));
        }
    }
}

export const onboardingController = new OnboardingController();
