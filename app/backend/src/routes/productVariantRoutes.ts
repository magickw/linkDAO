// Product Variant Routes - API endpoints for managing product variants

import express from 'express';
import { AuthenticationMiddleware } from '../middleware/authenticationMiddleware';
import { AuthenticationService } from '../services/authenticationService';
import { validateRequest } from '../middleware/validation';
import { db } from '../config/database';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Create authentication middleware
const connectionString = process.env.DATABASE_URL || '';
const jwtSecret = process.env.JWT_SECRET || 'development-secret-key-change-in-production';
const authService = new AuthenticationService(connectionString, jwtSecret);
const authMiddleware = new AuthenticationMiddleware(authService);

/**
 * Get all variants for a product
 * GET /api/marketplace/products/:productId/variants
 */
router.get('/products/:productId/variants',
  validateRequest({
    params: {
      productId: { type: 'string', required: true }
    }
  }),
  async (req, res) => {
    try {
      const { productId } = req.params;

      const variants = await db.execute(sql`
        SELECT 
          id,
          product_id as "productId",
          listing_id as "listingId",
          sku,
          color,
          color_hex as "colorHex",
          size,
          price_adjustment as "priceAdjustment",
          inventory,
          reserved_inventory as "reservedInventory",
          (inventory - reserved_inventory) as "availableInventory",
          image_urls as "imageUrls",
          primary_image_url as "primaryImageUrl",
          is_available as "isAvailable",
          is_default as "isDefault",
          weight,
          dimensions,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM product_variants
        WHERE product_id = ${productId}
        ORDER BY is_default DESC, color, size
      `);

      res.json({
        success: true,
        variants: variants.rows
      });
    } catch (error: any) {
      console.error('Error fetching variants:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product variants'
      });
    }
  }
);

/**
 * Create a new variant
 * POST /api/marketplace/products/:productId/variants
 */
router.post('/products/:productId/variants',
  authMiddleware.requireAuth,
  validateRequest({
    params: {
      productId: { type: 'string', required: true }
    },
    body: {
      sku: { type: 'string', required: true },
      color: { type: 'string', optional: true },
      colorHex: { type: 'string', optional: true },
      size: { type: 'string', optional: true },
      priceAdjustment: { type: 'number', optional: true },
      inventory: { type: 'number', required: true, min: 0 },
      imageUrls: { type: 'array', optional: true },
      primaryImageUrl: { type: 'string', optional: true },
      isDefault: { type: 'boolean', optional: true }
    }
  }),
  async (req, res) => {
    try {
      const { productId } = req.params;
      const variantData = req.body;

      const result = await db.execute(sql`
        INSERT INTO product_variants (
          product_id, listing_id, sku, color, color_hex, size,
          price_adjustment, inventory, image_urls, primary_image_url, is_default
        ) VALUES (
          ${productId},
          ${variantData.listingId || null},
          ${variantData.sku},
          ${variantData.color || null},
          ${variantData.colorHex || null},
          ${variantData.size || null},
          ${variantData.priceAdjustment || 0},
          ${variantData.inventory},
          ${variantData.imageUrls || []},
          ${variantData.primaryImageUrl || null},
          ${variantData.isDefault || false}
        )
        RETURNING *
      `);

      res.status(201).json({
        success: true,
        variant: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error creating variant:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create variant'
      });
    }
  }
);

/**
 * Bulk create variants
 * POST /api/marketplace/products/:productId/variants/bulk
 */
router.post('/products/:productId/variants/bulk',
  authMiddleware.requireAuth,
  async (req, res) => {
    try {
      const { productId } = req.params;
      const { variants } = req.body;

      if (!Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Variants array is required'
        });
      }

      const createdVariants = [];
      
      for (const variantData of variants) {
        const result = await db.execute(sql`
          INSERT INTO product_variants (
            product_id, listing_id, sku, color, color_hex, size,
            price_adjustment, inventory, image_urls, primary_image_url, is_default
          ) VALUES (
            ${productId},
            ${variantData.listingId || null},
            ${variantData.sku},
            ${variantData.color || null},
            ${variantData.colorHex || null},
            ${variantData.size || null},
            ${variantData.priceAdjustment || 0},
            ${variantData.inventory},
            ${variantData.imageUrls || []},
            ${variantData.primaryImageUrl || null},
            ${variantData.isDefault || false}
          )
          RETURNING *
        `);
        
        createdVariants.push(result.rows[0]);
      }

      res.status(201).json({
        success: true,
        variants: createdVariants
      });
    } catch (error: any) {
      console.error('Error bulk creating variants:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to bulk create variants'
      });
    }
  }
);

/**
 * Update a variant
 * PUT /api/marketplace/variants/:variantId
 */
router.put('/variants/:variantId',
  authMiddleware.requireAuth,
  async (req, res) => {
    try {
      const { variantId } = req.params;
      const updates = req.body;

      const setClauses = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.sku !== undefined) {
        setClauses.push(`sku = $${paramIndex++}`);
        values.push(updates.sku);
      }
      if (updates.color !== undefined) {
        setClauses.push(`color = $${paramIndex++}`);
        values.push(updates.color);
      }
      if (updates.colorHex !== undefined) {
        setClauses.push(`color_hex = $${paramIndex++}`);
        values.push(updates.colorHex);
      }
      if (updates.size !== undefined) {
        setClauses.push(`size = $${paramIndex++}`);
        values.push(updates.size);
      }
      if (updates.priceAdjustment !== undefined) {
        setClauses.push(`price_adjustment = $${paramIndex++}`);
        values.push(updates.priceAdjustment);
      }
      if (updates.inventory !== undefined) {
        setClauses.push(`inventory = $${paramIndex++}`);
        values.push(updates.inventory);
      }
      if (updates.isAvailable !== undefined) {
        setClauses.push(`is_available = $${paramIndex++}`);
        values.push(updates.isAvailable);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(variantId);

      const result = await db.execute(sql.raw(`
        UPDATE product_variants
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, values));

      res.json({
        success: true,
        variant: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error updating variant:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update variant'
      });
    }
  }
);

/**
 * Delete a variant
 * DELETE /api/marketplace/variants/:variantId
 */
router.delete('/variants/:variantId',
  authMiddleware.requireAuth,
  async (req, res) => {
    try {
      const { variantId } = req.params;

      await db.execute(sql`
        DELETE FROM product_variants
        WHERE id = ${variantId}
      `);

      res.json({
        success: true,
        message: 'Variant deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting variant:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete variant'
      });
    }
  }
);

export default router;
