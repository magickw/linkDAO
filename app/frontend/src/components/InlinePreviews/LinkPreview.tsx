import React, { useState } from 'react';
import { LinkPreviewData } from './InlinePreviewRenderer';

interface LinkPreviewProps {
  data: LinkPreviewData;
  className?: string;
}

export default function LinkPreview({ data, className = '' }: LinkPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article':
        return '📄';
      case 'video':
        return '🎥';
      case 'product':
        return '🛍️';
      default:
        return '🌐';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'article':
        return 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700/50';
      case 'video':
        return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-700/50';
      case 'product':
        return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700/50';
      default:
        return 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-700/50';
    }
  };

  const getTypeTextColor = (type: string) => {
    switch (type) {
      case 'article':
        return 'text-blue-700 dark:text-blue-300';
      case 'video':
        return 'text-red-700 dark:text-red-300';
      case 'product':
        return 'text-green-700 dark:text-green-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className={`bg-gradient-to-br ${getTypeColor(data.type)} rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm">{getTypeIcon(data.type)}</span>
            <span className={`text-sm font-medium ${getTypeTextColor(data.type)}`}>
              {data.type.charAt(0).toUpperCase() + data.type.slice(1)}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
            {data.siteName || getDomain(data.url)}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex space-x-4">
          {/* Link Image */}
          {data.image && (
            <div className="flex-shrink-0">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                {!imageError ? (
                  <>
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    <img
                      src={data.image}
                      alt={data.title}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Link Details */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-2">
              {truncateText(data.title, 60)}
            </h4>
            
            {data.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                {truncateText(data.description, 120)}
              </p>
            )}

            {/* URL */}
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                {truncateText(data.url, 40)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button 
                onClick={() => window.open(data.url, '_blank', 'noopener,noreferrer')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium ${getTypeTextColor(data.type)} bg-white/70 dark:bg-gray-800/70 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors duration-200`}
              >
                Visit Link
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}