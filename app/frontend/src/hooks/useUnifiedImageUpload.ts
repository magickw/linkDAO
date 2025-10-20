/**
 * React hook for unified image upload functionality
 * Provides consistent image upload experience across all seller components
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import React, { useState, useCallback, useRef } from 'react';
import { unifiedImageService, ImageUploadResult, ImageUploadOptions } from '../services/unifiedImageService';
import { SellerError, SellerErrorType } from '../types/sellerError';

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface UseUnifiedImageUploadOptions {
  context: 'profile' | 'cover' | 'listing';
  maxFiles?: number;
  onSuccess?: (results: ImageUploadResult[]) => void;
  onError?: (error: SellerError) => void;
  onProgress?: (progress: UploadProgress[]) => void;
  userId?: string;
}

export interface UseUnifiedImageUploadReturn {
  // State
  isUploading: boolean;
  progress: UploadProgress[];
  results: ImageUploadResult[];
  error: SellerError | null;
  
  // Actions
  uploadSingle: (file: File, options?: Partial<ImageUploadOptions>) => Promise<ImageUploadResult>;
  uploadMultiple: (files: File[], options?: Partial<ImageUploadOptions>) => Promise<ImageUploadResult[]>;
  deleteImage: (imageId: string) => Promise<boolean>;
  clearResults: () => void;
  clearError: () => void;
  
  // Utilities
  validateFiles: (files: File[]) => { valid: File[]; invalid: Array<{ file: File; errors: string[] }> };
  getImageInfo: (imageId: string) => Promise<ImageUploadResult | null>;
}

export const useUnifiedImageUpload = (
  options: UseUnifiedImageUploadOptions
): UseUnifiedImageUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [results, setResults] = useState<ImageUploadResult[]>([]);
  const [error, setError] = useState<SellerError | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Update progress for a specific file
   */
  const updateProgress = useCallback((fileName: string, update: Partial<UploadProgress>) => {
    setProgress(prev => {
      const existing = prev.find(p => p.fileName === fileName);
      if (existing) {
        return prev.map(p => 
          p.fileName === fileName 
            ? { ...p, ...update }
            : p
        );
      } else {
        return [...prev, { fileName, progress: 0, status: 'pending', ...update }];
      }
    });
  }, []);

  /**
   * Upload a single image file
   */
  const uploadSingle = useCallback(async (
    file: File,
    uploadOptions?: Partial<ImageUploadOptions>
  ): Promise<ImageUploadResult> => {
    setIsUploading(true);
    setError(null);
    
    // Initialize progress
    updateProgress(file.name, { status: 'uploading', progress: 0 });

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        updateProgress(file.name, { 
          progress: Math.min(90, Math.random() * 80 + 10) 
        });
      }, 200);

      const result = await unifiedImageService.uploadImage(
        file,
        options.context,
        { ...uploadOptions, userId: options.userId }
      );

      clearInterval(progressInterval);
      updateProgress(file.name, { status: 'completed', progress: 100 });

      setResults(prev => [...prev, result]);
      options.onSuccess?.([result]);

      return result;
    } catch (err) {
      const sellerError = err instanceof SellerError ? err : new SellerError(
        SellerErrorType.IMAGE_UPLOAD_ERROR,
        `Failed to upload ${file.name}: ${err.message}`,
        'UPLOAD_SINGLE_ERROR',
        { fileName: file.name, originalError: err }
      );

      updateProgress(file.name, { 
        status: 'error', 
        error: sellerError.getUserMessage() 
      });
      
      setError(sellerError);
      options.onError?.(sellerError);
      
      throw sellerError;
    } finally {
      setIsUploading(false);
    }
  }, [options, updateProgress]);

  /**
   * Upload multiple image files
   */
  const uploadMultiple = useCallback(async (
    files: File[],
    uploadOptions?: Partial<ImageUploadOptions>
  ): Promise<ImageUploadResult[]> => {
    if (options.maxFiles && files.length > options.maxFiles) {
      const error = new SellerError(
        SellerErrorType.VALIDATION_ERROR,
        `Maximum ${options.maxFiles} files allowed, got ${files.length}`,
        'MAX_FILES_EXCEEDED'
      );
      setError(error);
      options.onError?.(error);
      throw error;
    }

    setIsUploading(true);
    setError(null);

    // Initialize progress for all files
    files.forEach(file => {
      updateProgress(file.name, { status: 'pending', progress: 0 });
    });

    try {
      // Create abort controller for batch upload
      abortControllerRef.current = new AbortController();

      const uploadResults: ImageUploadResult[] = [];
      const errors: Array<{ file: string; error: SellerError }> = [];

      // Process files in batches to avoid overwhelming the server
      const batchSize = 3;
      const batches = [];
      for (let i = 0; i < files.length; i += batchSize) {
        batches.push(files.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (file) => {
          try {
            updateProgress(file.name, { status: 'uploading', progress: 10 });

            const result = await unifiedImageService.uploadImage(
              file,
              options.context,
              { ...uploadOptions, userId: options.userId }
            );

            updateProgress(file.name, { status: 'completed', progress: 100 });
            return result;
          } catch (err) {
            const sellerError = err instanceof SellerError ? err : new SellerError(
              SellerErrorType.IMAGE_UPLOAD_ERROR,
              `Failed to upload ${file.name}: ${err.message}`,
              'UPLOAD_BATCH_ERROR',
              { fileName: file.name, originalError: err }
            );

            updateProgress(file.name, { 
              status: 'error', 
              error: sellerError.getUserMessage() 
            });
            
            errors.push({ file: file.name, error: sellerError });
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        uploadResults.push(...batchResults.filter(result => result !== null));
      }

      setResults(prev => [...prev, ...uploadResults]);

      // Handle partial failures
      if (errors.length > 0) {
        const partialError = new SellerError(
          SellerErrorType.IMAGE_UPLOAD_ERROR,
          `${errors.length} of ${files.length} files failed to upload`,
          'PARTIAL_UPLOAD_FAILURE',
          { successCount: uploadResults.length, errors }
        );
        
        setError(partialError);
        options.onError?.(partialError);
        
        // Still call onSuccess for successful uploads
        if (uploadResults.length > 0) {
          options.onSuccess?.(uploadResults);
        }
      } else {
        options.onSuccess?.(uploadResults);
      }

      return uploadResults;
    } catch (err) {
      const sellerError = err instanceof SellerError ? err : new SellerError(
        SellerErrorType.IMAGE_UPLOAD_ERROR,
        `Batch upload failed: ${err.message}`,
        'BATCH_UPLOAD_ERROR',
        { fileCount: files.length, originalError: err }
      );

      setError(sellerError);
      options.onError?.(sellerError);
      
      throw sellerError;
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, [options, updateProgress]);

  /**
   * Delete an uploaded image
   */
  const deleteImage = useCallback(async (imageId: string): Promise<boolean> => {
    try {
      const success = await unifiedImageService.deleteImage(imageId, options.context);
      
      if (success) {
        // Remove from results
        setResults(prev => prev.filter(result => 
          !result.cdnUrl.includes(imageId) && !result.originalUrl.includes(imageId)
        ));
      }
      
      return success;
    } catch (err) {
      const sellerError = err instanceof SellerError ? err : new SellerError(
        SellerErrorType.API_ERROR,
        `Failed to delete image: ${err.message}`,
        'IMAGE_DELETE_ERROR',
        { imageId, originalError: err }
      );

      setError(sellerError);
      options.onError?.(sellerError);
      
      throw sellerError;
    }
  }, [options]);

  /**
   * Validate files before upload
   */
  const validateFiles = useCallback((files: File[]) => {
    const valid: File[] = [];
    const invalid: Array<{ file: File; errors: string[] }> = [];

    const contextOptions = {
      profile: {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      },
      cover: {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      },
      listing: {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      },
    };

    const config = contextOptions[options.context];

    files.forEach(file => {
      const errors: string[] = [];

      if (file.size > config.maxSize) {
        errors.push(`File size exceeds ${Math.round(config.maxSize / 1024 / 1024)}MB limit`);
      }

      if (!config.allowedTypes.includes(file.type)) {
        errors.push(`File type not supported. Use: ${config.allowedTypes.join(', ')}`);
      }

      if (errors.length > 0) {
        invalid.push({ file, errors });
      } else {
        valid.push(file);
      }
    });

    return { valid, invalid };
  }, [options.context]);

  /**
   * Get image information
   */
  const getImageInfo = useCallback(async (imageId: string): Promise<ImageUploadResult | null> => {
    try {
      return await unifiedImageService.getImageInfo(imageId);
    } catch (err) {
      const sellerError = err instanceof SellerError ? err : new SellerError(
        SellerErrorType.API_ERROR,
        `Failed to get image info: ${err.message}`,
        'IMAGE_INFO_ERROR',
        { imageId, originalError: err }
      );

      setError(sellerError);
      options.onError?.(sellerError);
      
      throw sellerError;
    }
  }, [options]);

  /**
   * Clear upload results
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setProgress([]);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Report progress to parent component
  React.useEffect(() => {
    options.onProgress?.(progress);
  }, [progress, options]);

  return {
    // State
    isUploading,
    progress,
    results,
    error,
    
    // Actions
    uploadSingle,
    uploadMultiple,
    deleteImage,
    clearResults,
    clearError,
    
    // Utilities
    validateFiles,
    getImageInfo,
  };
};

export default useUnifiedImageUpload;