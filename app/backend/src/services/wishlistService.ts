import { db } from '../db';
import { wishlists, wishlistItems } from '../db/buyerDataSchema';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/**
 * Convert database wishlist item to WishlistItem type
 * Converts numeric strings to numbers
 */
function dbToWishlistItem(item: any): WishlistItem {
    return {
        ...item,
        priceAtAdd: item.priceAtAdd ? parseFloat(item.priceAtAdd) : undefined,
        priceAlertThreshold: item.priceAlertThreshold ? parseFloat(item.priceAlertThreshold) : undefined,
    };
}

export interface Wishlist {
    id: string;
    userId: string;
    name: string;
    description?: string;
    isPublic: boolean;
    shareToken?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WishlistItem {
    id: string;
    wishlistId: string;
    productId: string;
    quantity: number;
    priority: 'high' | 'medium' | 'low';
    notes?: string;
    priceAtAdd?: number;
    priceAlertThreshold?: number;
    addedAt: Date;
    updatedAt: Date;
}

export interface CreateWishlistInput {
    userId: string;
    name: string;
    description?: string;
    isPublic?: boolean;
}

export interface UpdateWishlistInput {
    name?: string;
    description?: string;
    isPublic?: boolean;
}

export interface AddWishlistItemInput {
    wishlistId: string;
    productId: string;
    quantity?: number;
    priority?: 'high' | 'medium' | 'low';
    notes?: string;
    priceAtAdd?: number;
    priceAlertThreshold?: number;
}

export interface UpdateWishlistItemInput {
    quantity?: number;
    priority?: 'high' | 'medium' | 'low';
    notes?: string;
    priceAlertThreshold?: number;
}

export class WishlistService {
    /**
     * Get all wishlists for a user
     */
    static async getUserWishlists(userId: string): Promise<Wishlist[]> {
        const userWishlists = await db
            .select()
            .from(wishlists)
            .where(eq(wishlists.userId, userId))
            .orderBy(desc(wishlists.updatedAt));

        return userWishlists as Wishlist[];
    }

    /**
     * Get a specific wishlist by ID
     */
    static async getWishlistById(wishlistId: string, userId: string): Promise<Wishlist | null> {
        const [wishlist] = await db
            .select()
            .from(wishlists)
            .where(and(
                eq(wishlists.id, wishlistId),
                eq(wishlists.userId, userId)
            ))
            .limit(1);

        return (wishlist as Wishlist) || null;
    }

    /**
     * Get wishlist by share token (for public wishlists)
     */
    static async getWishlistByShareToken(shareToken: string): Promise<Wishlist | null> {
        const [wishlist] = await db
            .select()
            .from(wishlists)
            .where(and(
                eq(wishlists.shareToken, shareToken),
                eq(wishlists.isPublic, true)
            ))
            .limit(1);

        return (wishlist as Wishlist) || null;
    }

    /**
     * Create a new wishlist
     */
    static async createWishlist(input: CreateWishlistInput): Promise<Wishlist> {
        const shareToken = input.isPublic ? this.generateShareToken() : undefined;

        const [newWishlist] = await db
            .insert(wishlists)
            .values({
                ...input,
                isPublic: input.isPublic || false,
                shareToken,
            })
            .returning();

        return newWishlist as Wishlist;
    }

    /**
     * Update a wishlist
     */
    static async updateWishlist(wishlistId: string, userId: string, input: UpdateWishlistInput): Promise<Wishlist | null> {
        const updates: any = {
            ...input,
            updatedAt: new Date(),
        };

        // Generate share token if making public
        if (input.isPublic && !updates.shareToken) {
            const wishlist = await this.getWishlistById(wishlistId, userId);
            if (wishlist && !wishlist.shareToken) {
                updates.shareToken = this.generateShareToken();
            }
        }

        const [updatedWishlist] = await db
            .update(wishlists)
            .set(updates)
            .where(and(
                eq(wishlists.id, wishlistId),
                eq(wishlists.userId, userId)
            ))
            .returning();

        return (updatedWishlist as Wishlist) || null;
    }

    /**
     * Delete a wishlist
     */
    static async deleteWishlist(wishlistId: string, userId: string): Promise<boolean> {
        const result = await db
            .delete(wishlists)
            .where(and(
                eq(wishlists.id, wishlistId),
                eq(wishlists.userId, userId)
            ))
            .returning();

        return result.length > 0;
    }

    /**
     * Get all items in a wishlist
     */
    static async getWishlistItems(wishlistId: string): Promise<WishlistItem[]> {
        const items = await db
            .select()
            .from(wishlistItems)
            .where(eq(wishlistItems.wishlistId, wishlistId))
            .orderBy(desc(wishlistItems.priority), desc(wishlistItems.addedAt));

        return items.map(dbToWishlistItem);
    }

    /**
     * Add item to wishlist
     */
    static async addItemToWishlist(input: AddWishlistItemInput): Promise<WishlistItem> {
        const [newItem] = await db
            .insert(wishlistItems)
            .values({
                ...input,
                quantity: input.quantity || 1,
                priority: input.priority || 'medium',
            } as any)
            .returning();

        return dbToWishlistItem(newItem);
    }

    /**
     * Update wishlist item
     */
    static async updateWishlistItem(itemId: string, wishlistId: string, input: UpdateWishlistItemInput): Promise<WishlistItem | null> {
        const [updatedItem] = await db
            .update(wishlistItems)
            .set({
                ...input,
                updatedAt: new Date(),
            } as any)
            .where(and(
                eq(wishlistItems.id, itemId),
                eq(wishlistItems.wishlistId, wishlistId)
            ))
            .returning();

        return updatedItem ? dbToWishlistItem(updatedItem) : null;
    }

    /**
     * Remove item from wishlist
     */
    static async removeItemFromWishlist(wishlistId: string, productId: string): Promise<boolean> {
        const result = await db
            .delete(wishlistItems)
            .where(and(
                eq(wishlistItems.wishlistId, wishlistId),
                eq(wishlistItems.productId, productId)
            ))
            .returning();

        return result.length > 0;
    }

    /**
     * Check if product is in any of user's wishlists
     */
    static async isProductInWishlist(userId: string, productId: string): Promise<boolean> {
        const result = await db
            .select({ id: wishlistItems.id })
            .from(wishlistItems)
            .innerJoin(wishlists, eq(wishlistItems.wishlistId, wishlists.id))
            .where(and(
                eq(wishlists.userId, userId),
                eq(wishlistItems.productId, productId)
            ))
            .limit(1);

        return result.length > 0;
    }

    /**
     * Get items with price drops (price alert threshold exceeded)
     */
    static async getItemsWithPriceDrops(userId: string, currentPrices: Map<string, number>): Promise<WishlistItem[]> {
        const userWishlists = await this.getUserWishlists(userId);
        const wishlistIds = userWishlists.map(w => w.id);

        if (wishlistIds.length === 0) return [];

        const allItems = await db
            .select()
            .from(wishlistItems)
            .where(sql`${wishlistItems.wishlistId} IN ${wishlistIds}`);

        // Filter items where current price is below alert threshold
        return allItems.filter(item => {
            if (!item.priceAlertThreshold) return false;
            const currentPrice = currentPrices.get(item.productId);
            return currentPrice !== undefined && currentPrice <= Number(item.priceAlertThreshold);
        }).map(dbToWishlistItem);
    }

    /**
     * Move item to another wishlist
     */
    static async moveItemToWishlist(itemId: string, fromWishlistId: string, toWishlistId: string, userId: string): Promise<WishlistItem | null> {
        // Verify both wishlists belong to user
        const fromWishlist = await this.getWishlistById(fromWishlistId, userId);
        const toWishlist = await this.getWishlistById(toWishlistId, userId);

        if (!fromWishlist || !toWishlist) return null;

        const [movedItem] = await db
            .update(wishlistItems)
            .set({
                wishlistId: toWishlistId,
                updatedAt: new Date(),
            } as any)
            .where(and(
                eq(wishlistItems.id, itemId),
                eq(wishlistItems.wishlistId, fromWishlistId)
            ))
            .returning();

        return movedItem ? dbToWishlistItem(movedItem) : null;
    }

    /**
     * Generate a unique share token for public wishlists
     */
    private static generateShareToken(): string {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}
