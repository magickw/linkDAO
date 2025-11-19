import { db } from '../db';
import { userOnboardingPreferences, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export interface OnboardingPreferences {
    preferredCategories: string[];
    preferredTags: string[];
}

export interface UserOnboardingData {
    id: string;
    userId: string;
    preferredCategories: string[];
    preferredTags: string[];
    onboardingCompleted: boolean;
    skipOnboarding: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class OnboardingService {
    /**
     * Get user's onboarding preferences
     * @param userAddress - User's wallet address
     * @returns User's onboarding preferences or null if not found
     */
    async getUserPreferences(userAddress: string): Promise<UserOnboardingData | null> {
        try {
            const normalizedAddress = userAddress.toLowerCase();

            // First, get the user ID from the wallet address
            const user = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.walletAddress, normalizedAddress))
                .limit(1);

            if (user.length === 0) {
                safeLogger.warn('User not found for address:', normalizedAddress);
                return null;
            }

            const userId = user[0].id;

            // Get the onboarding preferences
            const preferences = await db
                .select()
                .from(userOnboardingPreferences)
                .where(eq(userOnboardingPreferences.userId, userId))
                .limit(1);

            if (preferences.length === 0) {
                return null;
            }

            return {
                id: preferences[0].id,
                userId: preferences[0].userId,
                preferredCategories: preferences[0].preferredCategories || [],
                preferredTags: preferences[0].preferredTags || [],
                onboardingCompleted: preferences[0].onboardingCompleted,
                skipOnboarding: preferences[0].skipOnboarding,
                createdAt: preferences[0].createdAt,
                updatedAt: preferences[0].updatedAt
            };
        } catch (error) {
            safeLogger.error('Error getting user onboarding preferences:', error);
            throw new Error('Failed to retrieve onboarding preferences');
        }
    }

    /**
     * Save or update user's onboarding preferences
     * @param userAddress - User's wallet address
     * @param preferences - Onboarding preferences data
     * @returns Saved preferences
     */
    async saveUserPreferences(
        userAddress: string,
        preferences: OnboardingPreferences
    ): Promise<UserOnboardingData> {
        try {
            const normalizedAddress = userAddress.toLowerCase();

            // Get or create user
            let user = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.walletAddress, normalizedAddress))
                .limit(1);

            let userId: string;

            if (user.length === 0) {
                // Create user if doesn't exist
                const newUser = await db
                    .insert(users)
                    .values({
                        walletAddress: normalizedAddress,
                        createdAt: new Date()
                    })
                    .returning({ id: users.id });

                userId = newUser[0].id;
            } else {
                userId = user[0].id;
            }

            // Check if preferences already exist
            const existingPreferences = await db
                .select()
                .from(userOnboardingPreferences)
                .where(eq(userOnboardingPreferences.userId, userId))
                .limit(1);

            let savedPreferences;

            if (existingPreferences.length > 0) {
                // Update existing preferences
                savedPreferences = await db
                    .update(userOnboardingPreferences)
                    .set({
                        preferredCategories: preferences.preferredCategories,
                        preferredTags: preferences.preferredTags,
                        onboardingCompleted: true,
                        updatedAt: new Date()
                    })
                    .where(eq(userOnboardingPreferences.userId, userId))
                    .returning();
            } else {
                // Insert new preferences
                savedPreferences = await db
                    .insert(userOnboardingPreferences)
                    .values({
                        userId,
                        preferredCategories: preferences.preferredCategories,
                        preferredTags: preferences.preferredTags,
                        onboardingCompleted: true,
                        skipOnboarding: false,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    })
                    .returning();
            }

            return {
                id: savedPreferences[0].id,
                userId: savedPreferences[0].userId,
                preferredCategories: savedPreferences[0].preferredCategories || [],
                preferredTags: savedPreferences[0].preferredTags || [],
                onboardingCompleted: savedPreferences[0].onboardingCompleted,
                skipOnboarding: savedPreferences[0].skipOnboarding,
                createdAt: savedPreferences[0].createdAt,
                updatedAt: savedPreferences[0].updatedAt
            };
        } catch (error) {
            safeLogger.error('Error saving user onboarding preferences:', error);
            throw new Error('Failed to save onboarding preferences');
        }
    }

    /**
     * Mark onboarding as skipped for a user
     * @param userAddress - User's wallet address
     * @returns Updated preferences
     */
    async skipOnboarding(userAddress: string): Promise<UserOnboardingData> {
        try {
            const normalizedAddress = userAddress.toLowerCase();

            // Get or create user
            let user = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.walletAddress, normalizedAddress))
                .limit(1);

            let userId: string;

            if (user.length === 0) {
                // Create user if doesn't exist
                const newUser = await db
                    .insert(users)
                    .values({
                        walletAddress: normalizedAddress,
                        createdAt: new Date()
                    })
                    .returning({ id: users.id });

                userId = newUser[0].id;
            } else {
                userId = user[0].id;
            }

            // Check if preferences already exist
            const existingPreferences = await db
                .select()
                .from(userOnboardingPreferences)
                .where(eq(userOnboardingPreferences.userId, userId))
                .limit(1);

            let savedPreferences;

            if (existingPreferences.length > 0) {
                // Update existing preferences
                savedPreferences = await db
                    .update(userOnboardingPreferences)
                    .set({
                        skipOnboarding: true,
                        onboardingCompleted: true,
                        updatedAt: new Date()
                    })
                    .where(eq(userOnboardingPreferences.userId, userId))
                    .returning();
            } else {
                // Insert new preferences with skip flag
                savedPreferences = await db
                    .insert(userOnboardingPreferences)
                    .values({
                        userId,
                        preferredCategories: [],
                        preferredTags: [],
                        onboardingCompleted: true,
                        skipOnboarding: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    })
                    .returning();
            }

            return {
                id: savedPreferences[0].id,
                userId: savedPreferences[0].userId,
                preferredCategories: savedPreferences[0].preferredCategories || [],
                preferredTags: savedPreferences[0].preferredTags || [],
                onboardingCompleted: savedPreferences[0].onboardingCompleted,
                skipOnboarding: savedPreferences[0].skipOnboarding,
                createdAt: savedPreferences[0].createdAt,
                updatedAt: savedPreferences[0].updatedAt
            };
        } catch (error) {
            safeLogger.error('Error skipping onboarding:', error);
            throw new Error('Failed to skip onboarding');
        }
    }

    /**
     * Check if user needs onboarding
     * @param userAddress - User's wallet address
     * @returns True if user needs onboarding, false otherwise
     */
    async needsOnboarding(userAddress: string): Promise<boolean> {
        try {
            const preferences = await this.getUserPreferences(userAddress);

            // User needs onboarding if:
            // 1. No preferences exist yet
            // 2. Preferences exist but onboarding is not completed
            return !preferences || !preferences.onboardingCompleted;
        } catch (error) {
            safeLogger.error('Error checking if user needs onboarding:', error);
            // Assume user needs onboarding on error to be safe
            return true;
        }
    }
}

export const onboardingService = new OnboardingService();
