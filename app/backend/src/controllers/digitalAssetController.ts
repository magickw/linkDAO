import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { digitalAssetService } from '../services/digitalAssetService';
import { analyticsService } from '../services/analyticsService';
import { watermarkService } from '../services/watermarkService';
import { 
  CreateDigitalAssetRequest, 
  CreateLicenseRequest, 
  PurchaseLicenseRequest,
  AssetAccessRequest,
  SubmitDMCARequest,
  AssetAnalyticsQuery,
  CreateWatermarkTemplateRequest,
  AccessType
} from '../types/digitalAsset';
import multer from 'multer';
import { z } from 'zod';

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for digital assets
    cb(null, true);
  }
});

// Validation schemas
const createAssetSchema = z.object({
  nftId: z.string().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assetType: z.enum(['image', 'video', 'audio', 'document', 'software', 'ebook', 'game', '3d_model', 'animation', 'font', 'template', 'other']),
  licenseType: z.enum(['standard', 'personal', 'commercial', 'extended', 'exclusive', 'creative_commons', 'custom']),
  licenseTerms: z.string().optional(),
  copyrightNotice: z.string().optional(),
  downloadLimit: z.number().int().min(-1).optional(),
  streamingEnabled: z.boolean().optional(),
  watermarkEnabled: z.boolean().optional()
});

const createLicenseSchema = z.object({
  assetId: z.string().uuid(),
  licenseName: z.string().min(1).max(100),
  licenseType: z.enum(['standard', 'personal', 'commercial', 'extended', 'exclusive', 'creative_commons', 'custom']),
  price: z.string(),
  currency: z.string(),
  usageRights: z.object({
    personalUse: z.boolean(),
    commercialUse: z.boolean(),
    modification: z.boolean(),
    redistribution: z.boolean(),
    printRights: z.boolean(),
    digitalRights: z.boolean(),
    exclusiveRights: z.boolean(),
    resaleRights: z.boolean(),
    sublicensingRights: z.boolean()
  }),
  durationDays: z.number().int().positive().optional(),
  maxDownloads: z.number().int().min(-1).optional(),
  maxUsers: z.number().int().positive().optional()
});

const purchaseLicenseSchema = z.object({
  assetId: z.string().uuid(),
  licenseId: z.string().uuid(),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  pricePaid: z.string(),
  currency: z.string()
});

const dmcaRequestSchema = z.object({
  assetId: z.string().uuid(),
  reporterName: z.string().min(1).max(255),
  reporterEmail: z.string().email(),
  reporterOrganization: z.string().max(255).optional(),
  copyrightHolderName: z.string().min(1).max(255),
  originalWorkDescription: z.string().min(10),
  infringementDescription: z.string().min(10),
  evidenceUrls: z.array(z.string().url()).optional(),
  swornStatement: z.string().min(50),
  contactInformation: z.string().min(10)
});

export class DigitalAssetController {
  
  /**
   * Create a new digital asset
   */
  async createAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Validate request body
      const validatedData = createAssetSchema.parse(req.body);
      
      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({ error: 'File is required' });
        return;
      }
      
      const createRequest: CreateDigitalAssetRequest = {
        ...validatedData,
        fileFormat: req.file.originalname.split('.').pop()?.toLowerCase() || 'unknown',
        file: req.file.buffer
      } as CreateDigitalAssetRequest;
      
      const asset = await digitalAssetService.createDigitalAsset(userId, createRequest);
      
      res.status(201).json({
        success: true,
        data: asset
      });
    } catch (error) {
      console.error('Error creating digital asset:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create digital asset' });
      }
    }
  }
  
  /**
   * Create a license for a digital asset
   */
  async createLicense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const validatedData = createLicenseSchema.parse(req.body);
      
      const license = await digitalAssetService.createLicense(validatedData as CreateLicenseRequest);
      
      res.status(201).json({
        success: true,
        data: license
      });
    } catch (error) {
      console.error('Error creating license:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create license' });
      }
    }
  }
  
  /**
   * Purchase a license for a digital asset
   */
  async purchaseLicense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const validatedData = purchaseLicenseSchema.parse(req.body);
      
      const purchase = await digitalAssetService.purchaseLicense(userId, validatedData);
      
      res.status(201).json({
        success: true,
        data: purchase
      });
    } catch (error) {
      console.error('Error purchasing license:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to purchase license' });
      }
    }
  }
  
  /**
   * Access digital asset content
   */
  async accessAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { licenseKey, accessType } = req.body;
      
      if (!licenseKey || !accessType) {
        res.status(400).json({ error: 'License key and access type are required' });
        return;
      }
      
      const accessRequest: AssetAccessRequest = {
        licenseKey,
        accessType: accessType as AccessType,
        userAgent: req.get('User-Agent')
      };
      
      const result = await digitalAssetService.accessAsset(
        userId,
        accessRequest,
        req.ip,
        req.get('User-Agent')
      );
      
      if (result.error) {
        res.status(403).json({ error: result.error });
        return;
      }
      
      if (result.content) {
        // Set appropriate headers for file download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment');
        res.send(result.content);
      } else if (result.streamUrl) {
        res.json({
          success: true,
          streamUrl: result.streamUrl
        });
      } else {
        res.status(500).json({ error: 'Unexpected response from asset service' });
      }
    } catch (error) {
      console.error('Error accessing asset:', error);
      res.status(500).json({ error: 'Failed to access asset' });
    }
  }
  
  /**
   * Submit DMCA takedown request
   */
  async submitDMCARequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id; // Optional for DMCA requests
      
      const validatedData = dmcaRequestSchema.parse(req.body);
      
      const requestId = await digitalAssetService.submitDMCARequest(userId, validatedData);
      
      res.status(201).json({
        success: true,
        data: { requestId }
      });
    } catch (error) {
      console.error('Error submitting DMCA request:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to submit DMCA request' });
      }
    }
  }
  
  /**
   * Get analytics for digital assets
   */
  async getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const {
        startDate,
        endDate,
        assetId,
        groupBy = 'day'
      } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }
      
      const analytics = await analyticsService.getAnalytics(
        startDate as string,
        endDate as string,
        assetId as string,
        userId
      );
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }
  
  /**
   * Get time series data for charts
   */
  async getTimeSeriesData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const {
        startDate,
        endDate,
        assetId,
        groupBy = 'day'
      } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }
      
      const timeSeriesData = await analyticsService.getTimeSeriesData(
        startDate as string,
        endDate as string,
        assetId as string,
        groupBy as 'day' | 'week' | 'month'
      );
      
      res.json({
        success: true,
        data: timeSeriesData
      });
    } catch (error) {
      console.error('Error getting time series data:', error);
      res.status(500).json({ error: 'Failed to get time series data' });
    }
  }
  
  /**
   * Get real-time statistics
   */
  async getRealTimeStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { assetId } = req.query;
      
      const stats = await analyticsService.getRealTimeStats(assetId as string);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting real-time stats:', error);
      res.status(500).json({ error: 'Failed to get real-time stats' });
    }
  }
  
  /**
   * Get geographic distribution
   */
  async getGeographicDistribution(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { startDate, endDate, assetId } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }
      
      const distribution = await analyticsService.getGeographicDistribution(
        startDate as string,
        endDate as string,
        assetId as string
      );
      
      res.json({
        success: true,
        data: distribution
      });
    } catch (error) {
      console.error('Error getting geographic distribution:', error);
      res.status(500).json({ error: 'Failed to get geographic distribution' });
    }
  }
  
  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }
      
      const revenueAnalytics = await analyticsService.getRevenueAnalytics(
        startDate as string,
        endDate as string,
        userId
      );
      
      res.json({
        success: true,
        data: revenueAnalytics
      });
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      res.status(500).json({ error: 'Failed to get revenue analytics' });
    }
  }
  
  /**
   * Create watermark template
   */
  async createWatermarkTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { name, templateType, templateData, isDefault } = req.body as CreateWatermarkTemplateRequest;
      
      if (!name || !templateType || !templateData) {
        res.status(400).json({ error: 'Name, template type, and template data are required' });
        return;
      }
      
      const templateId = await watermarkService.createWatermarkTemplate(
        userId,
        name,
        templateType,
        templateData,
        isDefault
      );
      
      res.status(201).json({
        success: true,
        data: { templateId }
      });
    } catch (error) {
      console.error('Error creating watermark template:', error);
      res.status(500).json({ error: 'Failed to create watermark template' });
    }
  }
  
  /**
   * Get watermark templates
   */
  async getWatermarkTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const templates = await watermarkService.getWatermarkTemplates(userId);
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error getting watermark templates:', error);
      res.status(500).json({ error: 'Failed to get watermark templates' });
    }
  }
}

// Create controller instance
export const digitalAssetController = new DigitalAssetController();

// Export middleware for file uploads
export const uploadMiddleware = upload.single('file');