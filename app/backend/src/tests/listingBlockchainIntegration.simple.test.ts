import { ProductListingService } from '../services/listingService';

describe('ListingService - Blockchain Integration Methods', () => {
  let listingService: ProductListingService;

  beforeEach(() => {
    listingService = new ProductListingService();
  });

  test('should have blockchain integration methods', () => {
    // Check if all blockchain methods exist
    expect(typeof listingService.publishToBlockchain).toBe('function');
    expect(typeof listingService.syncWithBlockchain).toBe('function');
    expect(typeof listingService.getBlockchainData).toBe('function');
    expect(typeof listingService.handleBlockchainEvent).toBe('function');
  });

  test('should have core listing methods', () => {
    // Check if core methods exist
    expect(typeof listingService.createListing).toBe('function');
    expect(typeof listingService.updateListing).toBe('function');
    expect(typeof listingService.getListingById).toBe('function');
    expect(typeof listingService.getMarketplaceListings).toBe('function');
  });
});