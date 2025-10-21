import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  useSellerProfile, 
  useSellerDashboard, 
  useSellerListings, 
  useSellerCacheManager 
} from '../../../hooks/useSellerCache';
import { useSellerCacheStats, useSellerCacheDebug } from '../../../providers/SellerQueryProvider';

/**
 * Demo component showcasing the unified cache invalidation system
 */
export const SellerCacheDemo: React.FC = () => {
  const { address } = useAccount();
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [updateCount, setUpdateCount] = useState(0);

  // Use the new cache-enabled hooks
  const { 
    data: profile, 
    isLoading: profileLoading, 
    updateProfile, 
    invalidateProfile,
    isCacheValid: profileCacheValid 
  } = useSellerProfile(selectedWallet || address);

  const { 
    data: dashboard, 
    isLoading: dashboardLoading,
    invalidateDashboard,
    isCacheValid: dashboardCacheValid 
  } = useSellerDashboard(selectedWallet || address);

  const { 
    data: listings, 
    isLoading: listingsLoading,
    invalidateListings,
    isCacheValid: listingsCacheValid 
  } = useSellerListings(selectedWallet || address);

  // Cache management hooks
  const { 
    invalidateAll, 
    clearAll, 
    warmCache, 
    getCacheStats,
    batchInvalidate 
  } = useSellerCacheManager(selectedWallet || address);

  const { stats, refreshStats } = useSellerCacheStats();
  const { debugCache, clearDebugCache, warmDebugCache } = useSellerCacheDebug();

  // Set default wallet address
  useEffect(() => {
    if (address && !selectedWallet) {
      setSelectedWallet(address);
    }
  }, [address, selectedWallet]);

  // Demo profile update with optimistic updates
  const handleProfileUpdate = async () => {
    if (!selectedWallet) return;

    try {
      await updateProfile.mutateAsync({
        displayName: `Updated Name ${updateCount + 1}`,
        bio: `Updated bio at ${new Date().toLocaleTimeString()}`,
        updatedAt: new Date().toISOString()
      });
      
      setUpdateCount(prev => prev + 1);
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  // Demo cache warming
  const handleWarmCache = async () => {
    if (!selectedWallet) return;
    await warmCache(['profile', 'dashboard', 'listings']);
  };

  // Demo batch invalidation
  const handleBatchInvalidate = async () => {
    const wallets = [selectedWallet, '0x1234567890123456789012345678901234567890'];
    await batchInvalidate(wallets.filter(Boolean));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Seller Cache Management Demo
        </h1>
        <p className="text-gray-600">
          Demonstrates unified cache invalidation system with React Query integration
        </p>
      </div>

      {/* Wallet Selection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wallet Address (for testing)
        </label>
        <input
          type="text"
          value={selectedWallet}
          onChange={(e) => setSelectedWallet(e.target.value)}
          placeholder="Enter wallet address or use connected wallet"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {address && (
          <button
            onClick={() => setSelectedWallet(address)}
            className="mt-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Use Connected Wallet
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cache Status Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Cache Status</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Profile Cache:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                profileCacheValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {profileCacheValid ? 'Valid' : 'Invalid/Stale'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Dashboard Cache:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                dashboardCacheValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {dashboardCacheValid ? 'Valid' : 'Invalid/Stale'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Listings Cache:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                listingsCacheValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {listingsCacheValid ? 'Valid' : 'Invalid/Stale'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Global Cache Stats</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Total Entries: {stats.totalEntries}</div>
              <div>Queue Size: {stats.queueSize}</div>
              <div>Dependencies: {stats.dependencies}</div>
              <div>Metadata Entries: {stats.metadata.length}</div>
            </div>
            
            <button
              onClick={refreshStats}
              className="mt-2 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Refresh Stats
            </button>
          </div>
        </div>

        {/* Cache Actions Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Cache Actions</h2>
          
          <div className="space-y-3">
            <button
              onClick={handleProfileUpdate}
              disabled={!selectedWallet || updateProfile.isPending}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateProfile.isPending ? 'Updating...' : 'Update Profile (Optimistic)'}
            </button>
            
            <button
              onClick={invalidateProfile}
              disabled={!selectedWallet}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              Invalidate Profile Cache
            </button>
            
            <button
              onClick={invalidateAll}
              disabled={!selectedWallet}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              Invalidate All Seller Cache
            </button>
            
            <button
              onClick={handleWarmCache}
              disabled={!selectedWallet}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Warm Cache
            </button>
            
            <button
              onClick={handleBatchInvalidate}
              disabled={!selectedWallet}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Batch Invalidate (Demo)
            </button>
            
            <button
              onClick={clearAll}
              disabled={!selectedWallet}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Clear All Cache
            </button>
          </div>

          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Debug Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => debugCache(selectedWallet)}
                className="w-full px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Debug Cache (Console)
              </button>
              
              <button
                onClick={() => clearDebugCache(selectedWallet)}
                className="w-full px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Clear Debug Cache
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Display */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Data */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Profile Data</h3>
          {profileLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : profile ? (
            <div className="text-sm space-y-2">
              <div><strong>Name:</strong> {profile.displayName || 'N/A'}</div>
              <div><strong>Bio:</strong> {profile.bio || 'N/A'}</div>
              <div><strong>Updated:</strong> {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : 'N/A'}</div>
              <div><strong>Tier:</strong> {profile.tier || 'N/A'}</div>
            </div>
          ) : (
            <div className="text-gray-500">No profile data</div>
          )}
        </div>

        {/* Dashboard Data */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Dashboard Data</h3>
          {dashboardLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : dashboard ? (
            <div className="text-sm space-y-2">
              <div><strong>Total Sales:</strong> {dashboard.sales.total}</div>
              <div><strong>Active Listings:</strong> {dashboard.listings.active}</div>
              <div><strong>Pending Orders:</strong> {dashboard.orders.pending}</div>
              <div><strong>Reputation:</strong> {dashboard.reputation.score}</div>
            </div>
          ) : (
            <div className="text-gray-500">No dashboard data</div>
          )}
        </div>

        {/* Listings Data */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Listings Data</h3>
          {listingsLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : listings && listings.length > 0 ? (
            <div className="text-sm space-y-2">
              <div><strong>Total Listings:</strong> {listings.length}</div>
              <div><strong>First Listing:</strong> {listings[0]?.title || 'N/A'}</div>
              <div><strong>Status:</strong> {listings[0]?.status || 'N/A'}</div>
            </div>
          ) : (
            <div className="text-gray-500">No listings data</div>
          )}
        </div>
      </div>

      {/* Update Counter */}
      {updateCount > 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            Profile updated {updateCount} time{updateCount !== 1 ? 's' : ''} with optimistic updates!
          </p>
        </div>
      )}

      {/* Error Display */}
      {updateProfile.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">
            Update Error: {updateProfile.error instanceof Error ? updateProfile.error.message : String(updateProfile.error)}
          </p>
        </div>
      )}
    </div>
  );
};

export default SellerCacheDemo;