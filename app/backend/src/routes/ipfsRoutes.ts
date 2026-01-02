import { Router } from 'express';
import { ipfsIntegrationService } from '../services/ipfsIntegrationService';
import { ipfsService } from '../services/ipfsService';
import { cacheService } from '../services/cacheService';
import { safeLogger } from '../utils/safeLogger';
import multer from 'multer';
import sharp from 'sharp';

// Log the imported services for debugging
safeLogger.info('IPFS routes - imported services', {
  ipfsService: !!ipfsService,
  ipfsIntegrationService: !!ipfsIntegrationService
});

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10 // Max 10 files per request
  }
});

/**
 * POST /api/ipfs/upload
 * Upload file to IPFS
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file provided'
      });
      return;
    }

    const { pin, name, description, tags, contentType } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    // Detect content type from MIME type if not provided
    let detectedContentType = contentType || 'document';
    if (!contentType && req.file.mimetype) {
      if (req.file.mimetype.startsWith('image/')) {
        detectedContentType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        detectedContentType = 'video';
      } else if (req.file.mimetype === 'application/pdf') {
        detectedContentType = 'document';
      }
    }

    const metadata = await ipfsIntegrationService.uploadDocument(req.file.buffer, {
      title: name || req.file.originalname,
      description: description,
      contentType: detectedContentType,
      userId: userId,
      tags: tags ? tags.split(',') : [],
      mimeType: req.file.mimetype // Pass the actual MIME type
    });

    // Pin the content if requested
    if (pin === 'true') {
      await ipfsIntegrationService.pinContent(metadata.ipfsHash, 'User requested pinning');
    }

    res.status(201).json({
      success: true,
      data: metadata,
      message: 'File uploaded to IPFS successfully'
    });
  } catch (error) {
    safeLogger.error('IPFS file upload error:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

/**
 * POST /api/ipfs/upload-multiple
 * Upload multiple files to IPFS
 */
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No files provided'
      });
      return;
    }

    const { pin } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    // Convert to the format expected by IPFS service
    const files = (req.files as Express.Multer.File[]).map(file => ({
      content: file.buffer,
      path: file.originalname
    }));

    // Upload directory to IPFS
    const result = await ipfsService.uploadDirectory(files, {
      pin: pin === 'true'
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Files uploaded to IPFS successfully'
    });
  } catch (error) {
    safeLogger.error('IPFS multiple file upload error:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

/**
 * GET /api/ipfs/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    // Try to get IPFS node info
    const nodeInfo = await ipfsService.getNodeInfo();

    res.status(200).json({
      success: true,
      status: 'healthy',
      data: {
        nodeId: nodeInfo.id,
        version: nodeInfo.agentVersion,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'IPFS node is not accessible',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/ipfs/:hash
 * Download file from IPFS
 */
router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    // Validate IPFS hash format
    if (!hash || !/^[a-zA-Z0-9]+$/.test(hash)) {
      res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash'
      });
      return;
    }

    const { content, metadata } = await ipfsIntegrationService.downloadDocument(hash);

    // Check for image processing parameters
    const width = req.query.w ? parseInt(req.query.w as string) : undefined;
    const height = req.query.h ? parseInt(req.query.h as string) : undefined;
    const quality = req.query.q ? parseInt(req.query.q as string) : undefined;
    const format = req.query.f as string;

    let sentContent = content;
    let contentType = metadata.mimeType || 'application/octet-stream';

    // Only process if we have image parameters and it looks like an image
    if ((width || height || quality || format) && (contentType.startsWith('image/') || contentType === 'application/octet-stream')) {
      try {
        let pipeline = sharp(content);

        if (width || height) {
          pipeline = pipeline.resize(width, height, {
            fit: 'cover',
            withoutEnlargement: true
          });
        }

        if (format) {
          if (format === 'webp') pipeline = pipeline.webp({ quality: quality || 80 });
          else if (format === 'png') pipeline = pipeline.png({ quality: quality || 80 });
          else if (format === 'jpeg' || format === 'jpg') pipeline = pipeline.jpeg({ quality: quality || 80 });
          else if (format === 'avif') pipeline = pipeline.avif({ quality: quality || 80 });
          contentType = `image/${format === 'jpg' ? 'jpeg' : format}`;
        } else if (quality) {
          // If no format specified but quality is, maintain original format if possible or default to jpeg/png
          // For simplicity, if only quality is given, we might need to know the input format.
          // Sharp keeps input format by default if not changed.
        }

        sentContent = await pipeline.toBuffer();
      } catch (processError) {
        safeLogger.warn(`Failed to process image for ${hash}, sending original:`, processError);
        // Continue with original content
      }
    }

    // Set appropriate headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': sentContent.length,
      'Content-Disposition': `inline; filename="${metadata.name}"`,
      'Cache-Control': 'public, max-age=31536000', // 1 year for IPFS content
      'ETag': `"${hash}-${width || ''}-${height || ''}-${format || ''}"`
    });

    // Send file content
    res.send(sentContent);
  } catch (error) {
    safeLogger.error(`IPFS file download error for ${req.params.hash}:`, error);

    if ((error as any).message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'File not found on IPFS'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      });
    }
  }
});

/**
 * GET /api/ipfs/metadata/:hash
 * Get file metadata from IPFS
 */
router.get('/metadata/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    // Validate IPFS hash format
    if (!hash || !/^[a-zA-Z0-9]+$/.test(hash)) {
      res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash'
      });
      return;
    }

    const metadata = await ipfsIntegrationService.getContentMetadata(hash);

    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    safeLogger.error(`IPFS metadata fetch error for ${req.params.hash}:`, error);

    if ((error as any).message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'File not found on IPFS'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Metadata fetch failed'
      });
    }
  }
});

/**
 * POST /api/ipfs/pin/:hash
 * Pin content to IPFS
 */
router.post('/pin/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const { reason } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    // Validate IPFS hash format
    if (!hash || !/^[a-zA-Z0-9]+$/.test(hash)) {
      res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash'
      });
      return;
    }

    const result = await ipfsIntegrationService.pinContent(hash, reason || `Pinned by user ${userId}`);

    if (result) {
      res.json({
        success: true,
        message: 'Content pinned successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to pin content'
      });
    }
  } catch (error) {
    safeLogger.error(`IPFS pin error for ${req.params.hash}:`, error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Pin operation failed'
    });
  }
});

/**
 * DELETE /api/ipfs/unpin/:hash
 * Unpin content from IPFS
 */
router.delete('/unpin/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const { reason } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    // Validate IPFS hash format
    if (!hash || !/^[a-zA-Z0-9]+$/.test(hash)) {
      res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash'
      });
      return;
    }

    const result = await ipfsIntegrationService.unpinContent(hash, reason || `Unpinned by user ${userId}`);

    if (result) {
      res.json({
        success: true,
        message: 'Content unpinned successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to unpin content'
      });
    }
  } catch (error) {
    safeLogger.error(`IPFS unpin error for ${req.params.hash}:`, error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unpin operation failed'
    });
  }
});

/**
 * GET /api/ipfs/exists/:hash
 * Check if content exists on IPFS
 */
router.get('/exists/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    // Validate IPFS hash format
    if (!hash || !/^[a-zA-Z0-9]+$/.test(hash)) {
      res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash'
      });
      return;
    }

    const exists = await ipfsIntegrationService.contentExists(hash);

    res.json({
      success: true,
      data: {
        exists: exists,
        hash: hash
      }
    });
  } catch (error) {
    safeLogger.error(`IPFS existence check error for ${req.params.hash}:`, error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Existence check failed'
    });
  }
});

/**
 * GET /api/ipfs/pin-status/:hash
 * Get pin status for content
 */
router.get('/pin-status/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    // Validate IPFS hash format
    if (!hash || !/^[a-zA-Z0-9]+$/.test(hash)) {
      res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash'
      });
      return;
    }

    const status = await ipfsIntegrationService.getPinStatus(hash);

    res.json({
      success: true,
      data: {
        status: status,
        hash: hash
      }
    });
  } catch (error) {
    safeLogger.error(`IPFS pin status check error for ${req.params.hash}:`, error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Pin status check failed'
    });
  }
});

/**
 * POST /api/ipfs/governance-proposal
 * Upload governance proposal to IPFS
 */
router.post('/governance-proposal', async (req, res) => {
  try {
    const { title, description, proposer, startTime, endTime, status } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    // Validate required fields
    if (!title || !description || !proposer || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, proposer, startTime, endTime'
      });
      return;
    }

    const proposal = await ipfsIntegrationService.uploadGovernanceProposal({
      title,
      description,
      proposer,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: status || 'active'
    }, userId);

    res.status(201).json({
      success: true,
      data: proposal,
      message: 'Governance proposal uploaded to IPFS successfully'
    });
  } catch (error) {
    safeLogger.error('IPFS governance proposal upload error:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Proposal upload failed'
    });
  }
});

/**
 * POST /api/ipfs/post-content
 * Upload post content to IPFS
 */
router.post('/post-content', async (req, res) => {
  try {
    const { title, content, author, communityId, tags, createdAt, mediaCids } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';

    // Validate required fields
    if (!title || !content || !author) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: title, content, author'
      });
      return;
    }

    const post = await ipfsIntegrationService.uploadPostContent({
      title,
      content,
      author,
      communityId,
      tags,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      mediaCids
    }, userId);

    res.status(201).json({
      success: true,
      data: post,
      message: 'Post content uploaded to IPFS successfully'
    });
  } catch (error) {
    safeLogger.error('IPFS post content upload error:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Post upload failed'
    });
  }
});

/**
 * GET /api/ipfs/governance-proposal/:hash
 * Download governance proposal from IPFS
 */
router.get('/governance-proposal/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    // Validate IPFS hash format
    if (!hash || !/^[a-zA-Z0-9]+$/.test(hash)) {
      res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash'
      });
      return;
    }

    const proposal = await ipfsIntegrationService.downloadGovernanceProposal(hash);

    res.json({
      success: true,
      data: proposal
    });
  } catch (error) {
    safeLogger.error(`IPFS governance proposal download error for ${req.params.hash}:`, error);

    if ((error as any).message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'Proposal not found on IPFS'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Proposal download failed'
      });
    }
  }
});

/**
 * GET /api/ipfs/post-content/:hash
 * Download post content from IPFS
 */
router.get('/post-content/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    // Validate IPFS hash format
    if (!hash || !/^[a-zA-Z0-9]+$/.test(hash)) {
      res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash'
      });
      return;
    }

    const post = await ipfsIntegrationService.downloadPostContent(hash);

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    safeLogger.error(`IPFS post content download error for ${req.params.hash}:`, error);

    if ((error as any).message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'Post not found on IPFS'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Post download failed'
      });
    }
  }
});

export { router as ipfsRoutes };