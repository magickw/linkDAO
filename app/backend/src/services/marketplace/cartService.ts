import { db } from '../db';
import { safeLogger } from '../../utils/safeLogger';
import { carts, cartItems, products, users, savedForLater } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { AuthenticatedUser } from '../middleware/authMiddleware';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  priceAtTime: string;
  currency: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  appliedPromoCodeId?: string | null;
  appliedDiscount?: string;
  product?: {
    id: string;
    title: string;
    description?: string;
    priceAmount: string;
    priceCurrency: string;
    images?: string[];
    sellerId: string;
    sellerWalletAddress?: string;
    status: string;
    inventory: number;
  };
}

export interface Cart {
  id: string;
  userId: string;
  sessionId?: string;
  status: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  items: CartItem[];
  totalItems: number;
  totalAmount: string;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export class CartService {
  /**
   * Get or create a cart for the authenticated user
   */
  async getOrCreateCart(user: AuthenticatedUser): Promise<Cart> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      // First try to find an active cart for the user
      let cart = await db
        .select()
        .from(carts)
        .where(and(
          eq(carts.userId, user.id),
          eq(carts.status, 'active')
        ))
        .limit(1);

      // If no cart exists, create one
      if (cart.length === 0) {
        const newCart = await db
          .insert(carts)
          .values({
            userId: user.id,
            status: 'active',
            metadata: JSON.stringify({}),
          })
          .returning();

        cart = newCart;
      }

      // Get cart items with product details
      const items = await this.getCartItems(cart[0].id);

      return this.formatCart(cart[0], items);
    } catch (error) {
      safeLogger.error('Error getting or creating cart:', error);
      throw new Error('Failed to get or create cart');
    }
  }

  /**
   * Add an item to the cart
   */
  async addItem(user: AuthenticatedUser, request: AddToCartRequest): Promise<Cart> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      // Validate product exists and is active
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, request.productId))
        .limit(1);

      if (product.length === 0) {
        throw new Error('Product not found');
      }

      if (product[0].status !== 'active') {
        throw new Error('Product is not available');
      }

      // Get or create cart
      const cart = await this.getOrCreateCart(user);

      // Check if item already exists in cart
      const existingItem = await db
        .select()
        .from(cartItems)
        .where(and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.productId, request.productId)
        ))
        .limit(1);

      if (existingItem.length > 0) {
        // Update quantity if item exists
        await db
          .update(cartItems)
          .set({
            quantity: existingItem[0].quantity + request.quantity,
            updatedAt: new Date(),
          })
          .where(eq(cartItems.id, existingItem[0].id));
      } else {
        // Add new item to cart
        await db
          .insert(cartItems)
          .values({
            cartId: cart.id,
            productId: request.productId,
            quantity: request.quantity,
            priceAtTime: product[0].priceAmount,
            currency: product[0].priceCurrency,
            metadata: JSON.stringify({}),
          });
      }

      // Update cart timestamp
      await db
        .update(carts)
        .set({ updatedAt: new Date() })
        .where(eq(carts.id, cart.id));

      // Return updated cart
      return this.getOrCreateCart(user);
    } catch (error) {
      safeLogger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateItem(user: AuthenticatedUser, itemId: string, request: UpdateCartItemRequest): Promise<Cart> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      // Verify the item belongs to the user's cart
      const item = await db
        .select({
          cartItem: cartItems,
          cart: carts,
        })
        .from(cartItems)
        .innerJoin(carts, eq(cartItems.cartId, carts.id))
        .where(and(
          eq(cartItems.id, itemId),
          eq(carts.userId, user.id),
          eq(carts.status, 'active')
        ))
        .limit(1);

      if (item.length === 0) {
        throw new Error('Cart item not found');
      }

      if (request.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Update the item quantity
      await db
        .update(cartItems)
        .set({
          quantity: request.quantity,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, itemId));

      // Update cart timestamp
      await db
        .update(carts)
        .set({ updatedAt: new Date() })
        .where(eq(carts.id, item[0].cart.id));

      // Return updated cart
      return this.getOrCreateCart(user);
    } catch (error) {
      safeLogger.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove an item from the cart
   */
  async removeItem(user: AuthenticatedUser, itemId: string): Promise<Cart> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      // Verify the item belongs to the user's cart
      const item = await db
        .select({
          cartItem: cartItems,
          cart: carts,
        })
        .from(cartItems)
        .innerJoin(carts, eq(cartItems.cartId, carts.id))
        .where(and(
          eq(cartItems.id, itemId),
          eq(carts.userId, user.id),
          eq(carts.status, 'active')
        ))
        .limit(1);

      if (item.length === 0) {
        throw new Error('Cart item not found');
      }

      // Remove the item
      await db
        .delete(cartItems)
        .where(eq(cartItems.id, itemId));

      // Update cart timestamp
      await db
        .update(carts)
        .set({ updatedAt: new Date() })
        .where(eq(carts.id, item[0].cart.id));

      // Return updated cart
      return this.getOrCreateCart(user);
    } catch (error) {
      safeLogger.error('Error removing cart item:', error);
      throw error;
    }
  }

  /**
   * Clear all items from the cart
   */
  async clearCart(user: AuthenticatedUser): Promise<Cart> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      // Get user's active cart
      const userCart = await db
        .select()
        .from(carts)
        .where(and(
          eq(carts.userId, user.id),
          eq(carts.status, 'active')
        ))
        .limit(1);

      if (userCart.length === 0) {
        throw new Error('Cart not found');
      }

      // Remove all items from the cart
      await db
        .delete(cartItems)
        .where(eq(cartItems.cartId, userCart[0].id));

      // Update cart timestamp
      await db
        .update(carts)
        .set({ updatedAt: new Date() })
        .where(eq(carts.id, userCart[0].id));

      // Return updated cart
      return this.getOrCreateCart(user);
    } catch (error) {
      safeLogger.error('Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Get cart items with product details
   */
  private async getCartItems(cartId: string): Promise<CartItem[]> {
    if (!db) {
      return [];
    }

    try {
      const items = await db
        .select({
          cartItem: cartItems,
          product: products,
          seller: users,
        })
        .from(cartItems)
        .innerJoin(products, eq(cartItems.productId, products.id))
        .leftJoin(users, eq(products.sellerId, users.id))
        .where(eq(cartItems.cartId, cartId))
        .orderBy(desc(cartItems.createdAt));

      return items.map(item => ({
        id: item.cartItem.id,
        cartId: item.cartItem.cartId,
        productId: item.cartItem.productId,
        quantity: item.cartItem.quantity,
        priceAtTime: item.cartItem.priceAtTime,
        currency: item.cartItem.currency,
        metadata: item.cartItem.metadata ? JSON.parse(item.cartItem.metadata) : {},
        createdAt: item.cartItem.createdAt,
        updatedAt: item.cartItem.updatedAt,
        appliedPromoCodeId: item.cartItem.appliedPromoCodeId,
        appliedDiscount: item.cartItem.appliedDiscount,
        product: {
          id: item.product.id,
          title: item.product.title,
          description: item.product.description,
          priceAmount: item.product.priceAmount,
          priceCurrency: item.product.priceCurrency,
          images: item.product.images ? JSON.parse(item.product.images) : [],
          sellerId: item.product.sellerId,
          sellerWalletAddress: item.seller?.walletAddress,
          status: item.product.status,
          inventory: item.product.inventory,
        },
      }));
    } catch (error) {
      safeLogger.error('Error getting cart items:', error);
      return [];
    }
  }

  /**
   * Format cart data with calculated totals
   */
  private formatCart(cartData: any, items: CartItem[]): Cart {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate total amount (assuming all items are in the same currency for simplicity)
    // Calculate total amount (assuming all items are in the same currency for simplicity)
    const totalAmount = items.reduce((sum, item) => {
      const itemPrice = parseFloat(item.priceAtTime);
      const quantity = item.quantity;
      const discount = parseFloat(item.appliedDiscount || '0');

      // Calculate item subtotal
      const itemSubtotal = itemPrice * quantity;

      // Subtract discount (ensure we don't go below 0)
      const discountedSubtotal = Math.max(0, itemSubtotal - discount);

      return sum + discountedSubtotal;
    }, 0);

    return {
      id: cartData.id,
      userId: cartData.userId,
      sessionId: cartData.sessionId,
      status: cartData.status,
      metadata: cartData.metadata ? JSON.parse(cartData.metadata) : {},
      createdAt: cartData.createdAt,
      updatedAt: cartData.updatedAt,
      items,
      totalItems,
      totalAmount: totalAmount.toString(),
    };
  }

  /**
   * Sync cart between localStorage and backend for authenticated users
   */
  async syncCart(user: AuthenticatedUser, localCartItems: AddToCartRequest[]): Promise<Cart> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      // Get or create backend cart
      const backendCart = await this.getOrCreateCart(user);

      // Get existing items in backend cart to avoid duplicates
      const existingItems = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, backendCart.id));

      const existingItemsMap = new Map(existingItems.map(item => [item.productId, item]));

      // Sync local cart items to backend cart
      for (const localItem of localCartItems) {
        try {
          const existingItem = existingItemsMap.get(localItem.productId);

          if (existingItem) {
            // Update existing item instead of adding duplicate
            await this.updateItem(user, existingItem.id, { quantity: localItem.quantity });
          } else {
            // Add new item if it doesn't exist
            await this.addItem(user, localItem);
          }
        } catch (error) {
          safeLogger.warn(`Failed to sync item ${localItem.productId}:`, error);
          // Continue with other items even if one fails
        }
      }

      // Return the updated cart
      return this.getOrCreateCart(user);
    } catch (error) {
      safeLogger.error('Error syncing cart:', error);
      throw error;
    }
  }

  /**
   * Apply promo code to a cart item
   */
  async applyPromoCode(user: AuthenticatedUser, itemId: string, promoCodeStr: string): Promise<Cart> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      // 1. Get the cart item
      const item = await db
        .select({
          cartItem: cartItems,
          cart: carts,
          product: products
        })
        .from(cartItems)
        .innerJoin(carts, eq(cartItems.cartId, carts.id))
        .innerJoin(products, eq(cartItems.productId, products.id))
        .where(
          and(
            eq(cartItems.id, itemId),
            eq(carts.userId, user.id),
            eq(carts.status, 'active')
          )
        )
        .limit(1);

      if (item.length === 0) {
        throw new Error('Cart item not found');
      }

      const { cartItem, product } = item[0];

      // 2. Verify the promo code using the service
      // We need to import promoCodeService dynamically or checking imports
      const { promoCodeService } = require('./promoCodeService');
      const promoResult = await promoCodeService.verifyPromoCode({
        code: promoCodeStr,
        sellerId: product.sellerId,
        productId: product.id,
        orderAmount: parseFloat(cartItem.priceAtTime) * cartItem.quantity
      });

      if (!promoResult.isValid) {
        throw new Error(promoResult.error || 'Invalid promo code');
      }

      // 3. Update the cart item with the promo code and applied discount
      const discountAmount = promoResult.promoCode.calculatedDiscount || 0;

      // Log the discount details for debugging
      safeLogger.info(`[CartService] Applying promo code to cart item:`, {
        code: promoCodeStr,
        discountType: promoResult.promoCode.discountType,
        discountValue: promoResult.promoCode.discountValue,
        orderAmount: parseFloat(cartItem.priceAtTime) * cartItem.quantity,
        calculatedDiscount: discountAmount
      });

      await db
        .update(cartItems)
        .set({
          appliedPromoCodeId: promoResult.promoCode.id,
          appliedDiscount: discountAmount.toString(),
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, itemId));

      // 4. Return updated cart
      return this.getOrCreateCart(user);
    } catch (error) {
      safeLogger.error('Error applying promo code:', error);
      throw error;
    }
  }

  /**
   * Remove promo code from a cart item
   */
  async removePromoCode(user: AuthenticatedUser, itemId: string): Promise<Cart> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      // 1. Verify item belongs to user
      const item = await db
        .select({
          cartItem: cartItems,
          cart: carts
        })
        .from(cartItems)
        .innerJoin(carts, eq(cartItems.cartId, carts.id))
        .where(
          and(
            eq(cartItems.id, itemId),
            eq(carts.userId, user.id),
            eq(carts.status, 'active')
          )
        )
        .limit(1);

      if (item.length === 0) {
        throw new Error('Cart item not found');
      }

      // 2. Remove promo code/discount from item
      await db
        .update(cartItems)
        .set({
          appliedPromoCodeId: null,
          appliedDiscount: '0',
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, itemId));

      // 3. Return updated cart
      return this.getOrCreateCart(user);
    } catch (error) {
      safeLogger.error('Error removing promo code:', error);
      throw error;
    }
  }

  /**
   * Set gift options for a cart item
   */
  async setGiftOptions(
    user: AuthenticatedUser,
    itemId: string,
    options: {
      isGift: boolean;
      giftMessage?: string;
      giftWrapOption?: string;
    }
  ): Promise<Cart> {
    try {
      if (!db) {
        throw new Error('Database connection not available');
      }

      // Update cart item with gift options
      await db
        .update(cartItems)
        .set({
          isGift: options.isGift,
          giftMessage: options.giftMessage || null,
          giftWrapOption: options.giftWrapOption || null,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, itemId));

      safeLogger.info(`[CartService] Set gift options for item ${itemId}`);

      return this.getOrCreateCart(user);
    } catch (error) {
      safeLogger.error('Error setting gift options:', error);
      throw error;
    }
  }

  /**
   * Toggle selection status for a cart item
   */
  async toggleItemSelection(user: AuthenticatedUser, itemId: string): Promise<Cart> {
    try {
      if (!db) {
        throw new Error('Database connection not available');
      }

      // Get current selection status
      const item = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, itemId))
        .limit(1);

      if (item.length === 0) {
        throw new Error('Cart item not found');
      }

      // Toggle selection
      await db
        .update(cartItems)
        .set({
          selected: !item[0].selected,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, itemId));

      return this.getOrCreateCart(user);
    } catch (error) {
      safeLogger.error('Error toggling item selection:', error);
      throw error;
    }
  }

  /**
   * Select or deselect all cart items
   */
  async setAllItemsSelection(user: AuthenticatedUser, selected: boolean): Promise<Cart> {
    try {
      if (!db) {
        throw new Error('Database connection not available');
      }

      const cart = await this.getOrCreateCart(user);

      // Update all items in the cart
      await db
        .update(cartItems)
        .set({
          selected,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.cartId, cart.id));

      safeLogger.info(`[CartService] Set all items selection to ${selected}`);

      return this.getOrCreateCart(user);
    } catch (error) {
      safeLogger.error('Error setting all items selection:', error);
      throw error;
    }
  }

  /**
   * Bulk delete selected items
   */
  async bulkDeleteSelected(user: AuthenticatedUser): Promise<{ deletedCount: number; cart: Cart }> {
    try {
      if (!db) {
        throw new Error('Database connection not available');
      }

      const cart = await this.getOrCreateCart(user);

      // Get selected items
      const selectedItems = await db
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.cartId, cart.id),
            eq(cartItems.selected, true)
          )
        );

      if (selectedItems.length === 0) {
        return { deletedCount: 0, cart };
      }

      // Delete selected items
      await db
        .delete(cartItems)
        .where(
          and(
            eq(cartItems.cartId, cart.id),
            eq(cartItems.selected, true)
          )
        );

      safeLogger.info(`[CartService] Bulk deleted ${selectedItems.length} items`);

      const updatedCart = await this.getOrCreateCart(user);
      return { deletedCount: selectedItems.length, cart: updatedCart };
    } catch (error) {
      safeLogger.error('Error bulk deleting items:', error);
      throw error;
    }
  }

  /**
   * Bulk save selected items for later
   */
  async bulkSaveForLater(user: AuthenticatedUser): Promise<{ savedCount: number; cart: Cart }> {
    try {
      if (!db) {
        throw new Error('Database connection not available');
      }

      const cart = await this.getOrCreateCart(user);

      // Get selected items with product details
      const selectedItems = await db
        .select()
        .from(cartItems)
        .leftJoin(products, eq(cartItems.productId, products.id))
        .where(
          and(
            eq(cartItems.cartId, cart.id),
            eq(cartItems.selected, true)
          )
        );

      if (selectedItems.length === 0) {
        return { savedCount: 0, cart };
      }

      let savedCount = 0;

      // Save each item for later
      for (const row of selectedItems) {
        const item = row.cart_items;
        const product = row.products;

        if (!product) continue;

        try {
          // Check if already saved
          const existing = await db
            .select()
            .from(savedForLater)
            .where(
              and(
                eq(savedForLater.userId, user.id),
                eq(savedForLater.productId, item.productId)
              )
            )
            .limit(1);

          if (existing.length === 0) {
            // Save for later
            await db.insert(savedForLater).values({
              id: crypto.randomUUID(),
              userId: user.id,
              productId: item.productId,
              quantity: item.quantity,
              priceAtSave: product.priceAmount,
              savedAt: new Date(),
            });
          }

          // Remove from cart
          await db
            .delete(cartItems)
            .where(eq(cartItems.id, item.id));

          savedCount++;
        } catch (error) {
          safeLogger.error(`Failed to save item ${item.id} for later:`, error);
        }
      }

      safeLogger.info(`[CartService] Bulk saved ${savedCount} items for later`);

      const updatedCart = await this.getOrCreateCart(user);
      return { savedCount, cart: updatedCart };
    } catch (error) {
      safeLogger.error('Error bulk saving items for later:', error);
      throw error;
    }
  }
}

export const cartService = new CartService();
