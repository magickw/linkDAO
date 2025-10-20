/**
 * Unified Seller Types - Index
 * 
 * Central export point for all unified seller interfaces and types
 */

export * from '../unifiedSeller';

// Re-export commonly used types with shorter names for convenience
export type {
  UnifiedSellerProfile as SellerProfile,
  UnifiedSellerListing as SellerListing,
  UnifiedSellerDashboard as SellerDashboard,
} from '../unifiedSeller';