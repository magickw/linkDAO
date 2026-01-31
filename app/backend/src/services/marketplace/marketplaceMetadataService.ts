import { safeLogger } from '../../utils/safeLogger';

export interface ProductMetadata {
  title: string;
  description: string;
  category: string;
  tags: string[];
  images: string[];
  attributes: Record<string, any>;
  condition: 'new' | 'used' | 'refurbished';
  brand?: string;
  sku?: string;
  variantId?: string;
  specifications: Record<string, string>;
}

export class MarketplaceMetadataService {
  /**
   * Parse raw metadata string/object into standardized ProductMetadata
   */
  static parseMetadata(rawMetadata: any, fallbackTitle?: string): ProductMetadata {
    try {
      let data: any = {};
      
      if (typeof rawMetadata === 'string') {
        try {
          data = JSON.parse(rawMetadata);
        } catch (e) {
          safeLogger.warn('Failed to parse metadata string, using as description');
          data = { description: rawMetadata };
        }
      } else if (typeof rawMetadata === 'object' && rawMetadata !== null) {
        data = rawMetadata;
      }

      return {
        title: data.title || data.name || fallbackTitle || 'Untitled Product',
        description: data.description || data.content || '',
        category: data.category || 'general',
        tags: Array.isArray(data.tags) ? data.tags : [],
        images: Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []),
        attributes: data.attributes || {},
        condition: data.condition || 'new',
        brand: data.brand || 'Generic',
        sku: data.sku || '',
        variantId: data.variantId || '',
        specifications: data.specifications || {}
      };
    } catch (error) {
      safeLogger.error('Error in parseMetadata:', error);
      return this.getEmptyMetadata(fallbackTitle);
    }
  }

  /**
   * Validate metadata against standard schema
   */
  static validateMetadata(metadata: Partial<ProductMetadata>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!metadata.title || metadata.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    }
    
    if (!metadata.description || metadata.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }

    if (metadata.images && !Array.isArray(metadata.images)) {
      errors.push('Images must be an array of strings');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize metadata for storage
   */
  static sanitizeMetadata(metadata: ProductMetadata): ProductMetadata {
    return {
      ...metadata,
      title: metadata.title.trim().substring(0, 200),
      description: metadata.description.trim().substring(0, 5000),
      category: metadata.category.toLowerCase().trim(),
      tags: metadata.tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0),
      brand: metadata.brand?.trim().substring(0, 100)
    };
  }

  private static getEmptyMetadata(title?: string): ProductMetadata {
    return {
      title: title || 'Untitled Product',
      description: '',
      category: 'general',
      tags: [],
      images: [],
      attributes: {},
      condition: 'new',
      specifications: {}
    };
  }
}
