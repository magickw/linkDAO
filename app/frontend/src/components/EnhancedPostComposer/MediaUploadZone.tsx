// Mock Media Upload Zone for testing
import React from 'react';

interface MediaUploadZoneProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export const MediaUploadZone: React.FC<MediaUploadZoneProps> = ({
  onUpload,
  maxFiles,
  acceptedTypes
}) => {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    onUpload(files);
  };

  return (
    <div 
      data-testid="media-upload-zone"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-300 p-4 text-center"
    >
      Drop files here or click to upload
    </div>
  );
};