import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { useMarketplace } from '@/hooks/useMarketplace';
import { format } from 'date-fns';
import type { Order } from '@/hooks/useMarketplace';

// Reuse the Order type from useMarketplace
interface PaginatedOrders {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface OrderManagementProps {
  address: string;
}

type OrderStatus = 'all' | 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export const OrderManagement: React.FC<OrderManagementProps> = ({ address }) => {
  const [activeTab, setActiveTab] = useState<OrderStatus>('all');
  const { getSellerOrders, updateOrderStatus } = useMarketplace();

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const { data: ordersResponse, isLoading, refetch } = useQuery<PaginatedOrders>({
    queryKey: ['sellerOrders', address, currentPage, activeTab],
    queryFn: async () => {
      if (!address) {
        return {
          orders: [],
          pagination: {
            total: 0,
            page: currentPage,
            pageSize,
            totalPages: 0
          }
        };
      }
      
      try {
        const response = await getSellerOrders(address, currentPage, pageSize);
        if (!response) {
          throw new Error('No response from getSellerOrders');
        }
        
        // Ensure response has the expected structure
        const orders = Array.isArray(response.orders) ? response.orders : [];
        const pagination = response.pagination || {
          total: 0,
          page: currentPage,
          pageSize,
          totalPages: 0
        };
        
        return {
          orders,
          pagination: {
            total: Number(pagination.total) || 0,
            page: Number(pagination.page) || currentPage,
            pageSize: Number(pagination.pageSize) || pageSize,
            totalPages: Number(pagination.totalPages) || 0
          }
        };
      } catch (error) {
        console.error('Error fetching orders:', error);
        return {
          orders: [],
          pagination: {
            total: 0,
            page: currentPage,
            pageSize,
            totalPages: 0
          }
        };
      }
    },
    enabled: !!address,
    refetchInterval: 30000, // 30 seconds
    placeholderData: () => ({
      orders: [],
      pagination: {
        total: 0,
        page: currentPage,
        pageSize,
        totalPages: 0
      }
    })
  });

  // Get all orders from the response with proper type safety
  const { orders: allOrders = [], pagination: paginationData } = ordersResponse || {
    orders: [],
    pagination: {
      total: 0,
      page: currentPage,
      pageSize,
      totalPages: 0
    }
  };

  // Ensure allOrders is an array
  const safeAllOrders = Array.isArray(allOrders) ? allOrders : [];
  
  // Filter orders based on active tab
  const filteredOrders = useMemo(() => {
    return activeTab === 'all' 
      ? [...safeAllOrders] 
      : safeAllOrders.filter((order) => order.status === activeTab);
  }, [safeAllOrders, activeTab]);

  // Get status counts for the status tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      paid: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      all: safeAllOrders.length
    };
    
    safeAllOrders.forEach((order) => {
      if (order.status in counts) {
        counts[order.status] = (counts[order.status] || 0) + 1;
      }
    });
    
    return counts;
  }, [safeAllOrders]);

  // Get pagination data with defaults
  const { total = 0, page = currentPage, totalPages = 0 } = paginationData || {
    total: 0,
    page: currentPage,
    pageSize,
    totalPages: 0
  };
  
  // Use filtered orders for display
  const orders = filteredOrders;

  const getStatusBadge = (status: OrderStatus) => {
    const statusMap: Record<OrderStatus, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
      paid: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
      shipped: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
      delivered: { bg: 'bg-green-500/10', text: 'text-green-400' },
      cancelled: { bg: 'bg-red-500/10', text: 'text-red-400' },
      all: { bg: 'bg-gray-500/10', text: 'text-gray-400' },
    };

    const statusConfig = statusMap[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'all') return; // Skip if 'all' is selected
    
    try {
      await updateOrderStatus(orderId, newStatus);
      refetch();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const statusFlow: Record<OrderStatus, OrderStatus | null> = {
      pending: 'paid',
      paid: 'shipped',
      shipped: 'delivered',
      delivered: null,
      cancelled: null,
      all: null,
    };
    return statusFlow[currentStatus] || null;
  };

  const formatPrice = (price: string): string => {
    try {
      return `${formatEther(BigInt(price))} ETH`;
    } catch (e) {
      console.error('Error formatting price:', e);
      return '0 ETH';
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading orders...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Order Management</h2>
        <div className="text-sm text-white/60">
          {total} total orders
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status as OrderStatus)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === status 
                ? 'bg-purple-600 text-white' 
                : 'text-white/70 hover:bg-white/5'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/10">
                {status === 'all' ? total : statusCounts[status] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/60">
            {activeTab === 'all' 
              ? 'No orders found' 
              : `No ${activeTab} orders found`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => {
              const nextStatus = getNextStatus(order.status);
              
              return (
                <div key={order.id} className="bg-white/5 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-white">
                          Order #{order.id.substring(0, 8)}
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-0 text-sm text-white/60">
                        {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-white/60 mb-2">Customer</h4>
                        <p className="text-white">{order.customerName}</p>
                        <p className="text-sm text-white/60">{order.customerEmail}</p>
                        <p className="text-xs text-white/50 mt-1">{order.shippingAddress}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-white/60 mb-2">Products</h4>
                        <div className="space-y-2">
                          {order.items.map((item: any) => (
                            <div key={item.id} className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-white/5">
                                {item.image && (
                                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                )}
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-white">{item.name}</p>
                                <p className="text-xs text-white/60">
                                  {item.quantity} × {formatPrice(item.price)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-white/60 mb-2">Order Total</h4>
                        <p className="text-2xl font-bold text-white">
                          {formatPrice(order.total)}
                        </p>
                        <p className="text-sm text-white/60 mt-1">
                          ${(parseFloat(formatPrice(order.total).replace(' ETH', '')) * 1800).toFixed(2)} USD
                        </p>
                        
                        {nextStatus && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, nextStatus)}
                            className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                          >
                            Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                          </button>
                        )}
                        
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                            className="mt-2 w-full bg-white/5 hover:bg-white/10 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 px-4 py-3 bg-white/5 rounded-lg">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-white/70 hover:text-white"
              >
                Previous
              </button>
              
              <div className="text-sm text-white/70">
                Page {page} of {totalPages}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-white/70 hover:text-white"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
