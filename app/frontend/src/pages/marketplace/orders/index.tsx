import React, { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { orderService } from '@/services/orderService';
import type { OrderStatus, OrderStatistics } from '@/types/order';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { BadgeCheck, Clock, Package, ShieldAlert, ShoppingBag, Truck } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const RECENT_ORDERS_KEY = 'linkdao_recent_orders';

type TabKey = 'all' | 'processing' | 'shipped' | 'delivered' | 'disputed';
type FilterKey = 'all' | 'active' | 'completed' | 'disputed';

type OrderSummary = {
  id: string;
  product: {
    id: string;
    title: string;
    description: string;
    image: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
  estimatedDelivery?: string;
  trackingCarrier?: string;
  trackingNumber?: string;
  sellerName?: string;
};

const tabConfig: Array<{ key: TabKey; label: string; statuses: OrderStatus[] }> = [
  { key: 'all', label: 'All', statuses: [] },
  { key: 'processing', label: 'Processing', statuses: ['PROCESSING', 'PAYMENT_PENDING', 'PAID'] },
  { key: 'shipped', label: 'Shipped', statuses: ['SHIPPED'] },
  { key: 'delivered', label: 'Delivered', statuses: ['DELIVERED', 'COMPLETED'] },
  { key: 'disputed', label: 'Disputed', statuses: ['DISPUTED'] },
];

const FALLBACK_ORDERS: OrderSummary[] = [
  {
    id: 'ORDER_DEMO_001',
    product: {
      id: 'prod_001',
      title: 'Premium Wireless Headphones',
      description: 'Audiophile-grade headphones with ANC and 30h battery life.',
      image: '/api/placeholder/240/240',
      category: 'Electronics',
      quantity: 1,
      unitPrice: 0.001,
      totalPrice: 0.001,
    },
    status: 'PROCESSING',
    totalAmount: 0.25,
    currency: 'ETH',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    estimatedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    trackingCarrier: 'LinkDAO Logistics',
    trackingNumber: 'LD-123-456',
    sellerName: 'TechGear Pro',
  },
  {
    id: 'ORDER_DEMO_002',
    product: {
      id: 'prod_002',
      title: 'Limited Edition DAO Hoodie',
      description: 'Ultra-soft hoodie with DAO governance patch and NFC chip.',
      image: '/api/placeholder/240/240',
      category: 'Apparel',
      quantity: 2,
      unitPrice: 0.05,
      totalPrice: 0.1,
    },
    status: 'COMPLETED',
    totalAmount: 0.1,
    currency: 'ETH',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    estimatedDelivery: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    trackingCarrier: 'FedEx',
    trackingNumber: 'FX-789-321',
    sellerName: 'DAO Merch Studio',
  },
];

const statusColors: Record<OrderStatus, string> = {
  CREATED: 'bg-slate-500/20 text-slate-200 border border-slate-400/20',
  PAYMENT_PENDING: 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/30',
  PAID: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30',
  PROCESSING: 'bg-blue-500/20 text-blue-200 border border-blue-400/30',
  SHIPPED: 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30',
  DELIVERED: 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30',
  COMPLETED: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30',
  DISPUTED: 'bg-red-500/20 text-red-200 border border-red-400/30',
  CANCELLED: 'bg-gray-600/30 text-gray-200 border border-gray-400/30',
  REFUNDED: 'bg-purple-500/20 text-purple-200 border border-purple-400/30',
};

const activeStatuses: OrderStatus[] = ['CREATED', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED'];
const completedStatuses: OrderStatus[] = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];

const filterConfig: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All Orders' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'disputed', label: 'Disputed' },
];

const OrdersPage: React.FC = () => {
  const { address: walletAddress } = useAccount();
  const router = useRouter();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [stats, setStats] = useState<OrderStatistics | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const errorToastShownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const loadOrders = async () => {
      if (!walletAddress) {
        const localOrders = sessionStorage.getItem(RECENT_ORDERS_KEY);
        setOrders(localOrders ? JSON.parse(localOrders) : FALLBACK_ORDERS);
        setStats(null);
        return;
      }

      setLoading(true);
      try {
        // Use getOrdersByUser instead of getOrderHistory since it doesn't exist
        const orders = await orderService.getOrdersByUser(walletAddress);
        
        // Mock statistics since getOrderStatistics doesn't exist
        const statusBreakdown: Record<OrderStatus, number> = {
          'CREATED': orders.filter(order => order.status === 'CREATED').length,
          'PAYMENT_PENDING': orders.filter(order => order.status === 'PAYMENT_PENDING').length,
          'PAID': orders.filter(order => order.status === 'PAID').length,
          'PROCESSING': orders.filter(order => order.status === 'PROCESSING').length,
          'SHIPPED': orders.filter(order => order.status === 'SHIPPED').length,
          'DELIVERED': orders.filter(order => order.status === 'DELIVERED').length,
          'COMPLETED': orders.filter(order => order.status === 'COMPLETED').length,
          'DISPUTED': orders.filter(order => order.status === 'DISPUTED').length,
          'CANCELLED': orders.filter(order => order.status === 'CANCELLED').length,
          'REFUNDED': orders.filter(order => order.status === 'REFUNDED').length,
        };
        
        const paymentMethodBreakdown: Record<string, {
          count: number;
          totalValue: number;
          averageCost: number;
          successRate: number;
        }> = {
          'crypto': {
            count: orders.filter(order => order.paymentMethod === 'crypto').length,
            totalValue: orders.filter(order => order.paymentMethod === 'crypto').reduce((sum, order) => sum + order.totalAmount, 0),
            averageCost: orders.filter(order => order.paymentMethod === 'crypto').length > 0 
              ? orders.filter(order => order.paymentMethod === 'crypto').reduce((sum, order) => sum + order.totalAmount, 0) / orders.filter(order => order.paymentMethod === 'crypto').length
              : 0,
            successRate: orders.filter(order => order.paymentMethod === 'crypto' && order.status === 'COMPLETED').length / Math.max(1, orders.filter(order => order.paymentMethod === 'crypto').length)
          },
          'fiat': {
            count: orders.filter(order => order.paymentMethod === 'fiat').length,
            totalValue: orders.filter(order => order.paymentMethod === 'fiat').reduce((sum, order) => sum + order.totalAmount, 0),
            averageCost: orders.filter(order => order.paymentMethod === 'fiat').length > 0 
              ? orders.filter(order => order.paymentMethod === 'fiat').reduce((sum, order) => sum + order.totalAmount, 0) / orders.filter(order => order.paymentMethod === 'fiat').length
              : 0,
            successRate: orders.filter(order => order.paymentMethod === 'fiat' && order.status === 'COMPLETED').length / Math.max(1, orders.filter(order => order.paymentMethod === 'fiat').length)
          }
        };
        
        const paymentMethodPreferences = [
          {
            methodId: 'crypto',
            methodName: 'Crypto',
            usageCount: orders.filter(order => order.paymentMethod === 'crypto').length,
            successRate: orders.filter(order => order.paymentMethod === 'crypto' && order.status === 'COMPLETED').length / Math.max(1, orders.filter(order => order.paymentMethod === 'crypto').length),
            averageCost: orders.filter(order => order.paymentMethod === 'crypto').length > 0 
              ? orders.filter(order => order.paymentMethod === 'crypto').reduce((sum, order) => sum + order.totalAmount, 0) / orders.filter(order => order.paymentMethod === 'crypto').length
              : 0,
            lastUsed: orders.filter(order => order.paymentMethod === 'crypto').length > 0 
              ? new Date(orders.filter(order => order.paymentMethod === 'crypto')[0].createdAt).toISOString()
              : new Date().toISOString()
          },
          {
            methodId: 'fiat',
            methodName: 'Fiat',
            usageCount: orders.filter(order => order.paymentMethod === 'fiat').length,
            successRate: orders.filter(order => order.paymentMethod === 'fiat' && order.status === 'COMPLETED').length / Math.max(1, orders.filter(order => order.paymentMethod === 'fiat').length),
            averageCost: orders.filter(order => order.paymentMethod === 'fiat').length > 0 
              ? orders.filter(order => order.paymentMethod === 'fiat').reduce((sum, order) => sum + order.totalAmount, 0) / orders.filter(order => order.paymentMethod === 'fiat').length
              : 0,
            lastUsed: orders.filter(order => order.paymentMethod === 'fiat').length > 0 
              ? new Date(orders.filter(order => order.paymentMethod === 'fiat')[0].createdAt).toISOString()
              : new Date().toISOString()
          }
        ];

        const statistics: OrderStatistics = {
          totalOrders: orders.length,
          completedOrders: orders.filter(order => order.status === 'COMPLETED').length,
          pendingOrders: orders.filter(order => ['CREATED', 'PAID', 'PROCESSING'].includes(order.status)).length,
          disputedOrders: orders.filter(order => order.status === 'DISPUTED').length,
          totalValue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
        averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0,
          completionRate: orders.length > 0 ? orders.filter(order => order.status === 'COMPLETED').length / orders.length : 0,
          statusBreakdown,
          paymentMethodBreakdown,
          paymentMethodPreferences
        };

        if (!cancelled) {
          if (orders.length > 0) {
            const normalized = orders.map<OrderSummary>((order) => ({
              id: order.id,
              product: {
                id: order.product?.id || '1',
                title: order.product?.title || `Order #${order.id}`,
                description: order.product?.description || '',
                image: order.product?.image || '/api/placeholder/400/400',
                category: order.product?.category || '',
                quantity: order.product?.quantity || 1,
                unitPrice: order.product?.unitPrice || order.totalAmount,
                totalPrice: order.product?.totalPrice || order.totalAmount
              },
              status: order.status,
              totalAmount: order.totalAmount,
              currency: order.currency,
              createdAt: new Date(order.createdAt).toISOString(),
        estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString() : undefined,
              trackingCarrier: undefined,
              trackingNumber: order.trackingNumber,
              sellerName: order.sellerAddress ? `${order.sellerAddress.substring(0, 6)}...${order.sellerAddress.substring(order.sellerAddress.length - 4)}` : 'Unknown Seller',
            }));
            setOrders(normalized);
          } else {
            const localOrders = sessionStorage.getItem(RECENT_ORDERS_KEY);
            setOrders(localOrders ? JSON.parse(localOrders) : FALLBACK_ORDERS);
          }

          setStats(statistics);
          setStatsError(null);
        }
      } catch (error) {
        console.error('Failed to load orders', error);
        if (!errorToastShownRef.current) {
          addToast('Unable to fetch orders. Showing recent activity instead.', 'warning');
          errorToastShownRef.current = true;
        }
        if (!cancelled) {
          const localOrders = sessionStorage.getItem(RECENT_ORDERS_KEY);
          setOrders(localOrders ? JSON.parse(localOrders) : FALLBACK_ORDERS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, addToast]);

  const filteredOrders = useMemo(() => {
    switch (filter) {
      case 'active':
        return orders.filter((order) => activeStatuses.includes(order.status));
      case 'completed':
        return orders.filter((order) => completedStatuses.includes(order.status));
      case 'disputed':
        return orders.filter((order) => order.status === 'DISPUTED');
      default:
        return orders;
    }
  }, [orders, filter]);

  const renderStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'PROCESSING':
      case 'PAID':
        return <Clock size={16} />;
      case 'SHIPPED':
        return <Truck size={16} />;
      case 'COMPLETED':
      case 'DELIVERED':
        return <BadgeCheck size={16} />;
      case 'DISPUTED':
        return <ShieldAlert size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  return (
    <Layout title="Orders - LinkDAO Marketplace" fullWidth={true}>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col gap-4">
          <div className="bg-white/10 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 text-white">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white tracking-tight">Order history & tracking</h1>
              <p className="text-white/70 text-base max-w-2xl">
                Monitor escrow releases, shipping progress, and DAO dispute outcomes across every marketplace purchase.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/support/disputes')}>
                Get support
              </Button>
              <Button variant="primary" onClick={() => router.push('/marketplace')}>
                Browse marketplace
              </Button>
            </div>
          </div>
        </div>

        {stats && (
          <div className="bg-white/10 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-white">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Total orders</p>
              <p className="text-2xl font-semibold text-white mt-2">{stats.totalOrders}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Completed</p>
              <p className="text-2xl font-semibold text-emerald-300 mt-2">{stats.completedOrders}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">In progress</p>
              <p className="text-2xl font-semibold text-blue-300 mt-2">{stats.pendingOrders}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Disputed</p>
              <p className="text-2xl font-semibold text-red-300 mt-2">{stats.disputedOrders}</p>
            </div>
          </div>
        )}
        {statsError && (
          <GlassPanel variant="secondary" className="p-4 text-sm text-white/70">
            {statsError}
          </GlassPanel>
        )}

        <div className="flex flex-wrap gap-3">
          {filterConfig.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border backdrop-blur
                ${filter === key
                  ? 'bg-white text-gray-900 border-gray-200 dark:bg-white/90 dark:text-gray-900'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}
              `}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white/10 rounded-2xl p-6 space-y-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <ShoppingBag size={20} />
              Orders
            </h2>
            {loading && (
              <span className="flex items-center gap-2 text-white/70 text-sm">
                <div className="w-3 h-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                Syncing on-chain data
              </span>
            )}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 space-y-4 text-white/70">
              <p>No orders match this filter yet.</p>
              <Button variant="primary" onClick={() => router.push('/marketplace')}>
                Start shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-white/10 hover:bg-white/20 transition flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-5 text-white"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <img
                      src={order.product.image}
                      alt={order.product.title}
                      className="w-20 h-20 rounded-lg object-cover border border-white/10"
                    />
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-white/70">#{order.id}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                          <span className="inline-flex items-center gap-2">
                            {renderStatusIcon(order.status)}
                            {order.status.replace('_', ' ')}
                          </span>
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white truncate">{order.product.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-white/70">
                        <span>Qty {order.product.quantity}</span>
                        <span>
                          {order.totalAmount.toFixed(3)} {order.currency}
                        </span>
                        {order.estimatedDelivery && (
                          <span>
                            ETA {new Date(order.estimatedDelivery).toLocaleDateString()}
                          </span>
                        )}
                        {order.trackingCarrier && order.trackingNumber && (
                          <span>
                            {order.trackingCarrier} • {order.trackingNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="border-white/20 text-white/80"
                      onClick={() => router.push(`/marketplace/orders/${order.id}`)}
                    >
                      View details
                    </Button>
                    <Button variant="primary" onClick={() => router.push(`/support/disputes?orderId=${order.id}`)}>
                      Support
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrdersPage;