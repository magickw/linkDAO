/**
 * UnifiedImageUploadDemo - Demonstration of the unified image upload pipeline
 * Shows how the standardized image upload works across all seller contexts
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import React, { useState } from 'react';
import { UnifiedImageUpload } from '../components/Seller/ImageUpload/UnifiedImageUpload';
import { ImageUploadResult } from '../services/unifiedImageService';
import { SellerError } from '../types/sellerError';

export const UnifiedImageUploadDemo: React.FC = () => {
  const [profileImages, setProfileImages] = useState<ImageUploadResult[]>([]);
  const [coverImages, setCoverImages] = useState<ImageUploadResult[]>([]);
  const [listingImages, setListingImages] = useState<ImageUploadResult[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleUploadSuccess = (context: string) => (results: ImageUploadResult[]) => {
    setUploadStatus(`✅ Successfully uploaded ${results.length} ${context} image(s)`);
    console.log(`${context} upload success:`, results);
  };

  const handleUploadError = (context: string) => (error: Error) => {
    setUploadStatus(`❌ ${context} upload failed: ${error.message}`);
    console.error(`${context} upload error:`, error);
  };

  const handleRemoveImage = (context: string) => (result: ImageUploadResult) => {
    setUploadStatus(`🗑️ Removed ${context} image`);
    console.log(`${context} image removed:`, result);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Unified Image Upload Pipeline Demo
        </h1>
        <p className="text-gray-600">
          Standardized image upload across all seller components
        </p>
        {uploadStatus && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">{uploadStatus}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Image Upload */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Profile Image</h2>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <UnifiedImageUpload
              context="profile"
              userId="demo-user-123"
              onUploadSuccess={handleUploadSuccess('profile')}
              onUploadError={handleUploadError('profile')}
              onRemoveImage={handleRemoveImage('profile')}
              initialImages={profileImages}
              className="w-full"
            />
          </div>
          <div className="text-sm text-gray-500">
            <p><strong>Requirements:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Max 5MB file size</li>
              <li>JPEG, PNG, WebP formats</li>
              <li>Recommended: 400x400px</li>
              <li>Single image only</li>
            </ul>
          </div>
        </div>

        {/* Cover Image Upload */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Cover Image</h2>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <UnifiedImageUpload
              context="cover"
              userId="demo-user-123"
              onUploadSuccess={handleUploadSuccess('cover')}
              onUploadError={handleUploadError('cover')}
              onRemoveImage={handleRemoveImage('cover')}
              initialImages={coverImages}
              className="w-full"
            />
          </div>
          <div className="text-sm text-gray-500">
            <p><strong>Requirements:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Max 10MB file size</li>
              <li>JPEG, PNG, WebP formats</li>
              <li>Recommended: 1200x400px</li>
              <li>Single image only</li>
            </ul>
          </div>
        </div>

        {/* Listing Images Upload */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Product Images</h2>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <UnifiedImageUpload
              context="listing"
              userId="demo-user-123"
              maxFiles={5}
              onUploadSuccess={handleUploadSuccess('listing')}
              onUploadError={handleUploadError('listing')}
              onRemoveImage={handleRemoveImage('listing')}
              initialImages={listingImages}
              variant="grid"
              className="w-full"
            />
          </div>
          <div className="text-sm text-gray-500">
            <p><strong>Requirements:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Max 10MB per file</li>
              <li>JPEG, PNG, WebP, GIF formats</li>
              <li>Recommended: 800x800px</li>
              <li>Up to 5 images</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Features Demonstration */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Unified Pipeline Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded border">
            <h3 className="font-medium text-gray-800 mb-2">✅ Consistent Validation</h3>
            <p className="text-sm text-gray-600">
              Same validation rules applied across all contexts with context-specific limits
            </p>
          </div>
          <div className="bg-white p-4 rounded border">
            <h3 className="font-medium text-gray-800 mb-2">🖼️ Image Processing</h3>
            <p className="text-sm text-gray-600">
              Automatic optimization, resizing, and thumbnail generation
            </p>
          </div>
          <div className="bg-white p-4 rounded border">
            <h3 className="font-medium text-gray-800 mb-2">🌐 CDN Integration</h3>
            <p className="text-sm text-gray-600">
              Consistent CDN URL generation with optimization parameters
            </p>
          </div>
          <div className="bg-white p-4 rounded border">
            <h3 className="font-medium text-gray-800 mb-2">🔄 Progress Tracking</h3>
            <p className="text-sm text-gray-600">
              Real-time upload progress with detailed status indicators
            </p>
          </div>
          <div className="bg-white p-4 rounded border">
            <h3 className="font-medium text-gray-800 mb-2">⚠️ Error Handling</h3>
            <p className="text-sm text-gray-600">
              Consistent error messages with recovery suggestions
            </p>
          </div>
          <div className="bg-white p-4 rounded border">
            <h3 className="font-medium text-gray-800 mb-2">📱 Mobile Optimized</h3>
            <p className="text-sm text-gray-600">
              Touch-friendly interface with responsive design
            </p>
          </div>
        </div>
      </div>

      {/* API Endpoints */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Standardized API Endpoints
        </h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="flex items-center space-x-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">POST</span>
            <span>/api/marketplace/seller/images/upload</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">POST</span>
            <span>/api/marketplace/seller/images/upload-multiple</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">GET</span>
            <span>/api/marketplace/seller/images/:imageId</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">DELETE</span>
            <span>/api/marketplace/seller/images/:imageId</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">GET</span>
            <span>/api/marketplace/seller/:walletAddress/images</span>
          </div>
        </div>
      </div>

      {/* Implementation Status */}
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h2 className="text-xl font-semibold text-green-800 mb-4">
          ✅ Implementation Complete
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-green-800 mb-2">Backend Services</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✅ UnifiedSellerImageService</li>
              <li>✅ SellerImageController</li>
              <li>✅ Standardized API routes</li>
              <li>✅ Image validation & processing</li>
              <li>✅ CDN URL generation</li>
              <li>✅ Error handling</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-green-800 mb-2">Frontend Components</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✅ UnifiedImageService</li>
              <li>✅ useUnifiedImageUpload hook</li>
              <li>✅ UnifiedImageUpload component</li>
              <li>✅ Context-aware validation</li>
              <li>✅ Progress tracking</li>
              <li>✅ Mobile optimization</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedImageUploadDemo;