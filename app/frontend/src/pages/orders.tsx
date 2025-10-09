/**
 * Orders Page - Unified buyer order history
 * Sprint 3: Clean tabs, search, and modern UI
 */

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { Button } from '@/design-system/components/Button';
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  AlertTriangle, 
  Search,
  ShoppingCart
} from 'lucide-react';

type OrderStatus = 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED';
type TabKey = 'all' | 'processing' | 'shipped' | 'delivered' | 'disputed';

interface Order {
  id: string;
  productTitle: string;
  productImage?: string;
  seller: string;
  status: OrderStatus;
  total: string;
  currency: string;
  date: string;
  trackingNumber?: string;
}

const tabConfig: Array<{ key: TabKey; label: string; statuses: OrderStatus[] }> = [
  { key: 'all', label: 'All', statuses: [] },
  { key: 'processing', label: 'Processing', statuses: ['PROCESSING'] },
  { key: 'shipped', label: 'Shipped', statuses: ['SHIPPED'] },
  { key: 'delivered', label: 'Delivered', statuses: ['DELIVERED', 'COMPLETED'] },
  { key: 'disputed', label: 'Disputed', statuses: ['DISPUTED'] },
];

// Mock orders data
const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-001',
    productTitle: 'Premium Wireless Headphones',
    productImage: undefined,
    seller: 'TechGear Store',
    status: 'DELIVERED',
    total: '0.1245',
    currency: 'ETH',
    date: '2025-01-05',
    trackingNumber: 'TRK123456789',
  },
  {
    id: 'ORD-002',
    productTitle: 'Rare Digital Art NFT',
    productImage: undefined,
    seller: 'CryptoArtist',
    status: 'PROCESSING',
    total: '2.5000',
    currency: 'ETH',
    date: '2025-01-08',
  },
  {
    id: 'ORD-003',
    productTitle: 'Smart Watch Pro',
    productImage: undefined,
    seller: 'Wearables Hub',
    status: 'SHIPPED',
    total: '0.0850',
    currency: 'ETH',
    date: '2025-01-07',
    trackingNumber: 'TRK987654321',
  },
];

const OrdersPage: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders] = useState<Order[]>(MOCK_ORDERS);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by tab
    const tab = tabConfig.find(t => t.key === activeTab);
    if (tab && tab.statuses.length > 0) {
      filtered = filtered.filter(order => tab.statuses.includes(order.status));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(query) ||
        order.productTitle.toLowerCase().includes(query) ||
        order.seller.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, activeTab, searchQuery]);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'PROCESSING':
        return <Clock size={16} className="text-blue-600 dark:text-blue-400" />;
      case 'SHIPPED':
        return <Truck size={16} className="text-purple-600 dark:text-purple-400" />;
      case 'DELIVERED':
      case 'COMPLETED':
        return <CheckCircle size={16} className="text-green-600 dark:text-green-400" />;
      case 'DISPUTED':
        return <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />;
      default:
        return <Package size={16} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'PROCESSING':
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'SHIPPED':
        return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'DISPUTED':
        return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getOrderCount = (tabKey: TabKey) => {
    if (tabKey === 'all') return orders.length;
    const tab = tabConfig.find(t => t.key === tabKey);
    if (!tab) return 0;
    return orders.filter(order => tab.statuses.includes(order.status)).length;
  };

  return (
    <Layout title="My Orders - LinkDAO Marketplace">
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Marketplace
            </span>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Orders</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Track your purchases and manage order disputes
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order ID, product, or seller..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {tabConfig.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab.label} ({getOrderCount(tab.key)})
              </button>
            ))}
          </div>

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                      {order.productImage ? (
                        <img
                          src={order.productImage}
                          alt={order.productTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="text-gray-400 dark:text-gray-500" size={32} />
                        </div>
                      )}
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {order.productTitle}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Order #{order.id} • {order.seller}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-gray-900 dark:text-white">
                            {order.total} {order.currency}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(order.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>

                        {/* Tracking Number */}
                        {order.trackingNumber && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Tracking: {order.trackingNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm text-center">
              <ShoppingCart size={64} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchQuery ? 'No orders found' : 'No orders yet'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Start shopping in the marketplace to see your orders here'}
              </p>
              {!searchQuery && (
                <Button variant="primary" onClick={() => router.push('/marketplace')}>
                  Browse Marketplace
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default OrdersPage;
