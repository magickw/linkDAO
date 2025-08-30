import React, { useState } from 'react';
import { ServiceCategory, ServiceSearchFilters } from '../types/service';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ServiceFiltersProps {
  categories: ServiceCategory[];
  filters: ServiceSearchFilters;
  onFiltersChange: (filters: ServiceSearchFilters) => void;
}

export const ServiceFilters: React.FC<ServiceFiltersProps> = ({
  categories,
  filters,
  onFiltersChange,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    pricing: true,
    location: true,
    other: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateFilter = (key: keyof ServiceSearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => 
    filters[key as keyof ServiceSearchFilters] !== undefined && 
    filters[key as keyof ServiceSearchFilters] !== null
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('category')}
          className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-3"
        >
          Category
          {expandedSections.category ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.category && (
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="category"
                checked={!filters.categoryId}
                onChange={() => updateFilter('categoryId', undefined)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">All Categories</span>
            </label>
            {categories.map((category) => (
              <label key={category.id} className="flex items-center">
                <input
                  type="radio"
                  name="category"
                  checked={filters.categoryId === category.id}
                  onChange={() => updateFilter('categoryId', category.id)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{category.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Pricing Model Filter */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('pricing')}
          className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-3"
        >
          Pricing Model
          {expandedSections.pricing ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.pricing && (
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="pricingModel"
                checked={!filters.pricingModel}
                onChange={() => updateFilter('pricingModel', undefined)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">All Models</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="pricingModel"
                checked={filters.pricingModel === 'fixed'}
                onChange={() => updateFilter('pricingModel', 'fixed')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Fixed Price</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="pricingModel"
                checked={filters.pricingModel === 'hourly'}
                onChange={() => updateFilter('pricingModel', 'hourly')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Hourly Rate</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="pricingModel"
                checked={filters.pricingModel === 'milestone'}
                onChange={() => updateFilter('pricingModel', 'milestone')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Milestone Based</span>
            </label>
          </div>
        )}
      </div>

      {/* Price Range Filter */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Price Range</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Min Price</label>
            <input
              type="number"
              placeholder="0"
              value={filters.minPrice || ''}
              onChange={(e) => updateFilter('minPrice', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Max Price</label>
            <input
              type="number"
              placeholder="No limit"
              value={filters.maxPrice || ''}
              onChange={(e) => updateFilter('maxPrice', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Location Filter */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection('location')}
          className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-3"
        >
          Location
          {expandedSections.location ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.location && (
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="location"
                checked={filters.isRemote === undefined}
                onChange={() => updateFilter('isRemote', undefined)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">All Locations</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="location"
                checked={filters.isRemote === true}
                onChange={() => updateFilter('isRemote', true)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Remote Only</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="location"
                checked={filters.isRemote === false}
                onChange={() => updateFilter('isRemote', false)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Local/In-Person</span>
            </label>
          </div>
        )}
      </div>

      {/* Tags Filter */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Skills & Tags</h4>
        <input
          type="text"
          placeholder="Enter tags separated by commas"
          value={filters.tags?.join(', ') || ''}
          onChange={(e) => {
            const tags = e.target.value
              .split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0);
            updateFilter('tags', tags.length > 0 ? tags : undefined);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          e.g., React, Design, Marketing
        </p>
      </div>

      {/* Quick Filters */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-3">Quick Filters</h4>
        <div className="space-y-2">
          <button
            onClick={() => onFiltersChange({ pricingModel: 'fixed', maxPrice: '100' })}
            className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Budget Friendly (Under $100)
          </button>
          <button
            onClick={() => onFiltersChange({ isRemote: true, pricingModel: 'hourly' })}
            className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Remote Hourly Services
          </button>
          <button
            onClick={() => onFiltersChange({ pricingModel: 'milestone' })}
            className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Project-Based Work
          </button>
        </div>
      </div>
    </div>
  );
};