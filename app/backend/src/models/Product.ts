// Product models for the Web3 marketplace
export interface CreateProductInput {
  sellerId: string;
  title: string;
  description: string;
  price: {
    amount: string;
    currency: string;
  };
  categoryId: string;
  images: string[]; // IPFS hashes
  metadata: ProductMetadata;
  inventory: number;
  tags: string[];
  shipping?: ShippingInfo;
  nft?: NFTInfo;
  sku?: string;
  canonicalProductId?: string;
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  price?: {
    amount: string;
    currency: string;
  };
  categoryId?: string;
  images?: string[];
  metadata?: Partial<ProductMetadata>;
  inventory?: number;
  tags?: string[];
  shipping?: ShippingInfo;
  status?: ProductStatus;
  sku?: string;
  canonicalProductId?: string;
}

export interface ProductMetadata {
  weight?: number; // in grams
  dimensions?: {
    length: number; // in cm
    width: number;
    height: number;
  };
  materials?: string[];
  brand?: string;
  model?: string;
  condition: 'new' | 'used' | 'refurbished';
  sku?: string;
  barcode?: string;
  manufacturingDate?: string;
  warranty?: {
    duration: number; // in months
    type: 'manufacturer' | 'seller' | 'extended';
    terms?: string;
  };
  certifications?: string[]; // e.g., ['CE', 'FCC', 'RoHS']
  customAttributes?: Record<string, any>;

  // Blockchain integration fields
  blockchainListingId?: string;
  publishedToBlockchain?: boolean;
  blockchainPublishedAt?: string;

  // Listing optimization fields
  searchVector?: string;
  imageIpfsHashes?: string[];
  imageCdnUrls?: Record<string, string>;
  seoOptimized?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  qualityScore?: number;
  publishedAt?: Date;
  lastIndexed?: Date;
  listingStatus?: 'draft' | 'active' | 'published' | 'inactive' | 'suspended';

  // Blockchain activity tracking
  lastBidAmount?: string;
  totalBids?: number;
  lastBidAt?: string;
  lastOfferAmount?: string;
  totalOffers?: number;
  lastOfferAt?: string;
  soldAt?: string;
  soldPrice?: string;
  buyer?: string;
  escrowId?: string;
  escrowCreatedAt?: string;
  isEscrowed?: boolean;

  // Price conversion data
  fiatEquivalents?: Record<string, string>;
  priceLastUpdated?: Date;
}

export interface ShippingInfo {
  weight: number; // in grams
  dimensions: {
    length: number; // in cm
    width: number;
    height: number;
  };
  freeShipping: boolean;
  shippingCost?: string;
  shippingMethods: string[]; // e.g., ['standard', 'express', 'overnight']
  handlingTime: number | string; // in days or string like "1-2"
  shipsFrom: {
    country: string;
    state?: string;
    city?: string;
  };
  restrictions?: {
    countries?: string[]; // ISO country codes
    states?: string[];
  };
  // Enhanced shipping options
  estimatedDelivery?: string; // e.g., "3-5 business days"
  internationalShipping?: boolean;
  internationalCost?: string;
  localPickup?: boolean;
  packageDimensions?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
  };
}

export interface NFTInfo {
  contractAddress: string;
  tokenId: string;
  standard: 'ERC721' | 'ERC1155';
  metadata: NFTMetadata;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string; // IPFS hash
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  animation_url?: string; // IPFS hash for video/audio
  external_url?: string;
  background_color?: string;
}

export type ProductStatus = 'active' | 'inactive' | 'sold_out' | 'suspended' | 'draft';

export interface ProductSeller {
  id: string;
  walletAddress: string;
  displayName?: string;
  storeName?: string;
  avatar?: string;
  verified: boolean;
  daoApproved: boolean;
  rating: number;
  totalSales: number;
  memberSince: Date;
  reputation: number;
}

export interface Product {
  id: string;
  sellerId: string;
  seller?: ProductSeller;
  title: string;
  description: string;
  price: {
    amount: string;
    currency: string;
    usdEquivalent?: string;
    eurEquivalent?: string;
    gbpEquivalent?: string;
    lastUpdated?: Date;
  };
  category: ProductCategory;
  images: string[]; // IPFS hashes
  metadata: ProductMetadata;
  inventory: number;
  status: ProductStatus;
  tags: string[];
  shipping?: ShippingInfo;
  nft?: NFTInfo;
  sku?: string;
  canonicalProductId?: string;
  views: number;
  favorites: number;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  path: string[]; // e.g., ['Electronics', 'Computers', 'Laptops']
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ProductSearchFilters {
  query?: string;
  categoryId?: string;
  sellerId?: string;
  priceMin?: string;
  priceMax?: string;
  currency?: string;
  condition?: 'new' | 'used' | 'refurbished';
  tags?: string[];
  status?: ProductStatus[];
  inStock?: boolean;
  freeShipping?: boolean;
  location?: {
    country?: string;
    state?: string;
    city?: string;
  };
}

export interface ProductSortOptions {
  field: 'price' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'title' | 'views' | 'favorites' | 'relevance' | 'reputation' | 'sales' | 'rating' | 'inventory' | 'discount' | 'handlingTime';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: ProductSearchFilters;
  sort: ProductSortOptions;
}

export interface BulkProductUpload {
  products: CreateProductInput[];
  categoryMappings?: Record<string, string>; // category name -> category ID
  defaultSellerId: string;
}

export interface BulkUploadResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    product: Partial<CreateProductInput>;
    error: string;
  }>;
  createdProducts: Product[];
}

export interface ProductAnalytics {
  productId: string;
  views: number;
  favorites: number;
  salesCount: number;
  orders: number;
  revenue: string;
  conversionRate: number;
  averageRating: number;
  reviewCount: number;
  period: {
    start: Date;
    end: Date;
  };
}

// CSV upload interfaces
export interface CSVProductRow {
  title: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  inventory: string;
  tags: string; // comma-separated
  weight?: string;
  length?: string;
  width?: string;
  height?: string;
  brand?: string;
  model?: string;
  condition: string;
  sku?: string;
  barcode?: string;
  freeShipping?: string;
  shippingCost?: string;
  handlingTime?: string;
  shipsFromCountry?: string;
  shipsFromState?: string;
  shipsFromCity?: string;
}

export interface ImageUploadResult {
  success: boolean;
  ipfsHash?: string;
  error?: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface BulkImageUploadResult {
  results: ImageUploadResult[];
  totalUploaded: number;
  totalFailed: number;
}
