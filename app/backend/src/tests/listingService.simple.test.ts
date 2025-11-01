import { ProductListingService } from '../services/listingService';

// Simple test to verify the service can be instantiated
describe('ListingService - Simple Tests', () => {
  let listingService: ProductListingService;

  beforeEach(() => {
    listingService = new ProductListingService();
  });

  it('should instantiate ListingService', () => {
    expect(listingService).toBeDefined();
    expect(listingService).toBeInstanceOf(ListingService);
  });

  it('should have required methods', () => {
    expect(typeof listingService.createListing).toBe('function');
    expect(typeof listingService.updateListing).toBe('function');
    expect(typeof listingService.getListingById).toBe('function');
    expect(typeof listingService.getMarketplaceListings).toBe('function');
    expect(typeof listingService.searchListingsEnhanced).toBe('function');
  });

  it('should validate listing status transitions', () => {
    const getValidStatusTransitions = (listingService as any).getValidStatusTransitions;
    
    const draftTransitions = getValidStatusTransitions('draft');
    expect(draftTransitions).toContain('active');
    expect(draftTransitions).toContain('published');
    expect(draftTransitions).toContain('inactive');

    const suspendedTransitions = getValidStatusTransitions('suspended');
    expect(suspendedTransitions).not.toContain('published');
    expect(suspendedTransitions).toContain('inactive');
  });

  it('should generate search vector from listing content', () => {
    const generateSearchVector = (listingService as any).generateSearchVector;
    
    const input = {
      title: 'Amazing Product',
      description: 'This is an amazing product with great features',
      tags: ['electronics', 'gadget'],
      seoKeywords: ['amazing', 'product']
    };

    const searchVector = generateSearchVector(input);

    expect(searchVector).toContain('amazing product');
    expect(searchVector).toContain('electronics');
    expect(searchVector).toContain('gadget');
    expect(typeof searchVector).toBe('string');
  });

  it('should generate consistent cache keys', () => {
    const generateCacheKey = (listingService as any).generateCacheKey;
    
    const key1 = generateCacheKey('test', { a: 1 }, { b: 2 }, { c: 3 });
    const key2 = generateCacheKey('test', { a: 1 }, { b: 2 }, { c: 3 });

    expect(key1).toBe(key2);
    expect(key1).toMatch(/^test:/);
  });

  it('should sanitize cache keys', () => {
    const generateCacheKey = (listingService as any).generateCacheKey;
    
    const key = generateCacheKey('test', { 'special@chars!': 'value' }, {}, {});

    expect(key).not.toContain('@');
    expect(key).not.toContain('!');
  });
});
