import { ProductService } from '../services/productService';
import { safeLogger } from '../utils/safeLogger';
import { CreateCategoryInput, CreateProductInput } from '../models/Product';
import { safeLogger } from '../utils/safeLogger';

// Simple integration test for product service
describe('ProductService Integration Test', () => {
  let productService: ProductService;

  beforeAll(() => {
    productService = new ProductService();
  });

  it('should create a category and product successfully', async () => {
    try {
      // Create a test category
      const categoryInput: CreateCategoryInput = {
        name: 'Test Electronics',
        slug: 'test-electronics',
        description: 'Test category for electronics'
      };

      safeLogger.info('Creating category...');
      const category = await productService.createCategory(categoryInput);
      safeLogger.info('Category created:', category.id);

      // Create a test product
      const productInput: CreateProductInput = {
        sellerId: 'test-seller-123',
        title: 'Test iPhone',
        description: 'A test iPhone product',
        price: {
          amount: '999.99',
          currency: 'USD'
        },
        categoryId: category.id,
        images: ['ipfs://test-image-hash'],
        metadata: {
          condition: 'new',
          brand: 'Apple',
          model: 'iPhone 15'
        },
        inventory: 10,
        tags: ['smartphone', 'apple', 'test']
      };

      safeLogger.info('Creating product...');
      const product = await productService.createProduct(productInput);
      safeLogger.info('Product created:', product.id);

      // Verify the product was created correctly
      expect(product.title).toBe('Test iPhone');
      expect(product.price.amount).toBe('999.99');
      expect(product.category.name).toBe('Test Electronics');
      expect(product.tags).toContain('smartphone');

      safeLogger.info('✅ Product service integration test passed!');
    } catch (error) {
      safeLogger.error('❌ Product service integration test failed:', error);
      throw error;
    }
  }, 30000); // 30 second timeout
});