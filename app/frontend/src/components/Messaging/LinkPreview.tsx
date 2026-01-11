import React, { useState, useEffect } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: string;
  favicon?: string;
  domain: string;
}

interface LinkPreviewProps {
  url: string;
  preview?: LinkPreviewData;
  onPreviewLoad?: (preview: LinkPreviewData) => void;
  className?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({
  url,
  preview: initialPreview,
  onPreviewLoad,
  className = ''
}) => {
  const [preview, setPreview] = useState<LinkPreviewData | null>(initialPreview || null);
  const [loading, setLoading] = useState(!initialPreview);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (initialPreview) {
      setPreview(initialPreview);
      setLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch('/api/messaging/link-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch preview');
        }

        const data = await response.json();
        if (data.success && data.data) {
          setPreview(data.data);
          onPreviewLoad?.(data.data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching link preview:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url, initialPreview, onPreviewLoad]);

  if (loading) {
    return (
      <div className={`animate-pulse border border-gray-200 dark:border-gray-700 rounded-lg p-3 ${className}`}>
        <div className="flex space-x-3">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return null; // Don't show anything if preview fails
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${className}`}
    >
      <div className="flex">
        {/* Image */}
        {preview.image && !imageError ? (
          <div className="w-24 h-24 flex-shrink-0">
            <img
              src={preview.image}
              alt={preview.title || 'Link preview'}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="w-24 h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            {preview.favicon && (
              <img
                src={preview.favicon}
                alt=""
                className="w-4 h-4"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            <span className="truncate">{preview.siteName || preview.domain}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </div>

          {preview.title && (
            <h4 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
              {preview.title}
            </h4>
          )}

          {preview.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {preview.description}
            </p>
          )}
        </div>
      </div>
    </a>
  );
};

export default LinkPreview;
