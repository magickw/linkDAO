import { useState, useCallback } from 'react';
import { ipfsUploadService, UploadResult } from '@/services/ipfsUploadService';

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([]);

  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await ipfsUploadService.uploadFile(file);
      setUploadedFiles(prev => [...prev, result]);
      setProgress(100);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const results = await ipfsUploadService.uploadMultiple(files);
      setUploadedFiles(prev => [...prev, ...results]);
      setProgress(100);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const clearUploads = useCallback(() => {
    setUploadedFiles([]);
    setError(null);
    setProgress(0);
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadedFiles,
    uploadFile,
    uploadMultiple,
    clearUploads,
  };
};
