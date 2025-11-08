/**
 * Seller Returns Management Page - Manage incoming return requests
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
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Truck,
  FileText,
  X
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import Layout from '@/components/Layout';
import { returnRefundService, ReturnRefundResponse } from '@/services/returnRefundService';
import { useAccount } from 'wagmi';
import { useToast } from '@/context/ToastContext';

type ReturnFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled';
type ReturnSort = 'newest' | 'oldest';

const SellerReturnsPage: React.FC = () => {
  const router = useRouter();
  const { address } = useAccount();
  const { addToast } = useToast();
  const [returns, setReturns] = useState<ReturnRefundResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReturnFilter>('all');
  const [sort, setSort] = useState<ReturnSort>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [responseApproved, setResponseApproved] = useState(true);
  const [currentReturnId, setCurrentReturnId] = useState('');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [returnPolicy, setReturnPolicy] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (address) {
      loadReturns();
      loadReturnPolicy();
      loadAnalytics();
    }
  }, [address]);

  const loadReturns = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const sellerReturns = await returnRefundService.getUserReturns(address, { status: filter });
      setReturns(sellerReturns);
    } catch (error) {
      console.error('Failed to load returns:', error);
      addToast('Failed to load return requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadReturnPolicy = async () => {
    if (!address) return;
    
    setLoadingPolicy(true);
    try {
      const policy = await returnRefundService.getSellerReturnPolicy(address);
      setReturnPolicy(policy);
    } catch (error) {
      console.error('Failed to load return policy:', error);
      // Don't show error toast for policy as it might not exist yet
    } finally {
      setLoadingPolicy(false);
    }
  };

  const loadAnalytics = async () => {
    if (!address) return;
    
    setLoadingAnalytics(true);
    try {
      // Get analytics for the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const analyticsData = await returnRefundService.getSellerReturnAnalytics(address, {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      addToast('Failed to load return analytics', 'error');
    } finally {
      setLoadingAnalytics(false);
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

  const handleRespondToReturn = async () => {
    if (!currentReturnId || !responseMessage.trim()) {
      addToast('Please provide a response message', 'error');
      return;
    }

    try {
      await returnRefundService.respondToReturnRequest(currentReturnId, {
        approved: responseApproved,
        message: responseMessage
      });
      
      addToast(`Return request ${responseApproved ? 'approved' : 'rejected'} successfully`, 'success');
      setShowRespondModal(false);
      setResponseMessage('');
      loadReturns(); // Refresh the returns list
    } catch (error) {
      console.error('Failed to respond to return:', error);
      addToast('Failed to respond to return request', 'error');
    }
  };

  const handleSavePolicy = async (policyData: any) => {
    try {
      let result;
      if (returnPolicy && returnPolicy.id) {
        // Update existing policy
        result = await returnRefundService.updateReturnPolicy(returnPolicy.id, policyData);
      } else {
        // Create new policy
        policyData.sellerId = address;
        result = await returnRefundService.createReturnPolicy(policyData);
      }
      
      if (result.success) {
        addToast('Return policy saved successfully', 'success');
        setShowPolicyModal(false);
        loadReturnPolicy(); // Refresh policy
      } else {
        addToast(result.error || 'Failed to save return policy', 'error');
      }
    } catch (error) {
      console.error('Failed to save return policy:', error);
      addToast('Failed to save return policy', 'error');
    }
  };

  const handleProcessRefund = async (returnId: string) => {
    try {
      const result = await returnRefundService.processRefund(returnId);
      
      if (result.success) {
        addToast('Refund processed successfully', 'success');
        loadReturns(); // Refresh the returns list
      } else {
        addToast(result.error || 'Failed to process refund', 'error');
      }
    } catch (error) {
      console.error('Failed to process refund:', error);
      addToast('Failed to process refund', 'error');
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
            size="small"
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
              You responded
            </div>
          )}
          
          {ret.refund && (
            <div className="flex items-center gap-1 text-white/70 text-sm">
              <DollarSign className="w-3 h-3 text-green-400" />
              Refund: {ret.refund.amount} {ret.refund.currency}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {ret.status === 'pending' && (
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                setCurrentReturnId(ret.id);
                setShowRespondModal(true);
              }}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-3 h-3" />
              Respond
            </Button>
          )}
          
          <Button
            variant="outline"
            size="small"
            onClick={() => setSelectedReturn(ret.id)}
            className="flex items-center gap-2"
          >
            <Eye className="w-3 h-3" />
            View Details
          </Button>
        </div>
      </div>
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
                  <h3 className="font-semibold text-white mb-3">Your Response</h3>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-white font-medium">Response from you</span>
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
              
              {returnDetails.status === 'pending' && !returnDetails.sellerResponse && (
                <div className="mt-8 pt-6 border-t border-white/20">
                  <h3 className="font-semibold text-white mb-4">Respond to Return Request</h3>
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={() => {
                        setCurrentReturnId(returnDetails.id);
                        setResponseApproved(true);
                        setShowRespondModal(true);
                      }}
                      className="flex-1"
                    >
                      Approve Return
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentReturnId(returnDetails.id);
                        setResponseApproved(false);
                        setShowRespondModal(true);
                      }}
                      className="flex-1 text-red-400 border-red-400 hover:bg-red-400/10"
                    >
                      Reject Return
                    </Button>
                  </div>
                </div>
              )}
              
              {returnDetails.status === 'approved' && !returnDetails.refund && (
                <div className="mt-8 pt-6 border-t border-white/20">
                  <h3 className="font-semibold text-white mb-4">Process Refund</h3>
                  <Button
                    variant="primary"
                    onClick={() => handleProcessRefund(returnDetails.id)}
                    className="w-full"
                  >
                    Process Refund
                  </Button>
                </div>
              )}
            </GlassPanel>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Seller Returns - LinkDAO Marketplace">
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Returns Management</h1>
              <p className="text-white/70">Manage incoming return requests for your products</p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPolicyModal(true)}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Return Policy
              </Button>
              <Button
                variant="ghost"
                onClick={loadReturns}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Analytics Summary */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <GlassPanel variant="secondary" className="p-6 text-center">
                <Package className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">{analytics.totalReturns}</h3>
                <p className="text-white/70 text-sm">Total Returns</p>
              </GlassPanel>
              
              <GlassPanel variant="secondary" className="p-6 text-center">
                <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">
                  {analytics.approvedReturns}
                </h3>
                <p className="text-white/70 text-sm">Approved</p>
              </GlassPanel>
              
              <GlassPanel variant="secondary" className="p-6 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">
                  {analytics.completedReturns}
                </h3>
                <p className="text-white/70 text-sm">Completed</p>
              </GlassPanel>
              
              <GlassPanel variant="secondary" className="p-6 text-center">
                <DollarSign className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">
                  ${analytics.totalRefundAmount?.toFixed(2) || '0.00'}
                </h3>
                <p className="text-white/70 text-sm">Total Refunded</p>
              </GlassPanel>
            </div>
          )}

          {/* Return Policy Summary */}
          {returnPolicy && (
            <div className="mb-8">
              <GlassPanel variant="secondary" className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white mb-1">Return Policy</h3>
                    <p className="text-white/70 text-sm">
                      {returnPolicy.acceptsReturns ? `${returnPolicy.returnWindowDays} day return window` : 'Returns not accepted'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {returnPolicy.restockingFeePercentage > 0 && (
                      <span className="text-sm text-white/70">
                        {returnPolicy.restockingFeePercentage}% restocking fee
                      </span>
                    )}
                    {returnPolicy.buyerPaysReturnShipping ? (
                      <span className="text-sm text-white/70">Buyer pays shipping</span>
                    ) : (
                      <span className="text-sm text-white/70">Free returns</span>
                    )}
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}

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
              <p className="text-white/70">Fetching your return requests...</p>
            </div>
          ) : filteredAndSortedReturns.length === 0 ? (
            <GlassPanel variant="secondary" className="text-center py-16">
              <Package className="w-16 h-16 text-white/60 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Returns Found</h2>
              <p className="text-white/70 mb-6">
                {searchQuery || filter !== 'all' 
                  ? 'No returns match your current filters.'
                  : 'You don\'t have any return requests yet.'
                }
              </p>
              <Button
                variant="primary"
                onClick={() => router.push('/marketplace/seller/dashboard')}
              >
                Back to Dashboard
              </Button>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredAndSortedReturns.map(renderReturnCard)}
            </div>
          )}
        </div>
      </div>
      
      {/* Respond Modal */}
      {showRespondModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel variant="primary" className="w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              {responseApproved ? 'Approve Return Request' : 'Reject Return Request'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  {responseApproved ? 'Approval message' : 'Rejection reason'}
                </label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder={responseApproved 
                    ? 'Please provide details about the approval (e.g., return instructions, refund timeline)...' 
                    : 'Please explain why you are rejecting this return request...'}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 resize-none"
                  rows={4}
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRespondModal(false);
                    setResponseMessage('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleRespondToReturn}
                  className="flex-1"
                >
                  {responseApproved ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}
      
      {/* Return Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel variant="primary" className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Return Policy</h3>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            <ReturnPolicyForm 
              policy={returnPolicy}
              onSave={handleSavePolicy}
              onCancel={() => setShowPolicyModal(false)}
            />
          </GlassPanel>
        </div>
      )}
    </Layout>
  );
};

// Return Policy Form Component
const ReturnPolicyForm: React.FC<{
  policy: any;
  onSave: (policy: any) => void;
  onCancel: () => void;
}> = ({ policy, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    acceptsReturns: policy?.acceptsReturns ?? true,
    returnWindowDays: policy?.returnWindowDays ?? 30,
    restockingFeePercentage: policy?.restockingFeePercentage ?? 0,
    buyerPaysReturnShipping: policy?.buyerPaysReturnShipping ?? true,
    freeReturnShippingThreshold: policy?.freeReturnShippingThreshold ?? null,
    policyText: policy?.policyText ?? 'We accept returns within 30 days of delivery. Items must be unused and in original packaging. Buyer is responsible for return shipping costs unless the item is defective or not as described.',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) || 0 : 
              value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-white font-medium">Accept Returns</label>
          <input
            type="checkbox"
            name="acceptsReturns"
            checked={formData.acceptsReturns}
            onChange={handleChange}
            className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
          />
        </div>
        
        {formData.acceptsReturns && (
          <>
            <div>
              <label className="block text-white/70 text-sm mb-2">
                Return Window (days)
              </label>
              <input
                type="number"
                name="returnWindowDays"
                value={formData.returnWindowDays}
                onChange={handleChange}
                min="1"
                max="365"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
              />
            </div>
            
            <div>
              <label className="block text-white/70 text-sm mb-2">
                Restocking Fee (%)
              </label>
              <input
                type="number"
                name="restockingFeePercentage"
                value={formData.restockingFeePercentage}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-white font-medium">Buyer Pays Return Shipping</label>
              <input
                type="checkbox"
                name="buyerPaysReturnShipping"
                checked={formData.buyerPaysReturnShipping}
                onChange={handleChange}
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
              />
            </div>
            
            {!formData.buyerPaysReturnShipping && (
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  Free Return Shipping Threshold ($)
                </label>
                <input
                  type="number"
                  name="freeReturnShippingThreshold"
                  value={formData.freeReturnShippingThreshold || ''}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="No threshold"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                />
              </div>
            )}
            
            <div>
              <label className="block text-white/70 text-sm mb-2">
                Policy Text
              </label>
              <textarea
                name="policyText"
                value={formData.policyText}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 resize-none"
              />
            </div>
          </>
        )}
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          className="flex-1"
        >
          Save Policy
        </Button>
      </div>
    </form>
  );
};

export default SellerReturnsPage;