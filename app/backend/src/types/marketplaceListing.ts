// Types for marketplace listings API endpoints

// Shipping information interface
export interface ShippingInfo {
  freeShipping: boolean;
  cost?: string;
  estimatedDelivery?: string;
  methods?: string[];
  handlingTime?: string;
  shipsFrom?: {
    country: string;
    state?: string;
    city?: string;
  };
  packageDimensions?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
  };
  internationalShipping?: boolean;
  internationalCost?: string;
  localPickup?: boolean;
}

export interface MarketplaceListing {
  id: string;
  sellerAddress: string;
  title: string;
  description?: string;
  price: string; // Using string for decimal precision
  currency: string;
  images?: string[]; // Array of image URLs/IPFS hashes
  category?: string;
  isActive: boolean;
  shipping?: ShippingInfo | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMarketplaceListingRequest {
  title: string;
  description?: string;
  price: string;
  currency?: string;
  images?: string[];
  category?: string;
  shipping?: ShippingInfo;
}

export interface UpdateMarketplaceListingRequest {
  title?: string;
  description?: string;
  price?: string;
  currency?: string;
  images?: string[];
  category?: string;
  isActive?: boolean;
  shipping?: ShippingInfo;
}

export interface MarketplaceListingFilters {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'price' | 'title';
  sortOrder?: 'asc' | 'desc';
  category?: string;
  priceRange?: {
    min: string;
    max: string;
  };
  sellerAddress?: string;
  isActive?: boolean;
}

export interface PaginatedMarketplaceListings {
  listings: MarketplaceListing[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Database insert/update types (for Drizzle ORM)
export interface MarketplaceListingInsert {
  sellerAddress: string;
  title: string;
  description?: string;
  price: string;
  currency?: string;
  images?: any; // JSON type for Drizzle
  category?: string;
  isActive?: boolean;
}

export interface MarketplaceListingUpdate {
  title?: string;
  description?: string;
  price?: string;
  currency?: string;
  images?: any; // JSON type for Drizzle
  category?: string;
  isActive?: boolean;
  updatedAt?: Date;
}
