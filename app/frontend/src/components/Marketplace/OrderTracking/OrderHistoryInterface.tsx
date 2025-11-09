/**
 * OrderHistoryInterface - Comprehensive order history interface for buyers
 * Features: Order listing, filtering, search, pagination, and detailed views
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  DollarSign,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { orderService } from '@/services/orderService';
import { 
  Order, 
  OrderStatus, 
  OrderFilters, 
  OrderSearchQuery, 
  PaginatedOrders,
  OrderDisplayPreferences,
  PaymentMethod
} from '@/types/order';
import OrderDetailModal from './OrderDetailModal';
import OrderStatusBadge from './OrderStatusBadge';
import OrderSearchFilters from './OrderSearchFilters';

interface OrderHistoryInterfaceProps {
  userType: 'buyer' | 'seller';
  className?: string;
}

const OrderHistoryInterface: React.FC<OrderHistoryInterfaceProps> = ({
  userType,
  className = ''
}) => {
  const { address: walletAddress } = useAccount();
  const { addToast } = useToast();

  // State management
  const [orders, setOrders] = useState<PaginatedOrders>({
    orders: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState<OrderSearchQuery>({});
  const [filters, setFilters] = useState<OrderFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'amount' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [displayPreferences, setDisplayPreferences] = useState<OrderDisplayPreferences>({
    itemsPerPage: 20,
    defaultSort: { field: 'createdAt', order: 'desc' },
    showColumns: {
      orderId: true,
      product: true,
      amount: true,
      status: true,
      date: true,
      tracking: true,
      actions: true
    },
    groupBy: 'none',
    compactView: false
  });

  // Load orders
  useEffect(() => {
    if (walletAddress) {
      loadOrders();
    }
  }, [walletAddress, userType, currentPage, sortBy, sortOrder, filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch orders for the current user
      const result = await orderService.getOrdersByUser(walletAddress);
      
      // Transform the service Order type to the types/order.ts Order type
      const transformedOrders = result.map(order => {
        // Create a minimal Order object that matches the types/order.ts interface
        const transformedOrder: Order = {
          id: order.id,
          listingId: order.id, // Using order.id as listingId since it's not available
          buyerAddress: walletAddress || '', // Using current user's address as buyer
          sellerAddress: order.seller.id, // Using seller id as address
          status: order.status,
          amount: order.total.toString(),
          paymentToken: order.paymentMethod === 'crypto' ? 'USDC' : 'FIAT',
          paymentMethod: order.paymentMethod,
          totalAmount: order.total,
          currency: order.currency,
          product: {
            id: order.items[0]?.id || '1',
            title: order.items[0]?.title || `Order #${order.id}`,
            description: '',
            image: order.items[0]?.image || '/api/placeholder/400/400',
            category: '',
            quantity: order.items[0]?.quantity || 1,
            unitPrice: order.items[0]?.unitPrice || order.total,
            totalPrice: order.items[0]?.totalPrice || order.total
          },
          shippingAddress: undefined,
          billingAddress: undefined,
          trackingNumber: order.trackingNumber,
          trackingCarrier: undefined,
          estimatedDelivery: order.estimatedDelivery?.toISOString(),
          actualDelivery: undefined,
          deliveryConfirmation: undefined,
          orderNotes: undefined,
          orderMetadata: undefined,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.createdAt.toISOString(),
          timeline: [],
          trackingInfo: undefined,
          disputeId: undefined,
          canConfirmDelivery: false,
          canOpenDispute: false,
          canCancel: false,
          canRefund: false,
          isEscrowProtected: false,
          daysUntilAutoComplete: 0
        };
        return transformedOrder;
      });
      
      const paginatedResult: PaginatedOrders = {
        orders: transformedOrders,
        total: transformedOrders.length,
        page: currentPage,
        limit: displayPreferences.itemsPerPage,
        totalPages: Math.ceil(transformedOrders.length / displayPreferences.itemsPerPage)
      };
      setOrders(paginatedResult);
    } catch (error) {
      console.error('Error loading orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to load orders');
      addToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };
      
      // Fetch fresh orders for the current user
      const result = await orderService.getOrdersByUser(walletAddress);
      const handleFilterChange = (newFilters: OrderFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSearch = async (query: OrderSearchQuery) => {
    try {
      setLoading(true);
      
      // Fetch orders for the current user
      const result = await orderService.getOrdersByUser(walletAddress);
      
      // Transform the service Order type to the types/order.ts Order type
      const transformedOrders = result.map(order => {
        // Create a minimal Order object that matches the types/order.ts interface
        const transformedOrder: Order = {
          id: order.id,
          listingId: order.id, // Using order.id as listingId since it's not available
          buyerAddress: walletAddress || '', // Using current user's address as buyer
          sellerAddress: order.seller.id, // Using seller id as address
          status: order.status,
          amount: order.total.toString(),
          paymentToken: order.paymentMethod === 'crypto' ? 'USDC' : 'FIAT',
          paymentMethod: order.paymentMethod,
          totalAmount: order.total,
          currency: order.currency,
          product: {
            id: order.items[0]?.id || '1',
            title: order.items[0]?.title || `Order #${order.id}`,
            description: '',
            image: order.items[0]?.image || '/api/placeholder/400/400',
            category: '',
            quantity: order.items[0]?.quantity || 1,
            unitPrice: order.items[0]?.unitPrice || order.total,
            totalPrice: order.items[0]?.totalPrice || order.total
          },
          shippingAddress: undefined,
          billingAddress: undefined,
          trackingNumber: order.trackingNumber,
          trackingCarrier: undefined,
          estimatedDelivery: order.estimatedDelivery?.toISOString(),
          actualDelivery: undefined,
          deliveryConfirmation: undefined,
          orderNotes: undefined,
          orderMetadata: undefined,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.createdAt.toISOString(),
          timeline: [],
          trackingInfo: undefined,
          disputeId: undefined,
          canConfirmDelivery: false,
          canOpenDispute: false,
          canCancel: false,
          canRefund: false,
          isEscrowProtected: false,
          daysUntilAutoComplete: 0
        };
        return transformedOrder;
      });
      
      // Apply local filtering based on search query
      const filteredOrders = transformedOrders.filter(order => {
        if (query.orderId && !order.id.includes(query.orderId)) return false;
        if (query.productTitle && !order.product?.title.toLowerCase().includes(query.productTitle.toLowerCase())) return false;
        if (query.trackingNumber && !order.trackingNumber?.includes(query.trackingNumber)) return false;
        return true;
      });
      
      const paginatedResult: PaginatedOrders = {
        orders: filteredOrders,
        total: filteredOrders.length,
        page: 1,
        limit: displayPreferences.itemsPerPage,
        totalPages: Math.ceil(filteredOrders.length / displayPreferences.itemsPerPage)
      };
      setOrders(paginatedResult);
    } catch (error) {
      console.error('Error searching orders:', error);
      addToast('Failed to search orders', 'error');
    } finally {
      setLoading(false);
    }
  };
      
      // Fetch orders for the current user
      const result = await orderService.getOrdersByUser(walletAddress);
      
      // Transform the service Order type to the types/order.ts Order type
      const transformedOrders = result.map(order => {
        // Create a minimal Order object that matches the types/order.ts interface
        const transformedOrder: Order = {
          id: order.id,
          listingId: order.id, // Using order.id as listingId since it's not available
          buyerAddress: walletAddress || '', // Using current user's address as buyer
          sellerAddress: order.seller.id, // Using seller id as address
          status: order.status,
          amount: order.total.toString(),
          paymentToken: order.paymentMethod === 'crypto' ? 'USDC' : 'FIAT',
          paymentMethod: order.paymentMethod,
          totalAmount: order.total,
          currency: order.currency,
          product: {
            id: order.items[0]?.id || '1',
            title: order.items[0]?.title || `Order #${order.id}`,
            description: '',
            image: order.items[0]?.image || '/api/placeholder/400/400',
            category: '',
            quantity: order.items[0]?.quantity || 1,
            unitPrice: order.items[0]?.unitPrice || order.total,
            totalPrice: order.items[0]?.totalPrice || order.total
          },
          shippingAddress: undefined,
          billingAddress: undefined,
          trackingNumber: order.trackingNumber,
          trackingCarrier: undefined,
          estimatedDelivery: order.estimatedDelivery?.toISOString(),
          actualDelivery: undefined,
          deliveryConfirmation: undefined,
          orderNotes: undefined,
          orderMetadata: undefined,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.createdAt.toISOString(),
          timeline: [],
          trackingInfo: undefined,
          disputeId: undefined,
          canConfirmDelivery: false,
          canOpenDispute: false,
          canCancel: false,
          canRefund: false,
          isEscrowProtected: false,
          daysUntilAutoComplete: 0
        };
        return transformedOrder;
      });
      
      // Apply local filtering based on search query
      const filteredOrders = transformedOrders.filter(order => {
        if (query.orderId && !order.id.includes(query.orderId)) return false;
        if (query.productTitle && !order.product?.title.toLowerCase().includes(query.productTitle.toLowerCase())) return false;
        if (query.trackingNumber && !order.trackingNumber?.includes(query.trackingNumber)) return false;
        return true;
      });
      
      totalPages: Math.ceil(filteredOrders.length / displayPreferences.itemsPerPage)
      };
      setOrders(paginatedResult);
    } catch (error) {
      console.error('Error searching orders:', error);
      addToast('Failed to search orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons = {
      CREATED: Clock,
      PAYMENT_PENDING: Clock,
      PAID: CheckCircle,
      PROCESSING: Package,
      SHIPPED: Truck,
      DELIVERED: Package,
      COMPLETED: CheckCircle,
      DISPUTED: AlertTriangle,
      CANCELLED: X,
      REFUNDED: RefreshCw
    };
    return icons[status] || Clock;
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      CREATED: 'text-yellow-400 bg-yellow-400/10',
      PAYMENT_PENDING: 'text-yellow-400 bg-yellow-400/10',
      PAID: 'text-blue-400 bg-blue-400/10',
      PROCESSING: 'text-purple-400 bg-purple-400/10',
      SHIPPED: 'text-indigo-400 bg-indigo-400/10',
      DELIVERED: 'text-green-400 bg-green-400/10',
      COMPLETED: 'text-green-500 bg-green-500/10',
      DISPUTED: 'text-red-400 bg-red-400/10',
      CANCELLED: 'text-gray-400 bg-gray-400/10',
      REFUNDED: 'text-orange-400 bg-orange-400/10'
    };
    return colors[status] || colors.CREATED;
  };

  const formatCurrency = (amount: number | string, currency: string = 'USD') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (currency === 'ETH' || currency === 'USDC') {
      return `${numAmount.toFixed(4)} ${currency}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(numAmount);
  };

  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders.orders];
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'amount':
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt || a.createdAt);
          bValue = new Date(b.updatedAt || b.createdAt);
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return result;
  }, [orders.orders, sortBy, sortOrder]);

  if (loading && orders.orders.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin text-blue-400 mr-2" size={24} />
        <span className="text-white">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {userType === 'buyer' ? 'My Orders' : 'Orders to Fulfill'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {orders.total} {orders.total === 1 ? 'order' : 'orders'} found
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="small"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} className="mr-2" />
            Filters
            {showFilters ? <ChevronUp size={16} className="ml-2" /> : <ChevronDown size={16} className="ml-2" />}
          </Button>
          
          <Button
            variant="outline"
            size="small"
            onClick={handleExportOrders}
          >
            <Download size={16} className="mr-2" />
            Export
          </Button>
          
          <Button
            variant="outline"
            size="small"
            onClick={loadOrders}
            disabled={loading}
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <OrderSearchFilters
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              currentFilters={filters}
              userType={userType}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm"
          >
            <option value="createdAt">Date Created</option>
            <option value="updatedAt">Last Updated</option>
            <option value="amount">Amount</option>
            <option value="status">Status</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
          <button
            onClick={() => setDisplayPreferences(prev => ({ ...prev, compactView: !prev.compactView }))}
            className={`px-3 py-1 text-sm rounded ${
              displayPreferences.compactView 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Compact
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredAndSortedOrders.length === 0 ? (
        <GlassPanel variant="primary" className="p-8 text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No orders found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {Object.keys(filters).length > 0 || searchQuery.text
              ? 'Try adjusting your search criteria or filters.'
              : `You don't have any ${userType === 'buyer' ? 'orders' : 'orders to fulfill'} yet.`
            }
          </p>
        </GlassPanel>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            const statusColor = getStatusColor(order.status);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <GlassPanel 
                  variant="primary" 
                  className={`p-6 hover:shadow-lg transition-all duration-300 ${
                    displayPreferences.compactView ? 'p-4' : 'p-6'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Product Image */}
                      {displayPreferences.showColumns.product && (
                        <img
                          src={order.product.image || '/images/placeholder.jpg'}
                          alt={order.product.title}
                          className={`rounded-lg object-cover ${
                            displayPreferences.compactView ? 'w-12 h-12' : 'w-16 h-16'
                          }`}
                        />
                      )}

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${
                            displayPreferences.compactView ? 'text-base' : 'text-lg'
                          }`}>
                            {order.product.title}
                          </h3>
                          
                          {displayPreferences.showColumns.status && (
                            <OrderStatusBadge status={order.status} />
                          )}
                        </div>

                        <div className={`grid gap-4 text-sm text-gray-600 dark:text-gray-400 ${
                          displayPreferences.compactView 
                            ? 'grid-cols-2 md:grid-cols-4' 
                            : 'grid-cols-1 md:grid-cols-3'
                        }`}>
                          {displayPreferences.showColumns.orderId && (
                            <div>
                              <span className="font-medium">Order ID:</span> {order.id.slice(0, 8)}...
                            </div>
                          )}
                          
                          {displayPreferences.showColumns.amount && (
                            <div>
                              <span className="font-medium">Amount:</span> {formatCurrency(order.totalAmount, order.currency)}
                            </div>
                          )}
                          
                          {displayPreferences.showColumns.date && (
                            <div>
                              <span className="font-medium">Date:</span> {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          )}
                          
                          {displayPreferences.showColumns.tracking && order.trackingNumber && (
                            <div className="md:col-span-2">
                              <span className="font-medium">Tracking:</span> {order.trackingCarrier} - {order.trackingNumber}
                            </div>
                          )}
                          
                          {order.estimatedDelivery && (
                            <div>
                              <span className="font-medium">Est. Delivery:</span> {new Date(order.estimatedDelivery).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Payment Method & Escrow Status */}
                        <div className="mt-3 flex items-center space-x-4 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            Payment: <span className="font-medium capitalize">{order.paymentMethod}</span>
                          </span>
                          
                          {order.isEscrowProtected && (
                            <div className="flex items-center text-blue-400">
                              <CheckCircle size={16} className="mr-1" />
                              <span>Escrow Protected</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {displayPreferences.showColumns.actions && (
                      <div className="flex flex-col space-y-2">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye size={16} className="mr-2" />
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Progress Timeline - Only show in expanded view */}
                  {!displayPreferences.compactView && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-sm">
                        {['CREATED', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'].map((step, index) => {
                          const isActive = order.status === step;
                          const statusOrder = ['CREATED', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
                          const currentIndex = statusOrder.indexOf(order.status);
                          const stepIndex = statusOrder.indexOf(step);
                          const isCompleted = currentIndex >= stepIndex;
                          
                          return (
                            <div key={step} className="flex items-center">
                              <div className={`w-3 h-3 rounded-full ${
                                isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`} />
                              <span className={`ml-2 capitalize ${
                                isActive ? 'text-blue-600 dark:text-blue-400 font-medium' : 
                                isCompleted ? 'text-green-600 dark:text-green-400' : 
                                'text-gray-500 dark:text-gray-400'
                              }`}>
                                {step.toLowerCase()}
                              </span>
                              {index < 4 && (
                                <div className={`w-8 h-0.5 mx-2 ${
                                  isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </GlassPanel>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {orders.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((currentPage - 1) * displayPreferences.itemsPerPage) + 1} to{' '}
            {Math.min(currentPage * displayPreferences.itemsPerPage, orders.total)} of {orders.total} orders
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="small"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
              {currentPage} of {orders.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="small"
              onClick={() => setCurrentPage(prev => Math.min(orders.totalPages, prev + 1))}
              disabled={currentPage === orders.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          userType={userType}
          onClose={() => setSelectedOrder(null)}
          onUpdate={loadOrders}
        />
      )}
    </div>
  );
};

export default OrderHistoryInterface;