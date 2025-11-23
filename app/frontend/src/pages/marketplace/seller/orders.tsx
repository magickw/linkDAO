import React from 'react';
import { useRouter } from 'next/router';
import { useSellerOrders, useSeller } from '@/hooks/useSeller';
import { Button, GlassPanel, LoadingSkeleton } from '@/design-system';
import Layout from '@/components/Layout';

export default function SellerOrdersPage() {
  const router = useRouter();
  const { profile } = useSeller();
  const { orders, loading, error } = useSellerOrders();

  if (!profile) {
    return (
      <Layout title="Seller Orders - LinkDAO Marketplace" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <GlassPanel className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Seller Profile Required</h1>
              <p className="text-gray-300 mb-6">
                You need to have a seller profile to view orders.
              </p>
            </div>
            <Button onClick={() => router.push('/marketplace/seller/onboarding')} variant="primary">
              Start Seller Onboarding
            </Button>
          </GlassPanel>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Seller Orders - LinkDAO Marketplace" fullWidth={true}>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/marketplace/seller/dashboard')}
              className="flex items-center text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            
            <h1 className="text-2xl font-bold text-white">Seller Orders</h1>
            
            <div></div> {/* Spacer for alignment */}
          </div>

          {loading ? (
            <GlassPanel className="p-6">
              <LoadingSkeleton className="h-8 w-1/4 mb-6" />
              {[...Array(3)].map((_, i) => (
                <LoadingSkeleton key={i} className="h-24 mb-4" />
              ))}
            </GlassPanel>
          ) : error ? (
            <GlassPanel className="p-6 text-center">
              <div className="text-red-400 mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-lg font-semibold">Error loading orders</p>
                <p className="text-sm mt-2">{error}</p>
              </div>
              <Button onClick={() => window.location.reload()} variant="primary">
                Try Again
              </Button>
            </GlassPanel>
          ) : orders.length === 0 ? (
            <GlassPanel className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">No Orders Yet</h3>
              <p className="text-gray-300 mb-6">
                You don't have any orders yet. When customers purchase your listings, they'll appear here.
              </p>
              <Button
                onClick={() => router.push('/marketplace/seller/listings/create')}
                variant="primary"
              >
                Create Your First Listing
              </Button>
            </GlassPanel>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <GlassPanel className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{orders.filter(o => o.status === 'pending').length}</p>
                  <p className="text-gray-300 text-sm">Pending</p>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{orders.filter(o => o.status === 'processing').length}</p>
                  <p className="text-gray-300 text-sm">Processing</p>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{orders.filter(o => o.status === 'shipped').length}</p>
                  <p className="text-gray-300 text-sm">Shipped</p>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{orders.filter(o => o.status === 'delivered').length}</p>
                  <p className="text-gray-300 text-sm">Delivered</p>
                </GlassPanel>
              </div>

              <GlassPanel className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Recent Orders</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 text-gray-300 font-medium">Order</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Item</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Customer</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Amount</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Status</th>
                        <th className="text-left py-3 text-gray-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-800">
                          <td className="py-4">
                            <div>
                              <p className="text-white font-medium">#{order.id.substring(0, 8)}</p>
                              <p className="text-gray-400 text-sm">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </td>
                          <td className="py-4">
                            <p className="text-white">{order.listingTitle}</p>
                            <p className="text-gray-400 text-sm">Qty: {order.quantity}</p>
                          </td>
                          <td className="py-4">
                            <p className="text-white">{order.buyerName}</p>
                            <p className="text-gray-400 text-sm truncate">{order.buyerAddress}</p>
                          </td>
                          <td className="py-4">
                            <p className="text-white">{order.totalAmount} {order.currency}</p>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                              order.status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
                              order.status === 'shipped' ? 'bg-purple-500/20 text-purple-300' :
                              order.status === 'delivered' ? 'bg-green-500/20 text-green-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/marketplace/seller/orders/${order.id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassPanel>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}