import { db } from '../db';
import { savedForLater, products, users } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedUser } from '../middleware/authMiddleware';

export interface SavedItem {
    id: string;
    userId: string;
    productId: string;
    quantity: number;
    savedAt: Date;
    notes?: string;
    priceAtSave?: string;
    createdAt: Date;
    updatedAt: Date;
    product?: {
        id: string;
        title: string;
        description?: string;
        priceAmount: string;
        priceCurrency: string;
        images?: string[];
        sellerId: string;
        status: string;
        inventory: number;
    };
}

export class SavedForLaterService {
    /**
     * Save a cart item for later
     */
    async saveForLater(
        user: AuthenticatedUser,
        productId: string,
        quantity: number = 1,
        notes?: string
    ): Promise<SavedItem> {
        if (!db) {
            throw new Error('Database connection not available');
        }

        try {
            // Get product to save current price
            const product = await db
                .select()
                .from(products)
                .where(eq(products.id, productId))
                .limit(1);

            if (product.length === 0) {
                throw new Error('Product not found');
            }

            // Check if already saved
            const existing = await db
                .select()
                .from(savedForLater)
                .where(
                    and(
                        eq(savedForLater.userId, user.id),
                        eq(savedForLater.productId, productId)
                    )
                )
                .limit(1);

            let savedItem;

            if (existing.length > 0) {
                // Update existing saved item
                savedItem = await db
                    .update(savedForLater)
                    .set({
                        quantity,
                        notes,
                        priceAtSave: product[0].priceAmount,
                        updatedAt: new Date(),
                    })
                    .where(eq(savedForLater.id, existing[0].id))
                    .returning();
            } else {
                // Create new saved item
                savedItem = await db
                    .insert(savedForLater)
                    .values({
                        userId: user.id,
                        productId,
                        quantity,
                        notes,
                        priceAtSave: product[0].priceAmount,
                    })
                    .returning();
            }

            safeLogger.info(`[SavedForLater] User ${user.id} saved product ${productId}`);

            return this.formatSavedItem(savedItem[0], product[0]);
        } catch (error) {
            safeLogger.error('[SavedForLater] Error saving item:', error);
            throw error;
        }
    }

    /**
     * Get all saved items for a user
     */
    async getSavedItems(user: AuthenticatedUser): Promise<SavedItem[]> {
        if (!db) {
            throw new Error('Database connection not available');
        }

        try {
            const items = await db
                .select({
                    savedItem: savedForLater,
                    product: products,
                })
                .from(savedForLater)
                .innerJoin(products, eq(savedForLater.productId, products.id))
                .where(eq(savedForLater.userId, user.id))
                .orderBy(desc(savedForLater.savedAt));

            return items.map((item) =>
                this.formatSavedItem(item.savedItem, item.product)
            );
        } catch (error) {
            safeLogger.error('[SavedForLater] Error getting saved items:', error);
            throw error;
        }
    }

    /**
     * Remove a saved item
     */
    async removeSavedItem(user: AuthenticatedUser, savedItemId: string): Promise<void> {
        if (!db) {
            throw new Error('Database connection not available');
        }

        try {
            // Verify ownership
            const item = await db
                .select()
                .from(savedForLater)
                .where(
                    and(
                        eq(savedForLater.id, savedItemId),
                        eq(savedForLater.userId, user.id)
                    )
                )
                .limit(1);

            if (item.length === 0) {
                throw new Error('Saved item not found');
            }

            await db
                .delete(savedForLater)
                .where(eq(savedForLater.id, savedItemId));

            safeLogger.info(`[SavedForLater] User ${user.id} removed saved item ${savedItemId}`);
        } catch (error) {
            safeLogger.error('[SavedForLater] Error removing saved item:', error);
            throw error;
        }
    }

    /**
     * Move saved item to cart (handled by cart service)
     * This method just returns the saved item data for the cart service to use
     */
    async getSavedItem(user: AuthenticatedUser, savedItemId: string): Promise<SavedItem> {
        if (!db) {
            throw new Error('Database connection not available');
        }

        try {
            const items = await db
                .select({
                    savedItem: savedForLater,
                    product: products,
                })
                .from(savedForLater)
                .innerJoin(products, eq(savedForLater.productId, products.id))
                .where(
                    and(
                        eq(savedForLater.id, savedItemId),
                        eq(savedForLater.userId, user.id)
                    )
                )
                .limit(1);

            if (items.length === 0) {
                throw new Error('Saved item not found');
            }

            return this.formatSavedItem(items[0].savedItem, items[0].product);
        } catch (error) {
            safeLogger.error('[SavedForLater] Error getting saved item:', error);
            throw error;
        }
    }

    /**
     * Format saved item with product details
     */
    private formatSavedItem(savedItem: any, product: any): SavedItem {
        return {
            id: savedItem.id,
            userId: savedItem.userId,
            productId: savedItem.productId,
            quantity: savedItem.quantity,
            savedAt: savedItem.savedAt,
            notes: savedItem.notes,
            priceAtSave: savedItem.priceAtSave,
            createdAt: savedItem.createdAt,
            updatedAt: savedItem.updatedAt,
            product: {
                id: product.id,
                title: product.title,
                description: product.description,
                priceAmount: product.priceAmount,
                priceCurrency: product.priceCurrency,
                images: product.images ? JSON.parse(product.images) : [],
                sellerId: product.sellerId,
                status: product.status,
                inventory: product.inventory,
            },
        };
    }
}

export const savedForLaterService = new SavedForLaterService();
