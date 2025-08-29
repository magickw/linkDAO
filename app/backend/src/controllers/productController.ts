import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
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
import { APIError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { Readable } from 'stream';

// Type declarations for multer and csv-parser
declare const require: any;
const multer = require('multer');
const csv = require('csv-parser');

const productService = new ProductService();

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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async getAllCategories(req: Request, res: Response): Promise<Response> {
    try {
      const categories = await productService.getAllCategories();
      return res.json(categories);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  async getCategoriesByParent(req: Request, res: Response): Promise<Response> {
    try {
      const { parentId } = req.params;
      const categories = await productService.getCategoriesByParent(parentId === 'null' ? null : parentId);
      return res.json(categories);
    } catch (error: any) {
      throw new APIError(500, error.message);
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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async getProductsBySeller(req: Request, res: Response): Promise<Response> {
    try {
      const { sellerId } = req.params;
      const filters = req.query as Partial<ProductSearchFilters>;
      
      const products = await productService.getProductsBySeller(sellerId, filters);
      return res.json(products);
    } catch (error: any) {
      throw new APIError(500, error.message);
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
      throw new APIError(500, error.message);
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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  // Image Upload
  async uploadProductImages(req: any, res: Response): Promise<Response> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new ValidationError('No images provided', 'files');
      }

      const files = req.files.map((file: any) => ({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      }));

      const result = await productService.uploadProductImages(files);
      return res.json(result);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async uploadProductsCSV(req: any, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        throw new ValidationError('CSV file is required', 'csvFile');
      }

      const { defaultSellerId, categoryMappings } = req.body;
      
      if (!defaultSellerId) {
        throw new ValidationError('Default seller ID is required', 'defaultSellerId');
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
              reject(new APIError(500, error.message));
            }
          })
          .on('error', (error: any) => {
            reject(new APIError(400, `CSV parsing error: ${error.message}`));
          });
      });
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
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
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
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