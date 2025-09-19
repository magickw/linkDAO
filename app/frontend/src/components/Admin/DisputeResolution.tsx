import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  Search,
  DollarSign,
  User,
  MessageSquare,
  FileText,
  Calendar
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { DisputeCase } from '@/types/auth';
import { Button, GlassPanel } from '@/design-system';

export function DisputeResolution() {
  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DisputeCase | null>(null);
  const [resolutionModal, setResolutionModal] = useState(false);
  const [resolutionData, setResolutionData] = useState({
    outcome: 'buyer_favor' as 'buyer_favor' | 'seller_favor' | 'partial_refund' | 'no_action',
    refundAmount: 0,
    reasoning: '',
    adminNotes: ''
  });
  const [filters, setFilters] = useState({
    status: 'open',
    type: '',
    priority: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    loadDisputes();
  }, [filters, pagination.page]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDisputes({
        ...filters,
        page: pagination.page,
        limit: 20
      });
      
      setDisputes(response.disputes);
      setPagination({
        page: response.page,
        totalPages: response.totalPages,
        total: response.total
      });
    } catch (error) {
      console.error('Failed to load disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute) return;
    
    try {
      await adminService.resolveDispute(selectedDispute.id, resolutionData);
      setResolutionModal(false);
      setSelectedDispute(null);
      loadDisputes();
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
    }
  };

  const handleAssign = async (disputeId: string, assigneeId: string) => {
    try {
      await adminService.assignDispute(disputeId, assigneeId);
      loadDisputes();
    } catch (error) {
      console.error('Failed to assign dispute:', error);
    }
  };

  const addNote = async (note: string) => {
    if (!selectedDispute) return;
    
    try {
      await adminService.addDisputeNote(selectedDispute.id, note);
      // Refresh dispute details
      const updatedDispute = await adminService.getDispute(selectedDispute.id);
      setSelectedDispute(updatedDispute);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-400 bg-red-500/20';
      case 'investigating': return 'text-yellow-400 bg-yellow-500/20';
      case 'awaiting_response': return 'text-blue-400 bg-blue-500/20';
      case 'resolved': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <GlassPanel className="p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-white font-medium">Filters:</span>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="awaiting_response">Awaiting Response</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Types</option>
            <option value="product_not_received">Product Not Received</option>
            <option value="product_not_as_described">Not As Described</option>
            <option value="refund_request">Refund Request</option>
            <option value="payment_issue">Payment Issue</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search disputes..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white flex-1"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Disputes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Disputes ({pagination.total})</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <GlassPanel key={i} className="p-4 animate-pulse">
                  <div className="h-24 bg-white/10 rounded"></div>
                </GlassPanel>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => (
                <GlassPanel
                  key={dispute.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedDispute?.id === dispute.id ? 'ring-2 ring-purple-500' : 'hover:bg-white/5'
                  }`}
                  onClick={() => setSelectedDispute(dispute)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 mt-1" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">
                            #{dispute.orderId.slice(-8)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(dispute.priority)}`}>
                            {dispute.priority}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2 capitalize">
                          {dispute.type.replace(/_/g, ' ')}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{dispute.amount} {dispute.currency}</span>
                          </div>
                          <span>Created {new Date(dispute.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                        {dispute.status.replace('_', ' ')}
                      </span>
                      {dispute.assignedTo && (
                        <span className="text-xs text-gray-400">
                          Assigned
                        </span>
                      )}
                    </div>
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-white px-4 py-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Dispute Details */}
        <div>
          {selectedDispute ? (
            <GlassPanel className="p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Dispute #{selectedDispute.orderId.slice(-8)}</h3>
                <div className="flex gap-2">
                  {selectedDispute.status === 'open' && (
                    <Button
                      onClick={() => setResolutionModal(true)}
                      variant="primary"
                      size="small"
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Status</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDispute.status)}`}>
                      {selectedDispute.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Priority</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedDispute.priority)}`}>
                      {selectedDispute.priority}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Type</label>
                  <p className="text-white capitalize">{selectedDispute.type.replace(/_/g, ' ')}</p>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Amount</label>
                  <p className="text-white">{selectedDispute.amount} {selectedDispute.currency}</p>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Description</label>
                  <p className="text-white">{selectedDispute.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Buyer ID</label>
                    <p className="text-white text-sm">{selectedDispute.buyerId}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Seller ID</label>
                    <p className="text-white text-sm">{selectedDispute.sellerId}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Timeline</label>
                  <div className="space-y-2">
                    {selectedDispute.timeline.map((event, index) => (
                      <div key={event.id} className="flex items-start gap-3 p-2 bg-white/5 rounded-lg">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{event.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <span>{event.actor}</span>
                            <span>•</span>
                            <span>{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence */}
                {(selectedDispute.evidence.buyerEvidence?.length || selectedDispute.evidence.sellerEvidence?.length) && (
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Evidence</label>
                    <div className="space-y-2">
                      {selectedDispute.evidence.buyerEvidence?.map((evidence, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 text-sm">Buyer Evidence {index + 1}</span>
                        </div>
                      ))}
                      {selectedDispute.evidence.sellerEvidence?.map((evidence, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
                          <FileText className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm">Seller Evidence {index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution */}
                {selectedDispute.resolution && (
                  <div>
                    <label className="text-gray-400 text-sm">Resolution</label>
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <p className="text-green-400 font-medium capitalize">
                        {selectedDispute.resolution.outcome.replace('_', ' ')}
                      </p>
                      {selectedDispute.resolution.refundAmount && (
                        <p className="text-white text-sm">
                          Refund: {selectedDispute.resolution.refundAmount} {selectedDispute.currency}
                        </p>
                      )}
                      <p className="text-gray-300 text-sm mt-1">
                        {selectedDispute.resolution.reasoning}
                      </p>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-gray-400 text-sm">Created</label>
                  <p className="text-white">{new Date(selectedDispute.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel className="p-6 text-center">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Select a dispute to review</p>
            </GlassPanel>
          )}
        </div>
      </div>

      {/* Resolution Modal */}
      {resolutionModal && selectedDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Resolve Dispute</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Outcome</label>
                <select
                  value={resolutionData.outcome}
                  onChange={(e) => setResolutionData({ ...resolutionData, outcome: e.target.value as any })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="buyer_favor">In Buyer's Favor</option>
                  <option value="seller_favor">In Seller's Favor</option>
                  <option value="partial_refund">Partial Refund</option>
                  <option value="no_action">No Action Required</option>
                </select>
              </div>
              
              {(resolutionData.outcome === 'buyer_favor' || resolutionData.outcome === 'partial_refund') && (
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Refund Amount</label>
                  <input
                    type="number"
                    value={resolutionData.refundAmount}
                    onChange={(e) => setResolutionData({ ...resolutionData, refundAmount: parseFloat(e.target.value) || 0 })}
                    max={selectedDispute.amount}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="0.00"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Reasoning</label>
                <textarea
                  value={resolutionData.reasoning}
                  onChange={(e) => setResolutionData({ ...resolutionData, reasoning: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Explain the resolution decision..."
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Admin Notes</label>
                <textarea
                  value={resolutionData.adminNotes}
                  onChange={(e) => setResolutionData({ ...resolutionData, adminNotes: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Internal notes..."
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={handleResolve} variant="primary">
                Resolve Dispute
              </Button>
              <Button onClick={() => setResolutionModal(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}