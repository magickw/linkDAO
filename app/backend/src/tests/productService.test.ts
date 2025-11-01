import { ProductService } from '../services/productService';
import { DatabaseService } from '../services/databaseService';
import { MetadataService } from '../services/metadataService';
import { 
  CreateProductInput, 
  UpdateProductInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  ProductSearchFilters,
  CSVProductRow,
  BulkProductUpload
} from '../models/Product';
import { ValidationError } from '../models/validation';

// Mock the dependencies
jest.mock('../services/databaseService');
jest.mock('../services/metadataService');

describe('ProductService', () => {
  let productService: ProductService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockMetadataService: jest.Mocked<MetadataService>;

  beforeEach(() => {
    jest.clearAllMocks();
    productService = new ProductService();
    mockDatabaseService = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockMetadataService = new MetadataService() as jest.Mocked<MetadataService>;
    
    // Mock the getDatabase method
    mockDatabaseService.getDatabase = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
        })
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([])
          }),
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              offset: jest.fn().mockResolvedValue([])
            })
          })
        })
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([])
          })
        })
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([])
        })
      })
    });
  });

  describe('Category Management', () => {
    describe('createCategory', () => {
      it('should create a category successfully', async () => {
        const input: CreateCategoryInput = {
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices and accessories'
        };

        const mockCategory = {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices and accessories',
          parentId: null,
          path: '["Electronics"]',
          imageUrl: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockDb = mockDatabaseService.getDatabase();
        mockDb.insert().values().returning.mockResolvedValue([mockCategory]);

        const result = await productService.createCategory(input);

        expect(result).toEqual({
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices and accessories',
          parentId: null,
          path: ['Electronics'],
          imageUrl: null,
          isActive: true,
          sortOrder: 0,
          createdAt: mockCategory.createdAt,
          updatedAt: mockCategory.updatedAt
        });
      });

      it('should throw validation error for missing name', async () => {
        const input: CreateCategoryInput = {
          name: '',
          slug: 'electronics'
        };

        await expect(productService.createCategory(input)).rejects.toThrow(ValidationError);
      });

      it('should throw validation error for invalid slug', async () => {
        const input: CreateCategoryInput = {
          name: 'Electronics',
          slug: 'Electronics With Spaces'
        };

        await expect(productService.createCategory(input)).rejects.toThrow(ValidationError);
      });
    });

    describe('getCategoryById', () => {
      it('should return category when found', async () => {
        const mockCategory = {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices',
          parentId: null,
          path: '["Electronics"]',
          imageUrl: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockDb = mockDatabaseService.getDatabase();
        mockDb.select().from().where.mockResolvedValue([mockCategory]);

        const result = await productService.getCategoryById('cat-1');

        expect(result).toEqual({
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices',
          parentId: null,
          path: ['Electronics'],
          imageUrl: null,
          isActive: true,
          sortOrder: 0,
          createdAt: mockCategory.createdAt,
          updatedAt: mockCategory.updatedAt
        });
      });

      it('should return null when category not found', async () => {
        const mockDb = mockDatabaseService.getDatabase();
        mockDb.select().from().where.mockResolvedValue([]);

        const result = await productService.getCategoryById('nonexistent');

        expect(result).toBeNull();
      });
    });
  });

  describe('Product Management', () => {
    describe('createProduct', () => {
      it('should create a product successfully', async () => {
        const input: CreateProductInput = {
          sellerId: 'seller-1',
          title: 'iPhone 15 Pro',
          description: 'Latest iPhone with advanced features',
          price: {
            amount: '999.99',
            currency: 'USD'
          },
          categoryId: 'cat-1',
          images: ['ipfs://image1', 'ipfs://image2'],
          metadata: {
            condition: 'new',
            brand: 'Apple',
            model: 'iPhone 15 Pro'
          },
          inventory: 10,
          tags: ['smartphone', 'apple', 'ios']
        };

        const mockCategory = {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices',
          parentId: null,
          path: '["Electronics"]',
          imageUrl: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockProduct = {
          id: 'prod-1',
          sellerId: 'seller-1',
          title: 'iPhone 15 Pro',
          description: 'Latest iPhone with advanced features',
          priceAmount: '999.99',
          priceCurrency: 'USD',
          categoryId: 'cat-1',
          images: '["ipfs://image1","ipfs://image2"]',
          metadata: '{"condition":"new","brand":"Apple","model":"iPhone 15 Pro"}',
          inventory: 10,
          status: 'active',
          tags: '["smartphone","apple","ios"]',
          shipping: null,
          nft: null,
          views: 0,
          favorites: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockDb = mockDatabaseService.getDatabase();
        
        // Mock category lookup
        mockDb.select().from().where.mockResolvedValueOnce([mockCategory]);
        
        // Mock product creation
        mockDb.insert().values().returning.mockResolvedValue([mockProduct]);

        const result = await productService.createProduct(input);

        expect(result.title).toBe('iPhone 15 Pro');
        expect(result.price.amount).toBe('999.99');
        expect(result.category.name).toBe('Electronics');
        expect(result.tags).toEqual(['smartphone', 'apple', 'ios']);
      });

      it('should throw validation error for missing required fields', async () => {
        const input: CreateProductInput = {
          sellerId: '',
          title: '',
          description: '',
          price: {
            amount: '0',
            currency: 'USD'
          },
          categoryId: '',
          images: [],
          metadata: { condition: 'new' },
          inventory: 0,
          tags: []
        };

        await expect(productService.createProduct(input)).rejects.toThrow(ValidationError);
      });

      it('should throw validation error for invalid price', async () => {
        const input: CreateProductInput = {
          sellerId: 'seller-1',
          title: 'Test Product',
          description: 'Test Description',
          price: {
            amount: '-10',
            currency: 'USD'
          },
          categoryId: 'cat-1',
          images: [],
          metadata: { condition: 'new' },
          inventory: 1,
          tags: []
        };

        await expect(productService.createProduct(input)).rejects.toThrow(ValidationError);
      });
    });

    describe('searchProducts', () => {
      it('should search products with filters', async () => {
        const filters: ProductSearchFilters = {
          query: 'iPhone',
          categoryId: 'cat-1',
          priceMin: '500',
          priceMax: '1500',
          currency: 'USD'
        };

        const mockProducts = [{
          products: {
            id: 'prod-1',
            sellerId: 'seller-1',
            title: 'iPhone 15 Pro',
            description: 'Latest iPhone',
            priceAmount: '999.99',
            priceCurrency: 'USD',
            categoryId: 'cat-1',
            images: '["ipfs://image1"]',
            metadata: '{"condition":"new"}',
            inventory: 10,
            status: 'active',
            tags: '["smartphone"]',
            shipping: null,
            nft: null,
            views: 100,
            favorites: 25,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          categories: {
            id: 'cat-1',
            name: 'Electronics',
            slug: 'electronics',
            description: 'Electronic devices',
            parentId: null,
            path: '["Electronics"]',
            imageUrl: null,
            isActive: true,
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }];

        const mockDb = mockDatabaseService.getDatabase();
        
        // Mock count query
        mockDb.select().from().where.mockResolvedValueOnce([{ count: 1 }]);
        
        // Mock products query
        mockDb.select().from().leftJoin().where().orderBy().limit().offset.mockResolvedValue(mockProducts);

        const result = await productService.searchProducts(filters);

        expect(result.products).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.products[0].title).toBe('iPhone 15 Pro');
      });
    });

    describe('updateProduct', () => {
      it('should update product successfully', async () => {
        const input: UpdateProductInput = {
          title: 'Updated iPhone 15 Pro',
          price: {
            amount: '899.99',
            currency: 'USD'
          },
          inventory: 5
        };

        const mockProduct = {
          id: 'prod-1',
          sellerId: 'seller-1',
          title: 'Updated iPhone 15 Pro',
          description: 'Latest iPhone',
          priceAmount: '899.99',
          priceCurrency: 'USD',
          categoryId: 'cat-1',
          images: '["ipfs://image1"]',
          metadata: '{"condition":"new"}',
          inventory: 5,
          status: 'active',
          tags: '["smartphone"]',
          shipping: null,
          nft: null,
          views: 100,
          favorites: 25,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockCategory = {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices',
          parentId: null,
          path: '["Electronics"]',
          imageUrl: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockDb = mockDatabaseService.getDatabase();
        
        // Mock update
        mockDb.update().set().where().returning.mockResolvedValue([mockProduct]);
        
        // Mock getProductById call
        mockDb.select().from().leftJoin().where.mockResolvedValue([{
          products: mockProduct,
          categories: mockCategory
        }]);

        const result = await productService.updateProduct('prod-1', input);

        expect(result?.title).toBe('Updated iPhone 15 Pro');
        expect(result?.price.amount).toBe('899.99');
        expect(result?.inventory).toBe(5);
      });
    });
  });

  describe('Image Upload', () => {
    describe('uploadProductImages', () => {
      it('should upload images successfully', async () => {
        const files = [
          {
            buffer: Buffer.from('fake image data'),
            originalName: 'image1.jpg',
            mimeType: 'image/jpeg'
          },
          {
            buffer: Buffer.from('fake image data 2'),
            originalName: 'image2.png',
            mimeType: 'image/png'
          }
        ];

        mockMetadataService.uploadToIPFS = jest.fn()
          .mockResolvedValueOnce('ipfs://hash1')
          .mockResolvedValueOnce('ipfs://hash2');

        const result = await productService.uploadProductImages(files);

        expect(result.totalUploaded).toBe(2);
        expect(result.totalFailed).toBe(0);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].ipfsHash).toBe('ipfs://hash1');
        expect(result.results[1].success).toBe(true);
        expect(result.results[1].ipfsHash).toBe('ipfs://hash2');
      });

      it('should handle non-image files', async () => {
        const files = [
          {
            buffer: Buffer.from('not an image'),
            originalName: 'document.pdf',
            mimeType: 'application/pdf'
          }
        ];

        const result = await productService.uploadProductImages(files);

        expect(result.totalUploaded).toBe(0);
        expect(result.totalFailed).toBe(1);
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].error).toBe('File is not an image');
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('bulkUploadProducts', () => {
      it('should upload multiple products successfully', async () => {
        const upload: BulkProductUpload = {
          products: [
            {
              sellerId: 'seller-1',
              title: 'Product 1',
              description: 'Description 1',
              price: { amount: '100', currency: 'USD' },
              categoryId: 'cat-1',
              images: [],
              metadata: { condition: 'new' },
              inventory: 10,
              tags: ['tag1']
            },
            {
              sellerId: 'seller-1',
              title: 'Product 2',
              description: 'Description 2',
              price: { amount: '200', currency: 'USD' },
              categoryId: 'cat-1',
              images: [],
              metadata: { condition: 'new' },
              inventory: 5,
              tags: ['tag2']
            }
          ],
          defaultSellerId: 'seller-1'
        };

        const mockCategory = {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices',
          parentId: null,
          path: '["Electronics"]',
          imageUrl: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockDb = mockDatabaseService.getDatabase();
        
        // Mock category lookups
        mockDb.select().from().where
          .mockResolvedValueOnce([mockCategory])
          .mockResolvedValueOnce([mockCategory]);
        
        // Mock product creations
        mockDb.insert().values().returning
          .mockResolvedValueOnce([{ id: 'prod-1' }])
          .mockResolvedValueOnce([{ id: 'prod-2' }]);

        const result = await productService.bulkUploadProducts(upload);

        expect(result.success).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.createdProducts).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle partial failures', async () => {
        const upload: BulkProductUpload = {
          products: [
            {
              sellerId: 'seller-1',
              title: 'Valid Product',
              description: 'Valid Description',
              price: { amount: '100', currency: 'USD' },
              categoryId: 'cat-1',
              images: [],
              metadata: { condition: 'new' },
              inventory: 10,
              tags: []
            },
            {
              sellerId: '',
              title: '',
              description: '',
              price: { amount: '0', currency: 'USD' },
              categoryId: '',
              images: [],
              metadata: { condition: 'new' },
              inventory: 0,
              tags: []
            }
          ],
          defaultSellerId: 'seller-1'
        };

        const mockCategory = {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices',
          parentId: null,
          path: '["Electronics"]',
          imageUrl: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockDb = mockDatabaseService.getDatabase();
        
        // Mock category lookup for first product
        mockDb.select().from().where.mockResolvedValueOnce([mockCategory]);
        
        // Mock product creation for first product
        mockDb.insert().values().returning.mockResolvedValueOnce([{ id: 'prod-1' }]);

        const result = await productService.bulkUploadProducts(upload);

        expect(result.success).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.createdProducts).toHaveLength(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].row).toBe(2);
      });
    });

    describe('parseCSVProducts', () => {
      it('should parse CSV data correctly', async () => {
        const csvData: CSVProductRow[] = [
          {
            title: 'Test Product',
            description: 'Test Description',
            price: '99.99',
            currency: 'USD',
            category: 'Electronics',
            inventory: '10',
            tags: 'tag1,tag2,tag3',
            condition: 'new',
            brand: 'TestBrand',
            weight: '500'
          }
        ];

        const categoryMappings = {
          'Electronics': 'cat-1'
        };

        // Mock getAllCategories call
        jest.spyOn(productService, 'getAllCategories').mockResolvedValue([
          {
            id: 'cat-1',
            name: 'Electronics',
            slug: 'electronics',
            description: 'Electronic devices',
            parentId: null,
            path: ['Electronics'],
            imageUrl: null,
            isActive: true,
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]);

        const result = await productService.parseCSVProducts(csvData, 'seller-1', categoryMappings);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Test Product');
        expect(result[0].price.amount).toBe('99.99');
        expect(result[0].categoryId).toBe('cat-1');
        expect(result[0].tags).toEqual(['tag1', 'tag2', 'tag3']);
        expect(result[0].metadata.brand).toBe('TestBrand');
        expect(result[0].metadata.weight).toBe(500);
      });

      it('should throw error for unknown category', async () => {
        const csvData: CSVProductRow[] = [
          {
            title: 'Test Product',
            description: 'Test Description',
            price: '99.99',
            currency: 'USD',
            category: 'Unknown Category',
            inventory: '10',
            tags: '',
            condition: 'new'
          }
        ];

        // Mock getAllCategories call
        jest.spyOn(productService, 'getAllCategories').mockResolvedValue([]);

        await expect(productService.parseCSVProducts(csvData, 'seller-1')).rejects.toThrow('Category not found: Unknown Category');
      });
    });
  });
});
