import React, { useCallback } from 'react';

interface MediaUploadZoneProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
}

export const MediaUploadZone: React.FC<MediaUploadZoneProps> = ({
  onUpload,
  maxFiles = 10,
  acceptedTypes = ['image/*', 'video/*'],
  className = ''
}) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    onUpload(files.slice(0, maxFiles));
  }, [onUpload, maxFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onUpload(files.slice(0, maxFiles));
    }
  }, [onUpload, maxFiles]);

  return (
    <div
      className={`
        border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6
        hover:border-blue-400 dark:hover:border-blue-500 transition-colors
        ${className}
      `}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="text-center">
        <div className="text-4xl mb-2">📷</div>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Drag and drop files here, or click to select
        </p>
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600"
        >
          Choose Files
        </label>
      </div>
    </div>
  );
};