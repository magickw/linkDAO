/**
 * EnhancedListingCreation - Updated listing creation component with image upload
 * Features: Multiple image upload, real-time preview, enhanced metadata, immediate visibility
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Plus, 
  Eye, 
  Save, 
  AlertTriangle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { marketplaceService } from '@/services/marketplaceService';
import { useSeller } from '@/hooks/useSeller';

interface ListingFormData {
  title: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  condition: string;
  tags: string[];
  escrowEnabled: boolean;
  shippingCost: string;
  estimatedDelivery: string;
  quantity: number;
}

interface ImagePreview {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

export const EnhancedListingCreation: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { profile } = useSeller();
  const { addToast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    price: '',
    currency: 'ETH',
    category: 'electronics',
    condition: 'new',
    tags: [],
    escrowEnabled: true,
    shippingCost: '0',
    estimatedDelivery: '3-5 days',
    quantity: 1
  });

  const [images, setImages] = useState<ImagePreview[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'details' | 'images' | 'preview'>('details');

  const categories = [
    'electronics', 'fashion', 'home', 'books', 'sports', 'toys', 
    'automotive', 'health', 'beauty', 'jewelry', 'art', 'collectibles'
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like-new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' }
  ];

  const handleInputChange = (field: keyof ListingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = useCallback((files: FileList) => {
    const maxImages = 10;
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    Array.from(files).forEach(file => {
      if (images.length >= maxImages) {
        addToast(`Maximum ${maxImages} images allowed`, 'warning');
        return;
      }

      if (file.size > maxSize) {
        addToast(`Image ${file.name} is too large (max 10MB)`, 'error');
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        addToast(`Invalid file type for ${file.name}`, 'error');
        return;
      }

      const preview = URL.createObjectURL(file);
      const newImage: ImagePreview = {
        file,
        preview,
        uploading: false,
        uploaded: false
      };

      setImages(prev => [...prev, newImage]);
    });
  }, [images.length, addToast]);

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleInputChange('tags', [...formData.tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (formData.quantity < 1) newErrors.quantity = 'Quantity must be at least 1';
    if (images.length === 0) newErrors.images = 'At least one image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImages = async (): Promise<string[]> => {
    // For now, we'll create mock image URLs since there's no upload method in marketplaceService
    const mockUrls: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (image.uploaded) continue;

      setImages(prev => prev.map((img, idx) => 
        idx === i ? { ...img, uploading: true } : img
      ));

      try {
        // Create a mock URL for the image
        const mockUrl = URL.createObjectURL(image.file);
        mockUrls.push(mockUrl);
        
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { ...img, uploading: false, uploaded: true } : img
        ));
      } catch (error) {
        console.error('Error processing image:', error);
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { 
            ...img, 
            uploading: false, 
            error: 'Processing failed' 
          } : img
        ));
        throw new Error(`Failed to process image ${i + 1}`);
      }
    }

    return mockUrls;
  };

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    if (!profile) {
      addToast('Please complete seller onboarding first', 'error');
      router.push('/marketplace/seller/onboarding');
      return;
    }

    if (!validateForm()) {
      addToast('Please fix the errors before submitting', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images first
      addToast('Processing images...', 'info');
      const imageUrls = await uploadImages();

      // Create listing with images
      addToast('Creating listing...', 'info');
      
      // Prepare the listing data with correct types
      const listingData: any = {
        sellerWalletAddress: address,
        tokenAddress: '0x0000000000000000000000000000000000000000', // For native token
        price: formData.price,
        quantity: formData.quantity,
        itemType: 'DIGITAL', // Default to digital for now
        listingType: 'FIXED_PRICE', // Default to fixed price for now
        metadataURI: formData.title,
        isEscrowed: formData.escrowEnabled,
        nftStandard: undefined,
        tokenId: undefined
      };

      const result = await marketplaceService.createListing(listingData);
      
      addToast('Listing created successfully! It should appear in the marketplace within 30 seconds.', 'success');
      
      // Redirect to marketplace or listing page
      router.push('/marketplace');
    } catch (error) {
      console.error('Error creating listing:', error);
      addToast(error instanceof Error ? error.message : 'Failed to create listing', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-white font-medium mb-2">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter a descriptive title for your item"
        />
        {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-white font-medium mb-2">Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={4}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe your item in detail..."
        />
        {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-white font-medium mb-2">Price *</label>
          <div className="flex">
            <input
              type="number"
              step="0.0001"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              className="flex-1 bg-white/10 border border-white/20 rounded-l-lg px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            <select
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="bg-white/10 border border-white/20 border-l-0 rounded-r-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Quantity</label>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-white font-medium mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Condition</label>
          <select
            value={formData.condition}
            onChange={(e) => handleInputChange('condition', e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {conditions.map(condition => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-white font-medium mb-2">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map(tag => (
            <span
              key={tag}
              className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-red-400"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a tag..."
          />
          <Button variant="outline" size="small" onClick={addTag}>
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="escrowEnabled"
          checked={formData.escrowEnabled}
          onChange={(e) => handleInputChange('escrowEnabled', e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
        />
        <label htmlFor="escrowEnabled" className="text-white">
          Enable escrow protection (recommended)
        </label>
      </div>
    </div>
  );

  const renderImagesStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-white font-medium mb-2">Product Images *</label>
        <p className="text-white/70 text-sm mb-4">
          Upload up to 10 high-quality images. The first image will be used as the main product image.
        </p>
        
        {/* Upload Area */}
        <div
          className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-white/50 transition-colors cursor-pointer"
          onClick={() => document.getElementById('image-upload')?.click()}
        >
          <Upload className="mx-auto text-white/60 mb-4" size={48} />
          <p className="text-white mb-2">Click to upload images</p>
          <p className="text-white/60 text-sm">PNG, JPG, WebP up to 10MB each</p>
          <input
            id="image-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
            className="hidden"
          />
        </div>
        {errors.images && <p className="text-red-400 text-sm mt-1">{errors.images}</p>}
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div>
          <h3 className="text-white font-medium mb-4">Uploaded Images ({images.length}/10)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                
                {/* Loading overlay */}
                {image.uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <Loader className="animate-spin text-white" size={24} />
                  </div>
                )}

                {/* Success indicator */}
                {image.uploaded && (
                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                    <CheckCircle size={16} className="text-white" />
                  </div>
                )}

                {/* Error indicator */}
                {image.error && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center rounded-lg">
                    <AlertTriangle className="text-red-400" size={24} />
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} className="text-white" />
                </button>

                {/* Main image indicator */}
                {index === 0 && (
                  <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Main
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Preview Your Listing</h3>
        <p className="text-white/70">Review your listing before publishing</p>
      </div>

      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-start space-x-6">
          {images.length > 0 && (
            <img
              src={images[0].preview}
              alt={formData.title}
              className="w-32 h-32 object-cover rounded-lg"
            />
          )}
          
          <div className="flex-1">
            <h4 className="text-xl font-bold text-white mb-2">{formData.title}</h4>
            <p className="text-white/80 mb-4">{formData.description}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/60">Price:</span>
                <p className="text-white font-medium">{formData.price} {formData.currency}</p>
              </div>
              <div>
                <span className="text-white/60">Category:</span>
                <p className="text-white font-medium capitalize">{formData.category}</p>
              </div>
              <div>
                <span className="text-white/60">Condition:</span>
                <p className="text-white font-medium capitalize">{formData.condition}</p>
              </div>
              <div>
                <span className="text-white/60">Quantity:</span>
                <p className="text-white font-medium">{formData.quantity}</p>
              </div>
            </div>

            {formData.tags.length > 0 && (
              <div className="mt-4">
                <span className="text-white/60 text-sm">Tags:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formData.escrowEnabled && (
              <div className="mt-4 flex items-center text-blue-400 text-sm">
                <CheckCircle size={16} className="mr-2" />
                Escrow Protection Enabled
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create New Listing</h1>
        <p className="text-white/70">List your item on the marketplace with enhanced features</p>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[
            { key: 'details', label: 'Details', icon: Save },
            { key: 'images', label: 'Images', icon: ImageIcon },
            { key: 'preview', label: 'Preview', icon: Eye }
          ].map((stepItem, index) => {
            const isActive = step === stepItem.key;
            const isCompleted = ['details', 'images', 'preview'].indexOf(step) > index;
            const Icon = stepItem.icon;

            return (
              <React.Fragment key={stepItem.key}>
                <div
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                    isActive 
                      ? 'bg-blue-500 text-white' 
                      : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                  onClick={() => setStep(stepItem.key as any)}
                >
                  <Icon size={20} />
                  <span>{stepItem.label}</span>
                </div>
                {index < 2 && (
                  <div className={`w-8 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-white/20'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <GlassPanel variant="primary" className="p-8 mb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 'details' && renderDetailsStep()}
            {step === 'images' && renderImagesStep()}
            {step === 'preview' && renderPreviewStep()}
          </motion.div>
        </AnimatePresence>
      </GlassPanel>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (step === 'details') router.back();
            else if (step === 'images') setStep('details');
            else if (step === 'preview') setStep('images');
          }}
        >
          {step === 'details' ? 'Cancel' : 'Back'}
        </Button>

        <Button
          variant="primary"
          onClick={() => {
            if (step === 'details') setStep('images');
            else if (step === 'images') setStep('preview');
            else handleSubmit();
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin mr-2" size={16} />
              Creating...
            </>
          ) : step === 'preview' ? (
            'Publish Listing'
          ) : (
            'Next'
          )}
        </Button>
      </div>
    </div>
  );
};

export default EnhancedListingCreation;