/**
 * OrderSearchFilters - Advanced search and filtering for orders
 * Features: Text search, status filters, date ranges, amount filters
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Calendar, 
  DollarSign, 
  Filter, 
  X, 
  RotateCcw 
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { OrderFilters, OrderSearchQuery, OrderStatus, PaymentMethod } from '@/types/order';

interface OrderSearchFiltersProps {
  onSearch: (query: OrderSearchQuery) => void;
  onFilterChange: (filters: OrderFilters) => void;
  currentFilters: OrderFilters;
  userType: 'buyer' | 'seller';
  className?: string;
}

const OrderSearchFilters: React.FC<OrderSearchFiltersProps> = ({
  onSearch,
  onFilterChange,
  currentFilters,
  userType,
  className = ''
}) => {
  const [searchText, setSearchText] = useState('');
  const [localFilters, setLocalFilters] = useState<OrderFilters>(currentFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const query: OrderSearchQuery = {
      text: searchText.trim() || undefined,
      filters: localFilters,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };

    onSearch(query);
  };

  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters: OrderFilters = {};
    setLocalFilters(emptyFilters);
    setSearchText('');
    onFilterChange(emptyFilters);
    onSearch({ filters: emptyFilters });
  };

  const getActiveFilterCount = () => {
    return Object.values(localFilters).filter(value => 
      value !== undefined && value !== '' && value !== null
    ).length;
  };

  const statusOptions: { value: OrderStatus; label: string }[] = [
    { value: 'CREATED', label: 'Created' },
    { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'DISPUTED', label: 'Disputed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'REFUNDED', label: 'Refunded' }
  ];

  const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'crypto', label: 'Crypto' },
    { value: 'fiat', label: 'Fiat' },
    { value: 'escrow', label: 'Escrow' }
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by order ID, product name, or tracking number..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
          >
            Search
          </Button>
        </div>
      </form>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            showAdvanced
              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Filter size={14} className="mr-1" />
          Advanced Filters
          {getActiveFilterCount() > 0 && (
            <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
              {getActiveFilterCount()}
            </span>
          )}
        </button>

        {/* Quick status filters */}
        {['PAID', 'SHIPPED', 'DELIVERED', 'DISPUTED'].map((status) => (
          <button
            key={status}
            onClick={() => handleFilterChange('status', localFilters.status === status ? undefined : status as OrderStatus)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              localFilters.status === status
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}

        {getActiveFilterCount() > 0 && (
          <button
            onClick={handleClearFilters}
            className="flex items-center px-3 py-1.5 text-sm rounded-lg border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <X size={14} className="mr-1" />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <select
              value={localFilters.paymentMethod || ''}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Methods</option>
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar size={14} className="inline mr-1" />
              Date From
            </label>
            <input
              type="date"
              value={localFilters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar size={14} className="inline mr-1" />
              Date To
            </label>
            <input
              type="date"
              value={localFilters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Min Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign size={14} className="inline mr-1" />
              Min Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={localFilters.minAmount || ''}
              onChange={(e) => handleFilterChange('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Max Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign size={14} className="inline mr-1" />
              Max Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={localFilters.maxAmount || ''}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Boolean Filters */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localFilters.hasDispute || false}
                onChange={(e) => handleFilterChange('hasDispute', e.target.checked || undefined)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Has Dispute
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localFilters.hasTracking || false}
                onChange={(e) => handleFilterChange('hasTracking', e.target.checked || undefined)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Has Tracking
              </span>
            </label>
          </div>

          {/* Category Filter (if applicable) */}
          {userType === 'buyer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={localFilters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                placeholder="e.g., Electronics, Fashion"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Seller Filter (for buyers) */}
          {userType === 'buyer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Seller Address
              </label>
              <input
                type="text"
                value={localFilters.seller || ''}
                onChange={(e) => handleFilterChange('seller', e.target.value || undefined)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Buyer Filter (for sellers) */}
          {userType === 'seller' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buyer Address
              </label>
              <input
                type="text"
                value={localFilters.buyer || ''}
                onChange={(e) => handleFilterChange('buyer', e.target.value || undefined)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Apply Filters Button */}
      {showAdvanced && (
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
            >
              <RotateCcw size={16} className="mr-2" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => onSearch({ filters: localFilters })}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSearchFilters;