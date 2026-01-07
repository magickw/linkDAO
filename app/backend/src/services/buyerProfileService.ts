import { db } from '../db';
import { buyerProfiles } from '../db/buyerDataSchema';
import { eq } from 'drizzle-orm';

export interface BuyerProfile {
    userId: string;
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    savedAddressesCount: number;
    savedPaymentMethodsCount: number;
    wishlistItemsCount: number;
    preferredCurrency: string;
    preferredPaymentMethodId?: string;
    preferredShippingAddressId?: string;
    preferredBillingAddressId?: string;
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
    priceDropAlerts: boolean;
    orderUpdates: boolean;
    profileVisibility: 'public' | 'private' | 'friends';
    createdAt: Date;
    updatedAt: Date;
    lastPurchaseAt?: Date;
}

export interface UpdateBuyerPreferencesInput {
    preferredCurrency?: string;
    preferredPaymentMethodId?: string;
    preferredShippingAddressId?: string;
    preferredBillingAddressId?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
    marketingEmails?: boolean;
    priceDropAlerts?: boolean;
    orderUpdates?: boolean;
    profileVisibility?: 'public' | 'private' | 'friends';
}

export class BuyerProfileService {
    /**
     * Get buyer profile for a user
     */
    static async getBuyerProfile(userId: string): Promise<BuyerProfile | null> {
        const [profile] = await db
            .select()
            .from(buyerProfiles)
            .where(eq(buyerProfiles.userId, userId))
            .limit(1);

        return (profile as BuyerProfile) || null;
    }

    /**
     * Get or create buyer profile
     */
    static async getOrCreateBuyerProfile(userId: string): Promise<BuyerProfile> {
        let profile = await this.getBuyerProfile(userId);

        if (!profile) {
            profile = await this.createBuyerProfile(userId);
        }

        return profile;
    }

    /**
     * Create a new buyer profile
     */
    static async createBuyerProfile(userId: string): Promise<BuyerProfile> {
        const [newProfile] = await db
            .insert(buyerProfiles)
            .values({
                userId,
                totalOrders: 0,
                totalSpent: 0,
                averageOrderValue: 0,
                savedAddressesCount: 0,
                savedPaymentMethodsCount: 0,
                wishlistItemsCount: 0,
                preferredCurrency: 'USD',
                emailNotifications: true,
                smsNotifications: false,
                pushNotifications: true,
                marketingEmails: true,
                priceDropAlerts: true,
                orderUpdates: true,
                profileVisibility: 'private',
            })
            .returning();

        return newProfile as BuyerProfile;
    }

    /**
     * Update buyer preferences
     */
    static async updatePreferences(userId: string, input: UpdateBuyerPreferencesInput): Promise<BuyerProfile | null> {
        const [updatedProfile] = await db
            .update(buyerProfiles)
            .set({
                ...input,
                updatedAt: new Date(),
            })
            .where(eq(buyerProfiles.userId, userId))
            .returning();

        return (updatedProfile as BuyerProfile) || null;
    }

    /**
     * Update order statistics (called after order completion)
     */
    static async updateOrderStats(userId: string, orderAmount: number): Promise<BuyerProfile | null> {
        const profile = await this.getOrCreateBuyerProfile(userId);

        const newTotalOrders = Number(profile.totalOrders) + 1;
        const newTotalSpent = Number(profile.totalSpent) + orderAmount;
        const newAverageOrderValue = newTotalSpent / newTotalOrders;

        const [updatedProfile] = await db
            .update(buyerProfiles)
            .set({
                totalOrders: newTotalOrders,
                totalSpent: newTotalSpent,
                averageOrderValue: newAverageOrderValue,
                lastPurchaseAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(buyerProfiles.userId, userId))
            .returning();

        return (updatedProfile as BuyerProfile) || null;
    }

    /**
     * Update saved addresses count
     */
    static async updateSavedAddressesCount(userId: string, count: number): Promise<void> {
        await db
            .update(buyerProfiles)
            .set({
                savedAddressesCount: count,
                updatedAt: new Date(),
            })
            .where(eq(buyerProfiles.userId, userId));
    }

    /**
     * Update saved payment methods count
     */
    static async updateSavedPaymentMethodsCount(userId: string, count: number): Promise<void> {
        await db
            .update(buyerProfiles)
            .set({
                savedPaymentMethodsCount: count,
                updatedAt: new Date(),
            })
            .where(eq(buyerProfiles.userId, userId));
    }

    /**
     * Update wishlist items count
     */
    static async updateWishlistItemsCount(userId: string, count: number): Promise<void> {
        await db
            .update(buyerProfiles)
            .set({
                wishlistItemsCount: count,
                updatedAt: new Date(),
            })
            .where(eq(buyerProfiles.userId, userId));
    }

    /**
     * Set preferred payment method
     */
    static async setPreferredPaymentMethod(userId: string, paymentMethodId: string): Promise<BuyerProfile | null> {
        const [updatedProfile] = await db
            .update(buyerProfiles)
            .set({
                preferredPaymentMethodId: paymentMethodId,
                updatedAt: new Date(),
            })
            .where(eq(buyerProfiles.userId, userId))
            .returning();

        return (updatedProfile as BuyerProfile) || null;
    }

    /**
     * Set preferred shipping address
     */
    static async setPreferredShippingAddress(userId: string, addressId: string): Promise<BuyerProfile | null> {
        const [updatedProfile] = await db
            .update(buyerProfiles)
            .set({
                preferredShippingAddressId: addressId,
                updatedAt: new Date(),
            })
            .where(eq(buyerProfiles.userId, userId))
            .returning();

        return (updatedProfile as BuyerProfile) || null;
    }

    /**
     * Set preferred billing address
     */
    static async setPreferredBillingAddress(userId: string, addressId: string): Promise<BuyerProfile | null> {
        const [updatedProfile] = await db
            .update(buyerProfiles)
            .set({
                preferredBillingAddressId: addressId,
                updatedAt: new Date(),
            })
            .where(eq(buyerProfiles.userId, userId))
            .returning();

        return (updatedProfile as BuyerProfile) || null;
    }

    /**
     * Get buyer statistics summary
     */
    static async getBuyerStats(userId: string): Promise<{
        totalOrders: number;
        totalSpent: number;
        averageOrderValue: number;
        savedAddresses: number;
        savedPaymentMethods: number;
        wishlistItems: number;
        lastPurchase?: Date;
    } | null> {
        const profile = await this.getBuyerProfile(userId);

        if (!profile) return null;

        return {
            totalOrders: Number(profile.totalOrders),
            totalSpent: Number(profile.totalSpent),
            averageOrderValue: Number(profile.averageOrderValue),
            savedAddresses: Number(profile.savedAddressesCount),
            savedPaymentMethods: Number(profile.savedPaymentMethodsCount),
            wishlistItems: Number(profile.wishlistItemsCount),
            lastPurchase: profile.lastPurchaseAt,
        };
    }

    /**
     * Update profile visibility
     */
    static async updateProfileVisibility(userId: string, visibility: 'public' | 'private' | 'friends'): Promise<BuyerProfile | null> {
        const [updatedProfile] = await db
            .update(buyerProfiles)
            .set({
                profileVisibility: visibility,
                updatedAt: new Date(),
            })
            .where(eq(buyerProfiles.userId, userId))
            .returning();

        return (updatedProfile as BuyerProfile) || null;
    }
}
