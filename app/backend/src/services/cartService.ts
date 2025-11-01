import { db } from '../db/connection';
import { safeLogger } from '../utils/safeLogger';
import { carts, cartItems, products, users } from '../db/schema';
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
  product?: {
    id: string;
    title: string;
    description?: string;
    priceAmount: string;
    priceCurrency: string;
    images?: string[];
    sellerId: string;
    status: string;
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
        })
        .from(cartItems)
        .innerJoin(products, eq(cartItems.productId, products.id))
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
        product: {
          id: item.product.id,
          title: item.product.title,
          description: item.product.description,
          priceAmount: item.product.priceAmount,
          priceCurrency: item.product.priceCurrency,
          images: item.product.images ? JSON.parse(item.product.images) : [],
          sellerId: item.product.sellerId,
          status: item.product.status,
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
    const totalAmount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.priceAtTime) * item.quantity);
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

      // Add local cart items to backend cart
      for (const localItem of localCartItems) {
        try {
          await this.addItem(user, localItem);
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
}

export const cartService = new CartService();
