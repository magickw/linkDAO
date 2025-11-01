import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { ProductService } from '../services/productService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { SearchService, AdvancedSearchFilters } from '../services/searchService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { 
  CreateProductInput, 
  UpdateProductInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  ProductSearchFilters,
  ProductSortOptions,
  PaginationOptions,
  BulkProductUpload,
  CSVProductRow
} from '../models/Product';
import { AppError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { Readable } from 'stream';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

const multer = require('multer');
const csv = require('csv-parser');

const productService = new ProductService();
const searchService = new SearchService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Allow images and CSV files
    if (file.mimetype.startsWith('image/') || file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only image and CSV files are allowed'));
    }
  },
});

export class ProductController {
  // Category Management
  async createCategory(req: Request, res: Response): Promise<Response> {
    try {
      const input: CreateCategoryInput = req.body;
      
      if (!input.name || !input.slug) {
        throw new ValidationError('Name and slug are required');
      }
      
      const category = await productService.createCategory(input);
      return res.status(201).json(category);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getCategoryById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const category = await productService.getCategoryById(id);
      
      if (!category) {
        throw new NotFoundError('Category not found');
      }
      
      return res.json(category);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getCategoryBySlug(req: Request, res: Response): Promise<Response> {
    try {
      const { slug } = req.params;
      const category = await productService.getCategoryBySlug(slug);
      
      if (!category) {
        throw new NotFoundError('Category not found');
      }
      
      return res.json(category);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getAllCategories(req: Request, res: Response): Promise<Response> {
    try {
      const categories = await productService.getAllCategories();
      return res.json(categories);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async getCategoriesByParent(req: Request, res: Response): Promise<Response> {
    try {
      const { parentId } = req.params;
      const categories = await productService.getCategoriesByParent(parentId === 'null' ? null : parentId);
      return res.json(categories);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async updateCategory(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const input: UpdateCategoryInput = req.body;
      
      const category = await productService.updateCategory(id, input);
      
      if (!category) {
        throw new NotFoundError('Category not found');
      }
      
      return res.json(category);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const success = await productService.deleteCategory(id);
      
      if (!success) {
        throw new NotFoundError('Category not found');
      }
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  // Product Management
  async createProduct(req: Request, res: Response): Promise<Response> {
    try {
      const input: CreateProductInput = req.body;
      
      // Validate required fields
      if (!input.sellerId || !input.title || !input.description || !input.price || !input.categoryId) {
        throw new ValidationError('Missing required fields');
      }
      
      const product = await productService.createProduct(input);
      return res.status(201).json(product);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getProductById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);
      
      if (!product) {
        throw new NotFoundError('Product not found');
      }
      
      return res.json(product);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getProductsBySeller(req: Request, res: Response): Promise<Response> {
    try {
      const { sellerId } = req.params;
      const filters = req.query as Partial<ProductSearchFilters>;
      
      const products = await productService.getProductsBySeller(sellerId, filters);
      return res.json(products);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async searchProducts(req: Request, res: Response): Promise<Response> {
    try {
      const filters: ProductSearchFilters = {
        query: req.query.query as string,
        categoryId: req.query.categoryId as string,
        sellerId: req.query.sellerId as string,
        priceMin: req.query.priceMin as string,
        priceMax: req.query.priceMax as string,
        currency: req.query.currency as string,
        condition: req.query.condition as any,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        status: req.query.status ? (req.query.status as string).split(',') as any : undefined,
        inStock: req.query.inStock === 'true',
        freeShipping: req.query.freeShipping === 'true',
      };

      const sort: ProductSortOptions = {
        field: (req.query.sortField as any) || 'createdAt',
        direction: (req.query.sortDirection as any) || 'desc',
      };

      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await productService.searchProducts(filters, sort, pagination);
      return res.json(result);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async advancedSearch(req: Request, res: Response): Promise<Response> {
    try {
      const filters: AdvancedSearchFilters = {
        query: req.query.query as string,
        categoryId: req.query.categoryId as string,
        sellerId: req.query.sellerId as string,
        priceMin: req.query.priceMin as string,
        priceMax: req.query.priceMax as string,
        currency: req.query.currency as string,
        condition: req.query.condition as any,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        status: req.query.status ? (req.query.status as string).split(',') as any : undefined,
        inStock: req.query.inStock === 'true',
        freeShipping: req.query.freeShipping === 'true',
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
        maxRating: req.query.maxRating ? parseFloat(req.query.maxRating as string) : undefined,
        sellerReputation: req.query.sellerReputation as any,
        hasReviews: req.query.hasReviews === 'true',
        recentlyAdded: req.query.recentlyAdded === 'true',
        trending: req.query.trending === 'true',
        onSale: req.query.onSale === 'true',
        fastShipping: req.query.fastShipping === 'true',
        location: req.query.country || req.query.state || req.query.city ? {
          country: req.query.country as string,
          state: req.query.state as string,
          city: req.query.city as string,
          radius: req.query.radius ? parseInt(req.query.radius as string) : undefined,
          coordinates: req.query.lat && req.query.lng ? {
            lat: parseFloat(req.query.lat as string),
            lng: parseFloat(req.query.lng as string),
          } : undefined,
        } : undefined,
      };

      const sort: ProductSortOptions = {
        field: (req.query.sortField as any) || 'relevance',
        direction: (req.query.sortDirection as any) || 'desc',
      };

      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await searchService.advancedSearch(filters, sort, pagination);
      return res.json(result);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async getRecommendations(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.query.userId as string;
      const productId = req.query.productId as string;
      const categoryId = req.query.categoryId as string;
      const limit = parseInt(req.query.limit as string) || 10;

      if (limit > 50) {
        throw new ValidationError('Limit cannot exceed 50');
      }

      const recommendations = await searchService.getRecommendations(
        userId,
        productId,
        categoryId,
        limit
      );

      return res.json({
        recommendations,
        count: recommendations.length,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async compareProducts(req: Request, res: Response): Promise<Response> {
    try {
      const productIds = req.query.productIds as string;
      
      if (!productIds) {
        throw new ValidationError('Product IDs are required');
      }

      const ids = productIds.split(',').map(id => id.trim());
      
      if (ids.length < 2 || ids.length > 5) {
        throw new ValidationError('Can compare between 2 and 5 products');
      }

      const comparison = await searchService.compareProducts(ids);
      return res.json(comparison);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getSearchSuggestions(req: Request, res: Response): Promise<Response> {
    try {
      const query = req.query.query as string;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query || query.trim().length < 2) {
        throw new ValidationError('Query must be at least 2 characters long');
      }

      if (limit > 20) {
        throw new ValidationError('Limit cannot exceed 20');
      }

      const suggestions = await searchService.getSearchSuggestions(query.trim(), limit);
      return res.json({
        suggestions,
        count: suggestions.length,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getSearchAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        throw new ValidationError('Start date and end date are required');
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('Invalid date format');
      }

      if (end <= start) {
        throw new ValidationError('End date must be after start date');
      }

      const filters = req.query.filters ? JSON.parse(req.query.filters as string) : undefined;
      
      const analytics = await searchService.getSearchAnalytics(start, end, filters);
      return res.json(analytics);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async optimizeSearchPerformance(req: Request, res: Response): Promise<Response> {
    try {
      const result = await searchService.optimizeSearchPerformance();
      return res.json({
        success: true,
        message: 'Search performance optimization completed',
        results: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async updateProduct(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const input: UpdateProductInput = req.body;
      
      const product = await productService.updateProduct(id, input);
      
      if (!product) {
        throw new NotFoundError('Product not found');
      }
      
      return res.json(product);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const success = await productService.deleteProduct(id);
      
      if (!success) {
        throw new NotFoundError('Product not found');
      }
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  // Image Upload
  async uploadProductImages(req: any, res: Response): Promise<Response> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new ValidationError('No images provided');
      }

      const files = req.files.map((file: any) => ({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      }));

      const result = await productService.uploadProductImages(files);
      return res.json(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  // Bulk Operations
  async bulkUploadProducts(req: Request, res: Response): Promise<Response> {
    try {
      const upload: BulkProductUpload = req.body;
      
      if (!upload.products || !Array.isArray(upload.products) || upload.products.length === 0) {
        throw new ValidationError('No products provided');
      }
      
      if (!upload.defaultSellerId) {
        throw new ValidationError('Default seller ID is required');
      }
      
      const result = await productService.bulkUploadProducts(upload);
      return res.json(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async uploadProductsCSV(req: any, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        throw new ValidationError('CSV file is required');
      }

      const { defaultSellerId, categoryMappings } = req.body;
      
      if (!defaultSellerId) {
        throw new ValidationError('Default seller ID is required');
      }

      // Parse CSV
      const csvData: CSVProductRow[] = [];
      const stream = Readable.from(req.file.buffer.toString());
      
      return new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (row: CSVProductRow) => {
            csvData.push(row);
          })
          .on('end', async () => {
            try {
              const parsedCategoryMappings = categoryMappings ? JSON.parse(categoryMappings) : {};
              const products = await productService.parseCSVProducts(csvData, defaultSellerId, parsedCategoryMappings);
              
              const bulkUpload: BulkProductUpload = {
                products,
                categoryMappings: parsedCategoryMappings,
                defaultSellerId,
              };
              
              const result = await productService.bulkUploadProducts(bulkUpload);
              resolve(res.json(result));
            } catch (error: any) {
              reject(new AppError(500, error.message));
            }
          })
          .on('error', (error: any) => {
            reject(new AppError(400, `CSV parsing error: ${error.message}`));
          });
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  // Analytics
  async getProductAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        throw new ValidationError('Start date and end date are required');
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('Invalid date format');
      }
      
      const analytics = await productService.getProductAnalytics(id, start, end);
      
      if (!analytics) {
        throw new NotFoundError('Product not found');
      }
      
      return res.json(analytics);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  // Middleware for file uploads
  static getUploadMiddleware() {
    return {
      single: upload.single.bind(upload),
      array: upload.array.bind(upload),
      fields: upload.fields.bind(upload),
    };
  }
}