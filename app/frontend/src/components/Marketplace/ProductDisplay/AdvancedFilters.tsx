/**
 * AdvancedFilters Component - Comprehensive filtering system for marketplace
 * Features: Sale type, item type, seller status, payment methods, price ranges, and Web3 filters
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, X, ChevronDown, ChevronUp, Star, Shield, CheckCircle, Vote,
  DollarSign, Zap, Package, Palette, User, Clock, Truck, Globe
} from 'lucide-react';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';

export interface FilterOptions {
  // Core filters
  category?: string[];
  priceRange?: [number, number];
  currency?: 'eth' | 'usd' | 'any';

  // Sale type filters
  saleType?: ('fixed' | 'auction' | 'offer')[];

  // Item type filters
  itemType?: ('physical' | 'digital' | 'nft' | 'service')[];

  // Seller status filters
  sellerStatus?: ('verified' | 'new' | 'top' | 'dao-approved')[];

  // Payment method filters
  paymentMethods?: ('crypto' | 'fiat' | 'escrow')[];

  // Trust & security filters
  trust?: {
    verified?: boolean;
    escrowProtected?: boolean;
    onChainCertified?: boolean;
    daoApproved?: boolean;
  };

  // Shipping & logistics
  shipping?: {
    freeShipping?: boolean;
    digitalDelivery?: boolean;
    internationalShipping?: boolean;
    fastDelivery?: boolean; // 1-2 days
  };

  // Quality & reviews
  quality?: {
    minRating?: number;
    minReviews?: number;
    hasWarranty?: boolean;
    returnable?: boolean;
  };

  // Web3 specific
  web3?: {
    chains?: ('ethereum' | 'polygon' | 'arbitrum' | 'optimism')[];
    nftOnly?: boolean;
    newListings?: boolean; // Listed in last 24 hours
    endingSoon?: boolean; // Auctions ending in 24 hours
  };

  // Availability
  availability?: {
    inStock?: boolean;
    preOrder?: boolean;
    comingSoon?: boolean;
  };
}

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onReset: () => void;
  isOpen: boolean;
  onToggle: () => void;
  productCount?: number;
  className?: string;
}

interface FilterSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  isOpen,
  onToggle,
  productCount = 0,
  className = '',
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['saleType', 'itemType']));
  const [tempPriceRange, setTempPriceRange] = useState<[number, number]>(filters.priceRange || [0, 10000]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const updateFilters = useCallback((updates: Partial<FilterOptions>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  const toggleArrayFilter = useCallback((
    key: keyof FilterOptions,
    value: string,
    currentArray: string[] = []
  ) => {
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];

    updateFilters({ [key]: newArray.length > 0 ? newArray : undefined });
  }, [updateFilters]);

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category?.length) count++;
    if (filters.saleType?.length) count++;
    if (filters.itemType?.length) count++;
    if (filters.sellerStatus?.length) count++;
    if (filters.paymentMethods?.length) count++;
    if (filters.trust && Object.values(filters.trust).some(Boolean)) count++;
    if (filters.shipping && Object.values(filters.shipping).some(Boolean)) count++;
    if (filters.quality && Object.values(filters.quality).some(v => v !== undefined && v !== 0)) count++;
    if (filters.web3 && Object.values(filters.web3).some(v => v !== undefined && v !== false && (!Array.isArray(v) || v.length > 0))) count++;
    if (filters.availability && Object.values(filters.availability).some(Boolean)) count++;
    if (filters.priceRange) count++;
    return count;
  };

  const filterSections: FilterSection[] = [
    { id: 'saleType', title: 'Sale Type', icon: <DollarSign size={16} />, isExpanded: expandedSections.has('saleType') },
    { id: 'itemType', title: 'Item Type', icon: <Package size={16} />, isExpanded: expandedSections.has('itemType') },
    { id: 'sellerStatus', title: 'Seller Status', icon: <User size={16} />, isExpanded: expandedSections.has('sellerStatus') },
    { id: 'payment', title: 'Payment & Trust', icon: <Shield size={16} />, isExpanded: expandedSections.has('payment') },
    { id: 'shipping', title: 'Shipping & Delivery', icon: <Truck size={16} />, isExpanded: expandedSections.has('shipping') },
    { id: 'quality', title: 'Quality & Reviews', icon: <Star size={16} />, isExpanded: expandedSections.has('quality') },
    { id: 'web3', title: 'Web3 Features', icon: <Globe size={16} />, isExpanded: expandedSections.has('web3') },
    { id: 'availability', title: 'Availability', icon: <Clock size={16} />, isExpanded: expandedSections.has('availability') },
  ];

  const CheckboxGroup: React.FC<{
    options: { value: string; label: string; icon?: React.ReactNode }[];
    values: string[];
    onChange: (value: string) => void;
  }> = ({ options, values, onChange }) => (
    <div className="space-y-2">
      {options.map(option => (
        <label key={option.value} className="flex items-center space-x-3 cursor-pointer group">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
            values.includes(option.value)
              ? 'bg-blue-500 border-blue-500'
              : 'border-white/30 group-hover:border-white/50'
          }`}>
            {values.includes(option.value) && (
              <CheckCircle size={12} className="text-white" />
            )}
          </div>
          <div className="flex items-center space-x-2">
            {option.icon}
            <span className="text-sm text-white/80 group-hover:text-white transition-colors">
              {option.label}
            </span>
          </div>
        </label>
      ))}
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Filter Toggle Button */}
      <Button
        variant="outline"
        onClick={onToggle}
        className="flex items-center gap-2"
      >
        <Filter size={16} />
        <span>Filters</span>
        {getActiveFilterCount() > 0 && (
          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
            {getActiveFilterCount()}
          </span>
        )}
      </Button>

      {/* Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' as any }}
            className="fixed left-0 top-0 h-full w-80 z-50 lg:absolute lg:left-0 lg:top-full lg:mt-2 lg:h-auto lg:max-h-[80vh]"
          >
            <GlassPanel variant="modal" className="h-full lg:h-auto overflow-hidden border border-white/10">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-white/80" />
                  <h3 className="font-medium text-white">Advanced Filters</h3>
                </div>
                <div className="flex items-center gap-2">
                  {getActiveFilterCount() > 0 && (
                    <Button variant="ghost" size="small" onClick={onReset}>
                      Clear All
                    </Button>
                  )}
                  <button
                    onClick={onToggle}
                    className="p-1 text-white/60 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Filters Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-8rem)] lg:max-h-96">
                {/* Price Range */}
                <div className="p-4 border-b border-white/10">
                  <h4 className="font-medium text-white mb-3">Price Range</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={filters.currency || 'any'}
                        onChange={(e) => updateFilters({ currency: e.target.value as any })}
                        className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white"
                      >
                        <option value="any">Any Currency</option>
                        <option value="eth">ETH</option>
                        <option value="usd">USD</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={tempPriceRange[0]}
                        onChange={(e) => setTempPriceRange([+e.target.value, tempPriceRange[1]])}
                        onBlur={() => updateFilters({ priceRange: tempPriceRange })}
                        className="flex-1 px-2 py-1 text-sm bg-white/10 border border-white/20 rounded text-white placeholder-white/50"
                      />
                      <span className="text-white/60">to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={tempPriceRange[1]}
                        onChange={(e) => setTempPriceRange([tempPriceRange[0], +e.target.value])}
                        onBlur={() => updateFilters({ priceRange: tempPriceRange })}
                        className="flex-1 px-2 py-1 text-sm bg-white/10 border border-white/20 rounded text-white placeholder-white/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Sections */}
                {filterSections.map(section => (
                  <div key={section.id} className="border-b border-white/10">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {section.icon}
                        <span className="font-medium text-white">{section.title}</span>
                      </div>
                      {section.isExpanded ? (
                        <ChevronUp size={16} className="text-white/60" />
                      ) : (
                        <ChevronDown size={16} className="text-white/60" />
                      )}
                    </button>

                    <AnimatePresence>
                      {section.isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0">
                            {section.id === 'saleType' && (
                              <CheckboxGroup
                                options={[
                                  { value: 'fixed', label: 'Fixed Price', icon: <DollarSign size={14} /> },
                                  { value: 'auction', label: 'Auction', icon: <Zap size={14} /> },
                                  { value: 'offer', label: 'Accept Offers', icon: <Globe size={14} /> },
                                ]}
                                values={filters.saleType || []}
                                onChange={(value) => toggleArrayFilter('saleType', value, filters.saleType)}
                              />
                            )}

                            {section.id === 'itemType' && (
                              <CheckboxGroup
                                options={[
                                  { value: 'physical', label: 'Physical Items', icon: <Package size={14} /> },
                                  { value: 'digital', label: 'Digital Items', icon: <Globe size={14} /> },
                                  { value: 'nft', label: 'NFTs', icon: <Palette size={14} /> },
                                  { value: 'service', label: 'Services', icon: <Zap size={14} /> },
                                ]}
                                values={filters.itemType || []}
                                onChange={(value) => toggleArrayFilter('itemType', value, filters.itemType)}
                              />
                            )}

                            {section.id === 'sellerStatus' && (
                              <CheckboxGroup
                                options={[
                                  { value: 'verified', label: 'Verified Sellers', icon: <CheckCircle size={14} /> },
                                  { value: 'dao-approved', label: 'DAO Approved', icon: <Vote size={14} /> },
                                  { value: 'top', label: 'Top Sellers', icon: <Star size={14} /> },
                                  { value: 'new', label: 'New Sellers', icon: <Clock size={14} /> },
                                ]}
                                values={filters.sellerStatus || []}
                                onChange={(value) => toggleArrayFilter('sellerStatus', value, filters.sellerStatus)}
                              />
                            )}

                            {section.id === 'payment' && (
                              <div className="space-y-4">
                                <CheckboxGroup
                                  options={[
                                    { value: 'crypto', label: 'Crypto Payments', icon: <Globe size={14} /> },
                                    { value: 'fiat', label: 'Fiat Payments', icon: <DollarSign size={14} /> },
                                    { value: 'escrow', label: 'Escrow Protected', icon: <Shield size={14} /> },
                                  ]}
                                  values={filters.paymentMethods || []}
                                  onChange={(value) => toggleArrayFilter('paymentMethods', value, filters.paymentMethods)}
                                />

                                <div className="pt-2 space-y-2">
                                  <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                      type="checkbox"
                                      checked={filters.trust?.escrowProtected || false}
                                      onChange={(e) => updateFilters({
                                        trust: { ...filters.trust, escrowProtected: e.target.checked }
                                      })}
                                      className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                      filters.trust?.escrowProtected
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-white/30 group-hover:border-white/50'
                                    }`}>
                                      {filters.trust?.escrowProtected && <CheckCircle size={12} className="text-white" />}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Shield size={14} />
                                      <span className="text-sm text-white/80">Escrow Required</span>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Add other filter sections here... */}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10">
                <div className="text-sm text-white/60 mb-3">
                  {productCount} products match your filters
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={onToggle}
                    className="flex-1"
                  >
                    Apply Filters
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onReset}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedFilters;