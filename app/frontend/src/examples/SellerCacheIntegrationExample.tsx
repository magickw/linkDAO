import React from 'react';
import { useAccount } from 'wagmi';
import { SellerQueryProvider } from '../providers/SellerQueryProvider';
import { useSellerProfile, useSellerDashboard } from '../hooks/useSellerCache';
import SellerCacheDemo from '../components/Seller/Cache/SellerCacheDemo';

/**
 * Example component showing how to integrate the unified cache invalidation system
 */
const SellerProfileExample: React.FC = () => {
  const { address } = useAccount();
  
  // Use the cache-enabled hooks
  const { 
    data: profile, 
    isLoading: profileLoading, 
    updateProfile,
    isCacheValid: profileCacheValid 
  } = useSellerProfile(address);

  const { 
    data: dashboard, 
    isLoading: dashboardLoading,
    isCacheValid: dashboardCacheValid 
  } = useSellerDashboard(address);

  const handleUpdateProfile = async () => {
    if (!address) return;
    
    try {
      // This will trigger optimistic updates and cache invalidation
      await updateProfile.mutateAsync({
        displayName: `Updated at ${new Date().toLocaleTimeString()}`,
        bio: 'Updated bio with cache invalidation'
      });
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  if (!address) {
    return (
      <div className="p-4 text-center">
        <p>Please connect your wallet to see seller data</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Seller Cache Integration Example</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Profile Data</h3>
            <span className={`px-2 py-1 rounded text-xs ${
              profileCacheValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              Cache: {profileCacheValid ? 'Valid' : 'Stale'}
            </span>
          </div>
          
          {profileLoading ? (
            <div className="text-gray-500">Loading profile...</div>
          ) : profile ? (
            <div className="space-y-2 text-sm">
              <div><strong>Name:</strong> {profile.displayName ?? 'N/A'}</div>
              <div><strong>Bio:</strong> {profile.bio ?? 'N/A'}</div>
              <div><strong>Tier:</strong> {profile.tier ?? 'N/A'}</div>
              <div><strong>Updated:</strong> {profile.updatedAt ? (new Date(profile.updatedAt)).toLocaleString() : 'N/A'}</div>
            </div>
          ) : (
            <div className="text-gray-500">No profile found</div>
          )}
          
          <button
            onClick={handleUpdateProfile}
            disabled={updateProfile.isPending}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {updateProfile.isPending ? 'Updating...' : 'Update Profile (Optimistic)'}
          </button>
        </div>

        {/* Dashboard Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Dashboard Data</h3>
            <span className={`px-2 py-1 rounded text-xs ${
              dashboardCacheValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              Cache: {dashboardCacheValid ? 'Valid' : 'Stale'}
            </span>
          </div>
          
          {dashboardLoading ? (
            <div className="text-gray-500">Loading dashboard...</div>
          ) : dashboard ? (
            <div className="space-y-2 text-sm">
              <div><strong>Total Sales:</strong> {dashboard.sales?.total ?? 'N/A'}</div>
              <div><strong>Active Listings:</strong> {dashboard.listings?.active ?? 'N/A'}</div>
              <div><strong>Pending Orders:</strong> {dashboard.orders?.pending ?? 'N/A'}</div>
              <div><strong>Reputation:</strong> {dashboard.reputation?.score ?? 'N/A'}</div>
            </div>
          ) : (
            <div className="text-gray-500">No dashboard data</div>
          )}
        </div>
      </div>

      {/* Cache Benefits */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">Cache System Benefits</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Optimistic Updates:</strong> UI updates immediately, then syncs with server</li>
          <li>• <strong>Automatic Invalidation:</strong> Related caches are invalidated when data changes</li>
          <li>• <strong>Dependency Tracking:</strong> Profile changes automatically update dashboard</li>
          <li>• <strong>Error Recovery:</strong> Automatic rollback on failed updates</li>
          <li>• <strong>Performance:</strong> Reduced API calls with intelligent caching</li>
        </ul>
      </div>

      {/* Error Display */}
      {updateProfile.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            Update Error: {updateProfile.error instanceof Error ? updateProfile.error.message : String(updateProfile.error)}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Main integration example with provider
 */
const SellerCacheIntegrationExample: React.FC = () => {
  return (
    <SellerQueryProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Seller Cache Integration Example
            </h1>
            <p className="text-gray-600">
              Demonstrates unified cache invalidation system with React Query
            </p>
          </div>
          
          <SellerProfileExample />
          
          <div className="mt-12">
            <SellerCacheDemo />
          </div>
        </div>
      </div>
    </SellerQueryProvider>
  );
};

export default SellerCacheIntegrationExample;