/**
 * Data Consistency Demo Component
 * Demonstrates the centralized data management and consistency features
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useProduct, usePrice, useDataConsistency } from '@/hooks/useMarketplaceData';
import { formatPrice, formatDualPrice } from '@/utils/priceFormatter';
import { validateProductID, validateSellerID, normalizeID } from '@/utils/idValidator';
import DataConsistencyMonitor from './DataConsistencyMonitor';

interface DataConsistencyDemoProps {
  productId?: string;
}

export const DataConsistencyDemo: React.FC<DataConsistencyDemoProps> = ({
  productId = '550e8400-e29b-41d4-a716-446655440000'
}) => {
  const [selectedProductId, setSelectedProductId] = useState(productId);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [priceFormattingExamples, setPriceFormattingExamples] = useState<any[]>([]);

  // Use centralized data hooks
  const { product, loading: productLoading, error: productError, refresh: refreshProduct } = useProduct(selectedProductId);
  const { priceData, loading: priceLoading, refresh: refreshPrice } = usePrice(selectedProductId);
  const { inconsistencies, validateConsistency, getCacheStats } = useDataConsistency();

  // Demo data
  const demoProductIds = [
    '550e8400-e29b-41d4-a716-446655440000',
    'product-12345678',
    'invalid-id',
    ' whitespace-id ',
    ''
  ];

  const demoSellerIds = [
    '0x1234567890123456789012345678901234567890',
    'seller-12345678',
    'short',
    'UPPERCASE-SELLER-ID'
  ];

  const demoPrices = [
    { amount: 100, currency: 'USD' },
    { amount: 1.5, currency: 'ETH' },
    { amount: 0.5, currency: 'BTC' },
    { amount: 1000000, currency: 'USD' },
    { amount: -50, currency: 'USD' }
  ];

  useEffect(() => {
    // Run validation examples
    const productValidations = demoProductIds.map(id => ({
      id,
      type: 'product',
      validation: validateProductID(id),
      normalized: normalizeID(id, 'product')
    }));

    const sellerValidations = demoSellerIds.map(id => ({
      id,
      type: 'seller',
      validation: validateSellerID(id),
      normalized: normalizeID(id, 'seller')
    }));

    setValidationResults([...productValidations, ...sellerValidations]);

    // Run price formatting examples
    const priceExamples = demoPrices.map(({ amount, currency }) => {
      const formatted = formatPrice(amount, currency);
      const validation = formatted.value > 0 && currency.length > 0;
      
      return {
        input: { amount, currency },
        formatted,
        isValid: validation,
        dualPrice: amount > 0 ? formatDualPrice(amount, currency, amount * 2400, 'USD') : null
      };
    });

    setPriceFormattingExamples(priceExamples);
  }, []);

  const handleProductIdChange = (newId: string) => {
    setSelectedProductId(newId);
  };

  const handleRefreshData = async () => {
    await Promise.all([refreshProduct(), refreshPrice()]);
    validateConsistency();
  };

  const cacheStats = getCacheStats();

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          Data Consistency Demo
        </h1>
        <p className="text-white/70">
          Demonstrating centralized data management, price formatting, and ID validation
        </p>
      </motion.div>

      {/* Data Consistency Monitor */}
      <DataConsistencyMonitor 
        showDetails={true}
        autoRefresh={true}
        onInconsistencyDetected={(issues) => {
          console.log('Inconsistencies detected:', issues);
        }}
      />

      {/* Product Data Demo */}
      <GlassPanel variant="secondary" className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Centralized Product Data Management
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Selection */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Select Product ID:</h3>
            <div className="space-y-2">
              {demoProductIds.slice(0, 3).map((id) => (
                <Button
                  key={id}
                  variant={selectedProductId === id ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleProductIdChange(id)}
                  className="w-full text-left"
                >
                  {id || '(empty)'}
                </Button>
              ))}
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshData}
              className="w-full mt-4"
              disabled={productLoading || priceLoading}
            >
              {productLoading || priceLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>

          {/* Product Data Display */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Product Data:</h3>
            {productLoading ? (
              <div className="text-white/70">Loading...</div>
            ) : productError ? (
              <div className="text-red-400">Error: {productError}</div>
            ) : product ? (
              <div className="space-y-2 text-sm">
                <div><span className="text-white/70">ID:</span> {product.id}</div>
                <div><span className="text-white/70">Title:</span> {product.title}</div>
                <div><span className="text-white/70">Price:</span> {product.priceAmount} {product.priceCurrency}</div>
                <div><span className="text-white/70">Seller:</span> {product.sellerId}</div>
                <div><span className="text-white/70">Status:</span> {product.status}</div>
              </div>
            ) : (
              <div className="text-white/70">No product data</div>
            )}

            {/* Price Data */}
            {priceData && (
              <div className="mt-4 p-3 bg-white/5 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-2">Price Data:</h4>
                <div className="space-y-1 text-xs text-white/70">
                  <div>Amount: {priceData.amount} {priceData.currency}</div>
                  <div>USD: ${priceData.usdEquivalent}</div>
                  <div>EUR: €{priceData.eurEquivalent}</div>
                  <div>GBP: £{priceData.gbpEquivalent}</div>
                  <div>Updated: {priceData.lastUpdated.toLocaleTimeString()}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* ID Validation Demo */}
      <GlassPanel variant="secondary" className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          ID Validation & Normalization
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/70 pb-2">Original ID</th>
                <th className="text-left text-white/70 pb-2">Type</th>
                <th className="text-left text-white/70 pb-2">Valid</th>
                <th className="text-left text-white/70 pb-2">Detected Format</th>
                <th className="text-left text-white/70 pb-2">Normalized</th>
                <th className="text-left text-white/70 pb-2">Errors</th>
              </tr>
            </thead>
            <tbody>
              {validationResults.map((result, index) => (
                <tr key={index} className="border-b border-white/5">
                  <td className="py-2 text-white">
                    {result.id || '(empty)'}
                  </td>
                  <td className="py-2 text-white/70">
                    {result.type}
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      result.validation.isValid 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {result.validation.isValid ? 'Valid' : 'Invalid'}
                    </span>
                  </td>
                  <td className="py-2 text-white/70">
                    {result.validation.format || 'Unknown'}
                  </td>
                  <td className="py-2 text-white/70">
                    {result.normalized}
                  </td>
                  <td className="py-2 text-red-300 text-xs">
                    {result.validation.errors.slice(0, 2).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Price Formatting Demo */}
      <GlassPanel variant="secondary" className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Consistent Price Formatting
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {priceFormattingExamples.map((example, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-lg border ${
                example.isValid 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              <div className="text-sm text-white/70 mb-2">
                Input: {example.input.amount} {example.input.currency}
              </div>
              
              <div className="text-white font-medium mb-2">
                {example.formatted.display}
              </div>
              
              {example.dualPrice && (
                <div className="text-xs text-white/60">
                  Dual: {example.dualPrice.display}
                </div>
              )}
              
              <div className="text-xs text-white/50 mt-2">
                Valid: {example.isValid ? 'Yes' : 'No'}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Cache Statistics */}
      <GlassPanel variant="secondary" className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Cache Performance
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {cacheStats.products.size}
            </div>
            <div className="text-sm text-white/70">Products Cached</div>
            <div className="text-xs text-white/50 mt-1">
              Hit Rate: {(cacheStats.products.hitRate * 100).toFixed(1)}%
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {cacheStats.sellers.size}
            </div>
            <div className="text-sm text-white/70">Sellers Cached</div>
            <div className="text-xs text-white/50 mt-1">
              Hit Rate: {(cacheStats.sellers.hitRate * 100).toFixed(1)}%
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {cacheStats.prices.size}
            </div>
            <div className="text-sm text-white/70">Prices Cached</div>
            <div className="text-xs text-white/50 mt-1">
              Hit Rate: {(cacheStats.prices.hitRate * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-white/60 text-center">
          TTL: {Math.round(cacheStats.config.ttl / 1000 / 60)} minutes | 
          Max Size: {cacheStats.config.maxSize} items | 
          Inconsistencies: {inconsistencies.length}
        </div>
      </GlassPanel>
    </div>
  );
};

export default DataConsistencyDemo;