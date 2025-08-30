import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { PlusIcon, XMarkIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

interface NFTMintingInterfaceProps {
  onMint: (nftData: any) => Promise<void>;
  collections?: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

export default function NFTMintingInterface({ 
  onMint, 
  collections = [], 
  isLoading = false 
}: NFTMintingInterfaceProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    externalUrl: '',
    collectionId: '',
    royalty: 5, // 5% default
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [animationFile, setAnimationFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [attributes, setAttributes] = useState<NFTAttribute[]>([]);
  const [newAttribute, setNewAttribute] = useState({
    trait_type: '',
    value: '',
    display_type: '',
  });

  // Image dropzone
  const onImageDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Animation dropzone
  const onAnimationDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setAnimationFile(file);
      toast.success('Animation file added');
    }
  }, []);

  const {
    getRootProps: getImageRootProps,
    getInputProps: getImageInputProps,
    isDragActive: isImageDragActive,
  } = useDropzone({
    onDrop: onImageDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const {
    getRootProps: getAnimationRootProps,
    getInputProps: getAnimationInputProps,
    isDragActive: isAnimationDragActive,
  } = useDropzone({
    onDrop: onAnimationDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.mov'],
      'audio/*': ['.mp3', '.wav'],
      'model/*': ['.glb', '.gltf'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const addAttribute = () => {
    if (newAttribute.trait_type && newAttribute.value) {
      const attribute: NFTAttribute = {
        trait_type: newAttribute.trait_type,
        value: isNaN(Number(newAttribute.value)) ? newAttribute.value : Number(newAttribute.value),
      };
      
      if (newAttribute.display_type) {
        attribute.display_type = newAttribute.display_type;
      }

      setAttributes(prev => [...prev, attribute]);
      setNewAttribute({ trait_type: '', value: '', display_type: '' });
    }
  };

  const removeAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageFile) {
      toast.error('Please select an image file');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a name for your NFT');
      return;
    }

    try {
      const nftData = new FormData();
      nftData.append('name', formData.name);
      nftData.append('description', formData.description);
      nftData.append('externalUrl', formData.externalUrl);
      nftData.append('royalty', formData.royalty.toString());
      nftData.append('attributes', JSON.stringify(attributes));
      nftData.append('image', imageFile);
      
      if (formData.collectionId) {
        nftData.append('collectionId', formData.collectionId);
      }
      
      if (animationFile) {
        nftData.append('animation', animationFile);
      }

      await onMint(nftData);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        externalUrl: '',
        collectionId: '',
        royalty: 5,
      });
      setImageFile(null);
      setAnimationFile(null);
      setImagePreview('');
      setAttributes([]);
      
      toast.success('NFT minted successfully!');
    } catch (error) {
      console.error('Error minting NFT:', error);
      toast.error('Failed to mint NFT');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Mint New NFT
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Media Upload */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Image *
              </label>
              <div
                {...getImageRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isImageDragActive
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <input {...getImageInputProps()} />
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <PhotoIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Drag & drop an image, or click to select
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      PNG, JPG, GIF up to 50MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Animation Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Animation (Optional)
              </label>
              <div
                {...getAnimationRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isAnimationDragActive
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <input {...getAnimationInputProps()} />
                {animationFile ? (
                  <div className="flex items-center justify-center space-x-2">
                    <VideoCameraIcon className="h-6 w-6 text-green-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {animationFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnimationFile(null);
                      }}
                      className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <VideoCameraIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Drag & drop animation file
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      MP4, WebM, GLB up to 100MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - NFT Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter NFT name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe your NFT"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                External URL
              </label>
              <input
                type="url"
                name="externalUrl"
                value={formData.externalUrl}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://yoursite.com"
              />
            </div>

            {/* Collection Selection */}
            {collections.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Collection
                </label>
                <select
                  name="collectionId"
                  value={formData.collectionId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">No Collection</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Royalty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Royalty Percentage (0-10%)
              </label>
              <input
                type="number"
                name="royalty"
                value={formData.royalty}
                onChange={handleInputChange}
                min="0"
                max="10"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Attributes Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Attributes
          </h3>
          
          {/* Add New Attribute */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Trait type (e.g., Color)"
              value={newAttribute.trait_type}
              onChange={(e) => setNewAttribute(prev => ({ ...prev, trait_type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <input
              type="text"
              placeholder="Value (e.g., Blue)"
              value={newAttribute.value}
              onChange={(e) => setNewAttribute(prev => ({ ...prev, value: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <select
              value={newAttribute.display_type}
              onChange={(e) => setNewAttribute(prev => ({ ...prev, display_type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Default</option>
              <option value="number">Number</option>
              <option value="boost_percentage">Boost Percentage</option>
              <option value="boost_number">Boost Number</option>
              <option value="date">Date</option>
            </select>
            <button
              type="button"
              onClick={addAttribute}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add
            </button>
          </div>

          {/* Existing Attributes */}
          {attributes.length > 0 && (
            <div className="space-y-2">
              {attributes.map((attr, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                >
                  <div className="flex items-center space-x-4">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {attr.trait_type}:
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {attr.value}
                    </span>
                    {attr.display_type && (
                      <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                        {attr.display_type}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttribute(index)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !imageFile || !formData.name.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Minting...' : 'Mint NFT'}
          </button>
        </div>
      </form>
    </div>
  );
}