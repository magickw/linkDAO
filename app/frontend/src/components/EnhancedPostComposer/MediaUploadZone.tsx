import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MediaFile, MediaUploadConfig } from '../../types/enhancedPost';

interface MediaUploadZoneProps {
  files: MediaFile[];
  onFilesChange: (files: MediaFile[]) => void;
  config?: Partial<MediaUploadConfig>;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_CONFIG: MediaUploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
  enablePreview: true,
  enableEditing: true,
  enableProgress: true
};

export default function MediaUploadZone({
  files,
  onFilesChange,
  config = {},
  disabled = false,
  className = ''
}: MediaUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Generate unique ID for files
  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Validate file before adding
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > finalConfig.maxFileSize) {
      return {
        valid: false,
        error: `File size must be less than ${Math.round(finalConfig.maxFileSize / 1024 / 1024)}MB`
      };
    }

    if (!finalConfig.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported'
      };
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
  const createMediaFile = (file: File): Promise<MediaFile> => {
    return new Promise((resolve, reject) => {
      const id = generateFileId();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        const mediaFile: MediaFile = {
          id,
          file,
          preview,
          type: file.type.startsWith('image/') ? 'image' : 
                file.type.startsWith('video/') ? 'video' : 'audio',
          size: file.size,
          uploadStatus: 'pending'
        };
        resolve(mediaFile);
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
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
    }

    // Show errors if any
    if (errors.length > 0) {
      console.error('File upload errors:', errors);
      // In a real app, you'd show these errors to the user
    }
  }, [files, onFilesChange, disabled, finalConfig]);

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
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  }, [files, onFilesChange]);

  // Simulate upload progress (in real app, this would be actual upload progress)
  const simulateUpload = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || file.uploadStatus !== 'pending') return;

    // Update file status to uploading
    onFilesChange(files.map(f => 
      f.id === fileId ? { ...f, uploadStatus: 'uploading' as const } : f
    ));

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Mark as completed
        const updatedFiles = files.map(f => 
          f.id === fileId ? { 
            ...f, 
            uploadStatus: 'completed' as const,
            uploadProgress: 100,
            cid: `bafybei${Math.random().toString(36).substr(2, 50)}` // Mock IPFS CID
          } : f
        );
        onFilesChange(updatedFiles);
        
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      } else {
        setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
        const updatedFiles = files.map(f => 
          f.id === fileId ? { ...f, uploadProgress: progress } : f
        );
        onFilesChange(updatedFiles);
      }
    }, 200);
  }, [files, onFilesChange]);

  // Auto-start upload for pending files
  useEffect(() => {
    files.forEach(file => {
      if (file.uploadStatus === 'pending') {
        setTimeout(() => simulateUpload(file.id), 500);
      }
    });
  }, [files, simulateUpload]);

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
                
                {/* Upload Progress Overlay */}
                {file.uploadStatus === 'uploading' && finalConfig.enableProgress && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-2" />
                      <div className="text-sm">
                        {Math.round(file.uploadProgress || 0)}%
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Status Icons */}
                <div className="absolute top-2 left-2">
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
                </div>
                
                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors duration-200"
                  disabled={disabled}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* File Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
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
    </div>
  );
}