import request from 'supertest';
import express from 'express';
import { ProductController } from '../controllers/productController';
import { ProductService } from '../services/productService';
import { errorHandler } from '../middleware/errorHandler';
import productRoutes from '../routes/productRoutes';

// Mock the ProductService
jest.mock('../services/productService');

describe('ProductController', () => {
  let app: express.Application;
  let mockProductService: jest.Mocked<ProductService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api', productRoutes);
    app.use(errorHandler);

    mockProductService = new ProductService() as jest.Mocked<ProductService>;
  });

  describe('Category Management', () => {
    describe('POST /api/categories', () => {
      it('should create a category successfully', async () => {
        const categoryInput = {
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
          path: ['Electronics'],
          imageUrl: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockProductService.createCategory = jest.fn().mockResolvedValue(mockCategory);

        const response = await request(app)
          .post('/api/categories')
          .send(categoryInput);

        expect(response.status).toBe(201);
        expect(response.body).toEqual(mockCategory);
      });

      it('should return 400 for missing required fields', async () => {
        const categoryInput = {
          name: '',
          slug: ''
        };

        const response = await request(app)
          .post('/api/categories')
          .send(categoryInput);

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/categories/:id', () => {
      it('should return category when found', async () => {
        const mockCategory = {
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
        };

        mockProductService.getCategoryById = jest.fn().mockResolvedValue(mockCategory);

        const response = await request(app)
          .get('/api/categories/cat-1');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockCategory);
      });

      it('should return 404 when category not found', async () => {
        mockProductService.getCategoryById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get('/api/categories/nonexistent');

        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/categories', () => {
      it('should return all categories', async () => {
        const mockCategories = [
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
        ];

        mockProductService.getAllCategories = jest.fn().mockResolvedValue(mockCategories);

        const response = await request(app)
          .get('/api/categories');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockCategories);
      });
    });

    describe('PUT /api/categories/:id', () => {
      it('should update category successfully', async () => {
        const updateInput = {
          name: 'Updated Electronics',
          description: 'Updated description'
        };

        const mockUpdatedCategory = {
          id: 'cat-1',
          name: 'Updated Electronics',
          slug: 'electronics',
          description: 'Updated description',
          parentId: null,
          path: ['Updated Electronics'],
          imageUrl: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockProductService.updateCategory = jest.fn().mockResolvedValue(mockUpdatedCategory);

        const response = await request(app)
          .put('/api/categories/cat-1')
          .send(updateInput);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockUpdatedCategory);
      });

      it('should return 404 when category not found', async () => {
        mockProductService.updateCategory = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .put('/api/categories/nonexistent')
          .send({ name: 'Updated' });

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/categories/:id', () => {
      it('should delete category successfully', async () => {
        mockProductService.deleteCategory = jest.fn().mockResolvedValue(true);

        const response = await request(app)
          .delete('/api/categories/cat-1');

        expect(response.status).toBe(204);
      });

      it('should return 404 when category not found', async () => {
        mockProductService.deleteCategory = jest.fn().mockResolvedValue(false);

        const response = await request(app)
          .delete('/api/categories/nonexistent');

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Product Management', () => {
    describe('POST /api/products', () => {
      it('should create a product successfully', async () => {
        const productInput = {
          sellerId: 'seller-1',
          title: 'iPhone 15 Pro',
          description: 'Latest iPhone with advanced features',
          price: {
            amount: '999.99',
            currency: 'USD'
          },
          categoryId: 'cat-1',
          images: ['ipfs://image1'],
          metadata: {
            condition: 'new',
            brand: 'Apple'
          },
          inventory: 10,
          tags: ['smartphone', 'apple']
        };

        const mockProduct = {
          id: 'prod-1',
          sellerId: 'seller-1',
          title: 'iPhone 15 Pro',
          description: 'Latest iPhone with advanced features',
          price: {
            amount: '999.99',
            currency: 'USD'
          },
          category: {
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
          },
          images: ['ipfs://image1'],
          metadata: {
            condition: 'new',
            brand: 'Apple'
          },
          inventory: 10,
          status: 'active' as const,
          tags: ['smartphone', 'apple'],
          views: 0,
          favorites: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockProductService.createProduct = jest.fn().mockResolvedValue(mockProduct);

        const response = await request(app)
          .post('/api/products')
          .send(productInput);

        expect(response.status).toBe(201);
        expect(response.body.title).toBe('iPhone 15 Pro');
        expect(response.body.price.amount).toBe('999.99');
      });

      it('should return 400 for missing required fields', async () => {
        const productInput = {
          sellerId: '',
          title: '',
          description: '',
          price: {
            amount: '0',
            currency: 'USD'
          },
          categoryId: ''
        };

        const response = await request(app)
          .post('/api/products')
          .send(productInput);

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/products/:id', () => {
      it('should return product when found', async () => {
        const mockProduct = {
          id: 'prod-1',
          sellerId: 'seller-1',
          title: 'iPhone 15 Pro',
          description: 'Latest iPhone',
          price: {
            amount: '999.99',
            currency: 'USD'
          },
          category: {
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
          },
          images: ['ipfs://image1'],
          metadata: { condition: 'new' as const },
          inventory: 10,
          status: 'active' as const,
          tags: ['smartphone'],
          views: 100,
          favorites: 25,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockProductService.getProductById = jest.fn().mockResolvedValue(mockProduct);

        const response = await request(app)
          .get('/api/products/prod-1');

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('iPhone 15 Pro');
      });

      it('should return 404 when product not found', async () => {
        mockProductService.getProductById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get('/api/products/nonexistent');

        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/products/search', () => {
      it('should search products with filters', async () => {
        const mockSearchResult = {
          products: [
            {
              id: 'prod-1',
              sellerId: 'seller-1',
              title: 'iPhone 15 Pro',
              description: 'Latest iPhone',
              price: {
                amount: '999.99',
                currency: 'USD'
              },
              category: {
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
              },
              images: ['ipfs://image1'],
              metadata: { condition: 'new' as const },
              inventory: 10,
              status: 'active' as const,
              tags: ['smartphone'],
              views: 100,
              favorites: 25,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          filters: {
            query: 'iPhone'
          },
          sort: {
            field: 'createdAt' as const,
            direction: 'desc' as const
          }
        };

        mockProductService.searchProducts = jest.fn().mockResolvedValue(mockSearchResult);

        const response = await request(app)
          .get('/api/products/search?query=iPhone&page=1&limit=20');

        expect(response.status).toBe(200);
        expect(response.body.products).toHaveLength(1);
        expect(response.body.total).toBe(1);
        expect(response.body.products[0].title).toBe('iPhone 15 Pro');
      });
    });

    describe('PUT /api/products/:id', () => {
      it('should update product successfully', async () => {
        const updateInput = {
          title: 'Updated iPhone 15 Pro',
          price: {
            amount: '899.99',
            currency: 'USD'
          }
        };

        const mockUpdatedProduct = {
          id: 'prod-1',
          sellerId: 'seller-1',
          title: 'Updated iPhone 15 Pro',
          description: 'Latest iPhone',
          price: {
            amount: '899.99',
            currency: 'USD'
          },
          category: {
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
          },
          images: ['ipfs://image1'],
          metadata: { condition: 'new' as const },
          inventory: 10,
          status: 'active' as const,
          tags: ['smartphone'],
          views: 100,
          favorites: 25,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockProductService.updateProduct = jest.fn().mockResolvedValue(mockUpdatedProduct);

        const response = await request(app)
          .put('/api/products/prod-1')
          .send(updateInput);

        expect(response.status).toBe(200);
        expect(response.body.title).toBe('Updated iPhone 15 Pro');
        expect(response.body.price.amount).toBe('899.99');
      });

      it('should return 404 when product not found', async () => {
        mockProductService.updateProduct = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .put('/api/products/nonexistent')
          .send({ title: 'Updated' });

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/products/:id', () => {
      it('should delete product successfully', async () => {
        mockProductService.deleteProduct = jest.fn().mockResolvedValue(true);

        const response = await request(app)
          .delete('/api/products/prod-1');

        expect(response.status).toBe(204);
      });

      it('should return 404 when product not found', async () => {
        mockProductService.deleteProduct = jest.fn().mockResolvedValue(false);

        const response = await request(app)
          .delete('/api/products/nonexistent');

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('POST /api/products/bulk', () => {
      it('should upload multiple products successfully', async () => {
        const bulkUpload = {
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
              tags: []
            }
          ],
          defaultSellerId: 'seller-1'
        };

        const mockResult = {
          success: 1,
          failed: 0,
          errors: [],
          createdProducts: [
            {
              id: 'prod-1',
              sellerId: 'seller-1',
              title: 'Product 1',
              description: 'Description 1',
              price: { amount: '100', currency: 'USD' },
              category: {
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
              },
              images: [],
              metadata: { condition: 'new' as const },
              inventory: 10,
              status: 'active' as const,
              tags: [],
              views: 0,
              favorites: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        };

        mockProductService.bulkUploadProducts = jest.fn().mockResolvedValue(mockResult);

        const response = await request(app)
          .post('/api/products/bulk')
          .send(bulkUpload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(1);
        expect(response.body.failed).toBe(0);
        expect(response.body.createdProducts).toHaveLength(1);
      });

      it('should return 400 for missing products', async () => {
        const bulkUpload = {
          products: [],
          defaultSellerId: 'seller-1'
        };

        const response = await request(app)
          .post('/api/products/bulk')
          .send(bulkUpload);

        expect(response.status).toBe(400);
      });

      it('should return 400 for missing defaultSellerId', async () => {
        const bulkUpload = {
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
              tags: []
            }
          ]
        };

        const response = await request(app)
          .post('/api/products/bulk')
          .send(bulkUpload);

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Analytics', () => {
    describe('GET /api/products/:id/analytics', () => {
      it('should return product analytics', async () => {
        const mockAnalytics = {
          productId: 'prod-1',
          views: 100,
          favorites: 25,
          orders: 5,
          revenue: '4999.95',
          conversionRate: 0.05,
          averageRating: 4.5,
          reviewCount: 10,
          period: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          }
        };

        mockProductService.getProductAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

        const response = await request(app)
          .get('/api/products/prod-1/analytics?startDate=2024-01-01&endDate=2024-01-31');

        expect(response.status).toBe(200);
        expect(response.body.views).toBe(100);
        expect(response.body.favorites).toBe(25);
        expect(response.body.orders).toBe(5);
      });

      it('should return 400 for missing date parameters', async () => {
        const response = await request(app)
          .get('/api/products/prod-1/analytics');

        expect(response.status).toBe(400);
      });

      it('should return 404 when product not found', async () => {
        mockProductService.getProductAnalytics = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get('/api/products/nonexistent/analytics?startDate=2024-01-01&endDate=2024-01-31');

        expect(response.status).toBe(404);
      });
    });
  });
});
