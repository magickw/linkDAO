import { Router } from 'express';
import { selfHostedStorageService } from '../services/selfHostedStorageService';
import { 
  storageAuthMiddleware, 
  storagePermissionMiddleware, 
  fileAccessMiddleware,
  storageRateLimiter,
  contentValidationMiddleware,
  storageSecurityHeaders,
  storageAuditLogger
} from '../middleware/storageAuthMiddleware';
import { safeLogger } from '../utils/safeLogger';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 1 // Single file uploads
  }
});

// Apply global middleware
router.use(storageSecurityHeaders);
router.use(storageAuditLogger);

/**
 * POST /api/storage/upload
 * Upload a file to self-hosted storage
 */
router.post(
  '/upload',
  storageAuthMiddleware,
  storagePermissionMiddleware('write'),
  storageRateLimiter(50), // 50 uploads per minute per user
  contentValidationMiddleware(100 * 1024 * 1024), // 100MB max
  upload.single('file'),
  async (req, res) => {
    try {
      const file = req.file;
      const { contentType, encrypt, readPermissions, writePermissions } = req.body;
      const userId = (req as any).storageUser.id;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No file provided'
        });
        return;
      }

      if (!contentType) {
        res.status(400).json({
          success: false,
          error: 'Content type is required'
        });
        return;
      }

      const result = await selfHostedStorageService.uploadFile(file.buffer, file.originalname, {
        userId,
        contentType,
        encrypt: encrypt !== 'false',
        accessControl: {
          readPermissions: readPermissions ? readPermissions.split(',') : [userId],
          writePermissions: writePermissions ? writePermissions.split(',') : [userId]
        }
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      safeLogger.error('File upload error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  }
);

/**
 * GET /api/storage/:fileId
 * Download a file from self-hosted storage
 */
router.get(
  '/:fileId',
  storageAuthMiddleware,
  fileAccessMiddleware('read'),
  async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const userId = (req as any).storageUser.id;

      const { buffer, metadata } = await selfHostedStorageService.downloadFile(fileId, userId);

      // Set appropriate headers
      res.set({
        'Content-Type': metadata.mimeType,
        'Content-Length': metadata.size,
        'Content-Disposition': `inline; filename="${metadata.originalName}"`,
        'Cache-Control': 'private, max-age=3600',
        'ETag': `"${metadata.checksum}"`
      });

      // Send file
      res.send(buffer);
    } catch (error) {
      safeLogger.error(`File download error for ${req.params.fileId}:`, error);
      
      if ((error as any).message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      } else if ((error as any).code === 'ENOENT') {
        res.status(404).json({
          success: false,
          error: 'File not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Download failed'
        });
      }
    }
  }
);

/**
 * DELETE /api/storage/:fileId
 * Delete a file from self-hosted storage
 */
router.delete(
  '/:fileId',
  storageAuthMiddleware,
  fileAccessMiddleware('delete'),
  async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const userId = (req as any).storageUser.id;

      const success = await selfHostedStorageService.deleteFile(fileId, userId);

      if (success) {
        res.json({
          success: true,
          message: 'File deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }
    } catch (error) {
      safeLogger.error(`File deletion error for ${req.params.fileId}:`, error);
      
      if ((error as any).message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Deletion failed'
        });
      }
    }
  }
);

/**
 * GET /api/storage/list
 * List user's files
 */
router.get(
  '/list',
  storageAuthMiddleware,
  storagePermissionMiddleware('read'),
  async (req, res) => {
    try {
      const userId = (req as any).storageUser.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const files = await selfHostedStorageService.listUserFiles(userId, limit, offset);

      res.json({
        success: true,
        data: files,
        pagination: {
          limit,
          offset,
          total: files.length
        }
      });
    } catch (error) {
      safeLogger.error('File listing error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files'
      });
    }
  }
);

/**
 * PUT /api/storage/:fileId/access
 * Update file access control
 */
router.put(
  '/:fileId/access',
  storageAuthMiddleware,
  fileAccessMiddleware('write'),
  async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const userId = (req as any).storageUser.id;
      const { readPermissions, writePermissions } = req.body;

      const updatedMetadata = await selfHostedStorageService.updateAccessControl(fileId, userId, {
        readPermissions: readPermissions ? readPermissions.split(',') : undefined,
        writePermissions: writePermissions ? writePermissions.split(',') : undefined
      });

      res.json({
        success: true,
        data: updatedMetadata,
        message: 'Access control updated successfully'
      });
    } catch (error) {
      safeLogger.error(`Access control update error for ${req.params.fileId}:`, error);
      
      if ((error as any).message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      } else if ((error as any).code === 'ENOENT') {
        res.status(404).json({
          success: false,
          error: 'File not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update access control'
        });
      }
    }
  }
);

/**
 * GET /api/storage/stats
 * Get storage statistics
 */
router.get(
  '/stats',
  storageAuthMiddleware,
  async (req, res) => {
    try {
      const userId = (req as any).storageUser.id;
      const includeUserStats = req.query.user === 'true';

      const stats = await selfHostedStorageService.getStorageStats(
        includeUserStats ? userId : undefined
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      safeLogger.error('Storage stats error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get storage stats'
      });
    }
  }
);

/**
 * GET /api/storage/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    // Simple health check
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'self-hosted-storage'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export { router as storageRoutes };