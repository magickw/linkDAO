/**
 * UnifiedImageUpload - Reusable image upload component for seller system
 * 
 * Features:
 * - Drag and drop support
 * - Multiple file selection
 * - Progress indicators
 * - Error handling with recovery
 * - Context-aware validation
 * - Thumbnail previews
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader, Image as ImageIcon } from 'lucide-react';
import { useUnifiedImageUpload, UseUnifiedImageUploadOptions } from '../../../../hooks/useUnifiedImageUpload';
import { ImageUploadResult } from '../../../../services/unifiedImageService';

export interface UnifiedImageUploadProps extends Omit<UseUnifiedImageUploadOptions, 'onSuccess' | 'onError'> {
  // Appearance
  className?: string;
  variant?: 'default' | 'compact' | 'grid';
  showPreviews?: boolean;
  showProgress?: boolean;
  
  // Behavior
  multiple?: boolean;
  disabled?: boolean;
  accept?: string;
  
  // Labels and text
  label?: string;
  description?: string;
  dragText?: string;
  browseText?: string;
  
  // Callbacks
  onUploadSuccess?: (results: ImageUploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  onFilesSelected?: (files: File[]) => void;
  onRemoveImage?: (result: ImageUploadResult) => void;
  
  // Initial values
  initialImages?: ImageUploadResult[];
}

export const UnifiedImageUpload: React.FC<UnifiedImageUploadProps> = ({
  context,
  maxFiles = context === 'listing' ? 10 : 1,
  className = '',
  variant = 'default',
  showPreviews = true,
  showProgress = true,
  multiple = context === 'listing',
  disabled = false,
  accept,
  label,
  description,
  dragText,
  browseText = 'Browse files',
  onUploadSuccess,
  onUploadError,
  onFilesSelected,
  onRemoveImage,
  initialImages = [],
  userId,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isUploading,
    progress,
    results,
    error,
    uploadMultiple,
    deleteImage,
    clearError,
    validateFiles,
  } = useUnifiedImageUpload({
    context,
    maxFiles,
    userId,
    onSuccess: (results) => {
      setSelectedFiles([]);
      onUploadSuccess?.(results);
    },
    onError: (error) => {
      onUploadError?.(error);
    },
  });

  // Combine initial images with uploaded results
  const allImages = [...initialImages, ...results];

  /**
   * Get context-specific configuration
   */
  const getContextConfig = () => {
    const configs = {
      profile: {
        label: label || 'Profile Picture',
        description: description || 'Upload a profile picture (max 5MB)',
        dragText: dragText || 'Drop your profile picture here',
        accept: accept || 'image/jpeg,image/png,image/webp',
        maxSize: '5MB',
        dimensions: 'Recommended: 400x400px',
      },
      cover: {
        label: label || 'Cover Image',
        description: description || 'Upload a cover image (max 10MB)',
        dragText: dragText || 'Drop your cover image here',
        accept: accept || 'image/jpeg,image/png,image/webp',
        maxSize: '10MB',
        dimensions: 'Recommended: 1200x400px',
      },
      listing: {
        label: label || 'Product Images',
        description: description || `Upload up to ${maxFiles} product images (max 10MB each)`,
        dragText: dragText || 'Drop your product images here',
        accept: accept || 'image/jpeg,image/png,image/webp,image/gif',
        maxSize: '10MB',
        dimensions: 'Recommended: 800x800px',
      },
    };
    return configs[context];
  };

  const config = getContextConfig();

  /**
   * Handle drag events
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  /**
   * Handle drop event
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, [disabled, isUploading]);

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileSelection(files);
    }
  }, []);

  /**
   * Process selected files
   */
  const handleFileSelection = useCallback((files: File[]) => {
    if (files.length === 0) return;

    // Validate files
    const { valid, invalid } = validateFiles(files);

    if (invalid.length > 0) {
      const errorMessage = invalid.map(({ file, errors }) => 
        `${file.name}: ${errors.join(', ')}`
      ).join('\n');
      
      onUploadError?.(new Error(`Invalid files:\n${errorMessage}`));
      return;
    }

    // Check total file limit
    const totalFiles = allImages.length + valid.length;
    if (totalFiles > maxFiles) {
      onUploadError?.(new Error(`Maximum ${maxFiles} files allowed. You have ${allImages.length} and are trying to add ${valid.length} more.`));
      return;
    }

    setSelectedFiles(valid);
    onFilesSelected?.(valid);

    // Auto-upload if enabled
    if (valid.length > 0) {
      uploadMultiple(valid);
    }
  }, [validateFiles, allImages.length, maxFiles, onUploadError, onFilesSelected, uploadMultiple]);

  /**
   * Handle remove image
   */
  const handleRemoveImage = useCallback(async (imageResult: ImageUploadResult, index: number) => {
    try {
      // If it's an initial image, just call the callback
      if (index < initialImages.length) {
        onRemoveImage?.(imageResult);
        return;
      }

      // For uploaded images, delete from storage
      const imageId = extractImageId(imageResult.cdnUrl);
      if (imageId) {
        await deleteImage(imageId);
      }
      
      onRemoveImage?.(imageResult);
    } catch (error) {
      onUploadError?.(error as Error);
    }
  }, [initialImages.length, deleteImage, onRemoveImage, onUploadError]);

  /**
   * Extract image ID from CDN URL
   */
  const extractImageId = (url: string): string | null => {
    const match = url.match(/\/images\/([^/?]+)/);
    return match ? match[1] : null;
  };

  /**
   * Open file dialog
   */
  const openFileDialog = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  /**
   * Render upload area
   */
  const renderUploadArea = () => {
    const canUpload = allImages.length < maxFiles && !disabled && !isUploading;

    return (
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${canUpload ? 'hover:border-gray-400 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
          ${variant === 'compact' ? 'p-4' : 'p-8'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="text-center">
          <Upload 
            className={`mx-auto mb-4 text-gray-400 ${variant === 'compact' ? 'w-8 h-8' : 'w-12 h-12'}`} 
          />
          <p className="text-gray-600 mb-2">
            {dragActive ? 'Drop files here' : config.dragText}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or <button type="button" className="text-blue-600 hover:text-blue-700 underline">
              {browseText}
            </button>
          </p>
          <p className="text-xs text-gray-400">
            {config.accept.split(',').join(', ')} • Max {config.maxSize}
            {config.dimensions && (
              <><br />{config.dimensions}</>
            )}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={config.accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>
    );
  };

  /**
   * Render image preview
   */
  const renderImagePreview = (imageResult: ImageUploadResult, index: number) => {
    const isUploading = progress.some(p => p.status === 'uploading' || p.status === 'processing');
    
    return (
      <div key={`${imageResult.cdnUrl}-${index}`} className="relative group">
        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
          <img
            src={imageResult.thumbnails?.medium || imageResult.cdnUrl}
            alt={`Upload ${index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <Loader className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          
          {/* Remove button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveImage(imageResult, index);
            }}
            className="absolute top-2 right-2 p-3 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 md:opacity-100 min-h-[44px] min-w-[44px]"
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Image info */}
        <div className="mt-2 text-xs text-gray-500">
          {imageResult.metadata.width}×{imageResult.metadata.height}
        </div>
      </div>
    );
  };

  /**
   * Render progress indicators
   */
  const renderProgress = () => {
    if (!showProgress || progress.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        {progress.map((item) => (
          <div key={item.fileName} className="flex items-center space-x-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{item.fileName}</span>
                <span className="text-gray-500">{item.progress}%</span>
              </div>
              <div className="mt-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    item.status === 'error' ? 'bg-red-500' : 
                    item.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
            
            {item.status === 'completed' && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {item.status === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render error message
   */
  const renderError = () => {
    if (!error) return null;

    return (
      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error.getUserMessage()}</p>
            {error.details?.errors && (
              <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                {error.details.errors.map((err: any, index: number) => (
                  <li key={index}>{err.file}: {err.error.message}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`unified-image-upload ${className}`}>
      {/* Label and description */}
      {(config.label || config.description) && (
        <div className="mb-4">
          {config.label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {config.label}
            </label>
          )}
          {config.description && (
            <p className="text-sm text-gray-500">{config.description}</p>
          )}
        </div>
      )}

      {/* Upload area */}
      {allImages.length < maxFiles && renderUploadArea()}

      {/* Image previews */}
      {showPreviews && allImages.length > 0 && (
        <div className={`mt-4 ${
          variant === 'grid' 
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'flex flex-wrap gap-4'
        }`}>
          {allImages.map((imageResult, index) => renderImagePreview(imageResult, index))}
        </div>
      )}

      {/* Progress indicators */}
      {renderProgress()}

      {/* Error display */}
      {renderError()}

      {/* File count indicator */}
      {maxFiles > 1 && (
        <div className="mt-2 text-xs text-gray-500 text-right">
          {allImages.length} of {maxFiles} files
        </div>
      )}
    </div>
  );
};

export default UnifiedImageUpload;