import React, { useState } from 'react';
import InlinePreviewRenderer from '../components/InlinePreviews/InlinePreviewRenderer';
import contentPreviewService from '../services/contentPreviewService';
import { ContentPreview } from '../types/contentPreview';

export default function TestContentPreview() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<ContentPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);

  // Sample URLs for testing
  const sampleUrls = [
    'https://opensea.io/assets/ethereum/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/1',
    'https://snapshot.org/#/ens.eth/proposal/0x123456789',
    'https://etherscan.io/token/0xa0b86a33e6441e6c8c7c4b4c8c4b4c8c4b4c8c4b',
    'https://github.com/ethereum/ethereum-org-website',
    'https://vitalik.ca/general/2021/01/26/snarks.html'
  ];

  const handleGeneratePreview = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const generatedPreview = await contentPreviewService.generatePreview(url, {
        enableSandbox: true,
        cacheEnabled: true
      });
      setPreview(generatedPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      contentPreviewService.clearCache();
      setCacheStats(null);
      alert('Cache cleared successfully');
    } catch (err) {
      alert('Failed to clear cache');
    }
  };

  const handleGetCacheStats = () => {
    const stats = contentPreviewService.getCacheStats();
    setCacheStats(stats);
  };

  const handleSampleUrl = (sampleUrl: string) => {
    setUrl(sampleUrl);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Content Preview System Test
          </h1>
          
          {/* URL Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter URL to Preview
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleGeneratePreview}
                disabled={loading || !url.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Preview'}
              </button>
            </div>
          </div>

          {/* Sample URLs */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sample URLs (Click to test):
            </h3>
            <div className="flex flex-wrap gap-2">
              {sampleUrls.map((sampleUrl, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleUrl(sampleUrl)}
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {sampleUrl.includes('opensea') ? 'NFT' :
                   sampleUrl.includes('snapshot') ? 'Proposal' :
                   sampleUrl.includes('etherscan') ? 'Token' :
                   sampleUrl.includes('github') ? 'GitHub' : 'Article'}
                </button>
              ))}
            </div>
          </div>

          {/* Cache Controls */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={handleGetCacheStats}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Get Cache Stats
            </button>
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Clear Cache
            </button>
          </div>

          {/* Cache Stats */}
          {cacheStats && (
            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cache Statistics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cached items: {cacheStats.size}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                URLs: {cacheStats.urls.join(', ') || 'None'}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800 dark:text-red-200 font-medium">Error:</span>
              </div>
              <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-blue-800 dark:text-blue-200">Generating preview...</span>
              </div>
            </div>
          )}
        </div>

        {/* Preview Results */}
        {preview && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Generated Preview
              </h2>
              
              {/* Preview Metadata */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400 capitalize">{preview.type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Security:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      preview.securityStatus === 'safe' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      preview.securityStatus === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {preview.securityStatus}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Cached:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{preview.cached ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Generated:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      {new Date(preview.metadata.fetchedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rendered Preview */}
              <InlinePreviewRenderer 
                enhancedPreviews={[preview]}
                enableSecurity={true}
                className="border border-gray-200 dark:border-gray-600 rounded-md p-4"
              />
            </div>

            {/* Compact Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Compact Preview
              </h2>
              <InlinePreviewRenderer 
                enhancedPreviews={[preview]}
                compact={true}
                enableSecurity={true}
                className="border border-gray-200 dark:border-gray-600 rounded-md p-4"
              />
            </div>

            {/* Raw Data */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Raw Preview Data
              </h2>
              <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-auto text-sm text-gray-800 dark:text-gray-200">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Multiple URL Test */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Multiple URL Preview Test
          </h2>
          <InlinePreviewRenderer 
            urls={sampleUrls.slice(0, 3)}
            enableSecurity={true}
            maxPreviews={3}
            className="space-y-4"
          />
        </div>
      </div>
    </div>
  );
}