/**
 * ID Validation Utilities
 * Ensures seller IDs and product IDs are used consistently throughout the application
 */

// ID format patterns
const ID_PATTERNS = {
  // Product ID patterns
  PRODUCT_UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  PRODUCT_NUMERIC: /^\d+$/,
  PRODUCT_ALPHANUMERIC: /^[a-zA-Z0-9_-]{8,32}$/,
  
  // Seller ID patterns (can be wallet addresses or UUIDs)
  ETHEREUM_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  SELLER_UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SELLER_ALPHANUMERIC: /^[a-zA-Z0-9_-]{8,42}$/,
  
  // Category ID patterns
  CATEGORY_SLUG: /^[a-z0-9-]{2,50}$/,
  CATEGORY_UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Order ID patterns
  ORDER_ID: /^ORD-[A-Z0-9]{8,16}$/,
  
  // Transaction hash patterns
  TX_HASH: /^0x[a-fA-F0-9]{64}$/
} as const;

export type IDType = 
  | 'product' 
  | 'seller' 
  | 'category' 
  | 'order' 
  | 'transaction'
  | 'wallet_address';

export interface ValidationResult {
  isValid: boolean;
  type: IDType | null;
  format: string | null;
  errors: string[];
  normalized: string | null;
}

export interface IDConsistencyCheck {
  id: string;
  expectedType: IDType;
  actualType: IDType | null;
  isConsistent: boolean;
  suggestions: string[];
}

class IDValidator {
  /**
   * Validate any ID and determine its type
   */
  validateID(id: string, expectedType?: IDType): ValidationResult {
    const errors: string[] = [];
    let detectedType: IDType | null = null;
    let format: string | null = null;
    let normalized: string | null = null;

    // Basic validation
    if (!id || typeof id !== 'string') {
      errors.push('ID must be a non-empty string');
      return { isValid: false, type: null, format: null, errors, normalized: null };
    }

    const trimmedId = id.trim();
    if (trimmedId !== id) {
      errors.push('ID should not have leading or trailing whitespace');
    }

    if (trimmedId.length === 0) {
      errors.push('ID cannot be empty');
      return { isValid: false, type: null, format: null, errors, normalized: null };
    }

    normalized = trimmedId;

    // Detect ID type and format
    const detectionResult = this.detectIDType(normalized);
    detectedType = detectionResult.type;
    format = detectionResult.format;

    // Validate against expected type
    if (expectedType && detectedType !== expectedType) {
      if (detectedType) {
        errors.push(`Expected ${expectedType} ID, but detected ${detectedType} ID`);
      } else {
        errors.push(`ID format does not match expected type: ${expectedType}`);
      }
    }

    // Additional validation based on detected type
    const typeValidation = this.validateByType(normalized, detectedType);
    errors.push(...typeValidation.errors);

    return {
      isValid: errors.length === 0,
      type: detectedType,
      format,
      errors,
      normalized
    };
  }

  /**
   * Detect the type of an ID based on its format
   */
  private detectIDType(id: string): { type: IDType | null; format: string | null } {
    // Check Ethereum address
    if (ID_PATTERNS.ETHEREUM_ADDRESS.test(id)) {
      return { type: 'wallet_address', format: 'ethereum_address' };
    }

    // Check transaction hash
    if (ID_PATTERNS.TX_HASH.test(id)) {
      return { type: 'transaction', format: 'tx_hash' };
    }

    // Check order ID
    if (ID_PATTERNS.ORDER_ID.test(id)) {
      return { type: 'order', format: 'order_id' };
    }

    // Check UUIDs (could be product, seller, or category)
    if (ID_PATTERNS.PRODUCT_UUID.test(id) || ID_PATTERNS.SELLER_UUID.test(id) || ID_PATTERNS.CATEGORY_UUID.test(id)) {
      // Need more context to determine exact type, default to product
      return { type: 'product', format: 'uuid' };
    }

    // Check category slug
    if (ID_PATTERNS.CATEGORY_SLUG.test(id)) {
      return { type: 'category', format: 'slug' };
    }

    // Check numeric ID (likely product)
    if (ID_PATTERNS.PRODUCT_NUMERIC.test(id)) {
      return { type: 'product', format: 'numeric' };
    }

    // Check alphanumeric (could be product or seller)
    if (ID_PATTERNS.PRODUCT_ALPHANUMERIC.test(id) || ID_PATTERNS.SELLER_ALPHANUMERIC.test(id)) {
      return { type: 'product', format: 'alphanumeric' };
    }

    return { type: null, format: null };
  }

  /**
   * Validate ID based on its detected type
   */
  private validateByType(id: string, type: IDType | null): { errors: string[] } {
    const errors: string[] = [];

    if (!type) {
      errors.push('Unable to determine ID type from format');
      return { errors };
    }

    switch (type) {
      case 'product':
        if (id.length < 1) {
          errors.push('Product ID cannot be empty');
        }
        if (id.length > 100) {
          errors.push('Product ID is too long (max 100 characters)');
        }
        break;

      case 'seller':
        if (id.length < 8) {
          errors.push('Seller ID must be at least 8 characters');
        }
        if (id.length > 42) {
          errors.push('Seller ID is too long (max 42 characters)');
        }
        break;

      case 'wallet_address':
        if (!ID_PATTERNS.ETHEREUM_ADDRESS.test(id)) {
          errors.push('Invalid Ethereum wallet address format');
        }
        break;

      case 'category':
        if (id.length < 2) {
          errors.push('Category ID must be at least 2 characters');
        }
        if (id.length > 50) {
          errors.push('Category ID is too long (max 50 characters)');
        }
        break;

      case 'order':
        if (!ID_PATTERNS.ORDER_ID.test(id)) {
          errors.push('Order ID must follow format: ORD-XXXXXXXX');
        }
        break;

      case 'transaction':
        if (!ID_PATTERNS.TX_HASH.test(id)) {
          errors.push('Invalid transaction hash format');
        }
        break;
    }

    return { errors };
  }

  /**
   * Validate product ID specifically
   */
  validateProductID(id: string): ValidationResult {
    return this.validateID(id, 'product');
  }

  /**
   * Validate seller ID specifically
   */
  validateSellerID(id: string): ValidationResult {
    const result = this.validateID(id);
    
    // Seller IDs can be wallet addresses or regular IDs
    if (result.type === 'wallet_address' || result.type === 'seller') {
      return { ...result, type: 'seller' };
    }
    
    // If it's detected as something else, validate as seller anyway
    return this.validateID(id, 'seller');
  }

  /**
   * Validate wallet address
   */
  validateWalletAddress(address: string): ValidationResult {
    return this.validateID(address, 'wallet_address');
  }

  /**
   * Check consistency between related IDs
   */
  checkIDConsistency(checks: Array<{ id: string; expectedType: IDType }>): IDConsistencyCheck[] {
    return checks.map(check => {
      const validation = this.validateID(check.id, check.expectedType);
      const suggestions: string[] = [];

      if (!validation.isValid) {
        suggestions.push('Fix ID format to match expected type');
        
        if (validation.errors.some(e => e.includes('whitespace'))) {
          suggestions.push('Remove leading/trailing whitespace');
        }
        
        if (validation.errors.some(e => e.includes('too long'))) {
          suggestions.push('Shorten ID to acceptable length');
        }
        
        if (validation.errors.some(e => e.includes('too short'))) {
          suggestions.push('Use longer ID that meets minimum requirements');
        }
      }

      return {
        id: check.id,
        expectedType: check.expectedType,
        actualType: validation.type,
        isConsistent: validation.isValid && validation.type === check.expectedType,
        suggestions
      };
    });
  }

  /**
   * Normalize ID for consistent usage
   */
  normalizeID(id: string, type: IDType): string {
    const validation = this.validateID(id, type);
    
    if (validation.normalized) {
      // Additional normalization based on type
      switch (type) {
        case 'wallet_address':
          // Ensure wallet addresses are lowercase
          return validation.normalized.toLowerCase();
        
        case 'category':
          // Ensure category slugs are lowercase
          return validation.normalized.toLowerCase();
        
        case 'seller':
          // If it's a wallet address, normalize as such
          if (validation.type === 'wallet_address') {
            return validation.normalized.toLowerCase();
          }
          return validation.normalized;
        
        default:
          return validation.normalized;
      }
    }
    
    return id.trim();
  }

  /**
   * Generate suggestions for invalid IDs
   */
  generateIDSuggestions(id: string, type: IDType): string[] {
    const suggestions: string[] = [];
    const validation = this.validateID(id, type);

    if (validation.isValid) {
      return ['ID is already valid'];
    }

    // General suggestions
    if (id.trim() !== id) {
      suggestions.push(`Remove whitespace: "${id.trim()}"`);
    }

    // Type-specific suggestions
    switch (type) {
      case 'product':
        if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
          suggestions.push('Use only letters, numbers, hyphens, and underscores');
        }
        if (id.length < 8) {
          suggestions.push('Make ID at least 8 characters long');
        }
        break;

      case 'seller':
        if (id.length < 8) {
          suggestions.push('Use at least 8 characters for seller ID');
        }
        if (!ID_PATTERNS.ETHEREUM_ADDRESS.test(id) && !ID_PATTERNS.SELLER_ALPHANUMERIC.test(id)) {
          suggestions.push('Use valid Ethereum address or alphanumeric ID');
        }
        break;

      case 'wallet_address':
        if (!id.startsWith('0x')) {
          suggestions.push('Wallet address should start with "0x"');
        }
        if (id.length !== 42) {
          suggestions.push('Wallet address should be exactly 42 characters');
        }
        break;

      case 'category':
        suggestions.push('Use lowercase letters, numbers, and hyphens only');
        if (id.length < 2) {
          suggestions.push('Category ID should be at least 2 characters');
        }
        break;
    }

    return suggestions;
  }

  /**
   * Batch validate multiple IDs
   */
  validateBatch(ids: Array<{ id: string; type: IDType }>): ValidationResult[] {
    return ids.map(({ id, type }) => this.validateID(id, type));
  }

  /**
   * Check if two IDs refer to the same entity
   */
  areIDsEquivalent(id1: string, id2: string, type: IDType): boolean {
    const normalized1 = this.normalizeID(id1, type);
    const normalized2 = this.normalizeID(id2, type);
    
    return normalized1 === normalized2;
  }
}

// Export singleton instance
export const idValidator = new IDValidator();

// Export utility functions
export const validateProductID = (id: string) => idValidator.validateProductID(id);
export const validateSellerID = (id: string) => idValidator.validateSellerID(id);
export const validateWalletAddress = (address: string) => idValidator.validateWalletAddress(address);
export const normalizeID = (id: string, type: IDType) => idValidator.normalizeID(id, type);
export const checkIDConsistency = (checks: Array<{ id: string; expectedType: IDType }>) => 
  idValidator.checkIDConsistency(checks);

export default idValidator;