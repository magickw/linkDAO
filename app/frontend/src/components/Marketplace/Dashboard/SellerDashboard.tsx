import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useUnifiedSellerDashboard, useUnifiedSeller, useSellerTiers, useUnifiedSellerListings } from '../../../hooks/useUnifiedSeller';
import { Button, GlassPanel, LoadingSkeleton } from '../../../design-system';
import { MessagingAnalytics } from '../../Seller/MessagingAnalytics';
import { UnifiedSellerDashboard } from '../../../types/unifiedSeller';
import { withSellerErrorBoundary } from '../../Seller/ErrorHandling';

interface SellerDashboardProps {
  mockWalletAddress?: string;
}

function SellerDashboardComponent({ mockWalletAddress }: SellerDashboardProps) {
  const router = useRouter();
  const { profile, loading: profileLoading } = useUnifiedSeller(mockWalletAddress);
  const { dashboard, stats, notifications, unreadNotifications, loading, markNotificationRead, address: dashboardAddress } = useUnifiedSellerDashboard(mockWalletAddress);
  const { getTierById, getNextTier } = useSellerTiers();
  const { listings, loading: listingsLoading } = useUnifiedSellerListings(dashboardAddress);
  const [activeTab, setActiveTab] = useState('overview');

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-32" />
            ))}
          </div>
          <LoadingSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Seller Profile Not Found</h1>
            <p className="text-gray-300 mb-6">
              You need to complete the seller onboarding process to access the dashboard.
            </p>
          </div>
          <Button onClick={() => router.push('/marketplace/seller/onboarding')} variant="primary">
            Start Seller Onboarding
          </Button>
        </GlassPanel>
      </div>
    );
  }

  // If stats is null or undefined, show a loading state or message
  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Loading Dashboard</h1>
            <p className="text-gray-300">
              Please wait while we load your seller dashboard data...
            </p>
          </div>
        </GlassPanel>
      </div>
    );
  }

  const currentTier = getTierById(profile?.tier);
  const nextTier = getNextTier(profile?.tier);

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const StatCard = ({ title, value, icon, color = 'blue' }: any) => (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 bg-${color}-500 bg-opacity-20 rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </GlassPanel>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center mb-4 md:mb-0">
            {profile?.coverImage ? (
              <img
                src={profile.coverImage}
                alt={profile.displayName}
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-500 mr-4"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl font-bold">
                  {profile?.displayName?.charAt(0) || profile?.storeName?.charAt(0) || 'S'}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{profile?.storeName || profile?.displayName}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  currentTier?.id === 'pro' ? 'bg-purple-600 text-white' :
                  currentTier?.id === 'verified' ? 'bg-blue-600 text-white' :
                  currentTier?.id === 'basic' ? 'bg-green-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {currentTier?.name}
                </span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(profile?.stats?.averageRating || 0) ? 'text-yellow-400' : 'text-gray-600'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-gray-400 text-sm ml-1">
                    ({profile?.stats?.totalReviews || 0})
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {unreadNotifications.length > 0 && (
              <Button
                onClick={() => setActiveTab('notifications')}
                variant="outline"
                className="relative"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 19H6a2 2 0 01-2-2V7a2 2 0 012-2h5m5 0v5" />
                </svg>
                Notifications
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications.length}
                </span>
              </Button>
            )}
            <Button
              onClick={() => {
                const sellerId = profile?.walletAddress || dashboardAddress;
                if (sellerId) {
                  router.push(`/marketplace/seller/store/${sellerId}`);
                } else {
                  console.error('No seller ID available for store navigation');
                }
              }}
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Store
            </Button>
            <Button
              onClick={() => router.push('/marketplace/seller/profile')}
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Edit Profile
            </Button>
            <Button
              onClick={() => router.push('/marketplace/seller/listings/create')}
              variant="primary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Listing
            </Button>
          </div>
        </div>

        {/* Tier Upgrade Banner */}
        {nextTier && (
          <GlassPanel className="mb-8 p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Upgrade to {nextTier.name}
                </h3>
                <p className="text-gray-300 text-sm mb-2">{nextTier.description}</p>
                <div className="flex flex-wrap gap-2">
                  {nextTier.benefits.slice(0, 3).map((benefit, index) => (
                    <span key={index} className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => router.push('/marketplace/seller/upgrade')}
                variant="primary"
                size="small"
              >
                Upgrade Now
              </Button>
            </div>
          </GlassPanel>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Sales"
            value={formatCurrency(stats?.sales?.total || 0)}
            color="green"
            icon={
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            }
          />

          <StatCard
            title="Active Listings"
            value={stats?.listings?.active || 0}
            color="blue"
            icon={
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />

          <StatCard
            title="Pending Orders"
            value={stats?.orders?.pending || 0}
            color="orange"
            icon={
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2H5a2 2 0 002-2v-6a2 2 0 002-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />

          <StatCard
            title="Reputation Score"
            value={profile?.stats?.reputationScore || 0}
            color="purple"
            icon={
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'orders', label: 'Orders', icon: '📦' },
            { id: 'listings', label: 'Listings', icon: '🏪' },
            { id: 'analytics', label: 'Analytics', icon: '📈' },
            { id: 'messaging', label: 'Messaging', icon: '💬' },
            { id: 'notifications', label: 'Notifications', icon: '🔔' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.id === 'notifications' && unreadNotifications.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <GlassPanel className="p-6 text-center">
              <div className="py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Welcome to Your Dashboard</h3>
                <p className="text-gray-300 mb-6">
                  Start by creating your first listing to begin selling on the marketplace
                </p>
                <Button
                  onClick={() => router.push('/marketplace/seller/listings/create')}
                  variant="primary"
                >
                  Create Your First Listing
                </Button>
              </div>
            </GlassPanel>
          )}

          {activeTab === 'notifications' && (
            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        notification.read
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-blue-900 bg-opacity-50 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{notification.title}</h4>
                          <p className="text-gray-300 text-sm mt-1">{notification.message}</p>
                          <p className="text-gray-400 text-xs mt-2">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <Button
                            onClick={() => markNotificationRead(notification.id)}
                            variant="outline"
                            size="small"
                          >
                            Mark Read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 19H6a2 2 0 01-2-2V7a2 2 0 012-2h5m5 0v5" />
                    </svg>
                    <p className="text-gray-400">No notifications yet</p>
                  </div>
                )}
              </div>
            </GlassPanel>
          )}

          {activeTab === 'messaging' && (
            <GlassPanel className="p-0">
              <MessagingAnalytics />
            </GlassPanel>
          )}

          {activeTab === 'listings' && (
            <GlassPanel className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">My Listings</h3>
                <div className="flex gap-3">
                  <Button
                    onClick={() => fetchListings()}
                    variant="outline"
                    size="small"
                    loading={listingsLoading}
                  >
                    Refresh
                  </Button>
                  <Button
                    onClick={() => router.push('/marketplace/seller/listings/create')}
                    variant="primary"
                    size="small"
                  >
                    New Listing
                  </Button>
                </div>
              </div>
              
              {listingsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <LoadingSkeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : listings.length > 0 ? (
                <div className="space-y-4">
                  {listings.map((listing) => (
                    <div key={listing.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">{listing.title}</h4>
                          <p className="text-gray-300 text-sm mb-2">{listing.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-400 font-medium">
                              {typeof listing.price === 'string' ? listing.price : listing.price.toString()} {listing.currency || 'ETH'}
                            </span>
                            <span className="text-gray-400">
                              Qty: {listing.quantity}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              listing.status === 'active' ? 'bg-green-600 text-white' :
                              listing.status === 'sold' ? 'bg-blue-600 text-white' :
                              'bg-gray-600 text-white'
                            }`}>
                              {listing.status?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm text-gray-400">
                            <div>Views: {listing.views || 0}</div>
                            <div>Likes: {listing.favorites || 0}</div>
                          </div>
                          <Button
                            onClick={() => router.push(`/marketplace/listing/${listing.id}`)}
                            variant="outline"
                            size="small"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No listings yet</h3>
                  <p className="text-gray-400 mb-6">Create your first listing to start selling</p>
                  <Button
                    onClick={() => router.push('/marketplace/seller/listings/create')}
                    variant="primary"
                  >
                    Create First Listing
                  </Button>
                </div>
              )}
            </GlassPanel>
          )}

          {/* Other tabs would be implemented similarly */}
          {activeTab !== 'overview' && activeTab !== 'notifications' && activeTab !== 'listings' && activeTab !== 'messaging' && (
            <GlassPanel className="p-6 text-center">
              <p className="text-gray-400">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} section coming soon...
              </p>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap with error boundary
export const SellerDashboard = withSellerErrorBoundary(SellerDashboardComponent, {
  context: 'SellerDashboard',
  enableRecovery: true,
});