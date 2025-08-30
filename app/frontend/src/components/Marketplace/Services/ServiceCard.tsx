import React from 'react';
import { Service } from '../../../types/service';
import { StarIcon, ClockIcon, MapPinIcon, TagIcon } from '@heroicons/react/24/solid';

interface ServiceCardProps {
  service: Service;
  onBook: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onBook }) => {
  const formatPrice = (price: string, pricingModel: string) => {
    const amount = parseFloat(price);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: service.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

    switch (pricingModel) {
      case 'hourly':
        return `${formatted}/hr`;
      case 'fixed':
        return `${formatted} fixed`;
      case 'milestone':
        return `${formatted} starting`;
      default:
        return formatted;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days}d`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Service Image/Portfolio Preview */}
      <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
        {service.portfolioItems && service.portfolioItems.length > 0 ? (
          <img
            src={`https://ipfs.io/ipfs/${service.portfolioItems[0]}`}
            alt={service.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-4xl opacity-80">
              {service.category?.icon || '💼'}
            </div>
          </div>
        )}
        
        {/* Featured Badge */}
        {service.featured && (
          <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-medium">
            Featured
          </div>
        )}

        {/* Remote/Local Badge */}
        <div className="absolute top-3 right-3 flex items-center space-x-1 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
          <MapPinIcon className="h-3 w-3" />
          <span>{service.isRemote ? 'Remote' : 'Local'}</span>
        </div>
      </div>

      <div className="p-6">
        {/* Service Title and Category */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
            {service.title}
          </h3>
          <p className="text-sm text-gray-600">{service.category?.name}</p>
        </div>

        {/* Short Description */}
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">
          {service.shortDescription || service.description}
        </p>

        {/* Provider Info */}
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
            {service.provider?.profileCid ? (
              <img
                src={`https://ipfs.io/ipfs/${service.provider.profileCid}`}
                alt="Provider"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-600 text-sm font-medium">
                {service.provider?.handle?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {service.provider?.handle || 'Anonymous Provider'}
            </p>
            <div className="flex items-center">
              <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
              <span className="text-sm text-gray-600">
                {service.averageRating?.toFixed(1) || 'New'} 
                {service.reviewCount && ` (${service.reviewCount})`}
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {service.tags && service.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {service.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
            {service.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{service.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Service Details */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="h-4 w-4 mr-1" />
            <span>
              {service.durationMinutes 
                ? formatDuration(service.durationMinutes)
                : 'Flexible'
              }
            </span>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              {formatPrice(service.basePrice, service.pricingModel)}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {service.pricingModel} pricing
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onBook}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Book Now
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};