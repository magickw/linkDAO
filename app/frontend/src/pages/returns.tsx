/**
 * Returns & Refunds Page - Manage all return requests
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
  RefreshCw,
  FileText
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import Layout from '@/components/Layout';
import { returnRefundService, ReturnRefundResponse } from '@/services/returnRefundService';
import { useAccount } from 'wagmi';
import { useToast } from '@/context/ToastContext';

type ReturnFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled';
type ReturnSort = 'newest' | 'oldest';

const ReturnsPage: React.FC = () => {
  const router = useRouter();
  const { address } = useAccount();
  const { addToast } = useToast();
  const [returns, setReturns] = useState<ReturnRefundResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReturnFilter>('all');
  const [sort, setSort] = useState<ReturnSort>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (address) {
      loadReturns();
    }
  }, [address]);

  const loadReturns = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      // Use the real returnRefundService instead of mock data
      const userReturns = await returnRefundService.getUserReturns(address);
      setReturns(userReturns);
    } catch (error) {
      console.error('Failed to load returns:', error);
      addToast('Failed to load return requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: ReturnRefundResponse['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'rejected':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'processing':
        return <Package className="w-4 h-4 text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
      default:
        return <Package className="w-4 h-4 text-white/60" />;
    }
  };

  const getStatusColor = (status: ReturnRefundResponse['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'approved':
      case 'completed':
        return 'text-green-400';
      case 'rejected':
      case 'cancelled':
        return 'text-red-400';
      case 'processing':
        return 'text-blue-400';
      default:
        return 'text-white/70';
    }
  };

  const filteredAndSortedReturns = returns
    .filter(ret => {
      if (filter !== 'all' && ret.status !== filter) return false;
      if (searchQuery && !ret.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !ret.orderId.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });

  const renderReturnCard = (ret: ReturnRefundResponse) => (
    <GlassPanel key={ret.id} variant="secondary" className="p-6 hover:scale-[1.02] transition-transform">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon(ret.status)}
          <div>
            <h3 className="font-semibold text-white">Return #{ret.id.slice(0, 8)}</h3>
            <p className="text-white/70 text-sm">
              For Order #{ret.orderId.slice(0, 8)} • {new Date(ret.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(ret.status)} bg-current/20`}>
            {ret.status}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedReturn(ret.id)}
            className="p-2"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white/70 text-sm">Reason:</span>
          <span className="text-white font-medium">{ret.reason}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">Action:</span>
          <span className="text-white font-medium">
            {ret.requestedAction === 'return_refund' && 'Return & Refund'}
            {ret.requestedAction === 'refund_only' && 'Refund Only'}
            {ret.requestedAction === 'replacement' && 'Replacement'}
          </span>
        </div>
      </div>

      <hr className="border-white/20 my-4" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {ret.sellerResponse && (
            <div className="flex items-center gap-1 text-white/70 text-sm">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Seller responded
            </div>
          )}
          
          {ret.refund && (
            <div className="flex items-center gap-1 text-white/70 text-sm">
              <DollarSign className="w-3 h-3 text-green-400" />
              Refund: {ret.refund.amount} {ret.refund.currency}
            </div>
          )}
          
          {ret.estimatedRefundDate && !ret.refund && (
            <div className="flex items-center gap-1 text-white/70 text-sm">
              <Clock className="w-3 h-3 text-yellow-400" />
              Est. refund: {new Date(ret.estimatedRefundDate).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedReturn(ret.id)}
            className="flex items-center gap-2"
          >
            <Eye className="w-3 h-3" />
            View Details
          </Button>
        </div>
      </div>
      
      {/* Progress bar for active returns */}
      {ret.status !== 'completed' && ret.status !== 'cancelled' && ret.status !== 'rejected' && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/70 mb-1">
            <span>Progress</span>
            <span>
              {ret.status === 'pending' && 'Awaiting seller response'}
              {ret.status === 'approved' && 'Return approved'}
              {ret.status === 'processing' && 'Processing refund'}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: ret.status === 'pending' ? '25%' : 
                       ret.status === 'approved' ? '50%' : 
                       ret.status === 'processing' ? '75%' : '100%' 
              }}
            ></div>
          </div>
        </div>
      )}
    </GlassPanel>
  );

  if (selectedReturn) {
    const returnDetails = returns.find(r => r.id === selectedReturn);
    if (!returnDetails) return null;

    return (
      <Layout title="Return Details - LinkDAO Marketplace">
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedReturn(null)}
                className="flex items-center gap-2 text-white/70 hover:text-white"
              >
                ← Back to Returns
              </Button>
            </div>
            
            <GlassPanel variant="secondary" className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">Return Request Details</h1>
                  <p className="text-white/70">Return #{returnDetails.id.slice(0, 8)}</p>
                </div>
                
                <span className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${getStatusColor(returnDetails.status)} bg-current/20`}>
                  {returnDetails.status}
                </span>
              </div>
              
              {/* Progress tracker */}
              <div className="mb-8">
                <h3 className="font-semibold text-white mb-4">Return Progress</h3>
                <div className="flex items-center justify-between relative">
                  {/* Progress line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/20 z-0"></div>
                  
                  {/* Steps */}
                  <div className="relative z-10 flex justify-between w-full">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        ['pending', 'approved', 'processing', 'completed'].includes(returnDetails.status) 
                          ? 'bg-green-500' : 'bg-white/20'
                      }`}>
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs text-white/70 mt-2 text-center">Submitted</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        ['approved', 'processing', 'completed'].includes(returnDetails.status) 
                          ? 'bg-green-500' : 'bg-white/20'
                      }`}>
                        {['approved', 'processing', 'completed'].includes(returnDetails.status) ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Clock className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="text-xs text-white/70 mt-2 text-center">Seller Review</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        ['processing', 'completed'].includes(returnDetails.status) 
                          ? 'bg-green-500' : 'bg-white/20'
                      }`}>
                        {['processing', 'completed'].includes(returnDetails.status) ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="text-xs text-white/70 mt-2 text-center">Refund Processing</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        returnDetails.status === 'completed' ? 'bg-green-500' : 'bg-white/20'
                      }`}>
                        {returnDetails.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Package className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="text-xs text-white/70 mt-2 text-center">Completed</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="font-semibold text-white mb-3">Order Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/70">Order ID:</span>
                      <span className="text-white">#{returnDetails.orderId.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Submitted:</span>
                      <span className="text-white">{new Date(returnDetails.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Reason:</span>
                      <span className="text-white">{returnDetails.reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Requested Action:</span>
                      <span className="text-white">
                        {returnDetails.requestedAction === 'return_refund' && 'Return & Refund'}
                        {returnDetails.requestedAction === 'refund_only' && 'Refund Only'}
                        {returnDetails.requestedAction === 'replacement' && 'Replacement'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-white mb-3">Refund Information</h3>
                  <div className="space-y-3">
                    {returnDetails.refund ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-white/70">Amount:</span>
                          <span className="text-white">{returnDetails.refund.amount} {returnDetails.refund.currency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Processed:</span>
                          <span className="text-white">{new Date(returnDetails.refund.processedAt || '').toLocaleDateString()}</span>
                        </div>
                        {returnDetails.refund.transactionHash && (
                          <div className="flex justify-between">
                            <span className="text-white/70">Transaction:</span>
                            <span className="text-white font-mono text-xs">{returnDetails.refund.transactionHash.slice(0, 8)}...</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-white/70 text-sm">Refund not yet processed</p>
                    )}
                    
                    {returnDetails.estimatedRefundDate && (
                      <div className="flex justify-between">
                        <span className="text-white/70">Estimated Refund:</span>
                        <span className="text-white">{new Date(returnDetails.estimatedRefundDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mb-8">
                <h3 className="font-semibold text-white mb-3">Description</h3>
                <p className="text-white/90 bg-white/5 p-4 rounded-lg">{returnDetails.description}</p>
              </div>
              
              {returnDetails.images && returnDetails.images.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-semibold text-white mb-3">Evidence Photos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {returnDetails.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {returnDetails.sellerResponse && (
                <div className="mb-8">
                  <h3 className="font-semibold text-white mb-3">Seller Response</h3>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-white font-medium">Response from seller</span>
                      <span className="text-white/70 text-sm">
                        {new Date(returnDetails.sellerResponse.respondedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-white/90">{returnDetails.sellerResponse.message}</p>
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold text-white mb-3">Timeline</h3>
                <div className="space-y-4">
                  {returnDetails.timeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="p-2 rounded-full bg-blue-500/20">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-white capitalize">{event.status}</h4>
                          <span className="text-white/60 text-sm">
                            {new Date(event.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        {event.note && (
                          <p className="text-white/70 text-sm mt-1">{event.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Returns - LinkDAO Marketplace">
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Returns</h1>
              <p className="text-white/70">Manage your return requests and refunds</p>
            </div>
            
            <Button
              variant="ghost"
              onClick={loadReturns}
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
                placeholder="Search returns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
              />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ReturnFilter)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="all">All Returns</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ReturnSort)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Return Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <GlassPanel variant="secondary" className="p-6 text-center">
              <Package className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">{returns.length}</h3>
              <p className="text-white/70 text-sm">Total Returns</p>
            </GlassPanel>
            
            <GlassPanel variant="secondary" className="p-6 text-center">
              <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">
                {returns.filter(r => r.status === 'pending').length}
              </h3>
              <p className="text-white/70 text-sm">Pending</p>
            </GlassPanel>
            
            <GlassPanel variant="secondary" className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">
                {returns.filter(r => ['approved', 'completed'].includes(r.status)).length}
              </h3>
              <p className="text-white/70 text-sm">Approved</p>
            </GlassPanel>
            
            <GlassPanel variant="secondary" className="p-6 text-center">
              <DollarSign className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white">
                {returns.filter(r => r.refund).length}
              </h3>
              <p className="text-white/70 text-sm">Refunded</p>
            </GlassPanel>
          </div>

          {/* Returns List */}
          {loading ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-white/60 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-white mb-2">Loading Returns</h2>
              <p className="text-white/70">Fetching your return history...</p>
            </div>
          ) : filteredAndSortedReturns.length === 0 ? (
            <GlassPanel variant="secondary" className="text-center py-16">
              <Package className="w-16 h-16 text-white/60 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Returns Found</h2>
              <p className="text-white/70 mb-6">
                {searchQuery || filter !== 'all' 
                  ? 'No returns match your current filters.'
                  : 'You haven\'t submitted any return requests yet.'
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
              {filteredAndSortedReturns.map(renderReturnCard)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ReturnsPage;