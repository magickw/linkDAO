// Product Variant Types for Color, Size, and SKU Management

export interface ProductVariant {
  id: string;
  productId: string;
  listingId?: string;
  sku: string;
  
  // Variant attributes
  color?: string;
  colorHex?: string; // Hex color code for visual display
  size?: string;
  sizeCategory?: string; // Category ID from size system (e.g., 'footwear-mens', 'clothing-tops')
  sizeType?: 'clothing' | 'footwear' | 'general' | 'custom';
  
  // International size equivalents
  sizeEquivalents?: {
    US?: string;
    UK?: string;
    EU?: string;
    JP?: string;
  };
  
  // Custom size dimensions
  customDimensions?: string; // e.g., "40x30x10cm"
  
  // Pricing
  priceAdjustment: number; // Additional cost (can be negative for discounts)
  
  // Inventory
  inventory: number;
  reservedInventory: number; // Items in pending orders
  availableInventory: number; // Calculated: inventory - reservedInventory
  
  // Images
  imageUrls: string[];
  primaryImageUrl?: string;
  
  // Availability
  isAvailable: boolean;
  isDefault: boolean;
  
  // Metadata
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  
  // Size measurements for clothing/footwear
  measurements?: {
    chest?: number; // cm
    waist?: number; // cm
    hips?: number; // cm
    length?: number; // cm
    inseam?: number; // cm
    footLength?: number; // cm
    footWidth?: number; // cm
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateVariantInput {
  productId: string;
  listingId?: string;
  sku: string;
  color?: string;
  colorHex?: string;
  size?: string;
  priceAdjustment?: number;
  inventory: number;
  imageUrls?: string[];
  primaryImageUrl?: string;
  isDefault?: boolean;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface UpdateVariantInput {
  sku?: string;
  color?: string;
  colorHex?: string;
  size?: string;
  priceAdjustment?: number;
  inventory?: number;
  imageUrls?: string[];
  primaryImageUrl?: string;
  isAvailable?: boolean;
  isDefault?: boolean;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface VariantSelectionState {
  selectedColor?: string;
  selectedSize?: string;
  selectedVariant?: ProductVariant;
  availableColors: string[];
  availableSizes: string[];
  colorSwatches: ColorSwatch[];
}

export interface ColorSwatch {
  color: string;
  colorHex: string;
  imageUrl?: string;
  available: boolean;
  inventory: number;
}

export interface SizeOption {
  size: string;
  available: boolean;
  inventory: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

// Helper type for variant matrix (seller management)
export interface VariantMatrixCell {
  color: string;
  colorHex: string;
  size: string;
  variant?: ProductVariant;
  sku: string;
  inventory: number;
  priceAdjustment: number;
  isAvailable: boolean;
}
