import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSellerDashboard, useSeller, useSellerTiers } from '../../hooks/useSeller';
import { Button } from '../design-system/components/Button';
import { GlassPanel } from '../design-system/components/GlassPanel';
import { LoadingSkeleton } from '../design-system/components/LoadingSkeleton';

export function SellerDashboard() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSeller();
  const { stats, notifications, unreadNotifications, loading, markNotificationRead } = useSellerDashboard();
  const { getTierById, getNextTier } = useSellerTiers();
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
          <Button onClick={() => router.push('/seller/onboarding')} variant="primary">
            Start Seller Onboarding
          </Button>
        </GlassPanel>
      </div>
    );
  }

  const currentTier = getTierById(profile.tier);
  const nextTier = getNextTier(profile.tier);

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const StatCard = ({ title, value, change, icon, color = 'blue' }: any) => (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? '+' : ''}{change}% from last month
            </p>
          )}
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
            {profile.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt={profile.displayName}
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-500 mr-4"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl font-bold">
                  {profile.displayName?.charAt(0) || profile.storeName?.charAt(0) || 'S'}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{profile.storeName || profile.displayName}</h1>
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
                        i < Math.floor(profile.stats.averageRating) ? 'text-yellow-400' : 'text-gray-600'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-gray-400 text-sm ml-1">
                    ({profile.stats.totalReviews})
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
              onClick={() => router.push('/seller/listings/create')}
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
                onClick={() => router.push('/seller/upgrade')}
                variant="primary"
                size="sm"
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
            value={formatCurrency(stats?.sales.total || 0)}
            change={12}
            color="green"
            icon={
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            }
          />
          
          <StatCard
            title="Active Listings"
            value={stats?.listings.active || 0}
            change={5}
            color="blue"
            icon={
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
          
          <StatCard
            title="Pending Orders"
            value={stats?.orders.pending || 0}
            change={-2}
            color="orange"
            icon={
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          
          <StatCard
            title="Reputation Score"
            value={profile.stats.reputationScore}
            change={8}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <GlassPanel className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
                  <Button
                    onClick={() => router.push('/seller/orders')}
                    variant="outline"
                    size="sm"
                  >
                    View All
                  </Button>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-white font-medium">Order #{1000 + i}</p>
                        <p className="text-gray-400 text-sm">Sample Product {i}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">${(Math.random() * 100 + 20).toFixed(2)}</p>
                        <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                          Processing
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              {/* Performance Metrics */}
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Response Rate</span>
                    <span className="text-white font-medium">98%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Shipping Time</span>
                    <span className="text-white font-medium">2.3 days avg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Customer Satisfaction</span>
                    <span className="text-white font-medium">4.8/5.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Dispute Rate</span>
                    <span className="text-green-400 font-medium">0.2%</span>
                  </div>
                </div>
              </GlassPanel>
            </div>
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
                            size="sm"
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

          {/* Other tabs would be implemented similarly */}
          {activeTab !== 'overview' && activeTab !== 'notifications' && (
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