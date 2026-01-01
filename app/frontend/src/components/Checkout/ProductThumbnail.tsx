/**
 * Product Thumbnail Component
 * Displays product images with robust fallback mechanisms
 */

import React, { useState } from 'react';
import { Package, Image as ImageIcon } from 'lucide-react';

interface ProductThumbnailProps {
  item: {
    id: string;
    title: string;
    image: string;
    category?: string;
  };
  size?: 'small' | 'medium' | 'large';
  fallbackType?: 'letter' | 'category' | 'placeholder';
  onImageError?: (item: any) => void;
  className?: string;
}

const ProductThumbnail: React.FC<ProductThumbnailProps> = ({
  item,
  size = 'medium',
  fallbackType = 'letter',
  onImageError,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-lg'
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
    if (onImageError) {
      onImageError(item);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const getLetterAvatar = () => {
    // Handle null, undefined, or empty titles gracefully
    const title = item.title || 'Product';
    const letter = title.charAt(0).toUpperCase() || 'P';
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-orange-500 to-orange-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'bg-gradient-to-br from-red-500 to-red-600',
      'bg-gradient-to-br from-teal-500 to-teal-600'
    ];
    
    // Use title hash to consistently pick a color
    const colorIndex = title.charCodeAt(0) % colors.length;
    
    return (
      <div className={`
        ${sizeClasses[size]} 
        ${colors[colorIndex]} 
        rounded-lg flex items-center justify-center text-white font-semibold
        ${className}
      `}>
        <span className={textSizeClasses[size]}>{letter}</span>
      </div>
    );
  };

  const getCategoryIcon = () => {
    const categoryIcons: { [key: string]: React.ReactNode } = {
      electronics: <Package className="w-1/2 h-1/2" />,
      clothing: <Package className="w-1/2 h-1/2" />,
      books: <Package className="w-1/2 h-1/2" />,
      home: <Package className="w-1/2 h-1/2" />,
      sports: <Package className="w-1/2 h-1/2" />,
      toys: <Package className="w-1/2 h-1/2" />,
      beauty: <Package className="w-1/2 h-1/2" />,
      automotive: <Package className="w-1/2 h-1/2" />,
      default: <Package className="w-1/2 h-1/2" />
    };

    const categoryColors: { [key: string]: string } = {
      electronics: 'bg-blue-500',
      clothing: 'bg-purple-500',
      books: 'bg-green-500',
      home: 'bg-orange-500',
      sports: 'bg-red-500',
      toys: 'bg-pink-500',
      beauty: 'bg-indigo-500',
      automotive: 'bg-gray-500',
      default: 'bg-gray-500'
    };

    const category = item.category?.toLowerCase() || 'default';
    const icon = categoryIcons[category] || categoryIcons.default;
    const color = categoryColors[category] || categoryColors.default;

    return (
      <div className={`
        ${sizeClasses[size]} 
        ${color} 
        rounded-lg flex items-center justify-center text-white
        ${className}
      `}>
        {icon}
      </div>
    );
  };

  const getPlaceholder = () => {
    return (
      <div className={`
        ${sizeClasses[size]} 
        bg-gray-600 
        rounded-lg flex items-center justify-center text-gray-400
        ${className}
      `}>
        <ImageIcon className="w-1/2 h-1/2" />
      </div>
    );
  };

  const getFallback = () => {
    switch (fallbackType) {
      case 'letter':
        return getLetterAvatar();
      case 'category':
        return getCategoryIcon();
      case 'placeholder':
      default:
        return getPlaceholder();
    }
  };

  // Show fallback if image failed to load or if no image URL
  if (imageError || !item.image) {
    return getFallback();
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <img
        src={item.image}
        alt={item.title}
        className={`
          ${sizeClasses[size]} 
          rounded-lg object-cover
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          transition-opacity duration-200
        `}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
      
      {/* Loading state */}
      {isLoading && (
        <div className={`
          absolute inset-0 
          ${sizeClasses[size]} 
          bg-gray-600 
          rounded-lg flex items-center justify-center
          animate-pulse
        `}>
          <ImageIcon className="w-1/2 h-1/2 text-gray-400" />
        </div>
      )}
    </div>
  );
};

export default ProductThumbnail;