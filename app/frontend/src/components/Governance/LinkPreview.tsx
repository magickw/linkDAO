import React, { useState, useEffect } from 'react';
import { fetchLinkMetadata, LinkMetadata, validateURL, isIPFSLink, extractIPFSHash } from '@/utils/linkValidator';

interface LinkPreviewProps {
    url: string;
    onValidationChange?: (isValid: boolean) => void;
    className?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({
    url,
    onValidationChange,
    className = '',
}) => {
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        if (!url || url.trim().length === 0) {
            setMetadata(null);
            setError(null);
            setIsValid(false);
            onValidationChange?.(false);
            return;
        }

        const validateAndFetchMetadata = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Validate URL
                const valid = validateURL(url);
                setIsValid(valid);
                onValidationChange?.(valid);

                if (!valid) {
                    setError('Invalid URL format');
                    setMetadata(null);
                    return;
                }

                // Fetch metadata
                const meta = await fetchLinkMetadata(url);
                setMetadata(meta);
            } catch (err) {
                console.error('Failed to fetch link metadata:', err);
                setError('Failed to load link preview');
                setMetadata(null);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(validateAndFetchMetadata, 500);
        return () => clearTimeout(timer);
    }, [url, onValidationChange]);

    if (!url || url.trim().length === 0) {
        return null;
    }

    if (isLoading) {
        return (
            <div className={`p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 ${className}`}>
                <div className="flex items-center space-x-3">
                    <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Loading preview...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-4 border border-red-300 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/20 ${className}`}>
                <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-all">{url}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!metadata) {
        return null;
    }

    // IPFS Preview
    if (metadata.type === 'ipfs') {
        const hash = extractIPFSHash(url);
        return (
            <div className={`p-4 border border-purple-300 dark:border-purple-600 rounded-lg bg-purple-50 dark:bg-purple-900/20 ${className}`}>
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                                IPFS Document
                            </h4>
                            <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded">
                                Decentralized
                            </span>
                        </div>
                        {hash && (
                            <p className="text-xs text-purple-700 dark:text-purple-300 font-mono break-all mb-2">
                                {hash}
                            </p>
                        )}
                        <a
                            href={metadata.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center"
                        >
                            View on IPFS
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Website Preview
    return (
        <div className={`p-4 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 ${className}`}>
            <div className="flex items-start space-x-3">
                {metadata.image ? (
                    <img
                        src={metadata.image}
                        alt={metadata.title || 'Preview'}
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1 truncate">
                        {metadata.title || 'Link Preview'}
                    </h4>
                    {metadata.description && (
                        <p className="text-xs text-blue-700 dark:text-blue-300 line-clamp-2 mb-2">
                            {metadata.description}
                        </p>
                    )}
                    <a
                        href={metadata.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all flex items-center"
                    >
                        {new URL(metadata.url).hostname}
                        <svg className="w-3 h-3 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-green-600 dark:text-green-400">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Valid verification link
            </div>
        </div>
    );
};
