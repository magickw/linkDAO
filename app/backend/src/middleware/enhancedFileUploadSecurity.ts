/**
 * Enhanced File Upload Security Middleware
 * Comprehensive file upload validation with virus scanning and security checks
 */

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import FileUploadValidationService, { FileValidationOptions, UploadedFile } from '../services/fileUploadValidationService';

export interface FileUploadSecurityConfig {
  maxFileSize: number;
  maxFiles: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanForViruses: boolean;
  checkMagicNumbers: boolean;
  validateImageDimensions: boolean;
  maxImageWidth: number;
  maxImageHeight: number;
  quarantineDirectory: string;
  uploadDirectory: string;
}

// Default configuration
const DEFAULT_CONFIG: FileUploadSecurityConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 10,
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    // Documents
    'application/pdf',
    'text/plain',
    'application/json',
    // Videos (for marketplace)
    'video/mp4',
    'video/webm',
    'video/ogg'
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp',
    '.pdf', '.txt', '.json',
    '.mp4', '.webm', '.ogg'
  ],
  scanForViruses: true,
  checkMagicNumbers: true,
  validateImageDimensions: true,
  maxImageWidth: 4096,
  maxImageHeight: 4096,
  quarantineDirectory: '/tmp/quarantine',
  uploadDirectory: '/tmp/uploads'
};

/**
 * Enhanced File Upload Security Manager
 */
export class FileUploadSecurityManager {
  private config: FileUploadSecurityConfig;
  private upload: multer.Multer;

  constructor(config: Partial<FileUploadSecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupMulter();
  }

  /**
   * Setup multer with security configurations
   */
  private setupMulter(): void {
    const storage = multer.memoryStorage(); // Store in memory for security scanning

    this.upload = multer({
      storage,
      limits: {
        fileSize: this.config.maxFileSize,
        files: this.config.maxFiles,
        fields: 20,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024 // 1MB for field values
      },
      fileFilter: (req, file, cb) => {
        // Basic file type validation
        if (!this.isFileTypeAllowed(file)) {
          const error = new Error(`File type '${file.mimetype}' is not allowed`);
          (error as any).code = 'INVALID_FILE_TYPE';
          return cb(error);
        }

        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (!this.config.allowedExtensions.includes(ext)) {
          const error = new Error(`File extension '${ext}' is not allowed`);
          (error as any).code = 'INVALID_FILE_EXTENSION';
          return cb(error);
        }

        cb(null, true);
      }
    });
  }

  /**
   * Check if file type is allowed
   */
  private isFileTypeAllowed(file: Express.Multer.File): boolean {
    return this.config.allowedMimeTypes.includes(file.mimetype);
  }

  /**
   * Create file upload middleware
   */
  public createUploadMiddleware(fieldName: string = 'file', multiple: boolean = false) {
    const uploadHandler = multiple 
      ? this.upload.array(fieldName, this.config.maxFiles)
      : this.upload.single(fieldName);

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Handle multer upload
        uploadHandler(req, res, async (err) => {
          if (err) {
            return this.handleUploadError(err, res);
          }

          // Get uploaded files
          const files = this.getUploadedFiles(req);
          if (files.length === 0) {
            return next(); // No files uploaded, continue
          }

          // Perform comprehensive security validation
          const validationResults = await this.validateFiles(files);
          
          // Check if any files failed validation
          const failedFiles = validationResults.filter(result => !result.valid);
          if (failedFiles.length > 0) {
            logger.warn('File upload validation failed', {
              failedFiles: failedFiles.map(f => ({
                name: f.sanitizedName,
                errors: f.errors
              })),
              ip: req.ip,
              userAgent: req.get('User-Agent')
            });

            return ApiResponse.badRequest(res, 'File validation failed', {
              failedFiles: failedFiles.map(f => ({
                filename: f.sanitizedName,
                errors: f.errors,
                warnings: f.warnings
              }))
            });
          }

          // Attach validation results to request
          (req as any).fileValidationResults = validationResults;

          // Log successful uploads
          logger.info('Files uploaded successfully', {
            fileCount: files.length,
            files: validationResults.map(r => ({
              name: r.sanitizedName,
              size: r.size,
              type: r.mimeType,
              hash: r.hash
            })),
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          next();
        });
      } catch (error) {
        logger.error('File upload middleware error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return ApiResponse.serverError(res, 'File upload processing failed');
      }
    };
  }

  /**
   * Get uploaded files from request
   */
  private getUploadedFiles(req: Request): UploadedFile[] {
    const files: UploadedFile[] = [];
    
    // Handle single file
    if ((req as any).file) {
      const file = (req as any).file as Express.Multer.File;
      files.push({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      });
    }
    
    // Handle multiple files
    if ((req as any).files && Array.isArray((req as any).files)) {
      const multerFiles = (req as any).files as Express.Multer.File[];
      for (const file of multerFiles) {
        files.push({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        });
      }
    }
    
    return files;
  }

  /**
   * Validate all uploaded files
   */
  private async validateFiles(files: UploadedFile[]): Promise<any[]> {
    const validationOptions: FileValidationOptions = {
      maxSize: this.config.maxFileSize,
      allowedTypes: this.config.allowedMimeTypes,
      allowedExtensions: this.config.allowedExtensions,
      scanForViruses: this.config.scanForViruses,
      checkMagicNumbers: this.config.checkMagicNumbers,
      validateImageDimensions: this.config.validateImageDimensions,
      maxImageWidth: this.config.maxImageWidth,
      maxImageHeight: this.config.maxImageHeight
    };

    const results = [];
    for (const file of files) {
      const result = await FileUploadValidationService.validateFile(file, validationOptions);
      results.push(result);
    }

    return results;
  }

  /**
   * Handle upload errors
   */
  private handleUploadError(error: any, res: Response): void {
    logger.warn('File upload error', {
      error: error.message,
      code: error.code
    });

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return ApiResponse.badRequest(res, `File too large. Maximum size is ${Math.round(this.config.maxFileSize / (1024 * 1024))}MB`);
      
      case 'LIMIT_FILE_COUNT':
        return ApiResponse.badRequest(res, `Too many files. Maximum is ${this.config.maxFiles} files`);
      
      case 'LIMIT_UNEXPECTED_FILE':
        return ApiResponse.badRequest(res, 'Unexpected file field');
      
      case 'INVALID_FILE_TYPE':
        return ApiResponse.badRequest(res, error.message);
      
      case 'INVALID_FILE_EXTENSION':
        return ApiResponse.badRequest(res, error.message);
      
      default:
        return ApiResponse.badRequest(res, 'File upload failed');
    }
  }

  /**
   * Create middleware for specific file types
   */
  public createImageUploadMiddleware(fieldName: string = 'image', multiple: boolean = false) {
    const imageConfig = {
      ...this.config,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      validateImageDimensions: true
    };

    const manager = new FileUploadSecurityManager(imageConfig);
    return manager.createUploadMiddleware(fieldName, multiple);
  }

  /**
   * Create middleware for document uploads
   */
  public createDocumentUploadMiddleware(fieldName: string = 'document', multiple: boolean = false) {
    const documentConfig = {
      ...this.config,
      allowedMimeTypes: [
        'application/pdf',
        'text/plain',
        'application/json',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      allowedExtensions: ['.pdf', '.txt', '.json', '.doc', '.docx'],
      validateImageDimensions: false
    };

    const manager = new FileUploadSecurityManager(documentConfig);
    return manager.createUploadMiddleware(fieldName, multiple);
  }

  /**
   * Get configuration
   */
  public getConfig(): FileUploadSecurityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<FileUploadSecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.setupMulter(); // Recreate multer with new config
  }
}

/**
 * File quarantine middleware
 */
export const fileQuarantineMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const validationResults = (req as any).fileValidationResults;
  
  if (!validationResults) {
    return next();
  }

  // Check for files that need quarantine
  const quarantineFiles = validationResults.filter((result: any) => 
    result.warnings.length > 0 || 
    (result.virusScanResult && !result.virusScanResult.clean)
  );

  if (quarantineFiles.length > 0) {
    logger.warn('Files quarantined', {
      quarantineFiles: quarantineFiles.map((f: any) => ({
        name: f.sanitizedName,
        warnings: f.warnings,
        virusThreats: f.virusScanResult?.threats || []
      }))
    });

    // In a real implementation, you would move files to quarantine directory
    // For now, we'll just log and continue
  }

  next();
};

/**
 * File metadata extraction middleware
 */
export const fileMetadataMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const validationResults = (req as any).fileValidationResults;
  
  if (!validationResults) {
    return next();
  }

  // Extract and attach metadata
  const metadata = validationResults.map((result: any) => ({
    filename: result.sanitizedName,
    originalName: result.sanitizedName,
    size: result.size,
    mimeType: result.mimeType,
    extension: result.extension,
    hash: result.hash,
    isImage: result.metadata.isImage,
    isVideo: result.metadata.isVideo,
    isDocument: result.metadata.isDocument,
    dimensions: result.metadata.dimensions,
    duration: result.metadata.duration,
    uploadedAt: new Date().toISOString()
  }));

  (req as any).fileMetadata = metadata;
  next();
};

// Create default instances
export const defaultFileUploadSecurity = new FileUploadSecurityManager();

// Export pre-configured middleware
export const fileUploadMiddleware = defaultFileUploadSecurity.createUploadMiddleware();
export const imageUploadMiddleware = defaultFileUploadSecurity.createImageUploadMiddleware();
export const documentUploadMiddleware = defaultFileUploadSecurity.createDocumentUploadMiddleware();

// Multiple file upload middleware
export const multipleFileUploadMiddleware = defaultFileUploadSecurity.createUploadMiddleware('files', true);
export const multipleImageUploadMiddleware = defaultFileUploadSecurity.createImageUploadMiddleware('images', true);

export default {
  FileUploadSecurityManager,
  defaultFileUploadSecurity,
  fileUploadMiddleware,
  imageUploadMiddleware,
  documentUploadMiddleware,
  multipleFileUploadMiddleware,
  multipleImageUploadMiddleware,
  fileQuarantineMiddleware,
  fileMetadataMiddleware
};