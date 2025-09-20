import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MediaFile, MediaUploadConfig } from '../../types/enhancedPost';
import { mediaProcessingService, MediaProcessingOptions, ImageEditingOptions } from '../../services/mediaProcessingService';

interface EnhancedMediaUploadZoneProps {
  files: MediaFile[];
  onFilesChange: (files: MediaFile[]) => void;
  config?: Partial<MediaUploadConfig>;
  disabled?: boolean;
  className?: string;
}

interface EditingState {
  fileId: string;
  options: ImageEditingOptions;
}

const DEFAULT_CONFIG: MediaUploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
  enablePreview: true,
  enableEditing: true,
  enableProgress: true
};

export default function EnhancedMediaUploadZone({
  files,
  onFilesChange,
  config = {},
  disabled = false,
  className = ''
}: EnhancedMediaUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Generate unique ID for files
  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Validate file before adding
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const validation = mediaProcessingService.validateMedia(file, {
      maxSize: finalConfig.maxFileSize,
      allowedTypes: finalConfig.allowedTypes
    });

    if (!validation.valid) {
      return { valid: false, error: validation.errors[0] };
    }

    if (files.length >= finalConfig.maxFiles) {
      return {
        valid: false,
        error: `Maximum ${finalConfig.maxFiles} files allowed`
      };
    }

    return { valid: true };
  };

  // Create media file object from File
  const createMediaFile = async (file: File): Promise<MediaFile> => {
    const id = generateFileId();
    const metadata = await mediaProcessingService.extractMetadata(file);
    const thumbnail = await mediaProcessingService.generateThumbnail(file);
    
    const mediaFile: MediaFile = {
      id,
      file,
      preview: thumbnail || URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' : 'audio',
      size: file.size,
      uploadStatus: 'pending',
      metadata
    };
    
    return mediaFile;
  };

  // Handle file selection
  const handleFiles = useCallback(async (fileList: FileList) => {
    if (disabled) return;

    const newFiles: MediaFile[] = [];
    const errors: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validation = validateFile(file);
      
      if (validation.valid) {
        try {
          const mediaFile = await createMediaFile(file);
          newFiles.push(mediaFile);
        } catch (error) {
          errors.push(`Failed to process ${file.name}`);
        }
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
      
      // Auto-process new files
      newFiles.forEach(file => processFile(file.id));
    }

    // Show errors if any
    if (errors.length > 0) {
      console.error('File upload errors:', errors);
    }
  }, [files, onFilesChange, disabled, finalConfig]);

  // Process file with optimization
  const processFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || file.uploadStatus !== 'pending') return;

    setProcessingFiles(prev => new Set(prev).add(fileId));

    // Update status to uploading
    onFilesChange(files.map(f => 
      f.id === fileId ? { ...f, uploadStatus: 'uploading' as const } : f
    ));

    try {
      const processingOptions: MediaProcessingOptions = {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        enableCompression: true
      };

      const result = await mediaProcessingService.processMedia(file.file, processingOptions);

      if (result.success && result.processedFile) {
        // Update file with processed version
        const updatedFiles = files.map(f => 
          f.id === fileId ? { 
            ...f, 
            file: result.processedFile!,
            preview: result.processedPreview || f.preview,
            uploadStatus: 'completed' as const,
            uploadProgress: 100,
            cid: `bafybei${Math.random().toString(36).substring(2, 50)}`, // Mock IPFS CID
            metadata: {
              ...f.metadata,
              originalSize: result.originalSize,
              processedSize: result.processedSize,
              compressionRatio: result.compressionRatio
            }
          } : f
        );
        onFilesChange(updatedFiles);
      } else {
        // Mark as error
        const updatedFiles = files.map(f => 
          f.id === fileId ? { 
            ...f, 
            uploadStatus: 'error' as const,
            error: result.error || 'Processing failed'
          } : f
        );
        onFilesChange(updatedFiles);
      }
    } catch (error) {
      console.error('File processing error:', error);
      const updatedFiles = files.map(f => 
        f.id === fileId ? { 
          ...f, 
          uploadStatus: 'error' as const,
          error: 'Processing failed'
        } : f
      );
      onFilesChange(updatedFiles);
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  }, [files, onFilesChange]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [disabled, handleFiles]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = '';
  }, [handleFiles]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
    setProcessingFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  }, [files, onFilesChange]);

  // Start editing
  const startEditing = useCallback((fileId: string) => {
    if (!finalConfig.enableEditing) return;
    
    setEditingState({
      fileId,
      options: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0,
        sharpen: 0
      }
    });
  }, [finalConfig.enableEditing]);

  // Apply editing
  const applyEditing = useCallback(async () => {
    if (!editingState) return;

    const file = files.find(f => f.id === editingState.fileId);
    if (!file) return;

    setProcessingFiles(prev => new Set(prev).add(editingState.fileId));

    try {
      const result = await mediaProcessingService.editImage(file.file, editingState.options);

      if (result.success && result.processedFile) {
        const updatedFiles = files.map(f => 
          f.id === editingState.fileId ? { 
            ...f, 
            file: result.processedFile!,
            preview: result.processedPreview || f.preview
          } : f
        );
        onFilesChange(updatedFiles);
      }
    } catch (error) {
      console.error('Image editing error:', error);
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(editingState.fileId);
        return newSet;
      });
      setEditingState(null);
    }
  }, [editingState, files, onFilesChange]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragOver 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={finalConfig.allowedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-2">
          <div className="text-4xl">
            {isDragOver ? '📤' : '📁'}
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {isDragOver ? 'Drop files here' : 'Upload media files'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drag & drop or click to select files
            </p>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Max {finalConfig.maxFiles} files, {Math.round(finalConfig.maxFileSize / 1024 / 1024)}MB each
            {finalConfig.enableEditing && <span> • Auto-optimization enabled</span>}
          </div>
        </div>
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
            >
              {/* Preview */}
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
                {file.type === 'image' ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : file.type === 'video' ? (
                  <video
                    src={file.preview}
                    className="w-full h-full object-cover"
                    controls={false}
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl">🎵</span>
                  </div>
                )}
                
                {/* Processing Overlay */}
                {(file.uploadStatus === 'uploading' || processingFiles.has(file.id)) && finalConfig.enableProgress && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-2" />
                      <div className="text-sm">
                        {processingFiles.has(file.id) ? 'Processing...' : `${Math.round(file.uploadProgress || 0)}%`}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Status Icons */}
                <div className="absolute top-2 left-2 flex space-x-1">
                  {file.uploadStatus === 'completed' && (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {file.uploadStatus === 'error' && (
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  {file.metadata?.compressionRatio && file.metadata.compressionRatio > 1.2 && (
                    <div className="px-2 py-1 bg-blue-500 rounded text-xs text-white">
                      -{Math.round((1 - 1/file.metadata.compressionRatio) * 100)}%
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex space-x-1">
                  {finalConfig.enableEditing && file.type === 'image' && file.uploadStatus === 'completed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(file.id);
                      }}
                      className="w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors duration-200"
                      disabled={disabled}
                      title="Edit image"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors duration-200"
                    disabled={disabled}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* File Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.file.name}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>{formatFileSize(file.size)}</span>
                  {file.metadata?.width && file.metadata?.height && (
                    <span>{file.metadata.width}×{file.metadata.height}</span>
                  )}
                </div>
                {file.uploadStatus === 'error' && file.error && (
                  <p className="text-xs text-red-500 mt-1">
                    {file.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Editing Modal */}
      {editingState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit Image
            </h3>
            
            <div className="space-y-4">
              {/* Brightness */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Brightness: {editingState.options.brightness}
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={editingState.options.brightness || 0}
                  onChange={(e) => setEditingState({
                    ...editingState,
                    options: { ...editingState.options, brightness: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>

              {/* Contrast */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contrast: {editingState.options.contrast}
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={editingState.options.contrast || 0}
                  onChange={(e) => setEditingState({
                    ...editingState,
                    options: { ...editingState.options, contrast: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>

              {/* Saturation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Saturation: {editingState.options.saturation}
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={editingState.options.saturation || 0}
                  onChange={(e) => setEditingState({
                    ...editingState,
                    options: { ...editingState.options, saturation: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingState(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={applyEditing}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors duration-200"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}