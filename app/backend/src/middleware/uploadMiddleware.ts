import multer from 'multer';
import { Request } from 'express';

/**
 * Multer configuration for image uploads
 */

// Storage configuration - use memory storage for direct IPFS upload
const storage = multer.memoryStorage();

// File filter to accept only images
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  // Accept images only
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Multer upload configuration
const uploadConfig = {
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10, // Max 10 files per request
  },
};

// Create multer instance
export const upload = multer(uploadConfig);

// Named export for different upload scenarios
export const uploadSingle = upload.single('image'); // Single image upload
export const uploadMultiple = upload.array('images', 10); // Multiple images upload (max 10)
export const uploadFields = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]); // Multiple fields with different names

// Error handler middleware for multer errors
export const handleMulterError = (err: any, req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds the 10MB limit',
        details: { limit: '10MB', code: err.code },
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'TOO_MANY_FILES',
        message: 'Too many files uploaded. Maximum is 10 files.',
        details: { limit: 10, code: err.code },
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'UNEXPECTED_FIELD',
        message: 'Unexpected file field',
        details: { code: err.code },
      });
    }

    return res.status(400).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: err.message,
      details: { code: err.code },
    });
  }

  if (err) {
    // Other errors (like file type validation)
    return res.status(400).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: err.message || 'Failed to upload file',
    });
  }

  next();
};
