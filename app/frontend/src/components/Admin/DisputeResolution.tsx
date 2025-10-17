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
  Calendar,
  Upload,
  Image,
  Download,
  Trash2,
  ExternalLink,
  FileImage,
  File,
  Check,
  X,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { DisputeCase } from '@/types/auth';
import { Button, GlassPanel } from '@/design-system';

export function DisputeResolution() {
  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DisputeCase | null>(null);
  const [resolutionModal, setResolutionModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [showCommunicationThread, setShowCommunicationThread] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
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

  useEffect(() => {
    if (selectedDispute) {
      loadMessages(selectedDispute.id);
    }
  }, [selectedDispute]);

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

  const loadMessages = async (disputeId: string) => {
    try {
      const response = await adminService.getDisputeMessages(disputeId);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDispute || sendingMessage) return;

    setSendingMessage(true);
    try {
      await adminService.sendDisputeMessage(selectedDispute.id, {
        message: newMessage,
        sender: 'admin',
        isInternal: false
      });

      setNewMessage('');
      // Reload messages
      await loadMessages(selectedDispute.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageSenderColor = (sender: string) => {
    switch (sender) {
      case 'admin': return 'bg-purple-500/20 border-purple-500/30';
      case 'buyer': return 'bg-blue-500/20 border-blue-500/30';
      case 'seller': return 'bg-green-500/20 border-green-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getMessageSenderLabel = (sender: string) => {
    switch (sender) {
      case 'admin': return 'Admin';
      case 'buyer': return 'Buyer';
      case 'seller': return 'Seller';
      default: return sender;
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

  const getEvidenceIcon = (type: string) => {
    if (type?.includes('image') || type?.includes('png') || type?.includes('jpg') || type?.includes('jpeg')) {
      return FileImage;
    }
    return File;
  };

  const getEvidenceTypeLabel = (type: string) => {
    if (!type) return 'Unknown';
    if (type.includes('image')) return 'Image';
    if (type.includes('pdf')) return 'PDF Document';
    if (type.includes('video')) return 'Video';
    return 'Document';
  };

  const handleEvidenceUpload = async (files: FileList | null, party: 'buyer' | 'seller' | 'admin') => {
    if (!files || !selectedDispute) return;

    setEvidenceUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('party', party);

      await adminService.uploadDisputeEvidence(selectedDispute.id, formData);

      // Refresh dispute details
      const updatedDispute = await adminService.getDispute(selectedDispute.id);
      setSelectedDispute(updatedDispute);
    } catch (error) {
      console.error('Failed to upload evidence:', error);
    } finally {
      setEvidenceUploading(false);
    }
  };

  const handleEvidenceDelete = async (evidenceId: string) => {
    if (!selectedDispute) return;

    try {
      await adminService.deleteDisputeEvidence(selectedDispute.id, evidenceId);

      // Refresh dispute details
      const updatedDispute = await adminService.getDispute(selectedDispute.id);
      setSelectedDispute(updatedDispute);
    } catch (error) {
      console.error('Failed to delete evidence:', error);
    }
  };

  const handleEvidenceStatusUpdate = async (evidenceId: string, status: 'verified' | 'rejected' | 'pending') => {
    if (!selectedDispute) return;

    try {
      await adminService.updateEvidenceStatus(selectedDispute.id, evidenceId, status);

      // Refresh dispute details
      const updatedDispute = await adminService.getDispute(selectedDispute.id);
      setSelectedDispute(updatedDispute);
    } catch (error) {
      console.error('Failed to update evidence status:', error);
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

                {/* Communication Thread */}
                <div className="border-t border-gray-700 pt-4">
                  <button
                    onClick={() => setShowCommunicationThread(!showCommunicationThread)}
                    className="flex items-center justify-between w-full text-left mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-medium text-sm">Communication Thread</span>
                      {messages.length > 0 && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                          {messages.length}
                        </span>
                      )}
                    </div>
                    {showCommunicationThread ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {showCommunicationThread && (
                    <div>
                      {/* Messages List */}
                      <div className="space-y-3 mb-3 max-h-96 overflow-y-auto">
                        {messages.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">No messages yet</p>
                            <p className="text-gray-500 text-xs mt-1">Start the conversation with the parties</p>
                          </div>
                        ) : (
                          messages.map((message, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border ${getMessageSenderColor(message.sender)}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-white text-sm font-medium">
                                    {getMessageSenderLabel(message.sender)}
                                  </span>
                                  {message.isInternal && (
                                    <span className="px-2 py-0.5 bg-gray-500/30 text-gray-300 text-xs rounded-full">
                                      Internal
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                  {new Date(message.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-gray-200 text-sm whitespace-pre-wrap">{message.message}</p>
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {message.attachments.map((attachment: any, idx: number) => (
                                    <a
                                      key={idx}
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded text-xs text-blue-400 hover:text-blue-300"
                                    >
                                      <FileText className="w-3 h-3" />
                                      {attachment.filename}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Message Input */}
                      <div className="space-y-2">
                        <div className="relative">
                          <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
                            rows={3}
                            disabled={sendingMessage}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-purple-500 disabled:opacity-50"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1">
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                disabled={sendingMessage}
                              />
                              <Upload className="w-3 h-3" />
                              Attach files
                            </label>
                          </div>
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sendingMessage}
                            variant="primary"
                            size="small"
                            className="flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            {sendingMessage ? 'Sending...' : 'Send'}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Messages are visible to both buyer and seller. Use internal notes for admin-only communication.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Evidence Management */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-gray-400 text-sm">Evidence Management</label>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleEvidenceUpload(e.target.files, 'admin')}
                        disabled={evidenceUploading}
                      />
                      <Button
                        variant="outline"
                        size="small"
                        disabled={evidenceUploading}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {evidenceUploading ? 'Uploading...' : 'Upload Evidence'}
                      </Button>
                    </label>
                  </div>

                  <div className="space-y-3">
                    {/* Buyer Evidence */}
                    {selectedDispute.evidence.buyerEvidence && selectedDispute.evidence.buyerEvidence.length > 0 && (
                      <div>
                        <h4 className="text-blue-400 text-xs font-medium mb-2">Buyer Evidence</h4>
                        <div className="space-y-2">
                          {selectedDispute.evidence.buyerEvidence.map((evidence, index) => {
                            const EvidenceIcon = getEvidenceIcon(evidence.type);
                            return (
                              <div key={index} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <div className="flex items-start gap-3">
                                  <EvidenceIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-white text-sm font-medium truncate">
                                        {evidence.filename || `Evidence ${index + 1}`}
                                      </span>
                                      {evidence.status && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          evidence.status === 'verified' ? 'bg-green-500/20 text-green-400' :
                                          evidence.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                          'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                          {evidence.status}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                      <span>{getEvidenceTypeLabel(evidence.type)}</span>
                                      {evidence.size && (
                                        <>
                                          <span>•</span>
                                          <span>{(evidence.size / 1024).toFixed(1)} KB</span>
                                        </>
                                      )}
                                      {evidence.uploadedAt && (
                                        <>
                                          <span>•</span>
                                          <span>{new Date(evidence.uploadedAt).toLocaleDateString()}</span>
                                        </>
                                      )}
                                    </div>
                                    {evidence.description && (
                                      <p className="text-gray-300 text-xs mb-2">{evidence.description}</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="small"
                                        onClick={() => setSelectedEvidence(evidence)}
                                        className="flex items-center gap-1 text-xs"
                                      >
                                        <Eye className="w-3 h-3" />
                                        View
                                      </Button>
                                      {evidence.url && (
                                        <a
                                          href={evidence.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                          <Download className="w-3 h-3" />
                                          Download
                                        </a>
                                      )}
                                      <div className="flex gap-1 ml-auto">
                                        <button
                                          onClick={() => handleEvidenceStatusUpdate(evidence.id, 'verified')}
                                          className="p-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400"
                                          title="Verify"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleEvidenceStatusUpdate(evidence.id, 'rejected')}
                                          className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400"
                                          title="Reject"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleEvidenceDelete(evidence.id)}
                                          className="p-1 rounded bg-gray-500/20 hover:bg-gray-500/30 text-gray-400"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Seller Evidence */}
                    {selectedDispute.evidence.sellerEvidence && selectedDispute.evidence.sellerEvidence.length > 0 && (
                      <div>
                        <h4 className="text-green-400 text-xs font-medium mb-2">Seller Evidence</h4>
                        <div className="space-y-2">
                          {selectedDispute.evidence.sellerEvidence.map((evidence, index) => {
                            const EvidenceIcon = getEvidenceIcon(evidence.type);
                            return (
                              <div key={index} className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                <div className="flex items-start gap-3">
                                  <EvidenceIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-white text-sm font-medium truncate">
                                        {evidence.filename || `Evidence ${index + 1}`}
                                      </span>
                                      {evidence.status && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          evidence.status === 'verified' ? 'bg-green-500/20 text-green-400' :
                                          evidence.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                          'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                          {evidence.status}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                      <span>{getEvidenceTypeLabel(evidence.type)}</span>
                                      {evidence.size && (
                                        <>
                                          <span>•</span>
                                          <span>{(evidence.size / 1024).toFixed(1)} KB</span>
                                        </>
                                      )}
                                      {evidence.uploadedAt && (
                                        <>
                                          <span>•</span>
                                          <span>{new Date(evidence.uploadedAt).toLocaleDateString()}</span>
                                        </>
                                      )}
                                    </div>
                                    {evidence.description && (
                                      <p className="text-gray-300 text-xs mb-2">{evidence.description}</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="small"
                                        onClick={() => setSelectedEvidence(evidence)}
                                        className="flex items-center gap-1 text-xs"
                                      >
                                        <Eye className="w-3 h-3" />
                                        View
                                      </Button>
                                      {evidence.url && (
                                        <a
                                          href={evidence.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                                        >
                                          <Download className="w-3 h-3" />
                                          Download
                                        </a>
                                      )}
                                      <div className="flex gap-1 ml-auto">
                                        <button
                                          onClick={() => handleEvidenceStatusUpdate(evidence.id, 'verified')}
                                          className="p-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400"
                                          title="Verify"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleEvidenceStatusUpdate(evidence.id, 'rejected')}
                                          className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400"
                                          title="Reject"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleEvidenceDelete(evidence.id)}
                                          className="p-1 rounded bg-gray-500/20 hover:bg-gray-500/30 text-gray-400"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Admin Evidence */}
                    {selectedDispute.evidence.adminEvidence && selectedDispute.evidence.adminEvidence.length > 0 && (
                      <div>
                        <h4 className="text-purple-400 text-xs font-medium mb-2">Admin Evidence</h4>
                        <div className="space-y-2">
                          {selectedDispute.evidence.adminEvidence.map((evidence, index) => {
                            const EvidenceIcon = getEvidenceIcon(evidence.type);
                            return (
                              <div key={index} className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <div className="flex items-start gap-3">
                                  <EvidenceIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-white text-sm font-medium truncate">
                                        {evidence.filename || `Evidence ${index + 1}`}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                      <span>{getEvidenceTypeLabel(evidence.type)}</span>
                                      {evidence.size && (
                                        <>
                                          <span>•</span>
                                          <span>{(evidence.size / 1024).toFixed(1)} KB</span>
                                        </>
                                      )}
                                      {evidence.uploadedAt && (
                                        <>
                                          <span>•</span>
                                          <span>{new Date(evidence.uploadedAt).toLocaleDateString()}</span>
                                        </>
                                      )}
                                    </div>
                                    {evidence.description && (
                                      <p className="text-gray-300 text-xs mb-2">{evidence.description}</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="small"
                                        onClick={() => setSelectedEvidence(evidence)}
                                        className="flex items-center gap-1 text-xs"
                                      >
                                        <Eye className="w-3 h-3" />
                                        View
                                      </Button>
                                      {evidence.url && (
                                        <a
                                          href={evidence.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                        >
                                          <Download className="w-3 h-3" />
                                          Download
                                        </a>
                                      )}
                                      <button
                                        onClick={() => handleEvidenceDelete(evidence.id)}
                                        className="p-1 rounded bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 ml-auto"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* No Evidence Message */}
                    {(!selectedDispute.evidence.buyerEvidence || selectedDispute.evidence.buyerEvidence.length === 0) &&
                     (!selectedDispute.evidence.sellerEvidence || selectedDispute.evidence.sellerEvidence.length === 0) &&
                     (!selectedDispute.evidence.adminEvidence || selectedDispute.evidence.adminEvidence.length === 0) && (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No evidence uploaded yet</p>
                      </div>
                    )}
                  </div>
                </div>

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