import React, { useState, useEffect } from 'react';
import { useIntelligentCache, useIntelligentCacheSystem, useCachePerformance } from '../../../hooks/useIntelligentCache';
import { CachePriority } from '../../../services/intelligentSellerCache';

// Mock seller data
const mockSellerData = {
  profile: {
    walletAddress: '0x1234567890123456789012345678901234567890',
    displayName: 'Demo Seller',
    bio: 'This is a demo seller for testing intelligent caching',
    tier: 'bronze',
    verificationStatus: { email: true, phone: false, kyc: false }
  },
  dashboard: {
    totalSales: 1250.50,
    activeListings: 8,
    pendingOrders: 3,
    totalViews: 2847,
    conversionRate: 4.2
  },
  listings: [
    { id: '1', title: 'Premium Widget', price: 99.99, status: 'active' },
    { id: '2', title: 'Basic Tool', price: 29.99, status: 'active' },
    { id: '3', title: 'Advanced Kit', price: 199.99, status: 'draft' }
  ]
};

/**
 * Demo component showcasing intelligent caching features
 */
export const IntelligentCacheDemo: React.FC = () => {
  const [selectedWallet, setSelectedWallet] = useState('0x1234567890123456789012345678901234567890');
  const [selectedDataType, setSelectedDataType] = useState('profile');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Cache system management
  const {
    systemStatus,
    startSystem,
    stopSystem,
    runOptimization,
    getReport,
    clearAllCaches
  } = useIntelligentCacheSystem();

  // Performance monitoring
  const { performance, alerts } = useCachePerformance(selectedWallet);

  // Intelligent cache for selected data
  const {
    data,
    isLoading,
    isError,
    error,
    isWarming,
    cacheStats,
    warmCache,
    invalidateCache,
    updateData,
    prefetchRelated,
    getCachePerformance
  } = useIntelligentCache({
    walletAddress: selectedWallet,
    dataType: selectedDataType,
    fetchFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      return (mockSellerData as any)[selectedDataType];
    },
    priority: CachePriority.HIGH,
    warmOnMount: true,
    dependencies: selectedDataType === 'dashboard' ? ['profile'] : []
  });

  // Auto-refresh demo
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      invalidateCache();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, invalidateCache]);

  // Start cache system on mount
  useEffect(() => {
    startSystem();
    return () => stopSystem();
  }, [startSystem, stopSystem]);

  const handleWarmCache = async () => {
    await warmCache(['seller-profile', 'seller-dashboard']);
  };

  const handleInvalidateCache = async () => {
    await invalidateCache();
  };

  const handleUpdateData = async () => {
    if (selectedDataType === 'profile' && data) {
      await updateData({
        displayName: `${data.displayName} (Updated ${new Date().toLocaleTimeString()})`
      });
    }
  };

  const handlePrefetchRelated = async () => {
    const relatedTypes = {
      profile: ['dashboard', 'listings'],
      dashboard: ['profile', 'listings'],
      listings: ['profile', 'dashboard']
    };

    await prefetchRelated(relatedTypes[selectedDataType as keyof typeof relatedTypes] || []);
  };

  const handleRunOptimization = async () => {
    const results = await runOptimization();
    console.log('Optimization results:', results);
  };

  const cachePerformance = getCachePerformance();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Intelligent Cache Demo</h1>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">System Status</h3>
          <div className="space-y-1 text-sm">
            <div>Intelligent Cache: {systemStatus.intelligent.enabled ? '✅ Active' : '❌ Inactive'}</div>
            <div>Cache Size: {systemStatus.intelligent.size} entries</div>
            <div>Hit Rate: {systemStatus.intelligent.hitRate.toFixed(1)}%</div>
            <div>Memory: {(systemStatus.intelligent.memoryUsage / 1024).toFixed(1)} KB</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Performance</h3>
          <div className="space-y-1 text-sm">
            <div>Monitoring: {systemStatus.performance.monitoring ? '✅ Active' : '❌ Inactive'}</div>
            <div>Active Alerts: {systemStatus.performance.alertCount}</div>
            <div>Optimization: {systemStatus.optimization.enabled ? '✅ Active' : '❌ Inactive'}</div>
            <div>Strategies Applied: {systemStatus.optimization.strategiesApplied}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Cache Performance</h3>
          <div className="space-y-1 text-sm">
            <div>Hit Rate: {cachePerformance.hitRate.toFixed(1)}%</div>
            <div>Response Time: {cachePerformance.responseTime.toFixed(1)}ms</div>
            <div>Memory Usage: {(cachePerformance.memoryUsage / 1024).toFixed(1)} KB</div>
            <div>Recommendations: {cachePerformance.recommendations.length}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="font-semibold mb-4">Demo Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Wallet Address</label>
            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="0x1234567890123456789012345678901234567890">Demo Wallet 1</option>
              <option value="0x9876543210987654321098765432109876543210">Demo Wallet 2</option>
              <option value="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd">Demo Wallet 3</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data Type</label>
            <select
              value={selectedDataType}
              onChange={(e) => setSelectedDataType(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="profile">Profile</option>
              <option value="dashboard">Dashboard</option>
              <option value="listings">Listings</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleWarmCache}
            disabled={isWarming}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isWarming ? 'Warming...' : 'Warm Cache'}
          </button>

          <button
            onClick={handleInvalidateCache}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Invalidate Cache
          </button>

          <button
            onClick={handleUpdateData}
            disabled={!data}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Update Data (Optimistic)
          </button>

          <button
            onClick={handlePrefetchRelated}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Prefetch Related
          </button>

          <button
            onClick={handleRunOptimization}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Run Optimization
          </button>

          <button
            onClick={clearAllCaches}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All Caches
          </button>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoRefresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="autoRefresh" className="text-sm">
            Auto-refresh every 10 seconds (for testing cache invalidation)
          </label>
        </div>
      </div>

      {/* Data Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Cached Data</h3>
          
          {isLoading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-600">Loading...</span>
            </div>
          )}

          {isError && (
            <div className="text-red-600 text-sm">
              Error: {error?.message || 'Unknown error'}
            </div>
          )}

          {data && (
            <div className="space-y-2">
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
              <div className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Cache Statistics</h3>
          
          {cacheStats && (
            <div className="space-y-2 text-sm">
              <div>Hit Rate: {cacheStats.hitRate.toFixed(1)}%</div>
              <div>Memory Usage: {(cacheStats.memoryUsage / 1024).toFixed(1)} KB</div>
              <div>Cache Size: {cacheStats.cacheSize} entries</div>
              <div>Last Updated: {new Date(cacheStats.lastUpdated).toLocaleTimeString()}</div>
            </div>
          )}

          {alerts && alerts.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-orange-600 mb-2">Performance Alerts</h4>
              <div className="space-y-1">
                {alerts.slice(0, 3).map((alert, index) => (
                  <div key={index} className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Recommendations */}
      {cachePerformance.recommendations.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Performance Recommendations</h3>
          <div className="space-y-2">
            {cachePerformance.recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="bg-blue-50 p-3 rounded">
                <div className="font-medium text-blue-800">{rec.type.replace('_', ' ').toUpperCase()}</div>
                <div className="text-sm text-blue-600">{rec.description}</div>
                <div className="text-xs text-blue-500 mt-1">
                  Impact: {rec.impact} | Effort: {rec.effort}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Information */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-4">Debug Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <h4 className="font-medium mb-2">Query State</h4>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
            <div>Error: {isError ? 'Yes' : 'No'}</div>
            <div>Warming: {isWarming ? 'Yes' : 'No'}</div>
            <div>Auto Refresh: {autoRefresh ? 'Yes' : 'No'}</div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Cache Keys</h4>
            <div>Wallet: {selectedWallet.slice(0, 10)}...</div>
            <div>Data Type: {selectedDataType}</div>
            <div>Query Key: ['seller', '{selectedDataType}', '{selectedWallet.slice(0, 6)}...']</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligentCacheDemo;