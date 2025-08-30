import { ProductService } from '../services/productService';
import { CreateCategoryInput, CreateProductInput } from '../models/Product';

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

      console.log('Creating category...');
      const category = await productService.createCategory(categoryInput);
      console.log('Category created:', category.id);

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

      console.log('Creating product...');
      const product = await productService.createProduct(productInput);
      console.log('Product created:', product.id);

      // Verify the product was created correctly
      expect(product.title).toBe('Test iPhone');
      expect(product.price.amount).toBe('999.99');
      expect(product.category.name).toBe('Test Electronics');
      expect(product.tags).toContain('smartphone');

      console.log('✅ Product service integration test passed!');
    } catch (error) {
      console.error('❌ Product service integration test failed:', error);
      throw error;
    }
  }, 30000); // 30 second timeout
});