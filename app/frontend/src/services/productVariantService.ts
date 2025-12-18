// Product Variant Service - Manages color, size, SKU, and inventory for product variants

import { ProductVariant, CreateVariantInput, UpdateVariantInput } from '@/types/productVariant';
import { enhancedAuthService } from './enhancedAuthService';
import { ENV_CONFIG } from '@/config/environment';

const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';

class ProductVariantService {
  /**
   * Get all variants for a product
   */
  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/marketplace/products/${productId}/variants`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(await enhancedAuthService.getAuthHeaders())
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch variants: ${response.statusText}`);
      }

      const data = await response.json();
      return data.variants || data.data || [];
    } catch (error) {
      console.error('Error fetching product variants:', error);
      return [];
    }
  }

  /**
   * Create a new variant
   */
  async createVariant(variantData: CreateVariantInput): Promise<ProductVariant> {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/api/marketplace/products/${variantData.productId}/variants`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await enhancedAuthService.getAuthHeaders())
        },
        body: JSON.stringify(variantData)
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to create variant: ${response.statusText}`);
    }

    const data = await response.json();
    return data.variant || data.data;
  }

  /**
   * Update an existing variant
   */
  async updateVariant(variantId: string, updates: UpdateVariantInput): Promise<ProductVariant> {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/api/marketplace/variants/${variantId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await enhancedAuthService.getAuthHeaders())
        },
        body: JSON.stringify(updates)
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to update variant: ${response.statusText}`);
    }

    const data = await response.json();
    return data.variant || data.data;
  }

  /**
   * Delete a variant
   */
  async deleteVariant(variantId: string): Promise<void> {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/api/marketplace/variants/${variantId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(await enhancedAuthService.getAuthHeaders())
        }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to delete variant: ${response.statusText}`);
    }
  }

  /**
   * Bulk create variants (useful for creating color x size matrix)
   */
  async bulkCreateVariants(productId: string, variants: CreateVariantInput[]): Promise<ProductVariant[]> {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/api/marketplace/products/${productId}/variants/bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await enhancedAuthService.getAuthHeaders())
        },
        body: JSON.stringify({ variants })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to bulk create variants: ${response.statusText}`);
    }

    const data = await response.json();
    return data.variants || data.data || [];
  }

  /**
   * Get available colors for a product
   */
  async getAvailableColors(productId: string): Promise<Array<{ color: string; colorHex: string; imageUrl?: string; inventory: number }>> {
    try {
      const variants = await this.getProductVariants(productId);
      
      // Group by color and aggregate inventory
      const colorMap = new Map<string, { color: string; colorHex: string; imageUrl?: string; inventory: number }>();
      
      variants.forEach(variant => {
        if (variant.color && variant.isAvailable) {
          const existing = colorMap.get(variant.color);
          if (existing) {
            existing.inventory += variant.inventory - variant.reservedInventory;
          } else {
            colorMap.set(variant.color, {
              color: variant.color,
              colorHex: variant.colorHex || '#000000',
              imageUrl: variant.primaryImageUrl || variant.imageUrls[0],
              inventory: variant.inventory - variant.reservedInventory
            });
          }
        }
      });
      
      return Array.from(colorMap.values());
    } catch (error) {
      console.error('Error fetching available colors:', error);
      return [];
    }
  }

  /**
   * Get available sizes for a product (optionally filtered by color)
   */
  async getAvailableSizes(productId: string, color?: string): Promise<Array<{ size: string; inventory: number; dimensions?: any }>> {
    try {
      const variants = await this.getProductVariants(productId);
      
      // Filter by color if specified
      const filteredVariants = color 
        ? variants.filter(v => v.color === color && v.isAvailable)
        : variants.filter(v => v.isAvailable);
      
      // Group by size and aggregate inventory
      const sizeMap = new Map<string, { size: string; inventory: number; dimensions?: any }>();
      
      filteredVariants.forEach(variant => {
        if (variant.size) {
          const existing = sizeMap.get(variant.size);
          if (existing) {
            existing.inventory += variant.inventory - variant.reservedInventory;
          } else {
            sizeMap.set(variant.size, {
              size: variant.size,
              inventory: variant.inventory - variant.reservedInventory,
              dimensions: variant.dimensions
            });
          }
        }
      });
      
      return Array.from(sizeMap.values());
    } catch (error) {
      console.error('Error fetching available sizes:', error);
      return [];
    }
  }

  /**
   * Find specific variant by color and size
   */
  async findVariant(productId: string, color?: string, size?: string): Promise<ProductVariant | null> {
    try {
      const variants = await this.getProductVariants(productId);
      
      return variants.find(v => 
        v.isAvailable &&
        (!color || v.color === color) &&
        (!size || v.size === size)
      ) || null;
    } catch (error) {
      console.error('Error finding variant:', error);
      return null;
    }
  }
}

export const productVariantService = new ProductVariantService();
