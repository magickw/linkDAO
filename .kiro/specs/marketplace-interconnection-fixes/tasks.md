# Implementation Plan

- [x] 1. Fix URL routing standardization and create missing pages
  - Create `/pages/marketplace/listing/[id].tsx` page route for product details
  - Create `/pages/marketplace/seller/store/[sellerId].tsx` page route for seller stores
  - Update all components to use standardized URL patterns
  - Implement redirects from legacy URLs (`/product/{id}`, `/seller/{id}`) to new patterns
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Fix ProductCard component navigation integration
  - Add direct `router.push()` calls to ProductCard for product and seller navigation
  - Remove dependency on optional callback props for navigation
  - Ensure ProductCard works consistently across all usage contexts
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Replace SimpleProductCard with ProductCard in marketplace browse
  - Update `marketplace.tsx` to use ProductCard instead of SimpleProductCard
  - Remove SimpleProductCard component if no longer needed
  - Ensure marketplace browse page has working product navigation
  - _Requirements: 2.6, 6.1, 6.2_

- [x] 4. Implement real data fetching for product detail pages
  - Replace hardcoded mock data with `marketplaceService.getListingById()` calls
  - Add proper loading states and error handling for product detail pages
  - Ensure product detail pages show accurate seller information with working links
  - Add retry mechanisms for failed API calls
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. Complete seller store page implementation
  - Enhance SellerStorePage component to accept sellerId prop and fetch real data
  - Ensure seller store displays actual seller listings with working product links
  - Fix seller dashboard "View Store" button to navigate to correct URL
  - Add proper error handling for unavailable seller stores
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 6. Integrate shopping cart system with ProductCard components
  - Connect cart service to all ProductCard instances for "Add to Cart" functionality
  - Add cart badge to marketplace header showing current item count
  - Implement cart state persistence across page navigation
  - Ensure cart integrates properly with checkout process
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 7. Add breadcrumb navigation system
  - Implement breadcrumb component for marketplace navigation
  - Add breadcrumbs to product detail pages showing "Marketplace > Category > Product"
  - Add breadcrumbs to seller store pages showing "Marketplace > Sellers > Seller Name"
  - Ensure breadcrumb links are functional and preserve filters/search terms
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Implement comprehensive error handling and fallbacks
  - Add user-friendly error messages with retry options for failed page loads
  - Implement automatic retry mechanisms with exponential backoff for API calls
  - Add "Go Back" and "Return to Marketplace" options on error pages
  - Create error boundaries for navigation components
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Add performance optimizations for navigation
  - Implement resource preloading for faster page transitions
  - Add proper loading states during navigation
  - Implement data caching for frequently accessed marketplace data
  - Optimize image loading strategies for product images
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 10. Ensure cross-component data consistency
  - Implement centralized data management for marketplace entities
  - Add cache invalidation when product or seller data is modified
  - Ensure consistent price formatting and currency display across components
  - Validate seller IDs and product IDs are used consistently throughout application
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_