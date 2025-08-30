import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { contentStagingService } from '../services/contentStagingService';

export interface ValidatedContent {
  text?: string;
  mediaFiles?: Express.Multer.File[];
  links?: string[];
  contentType: 'post' | 'comment' | 'listing' | 'dm' | 'username';
  priority: 'fast' | 'slow';
  stagedContent?: {
    id: string;
    hash: string;
    size: number;
  };
}

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed MIME types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 10, // Max 10 files per request
    fields: 20, // Max 20 non-file fields
    fieldSize: 1024 * 1024, // 1MB max field size
  },
});

/**
 * Middleware to handle file uploads
 */
export const handleFileUploads = upload.array('media', 10);

/**
 * Content validation middleware
 */
export const validateContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text, contentType, links } = req.body;
    const files = req.files as Express.Multer.File[] || [];

    // Validate required fields
    if (!contentType) {
      res.status(400).json({
        error: 'Content type is required',
        code: 'MISSING_CONTENT_TYPE'
      });
      return;
    }

    // Validate content type
    const validContentTypes = ['post', 'comment', 'listing', 'dm', 'username'];
    if (!validContentTypes.includes(contentType)) {
      res.status(400).json({
        error: 'Invalid content type',
        code: 'INVALID_CONTENT_TYPE',
        validTypes: validContentTypes
      });
      return;
    }

    // Validate that there's some content
    if (!text && files.length === 0) {
      res.status(400).json({
        error: 'Content cannot be empty',
        code: 'EMPTY_CONTENT'
      });
      return;
    }

    // Text validation
    if (text) {
      if (typeof text !== 'string') {
        res.status(400).json({
          error: 'Text content must be a string',
          code: 'INVALID_TEXT_TYPE'
        });
        return;
      }

      // Length limits by content type
      const textLimits = {
        post: 10000,
        comment: 2000,
        listing: 5000,
        dm: 1000,
        username: 50
      };

      const maxLength = textLimits[contentType as keyof typeof textLimits];
      if (text.length > maxLength) {
        res.status(400).json({
          error: `Text content exceeds maximum length of ${maxLength} characters`,
          code: 'TEXT_TOO_LONG',
          maxLength,
          currentLength: text.length
        });
        return;
      }

      // Basic content validation
      const validation = await contentStagingService.validateContent(text);
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Text content validation failed',
          code: 'TEXT_VALIDATION_FAILED',
          details: validation.errors
        });
        return;
      }
    }

    // File validation
    const validatedFiles: Express.Multer.File[] = [];
    for (const file of files) {
      // Validate file size
      if (file.size > 100 * 1024 * 1024) {
        res.status(400).json({
          error: `File ${file.originalname} exceeds maximum size of 100MB`,
          code: 'FILE_TOO_LARGE',
          fileName: file.originalname,
          fileSize: file.size
        });
        return;
      }

      // Validate file content
      const validation = await contentStagingService.validateContent(
        file.buffer,
        file.mimetype,
        file.originalname
      );

      if (!validation.isValid) {
        res.status(400).json({
          error: `File ${file.originalname} validation failed`,
          code: 'FILE_VALIDATION_FAILED',
          fileName: file.originalname,
          details: validation.errors
        });
        return;
      }

      validatedFiles.push(file);
    }

    // Links validation
    let validatedLinks: string[] = [];
    if (links) {
      try {
        const linkArray = Array.isArray(links) ? links : JSON.parse(links);
        
        if (!Array.isArray(linkArray)) {
          res.status(400).json({
            error: 'Links must be an array',
            code: 'INVALID_LINKS_FORMAT'
          });
          return;
        }

        // Validate each link
        for (const link of linkArray) {
          if (typeof link !== 'string') {
            res.status(400).json({
              error: 'Each link must be a string',
              code: 'INVALID_LINK_TYPE'
            });
            return;
          }

          try {
            new URL(link); // Validate URL format
            validatedLinks.push(link);
          } catch (error) {
            res.status(400).json({
              error: `Invalid URL format: ${link}`,
              code: 'INVALID_URL_FORMAT',
              url: link
            });
            return;
          }
        }

        // Limit number of links
        if (validatedLinks.length > 10) {
          res.status(400).json({
            error: 'Maximum 10 links allowed per content',
            code: 'TOO_MANY_LINKS',
            maxLinks: 10,
            currentLinks: validatedLinks.length
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          error: 'Invalid links format',
          code: 'INVALID_LINKS_JSON'
        });
        return;
      }
    }

    // Determine processing priority
    let priority: 'fast' | 'slow' = 'fast';
    
    // Use slow lane for media content or complex text
    if (validatedFiles.length > 0) {
      priority = 'slow';
    } else if (text && (text.length > 1000 || validatedLinks.length > 3)) {
      priority = 'slow';
    }

    // Stage content if needed
    let stagedContent;
    if (validatedFiles.length > 0) {
      // For now, we'll stage the first file as an example
      // In a full implementation, you'd stage all files
      const firstFile = validatedFiles[0];
      const staged = await contentStagingService.stageContent(
        firstFile.buffer,
        {
          originalName: firstFile.originalname,
          mimetype: firstFile.mimetype,
          contentType
        },
        firstFile.mimetype,
        firstFile.originalname
      );

      stagedContent = {
        id: staged.id,
        hash: staged.hash,
        size: staged.size
      };
    }

    // Attach validated content to request
    const validatedContent: ValidatedContent = {
      text,
      mediaFiles: validatedFiles,
      links: validatedLinks,
      contentType,
      priority,
      stagedContent
    };

    req.validatedContent = validatedContent;
    next();

  } catch (error) {
    console.error('Content validation error:', error);
    res.status(500).json({
      error: 'Content validation failed',
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Rate limiting middleware for content submission
 */
export const contentRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // This would integrate with the existing rate limiter
  // For now, we'll add basic per-user limits
  
  const userId = req.user?.userId || (req.user as any)?.id;
  if (!userId) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  // In a real implementation, this would check Redis for user-specific limits
  // For now, we'll just pass through
  next();
};

/**
 * Content type specific validation
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { contentType } = req.body;
    
    if (!allowedTypes.includes(contentType)) {
      res.status(400).json({
        error: `Content type ${contentType} not allowed for this endpoint`,
        code: 'CONTENT_TYPE_NOT_ALLOWED',
        allowedTypes
      });
      return;
    }
    
    next();
  };
};

/**
 * User reputation based validation
 */
export const validateUserReputation = (minReputation: number = 0) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userReputation = (req.user as any)?.reputation || 0;
    
    if (userReputation < minReputation) {
      res.status(403).json({
        error: `Minimum reputation of ${minReputation} required`,
        code: 'INSUFFICIENT_REPUTATION',
        currentReputation: userReputation,
        requiredReputation: minReputation
      });
      return;
    }
    
    next();
  };
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      validatedContent?: ValidatedContent;
    }
  }
}