import React from 'react';
import { LinkPreview } from '@/types/enhancedPost';

interface InlinePreviewRendererProps {
  preview: LinkPreview;
  className?: string;
}

export const InlinePreviewRenderer: React.FC<InlinePreviewRendererProps> = ({
  preview,
  className = ''
}) => {
  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title}
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">
          {preview.title}
        </h3>
        {preview.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {preview.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {preview.siteName || new URL(preview.url).hostname}
          </span>
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
            {preview.type}
          </span>
        </div>
      </div>
    </div>
  );
};