/**
 * Orders Page - View and manage all user orders
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Package,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Eye,
  MoreHorizontal,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import Layout from '@/components/Layout';
import OrderTracking from '@/components/Checkout/OrderTracking';

interface Order {
  id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'disputed';
  paymentMethod: 'crypto' | 'fiat';
  total: number;
  currency: string;
  items: Array<{
    id: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
  }>;
  createdAt: Date;
  estimatedDelivery?: Date;
  trackingNumber?: string;
  seller: {
    id: string;
    name: string;
    avatar?: string;
  };
}

type OrderFilter = 'all' | 'pending' | 'processing' | 'shipped' | 'completed' | 'disputed';
type OrderSort = 'newest' | 'oldest' | 'amount-high' | 'amount-low';

const OrdersPage: React.FC = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [sort, setSort] = useState<OrderSort>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockOrders: Order[] = [
        {
          id: 'order_1',
          status: 'processing',
          paymentMethod: 'crypto',
          total: 299.99,
          currency: 'USD',
          items: [
            {
              id: '1',
              name: 'Premium Digital Art NFT',
              image: '/api/placeholder/400/400',
              price: 299.99,
              quantity: 1
            }
          ],
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          estimatedDelivery: new Date(Date.now() + 86400000 * 3), // 3 days from now
          seller: {
            id: 'seller_1',
            name: 'ArtistDAO',
            avatar: '/api/placeholder/40/40'
          }
        },
        {
          id: 'order_2',
          status: 'shipped',
          paymentMethod: 'fiat',
          total: 149.50,
          currency: 'USD',
          items: [
            {
              id: '2',
              name: 'Blockchain Development Course',
              image: '/api/placeholder/400/400',
              price: 149.50,
              quantity: 1
            }
          ],
          createdAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
          estimatedDelivery: new Date(Date.now() + 86400000), // 1 day from now
          trackingNumber: 'TRK123456789',
          seller: {
            id: 'seller_2',
            name: 'EduChain',
            avatar: '/api/placeholder/40/40'
          }
        },
        {
          id: 'order_3',
          status: 'completed',
          paymentMethod: 'crypto',
          total: 89.99,
          currency: 'USD',
          items: [
            {
              id: '3',
              name: 'DeFi Analytics Tool',
              image: '/api/placeholder/400/400',
              price: 89.99,
              quantity: 1
            }
          ],
          createdAt: new Date(Date.now() - 86400000 * 7), // 1 week ago
          seller: {
            id: 'seller_3',
            name: 'DeFiTools',
            avatar: '/api/placeholder/40/40'
          }
        }
      ];

      setOrders(mockOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'processing':
        return <Package className="w-4 h-4 text-blue-400" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-blue-400" />;
      case 'delivered':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'cancelled':
      case 'disputed':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Package className="w-4 h-4 text-white/60" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'processing':
      case 'shipped':
        return 'text-blue-400';
      case 'delivered':
      case 'completed':
        return 'text-green-400';
      case 'cancelled':
      case 'disputed':
        return 'text-red-400';
      default:
        return 'text-white/70';
    }
  };

  const filteredAndSortedOrders = orders
    .filter(order => {
      if (filter !== 'all' && order.status !== filter) return false;
      if (searchQuery && !order.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'amount-high':
          return b.total - a.total;
        case 'amount-low':
          return a.total - b.total;
        default:
          return 0;
      }
    });

  const renderOrderCard = (order: Order) => (
    <GlassPanel key={order.id} variant="secondary" className="p-6 hover:scale-[1.02] transition-transform">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon(order.status)}
          <div>
            <h3 className="font-semibold text-white">Order #{order.id}</h3>
            <p className="text-white/70 text-sm">
              {order.createdAt.toLocaleDateString()} • {order.items.length} item{order.items.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)} bg-current/20`}>
            {order.status}
          </span>
          <Button
            variant="ghost"
            size="small"
            onClick={() => setSelectedOrder(order.id)}
            className="p-2"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h4 className="font-medium text-white text-sm">{item.name}</h4>
              <p className="text-white/70 text-xs">Qty: {item.quantity}</p>
            </div>
            <span className="text-white font-medium">${item.price}</span>
          </div>
        ))}
      </div>

      <hr className="border-white/20 my-4" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img
              src={order.seller.avatar}
              alt={order.seller.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-white/70 text-sm">{order.seller.name}</span>
          </div>
          
          <div className="flex items-center gap-1 text-white/70 text-sm">
            {order.paymentMethod === 'crypto' ? (
              <>
                <Package className="w-3 h-3" />
                Crypto
              </>
            ) : (
              <>
                <DollarSign className="w-3 h-3" />
                Card
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-white font-semibold">${order.total}</span>
          <Button
            variant="outline"
            size="small"
            onClick={() => setSelectedOrder(order.id)}
            className="flex items-center gap-2"
          >
            <Eye className="w-3 h-3" />
            View
          </Button>
        </div>
      </div>

      {order.trackingNumber && (
        <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-sm">Tracking: {order.trackingNumber}</span>
            <Button variant="ghost" size="small" className="text-blue-400 hover:text-blue-300">
              Track Package
            </Button>
          </div>
        </div>
      )}

      {order.estimatedDelivery && order.status !== 'completed' && (
        <div className="mt-3 flex items-center gap-2 text-white/70 text-sm">
          <Calendar className="w-3 h-3" />
          Estimated delivery: {order.estimatedDelivery.toLocaleDateString()}
        </div>
      )}
    </GlassPanel>
  );

  if (selectedOrder) {
    return (
      <Layout title="Order Details - LinkDAO Marketplace">
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedOrder(null)}
                className="flex items-center gap-2 text-white/70 hover:text-white"
              >
                ← Back to Orders
              </Button>
            </div>
            <OrderTracking orderId={selectedOrder} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Orders - LinkDAO Marketplace">
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Orders</h1>
              <p className="text-white/70">Track and manage your marketplace orders</p>
            </div>
            
            <Button
              variant="ghost"
              onClick={loadOrders}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Filters and Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
              />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as OrderFilter)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="disputed">Disputed</option>
            </select>
            
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as OrderSort)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Highest Amount</option>
              <option value="amount-low">Lowest Amount</option>
            </select>
          </div>

          {/* Order Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <GlassPanel variant="secondary" className="p-6 text-center">
              <Package className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">{orders.length}</h3>
              <p className="text-white/70 text-sm">Total Orders</p>
            </GlassPanel>
            
            <GlassPanel variant="secondary" className="p-6 text-center">
              <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">
                {orders.filter(o => ['pending', 'processing'].includes(o.status)).length}
              </h3>
              <p className="text-white/70 text-sm">In Progress</p>
            </GlassPanel>
            
            <GlassPanel variant="secondary" className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">
                {orders.filter(o => o.status === 'completed').length}
              </h3>
              <p className="text-white/70 text-sm">Completed</p>
            </GlassPanel>
            
            <GlassPanel variant="secondary" className="p-6 text-center">
              <DollarSign className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">
                ${orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
              </h3>
              <p className="text-white/70 text-sm">Total Spent</p>
            </GlassPanel>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-white/60 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-white mb-2">Loading Orders</h2>
              <p className="text-white/70">Fetching your order history...</p>
            </div>
          ) : filteredAndSortedOrders.length === 0 ? (
            <GlassPanel variant="secondary" className="text-center py-16">
              <Package className="w-16 h-16 text-white/60 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Orders Found</h2>
              <p className="text-white/70 mb-6">
                {searchQuery || filter !== 'all' 
                  ? 'No orders match your current filters.'
                  : 'You haven\'t placed any orders yet.'
                }
              </p>
              <Button
                variant="primary"
                onClick={() => router.push('/marketplace')}
              >
                Start Shopping
              </Button>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredAndSortedOrders.map(renderOrderCard)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default OrdersPage;