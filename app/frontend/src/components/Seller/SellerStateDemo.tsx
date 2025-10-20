import React from 'react';
import { useAccount } from 'wagmi';
import { useSellerState } from '../../hooks/useSellerState';

/**
 * Demo component showcasing the centralized seller state management with React Query
 */
const SellerStateDemo: React.FC = () => {
  const { address } = useAccount();
  
  const {
    // Data
    profile,
    dashboardStats,
    listings,
    orders,
    notifications,
    analytics,
    
    // Computed values
    unreadNotifications,
    activeListings,
    pendingOrders,
    
    // Loading states
    isLoading,
    profileLoading,
    dashboardLoading,
    listingsLoading,
    ordersLoading,
    notificationsLoading,
    analyticsLoading,
    
    // Error states
    hasError,
    profileError,
    dashboardError,
    listingsError,
    ordersError,
    notificationsError,
    analyticsError,
    
    // Actions
    createNewListing,
    updateExistingListing,
    removeListingById,
    updateProfileData,
    updateOrderStatusById,
    markNotificationAsRead,
    refreshAllData,
    
    // Cache management
    invalidateAll,
    clearAll,
    warmCache,
    getCacheStats,
    cacheStatus,
    
    // Mutation states
    isCreatingListing,
    isUpdatingListing,
    isDeletingListing,
    isUpdatingProfile,
    isUpdatingOrder,
    isMarkingNotificationRead,
    
    // Connection status
    isConnected,
    walletAddress,
  } = useSellerState();

  if (!isConnected) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">
          Wallet Not Connected
        </h2>
        <p className="text-yellow-700">
          Please connect your wallet to view seller data.
        </p>
      </div>
    );
  }

  const handleCreateListing = async () => {
    try {
      await createNewListing({
        title: 'Demo Listing',
        description: 'This is a demo listing created from the state management demo',
        price: 0.1,
        currency: 'ETH',
        quantity: 1,
        condition: 'new',
        category: 'demo',
        tags: ['demo', 'test'],
        images: [],
        status: 'draft',
        saleType: 'fixed',
        escrowEnabled: true,
        shippingOptions: {
          free: true,
          estimatedDays: '3-5 days',
          international: false
        }
      });
    } catch (error) {
      console.error('Failed to create listing:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await updateProfileData({
        displayName: 'Updated Seller Name',
        bio: 'Updated bio from state management demo'
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleRefreshAll = async () => {
    try {
      await refreshAllData();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const handleClearCache = async () => {
    try {
      await clearAll();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const cacheStats = getCacheStats();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Seller State Management Demo
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Connection Status</h3>
            <p className="text-blue-600">
              {isConnected ? `Connected: ${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}` : 'Not Connected'}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Loading State</h3>
            <p className="text-green-600">
              {isLoading ? 'Loading...' : 'Ready'}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-red-800">Error State</h3>
            <p className="text-red-600">
              {hasError ? 'Has Errors' : 'No Errors'}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
          <button
            onClick={handleUpdateProfile}
            disabled={isUpdatingProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
        {profileLoading ? (
          <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
        ) : profileError ? (
          <div className="text-red-600">Error: {profileError.message}</div>
        ) : profile ? (
          <div className="space-y-2">
            <p><strong>Display Name:</strong> {profile.displayName || 'Not set'}</p>
            <p><strong>Store Name:</strong> {profile.storeName || 'Not set'}</p>
            <p><strong>Bio:</strong> {profile.bio || 'Not set'}</p>
            <p><strong>Tier:</strong> {profile.tier}</p>
            <p><strong>Cache Valid:</strong> {cacheStatus.profile ? 'Yes' : 'No'}</p>
          </div>
        ) : (
          <p className="text-gray-500">No profile found</p>
        )}
      </div>

      {/* Dashboard Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard Stats</h2>
        {dashboardLoading ? (
          <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
        ) : dashboardError ? (
          <div className="text-red-600">Error: {dashboardError.message}</div>
        ) : dashboardStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">Total Sales</h3>
              <p className="text-2xl font-bold text-blue-600">{dashboardStats.sales.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Active Listings</h3>
              <p className="text-2xl font-bold text-green-600">{dashboardStats.listings.active}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-800">Pending Orders</h3>
              <p className="text-2xl font-bold text-yellow-600">{dashboardStats.orders.pending}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">Reputation</h3>
              <p className="text-2xl font-bold text-purple-600">{dashboardStats.reputation.score}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No dashboard data available</p>
        )}
      </div>

      {/* Listings Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Listings ({activeListings.length} active)
          </h2>
          <button
            onClick={handleCreateListing}
            disabled={isCreatingListing}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isCreatingListing ? 'Creating...' : 'Create Demo Listing'}
          </button>
        </div>
        {listingsLoading ? (
          <div className="animate-pulse bg-gray-200 h-40 rounded"></div>
        ) : listingsError ? (
          <div className="text-red-600">Error: {listingsError.message}</div>
        ) : listings.length > 0 ? (
          <div className="space-y-3">
            {listings.slice(0, 3).map((listing) => (
              <div key={listing.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{listing.title}</h3>
                    <p className="text-gray-600 text-sm">{listing.description}</p>
                    <p className="text-lg font-bold text-green-600">
                      {listing.price} {listing.currency}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateExistingListing(listing.id, { 
                        title: listing.title + ' (Updated)' 
                      })}
                      disabled={isUpdatingListing}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => removeListingById(listing.id)}
                      disabled={isDeletingListing}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {listings.length > 3 && (
              <p className="text-gray-500 text-center">
                ... and {listings.length - 3} more listings
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No listings found</p>
        )}
      </div>

      {/* Notifications Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Notifications ({unreadNotifications.length} unread)
        </h2>
        {notificationsLoading ? (
          <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
        ) : notificationsError ? (
          <div className="text-red-600">Error: {notificationsError.message}</div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div 
                key={notification.id} 
                className={`border rounded-lg p-4 ${
                  notification.read ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{notification.title}</h3>
                    <p className="text-gray-600 text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkNotificationRead(notification.id)}
                      disabled={isMarkingNotificationRead}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No notifications</p>
        )}
      </div>

      {/* Cache Management */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Cache Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Cache Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Profile:</span>
                <span className={cacheStatus.profile ? 'text-green-600' : 'text-red-600'}>
                  {cacheStatus.profile ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dashboard:</span>
                <span className={cacheStatus.dashboard ? 'text-green-600' : 'text-red-600'}>
                  {cacheStatus.dashboard ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Listings:</span>
                <span className={cacheStatus.listings ? 'text-green-600' : 'text-red-600'}>
                  {cacheStatus.listings ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Orders:</span>
                <span className={cacheStatus.orders ? 'text-green-600' : 'text-red-600'}>
                  {cacheStatus.orders ? 'Valid' : 'Invalid'}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Cache Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Entries:</span>
                <span>{cacheStats?.totalEntries || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Queue Size:</span>
                <span>{cacheStats?.queueSize || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Dependencies:</span>
                <span>{cacheStats?.dependencies || 0}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-4 mt-4">
          <button
            onClick={handleRefreshAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh All Data
          </button>
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Clear Cache
          </button>
          <button
            onClick={() => warmCache(['profile', 'dashboard', 'listings'])}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Warm Cache
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerStateDemo;