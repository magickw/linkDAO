/**
 * File Upload Component for Messages
 * Handles file uploads with preview, progress, and validation
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, FileText, Film, Music, AlertCircle, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

interface FileUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  onUploadComplete: (fileId: string, url: string) => void;
  maxFileSize?: number; // in MB
  maxFiles?: number;
  acceptedTypes?: string[];
  conversationId?: string;
}

export const FileUploadButton: React.FC<FileUploadProps> = ({
  onFilesSelected,
  onFileRemove,
  onUploadComplete,
  maxFileSize = 10, // 10MB default
  maxFiles = 5,
  acceptedTypes = ['image/*', 'video/*', 'audio/*', '.pdf', '.doc', '.docx', '.txt']
}) => {
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];
    const maxSizeBytes = maxFileSize * 1024 * 1024;

    for (let i = 0; i < Math.min(files.length, maxFiles - selectedFiles.length); i++) {
      const file = files[i];

      // Validate file size
      if (file.size > maxSizeBytes) {
        console.error(`File ${file.name} exceeds ${maxFileSize}MB limit`);
        continue;
      }

      const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const uploadedFile: UploadedFile = {
        id: fileId,
        file,
        uploadProgress: 0,
        uploadStatus: 'pending'
      };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.preview = e.target?.result as string;
          setSelectedFiles(prev => prev.map(f => f.id === fileId ? uploadedFile : f));
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(uploadedFile);
    }

    setSelectedFiles(prev => [...prev, ...newFiles]);
    onFilesSelected(newFiles);

    // Start uploading
    newFiles.forEach(uploadedFile => uploadFile(uploadedFile));
  }, [selectedFiles, maxFileSize, maxFiles, onFilesSelected]);

  const uploadFile = async (uploadedFile: UploadedFile) => {
    const formData = new FormData();
    formData.append('file', uploadedFile.file);

    try {
      setSelectedFiles(prev => prev.map(f =>
        f.id === uploadedFile.id ? { ...f, uploadStatus: 'uploading' as const } : f
      ));

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setSelectedFiles(prev => prev.map(f =>
            f.id === uploadedFile.id ? { ...f, uploadProgress: progress } : f
          ));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const url = response.url || response.fileUrl;

          setSelectedFiles(prev => prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, uploadStatus: 'completed' as const, uploadProgress: 100, url }
              : f
          ));

          onUploadComplete(uploadedFile.id, url);
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        setSelectedFiles(prev => prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, uploadStatus: 'error' as const, error: 'Upload failed' }
            : f
        ));
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (error) {
      console.error('File upload error:', error);
      setSelectedFiles(prev => prev.map(f =>
        f.id === uploadedFile.id
          ? { ...f, uploadStatus: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ));
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    onFileRemove(fileId);
  };

  return (
    <div>
      {/* Upload Button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
        title="Upload files"
      >
        <Upload size={20} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* File Preview List */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2"
          >
            {selectedFiles.map(file => (
              <FilePreview
                key={file.id}
                file={file}
                onRemove={() => removeFile(file.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag and Drop Area */}
      {dragActive && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="bg-gray-800 border-2 border-dashed border-blue-500 rounded-lg p-12">
            <Upload size={48} className="text-blue-500 mx-auto mb-4" />
            <p className="text-white text-lg font-semibold">Drop files to upload</p>
            <p className="text-gray-400 text-sm mt-2">Max {maxFileSize}MB per file</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface FilePreviewProps {
  file: UploadedFile;
  onRemove: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove }) => {
  const getFileIcon = () => {
    const type = file.file.type;
    if (type.startsWith('image/')) return <Image size={20} className="text-blue-400" />;
    if (type.startsWith('video/')) return <Film size={20} className="text-purple-400" />;
    if (type.startsWith('audio/')) return <Music size={20} className="text-green-400" />;
    if (type === 'application/pdf') return <FileText size={20} className="text-red-400" />;
    return <File size={20} className="text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-gray-700 rounded-lg p-3 flex items-center space-x-3"
    >
      {/* Preview or Icon */}
      {file.preview ? (
        <img
          src={file.preview}
          alt={file.file.name}
          className="w-12 h-12 object-cover rounded"
        />
      ) : (
        <div className="w-12 h-12 flex items-center justify-center bg-gray-800 rounded">
          {getFileIcon()}
        </div>
      )}

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{file.file.name}</p>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span>{formatFileSize(file.file.size)}</span>
          {file.uploadStatus === 'uploading' && (
            <span>{file.uploadProgress}%</span>
          )}
        </div>

        {/* Progress Bar */}
        {file.uploadStatus === 'uploading' && (
          <div className="mt-1 bg-gray-600 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${file.uploadProgress}%` }}
            />
          </div>
        )}

        {/* Error Message */}
        {file.uploadStatus === 'error' && (
          <p className="text-red-400 text-xs mt-1">{file.error}</p>
        )}
      </div>

      {/* Status Icon */}
      <div className="flex-shrink-0">
        {file.uploadStatus === 'uploading' && (
          <Loader2 size={20} className="text-blue-400 animate-spin" />
        )}
        {file.uploadStatus === 'completed' && (
          <div className="bg-green-500/20 rounded-full p-1">
            <Check size={16} className="text-green-400" />
          </div>
        )}
        {file.uploadStatus === 'error' && (
          <div className="bg-red-500/20 rounded-full p-1">
            <AlertCircle size={16} className="text-red-400" />
          </div>
        )}
        {file.uploadStatus === 'pending' && (
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default FileUploadButton;
