import React, { useState, useCallback } from 'react';
import { ipfsUploadService, UploadResult, UploadProgress, CharityDocMetadata } from '@/services/ipfsUploadService';

interface CharityDocumentUploadProps {
    onUploadComplete: (results: UploadResult[]) => void;
    onUploadError?: (error: Error) => void;
    metadata: CharityDocMetadata;
    maxFiles?: number;
    disabled?: boolean;
}

interface FileWithProgress {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'complete' | 'error';
    result?: UploadResult;
    error?: string;
}

export const CharityDocumentUpload: React.FC<CharityDocumentUploadProps> = ({
    onUploadComplete,
    onUploadError,
    metadata,
    maxFiles = 5,
    disabled = false,
}) => {
    const [files, setFiles] = useState<FileWithProgress[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) {
            setIsDragging(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (disabled) return;

        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles);
    }, [disabled]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            addFiles(selectedFiles);
        }
    }, []);

    const addFiles = (newFiles: File[]) => {
        const remainingSlots = maxFiles - files.length;
        const filesToAdd = newFiles.slice(0, remainingSlots);

        const filesWithProgress: FileWithProgress[] = filesToAdd.map(file => ({
            file,
            progress: 0,
            status: 'pending',
        }));

        setFiles(prev => [...prev, ...filesWithProgress]);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (files.length === 0 || isUploading) return;

        setIsUploading(true);
        const results: UploadResult[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const fileWithProgress = files[i];

                if (fileWithProgress.status === 'complete') {
                    if (fileWithProgress.result) {
                        results.push(fileWithProgress.result);
                    }
                    continue;
                }

                // Update status to uploading
                setFiles(prev => prev.map((f, idx) =>
                    idx === i ? { ...f, status: 'uploading' as const } : f
                ));

                try {
                    const result = await ipfsUploadService.uploadCharityDocument(
                        fileWithProgress.file,
                        metadata,
                        (progress: UploadProgress) => {
                            setFiles(prev => prev.map((f, idx) =>
                                idx === i ? { ...f, progress: progress.percentage } : f
                            ));
                        }
                    );

                    // Update status to complete
                    setFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: 'complete' as const, result, progress: 100 } : f
                    ));

                    results.push(result);
                } catch (error) {
                    // Update status to error
                    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
                    setFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: 'error' as const, error: errorMessage } : f
                    ));

                    if (onUploadError) {
                        onUploadError(error instanceof Error ? error : new Error(errorMessage));
                    }
                }
            }

            if (results.length > 0) {
                onUploadComplete(results);
            }
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getStatusIcon = (status: FileWithProgress['status']) => {
        switch (status) {
            case 'complete':
                return (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            case 'uploading':
                return (
                    <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={handleFileSelect}
                    disabled={disabled || files.length >= maxFiles}
                    className="hidden"
                />
                <label
                    htmlFor="file-upload"
                    className={`flex flex-col items-center ${disabled || files.length >= maxFiles ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        PDF, DOC, DOCX, or images (max 25MB each, up to {maxFiles} files)
                    </p>
                </label>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Files ({files.length}/{maxFiles})
                    </h4>
                    {files.map((fileWithProgress, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                            <div className="flex items-center flex-1 min-w-0 mr-4">
                                {getStatusIcon(fileWithProgress.status)}
                                <div className="ml-3 flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {fileWithProgress.file.name}
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatFileSize(fileWithProgress.file.size)}
                                        </p>
                                        {fileWithProgress.status === 'uploading' && (
                                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                                {fileWithProgress.progress}%
                                            </p>
                                        )}
                                        {fileWithProgress.status === 'error' && fileWithProgress.error && (
                                            <p className="text-xs text-red-600 dark:text-red-400">
                                                {fileWithProgress.error}
                                            </p>
                                        )}
                                        {fileWithProgress.status === 'complete' && fileWithProgress.result && (
                                            <a
                                                href={fileWithProgress.result.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                View on IPFS
                                            </a>
                                        )}
                                    </div>
                                    {fileWithProgress.status === 'uploading' && (
                                        <div className="mt-1 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                            <div
                                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                                style={{ width: `${fileWithProgress.progress}%` }}
                                            ></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {fileWithProgress.status !== 'uploading' && (
                                <button
                                    onClick={() => removeFile(index)}
                                    disabled={disabled}
                                    className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Button */}
            {files.length > 0 && files.some(f => f.status === 'pending' || f.status === 'error') && (
                <button
                    onClick={uploadFiles}
                    disabled={disabled || isUploading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                    {isUploading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                        </>
                    ) : (
                        'Upload to IPFS'
                    )}
                </button>
            )}
        </div>
    );
};
