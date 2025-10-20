import React, { useState, useCallback } from 'react';
import { Button } from '../../../../design-system';
import { UnifiedImageUpload } from '../../ImageUpload';
import { ImageUploadResult } from '../../../../services/unifiedImageService';

interface FirstListingStepProps {
  onComplete: (data: any) => void;
  data?: any;
}

export function FirstListingStep({ onComplete, data }: FirstListingStepProps) {
  const [formData, setFormData] = useState({
    title: data?.title || '',
    description: data?.description || '',
    category: data?.category || '',
    price: data?.price || '',
    currency: data?.currency || 'USDC',
    quantity: data?.quantity || '1',
    condition: data?.condition || 'new',
    images: data?.images || [],
    tags: data?.tags || '',
    escrowEnabled: data?.escrowEnabled !== undefined ? data.escrowEnabled : true,
    shippingFree: data?.shippingFree !== undefined ? data.shippingFree : true,
    shippingCost: data?.shippingCost || '',
    estimatedDays: data?.estimatedDays || '3-5',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const categories = [
    'Electronics',
    'Fashion & Clothing',
    'Home & Garden',
    'Sports & Outdoors',
    'Books & Media',
    'Art & Collectibles',
    'Digital Products',
    'NFTs',
    'Services',
    'Other',
  ];

  const currencies = [
    { value: 'USDC', label: 'USDC', symbol: '$' },
    { value: 'ETH', label: 'ETH', symbol: 'Ξ' },
    { value: 'BTC', label: 'BTC', symbol: '₿' },
    { value: 'MATIC', label: 'MATIC', symbol: '🔷' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Product title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Product description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    }

    if (!formData.shippingFree && (!formData.shippingCost || parseFloat(formData.shippingCost) < 0)) {
      newErrors.shippingCost = 'Please enter a valid shipping cost';
    }

    if (formData.images.length === 0) {
      newErrors.images = 'At least one product image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Process form data
      const listingData = {
        ...formData,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        shippingCost: formData.shippingFree ? 0 : parseFloat(formData.shippingCost || '0'),
        images: formData.images,
        tags: formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag),
        saleType: 'fixed',
        status: 'draft', // Start as draft
        imageCount: formData.images.length, // Add image count for logging
      };

      // Log image info instead of full base64 strings
      console.log('📸 Creating listing with', listingData.imageCount, 'images');
      formData.images.forEach((img: string, index: number) => {
        const sizeKB = Math.round((img.length * 0.75) / 1024); // Approximate size in KB
        console.log(`Image ${index + 1}: ${sizeKB}KB`);
      });

      await onComplete(listingData);
    } catch (error) {
      console.error('Failed to create listing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Image upload functions
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validImages = fileArray.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    if (validImages.length === 0) {
      setErrors(prev => ({
        ...prev,
        images: 'Please upload valid image files (JPEG, PNG, WebP) under 5MB'
      }));
      return;
    }

    setUploadingImage(true);
    try {
      const base64Images = await Promise.all(
        validImages.map(file => convertToBase64(file))
      );
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...base64Images].slice(0, 5) // Max 5 images
      }));
      
      // Show success feedback
      console.log(`✅ Successfully uploaded ${validImages.length} image(s)`);
      validImages.forEach((file, index) => {
        const sizeKB = Math.round(file.size / 1024);
        console.log(`📸 ${file.name}: ${sizeKB}KB`);
      });
      
      // Show temporary success indicator
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      
      // Clear any previous errors
      if (errors.images) {
        setErrors(prev => ({ ...prev, images: '' }));
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        images: 'Failed to process images. Please try again.'
      }));
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_: string, i: number) => i !== index)
    }));
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageUpload(e.target.files);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Introduction */}
      <div className="bg-purple-900 bg-opacity-50 rounded-lg p-4">
        <h4 className="text-purple-300 font-medium text-sm mb-2">🎉 Create Your First Listing!</h4>
        <p className="text-purple-200 text-sm">
          This will be your first product on the marketplace. Don't worry about making it perfect - 
          you can always edit it later. Let's get you started!
        </p>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Basic Information</h3>
        
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
            Product Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.title ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="e.g., Vintage Leather Jacket - Size M"
            maxLength={100}
          />
          {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title}</p>}
          <p className="mt-1 text-xs text-gray-400">{formData.title.length}/100 characters</p>
        </div>

        {/* Category and Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.category ? 'border-red-500' : 'border-gray-600'
              }`}
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category.toLowerCase().replace(/\s+/g, '-')}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-400">{errors.category}</p>}
          </div>

          <div>
            <label htmlFor="condition" className="block text-sm font-medium text-gray-300 mb-2">
              Condition
            </label>
            <select
              id="condition"
              value={formData.condition}
              onChange={(e) => handleInputChange('condition', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${
              errors.description ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Describe your product in detail. Include features, benefits, size, materials, etc."
            maxLength={2000}
          />
          {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-400">Be detailed to help buyers make informed decisions</p>
            <p className="text-xs text-gray-400">{formData.description.length}/2000</p>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Pricing & Quantity</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
              Price *
            </label>
            <div className="relative">
              <input
                type="number"
                id="price"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 pr-16 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.price ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="0.00"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-400 text-sm">{currencies.find(c => c.value === formData.currency)?.symbol}</span>
              </div>
            </div>
            {errors.price && <p className="mt-1 text-sm text-red-400">{errors.price}</p>}
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-300 mb-2">
              Currency
            </label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {currencies.map(currency => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              id="quantity"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              min="1"
              className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.quantity ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="1"
            />
            {errors.quantity && <p className="mt-1 text-sm text-red-400">{errors.quantity}</p>}
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Product Images *</h3>
        
        {/* Drag and Drop Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive
              ? 'border-purple-400 bg-purple-900/20'
              : errors.images
              ? 'border-red-400 bg-red-900/10'
              : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploadingImage || formData.images.length >= 5}
          />
          
          <div className="text-center">
            {uploadingImage ? (
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-gray-300">Processing images...</p>
              </div>
            ) : (
              <>
                <svg
                  className={`mx-auto h-12 w-12 mb-4 ${
                    dragActive ? 'text-purple-400' : 'text-gray-400'
                  }`}
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="space-y-2">
                  <p className={`text-lg font-medium ${
                    dragActive ? 'text-purple-300' : 'text-gray-300'
                  }`}>
                    {dragActive ? 'Drop images here' : 'Drag & drop images here'}
                  </p>
                  <p className="text-gray-400">or click to browse files</p>
                  <p className="text-sm text-gray-500">
                    JPEG, PNG, WebP • Max 5MB per image • Up to 5 images
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        
        {errors.images && (
          <p className="text-sm text-red-400 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.images}
          </p>
        )}
        
        {/* Success notification */}
        {uploadSuccess && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 animate-pulse">
            <p className="text-green-200 text-sm flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Images uploaded successfully! ✅
            </p>
          </div>
        )}
        
        {/* Image Previews */}
        {formData.images.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">
              Uploaded Images ({formData.images.length}/5)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {formData.images.map((image: string, index: number) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-600 bg-gray-800">
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Image Controls */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                      {index === 0 && (
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded font-medium">
                          Main
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        title="Remove image"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Main Image Indicator */}
                  {index === 0 && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600 text-white text-xs rounded font-medium">
                      Main
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="bg-blue-900/30 rounded-lg p-3">
              <p className="text-blue-200 text-sm flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                The first image will be used as the main thumbnail. Images are stored securely and will be processed when you create the listing.
              </p>
            </div>
          </div>
        )}
        
        <p className="text-xs text-gray-400">
          💡 Tip: Use high-quality images from different angles. Good photos significantly increase your chances of selling!
        </p>
      </div>

      {/* Shipping */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Shipping</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Free Shipping</h4>
            <p className="text-gray-400 text-sm">Offer free shipping to attract more buyers</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.shippingFree}
              onChange={(e) => handleInputChange('shippingFree', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {!formData.shippingFree && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="shippingCost" className="block text-sm font-medium text-gray-300 mb-2">
                Shipping Cost *
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="shippingCost"
                  value={formData.shippingCost}
                  onChange={(e) => handleInputChange('shippingCost', e.target.value)}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 pr-16 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.shippingCost ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400 text-sm">{currencies.find(c => c.value === formData.currency)?.symbol}</span>
                </div>
              </div>
              {errors.shippingCost && <p className="mt-1 text-sm text-red-400">{errors.shippingCost}</p>}
            </div>

            <div>
              <label htmlFor="estimatedDays" className="block text-sm font-medium text-gray-300 mb-2">
                Estimated Delivery
              </label>
              <input
                type="text"
                id="estimatedDays"
                value={formData.estimatedDays}
                onChange={(e) => handleInputChange('estimatedDays', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="3-5 business days"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
          Tags (Optional)
        </label>
        <input
          type="text"
          id="tags"
          value={formData.tags}
          onChange={(e) => handleInputChange('tags', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="vintage, leather, jacket, fashion (separate with commas)"
        />
        <p className="mt-1 text-xs text-gray-400">
          Add relevant tags to help buyers find your product
        </p>
      </div>

      {/* Escrow */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Escrow Protection
            </h4>
            <p className="text-gray-400 text-sm">
              Recommended: Protects both buyer and seller during the transaction
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.escrowEnabled}
              onChange={(e) => handleInputChange('escrowEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>

      {/* Success Tips */}
      <div className="bg-blue-900 bg-opacity-50 rounded-lg p-4">
        <h4 className="text-blue-300 font-medium text-sm mb-2">💡 Tips for Success</h4>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• Use clear, high-quality photos from multiple angles</li>
          <li>• Write detailed descriptions with measurements and materials</li>
          <li>• Price competitively by researching similar products</li>
          <li>• Respond quickly to buyer questions to build trust</li>
          <li>• Consider offering free shipping to increase appeal</li>
        </ul>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          onClick={() => onComplete({ ...formData, status: 'draft' })}
          variant="outline"
          disabled={isSubmitting || uploadingImage}
        >
          Save as Draft
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || uploadingImage}
          className="min-w-32"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creating...
            </div>
          ) : (
            'Create Listing'
          )}
        </Button>
      </div>
    </form>
  );
}