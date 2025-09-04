import React, { useState } from 'react';
import { Button } from '../../../../design-system';

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
    images: data?.images || [''],
    tags: data?.tags || '',
    escrowEnabled: data?.escrowEnabled !== undefined ? data.escrowEnabled : true,
    shippingFree: data?.shippingFree !== undefined ? data.shippingFree : true,
    shippingCost: data?.shippingCost || '',
    estimatedDays: data?.estimatedDays || '3-5',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const validImageUrl = formData.images[0] && formData.images[0].trim();
    if (!validImageUrl) {
      newErrors.images = 'At least one product image is required';
    } else {
      try {
        new URL(formData.images[0]);
      } catch {
        newErrors.images = 'Please enter a valid image URL';
      }
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
        images: formData.images.filter((img: string) => img.trim()),
        tags: formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag),
        saleType: 'fixed',
        status: 'draft', // Start as draft
      };

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

  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const removeImageField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_: string, i: number) => i !== index)
    }));
  };

  const updateImageField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img: string, i: number) => i === index ? value : img)
    }));
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
        <h3 className="text-lg font-semibold text-white">Product Images</h3>
        
        {formData.images.map((image: string, index: number) => (
          <div key={index} className="flex gap-3">
            <div className="flex-1">
              <label htmlFor={`image-${index}`} className="block text-sm font-medium text-gray-300 mb-2">
                Image URL {index === 0 ? '*' : '(Optional)'}
              </label>
              <input
                type="url"
                id={`image-${index}`}
                value={image}
                onChange={(e) => updateImageField(index, e.target.value)}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.images && index === 0 ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            {image && (
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-600">
                <img
                  src={image}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            {index > 0 && (
              <Button
                type="button"
                onClick={() => removeImageField(index)}
                variant="outline"
                size="small"
                className="mt-7"
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        
        {errors.images && <p className="text-sm text-red-400">{errors.images}</p>}
        
        {formData.images.length < 5 && (
          <Button
            type="button"
            onClick={addImageField}
            variant="outline"
            size="small"
          >
            Add Another Image
          </Button>
        )}
        
        <p className="text-xs text-gray-400">
          Tip: Use high-quality images from different angles. First image will be the main thumbnail.
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
          disabled={isSubmitting}
        >
          Save as Draft
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
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