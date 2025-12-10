import React, { useState, useEffect } from 'react';
// Import from the correct paths in the LinkDAO project
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TextArea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/animations/LoadingSkeletons';
import { Alert } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Shield, 
  TrendingUp,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Server,
  CheckSquare,
  Square,
  Loader
} from 'lucide-react';

interface VerificationRequest {
  id: string;
  userId: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  progressStatus: 'submitted' | 'documents_verified' | 'manual_review' | 'approved' | 'rejected';
  progressUpdatedAt: string;
  legalName?: string;
  ein?: string;
  businessAddress?: string;
  submittedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  verificationMethod?: string;
  verificationReference?: string;
  riskScore?: 'low' | 'medium' | 'high';
  // Add seller information
  user?: {
    email?: string;
    legalName?: string;
    country?: string;
    kycVerified?: boolean;
  };
  // Document references
  einDocumentId?: string;
  businessLicenseId?: string;
  addressProofId?: string;
}

interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export const SellerVerificationReview: React.FC = () => {
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});
  const [documentPreview, setDocumentPreview] = useState<{id: string, url: string} | null>(null);
  const [auditLogs, setAuditLogs] = useState<Record<string, AuditLogEntry[]>>({});
  const [selectedVerifications, setSelectedVerifications] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      // Fetch from real API endpoint
      const response = await fetch('/api/marketplace/verification/pending', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setVerificationRequests(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch verification requests');
      }
    } catch (err) {
      console.error('Error fetching verifications:', err);
      setError('Failed to fetch verification requests: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (verificationId: string) => {
    try {
      const response = await fetch(`/api/marketplace/verification/${verificationId}/audit`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setAuditLogs(prev => ({
          ...prev,
          [verificationId]: result.data
        }));
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  const handleApprove = async (verificationId: string) => {
    try {
      setActionLoading(verificationId);
      
      const response = await fetch(`/api/marketplace/verification/${verificationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationMethod: 'manual_review',
          riskScore: 'low'
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update the local state
        setVerificationRequests(prev => 
          prev.map(req => 
            req.id === verificationId 
              ? { ...req, status: 'verified', progressStatus: 'approved', verifiedAt: new Date().toISOString() } 
              : req
          )
        );
        
        // Show success message
        alert('Verification approved successfully');
      } else {
        throw new Error(result.message || 'Failed to approve verification');
      }
    } catch (err) {
      console.error('Error approving verification:', err);
      alert('Failed to approve verification: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (verificationId: string) => {
    const reason = rejectionReason[verificationId];
    if (!reason) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(verificationId);
      
      const response = await fetch(`/api/marketplace/verification/${verificationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update the local state
        setVerificationRequests(prev => 
          prev.map(req => 
            req.id === verificationId 
              ? { ...req, status: 'rejected', progressStatus: 'rejected', rejectionReason: reason } 
              : req
          )
        );
        
        // Show success message
        alert('Verification rejected successfully');
      } else {
        throw new Error(result.message || 'Failed to reject verification');
      }
    } catch (err) {
      console.error('Error rejecting verification:', err);
      alert('Failed to reject verification: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedVerifications.size === 0) {
      alert('Please select at least one verification to approve');
      return;
    }

    try {
      setBulkActionLoading(true);
      
      const response = await fetch('/api/marketplace/verification/bulk/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedVerifications)
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update the local state for successful approvals
        const approvedIds = result.data.successes.map((item: any) => item.id);
        setVerificationRequests(prev => 
          prev.map(req => 
            approvedIds.includes(req.id) 
              ? { ...req, status: 'verified', progressStatus: 'approved', verifiedAt: new Date().toISOString() } 
              : req
          )
        );
        
        // Clear selection
        setSelectedVerifications(new Set());
        setShowBulkActions(false);
        
        // Show success message
        alert(`Bulk approval completed: ${result.data.successes.length} approved, ${result.data.errors.length} failed`);
      } else {
        throw new Error(result.message || 'Failed to bulk approve verifications');
      }
    } catch (err) {
      console.error('Error bulk approving verifications:', err);
      alert('Failed to bulk approve verifications: ' + (err as Error).message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedVerifications.size === 0) {
      alert('Please select at least one verification to reject');
      return;
    }

    if (!bulkRejectionReason) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setBulkActionLoading(true);
      
      const response = await fetch('/api/marketplace/verification/bulk/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedVerifications),
          reason: bulkRejectionReason
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update the local state for successful rejections
        const rejectedIds = result.data.successes.map((item: any) => item.id);
        setVerificationRequests(prev => 
          prev.map(req => 
            rejectedIds.includes(req.id) 
              ? { ...req, status: 'rejected', progressStatus: 'rejected', rejectionReason: bulkRejectionReason } 
              : req
          )
        );
        
        // Clear selection and reason
        setSelectedVerifications(new Set());
        setShowBulkActions(false);
        setBulkRejectionReason('');
        
        // Show success message
        alert(`Bulk rejection completed: ${result.data.successes.length} rejected, ${result.data.errors.length} failed`);
      } else {
        throw new Error(result.message || 'Failed to bulk reject verifications');
      }
    } catch (err) {
      console.error('Error bulk rejecting verifications:', err);
      alert('Failed to bulk reject verifications: ' + (err as Error).message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRequests(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    
    // Fetch audit logs when expanding
    if (!expandedRequests[id] && !auditLogs[id]) {
      fetchAuditLogs(id);
    }
  };

  const toggleVerificationSelection = (id: string) => {
    const newSelected = new Set(selectedVerifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedVerifications(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedVerifications.size === verificationRequests.length) {
      setSelectedVerifications(new Set());
    } else {
      setSelectedVerifications(new Set(verificationRequests.map(req => req.id)));
    }
  };

  const getRiskScoreColor = (score: string) => {
    switch (score) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'seller_verification_approved': return 'text-green-600 bg-green-100';
      case 'seller_verification_rejected': return 'text-red-600 bg-red-100';
      case 'seller_verification_submitted': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-blue-600 bg-blue-100';
      case 'documents_verified': return 'text-purple-600 bg-purple-100';
      case 'manual_review': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDocumentPreview = (documentId: string) => {
    // In a real implementation, this would open a document preview modal
    setDocumentPreview({
      id: documentId,
      url: `/api/documents/${documentId}/preview`
    });
  };

  const handleDocumentDownload = (documentId: string) => {
    // In a real implementation, this would download the document
    window.open(`/api/documents/${documentId}/download`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading verification requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        {error}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Seller Verification Requests
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and approve pending seller verification requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowBulkActions(!showBulkActions)}
            variant="secondary"
          >
            {showBulkActions ? 'Cancel Bulk Actions' : 'Bulk Actions'}
          </Button>
          <Button onClick={fetchPendingVerifications} variant="secondary">
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {showBulkActions && (
        <Card className="p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleSelectAll}
                variant="outline"
                size="sm"
              >
                {selectedVerifications.size === verificationRequests.length ? (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {selectedVerifications.size} of {verificationRequests.length} selected
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button
                onClick={handleBulkApprove}
                variant="default"
                disabled={bulkActionLoading || selectedVerifications.size === 0}
                className="flex-1"
              >
                {bulkActionLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Bulk Approve
                  </>
                )}
              </Button>
              
              <div className="flex flex-col gap-2 flex-1">
                <TextArea
                  placeholder="Bulk rejection reason (required)"
                  value={bulkRejectionReason}
                  onChange={(e) => setBulkRejectionReason(e.target.value)}
                  rows={2}
                  className="w-full"
                />
                <Button
                  onClick={handleBulkReject}
                  variant="destructive"
                  disabled={bulkActionLoading || selectedVerifications.size === 0 || !bulkRejectionReason}
                  className="w-full"
                >
                  {bulkActionLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Bulk Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {verificationRequests.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No pending verifications
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              All verification requests have been processed.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {verificationRequests.map((request) => (
            <Card key={request.id} className="border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                {/* Selection Checkbox for Bulk Actions */}
                {showBulkActions && (
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => toggleVerificationSelection(request.id)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {selectedVerifications.has(request.id) ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.legalName || 'Unnamed Business'}
                      </h3>
                      <Badge variant={request.status === 'pending' ? 'destructive' : 'secondary'}>
                        {request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1) : 'Unknown'}
                      </Badge>
                      <Badge className={getProgressStatusColor(request.progressStatus)}>
                        {request.progressStatus ? request.progressStatus.replace('_', ' ') : 'Unknown'}
                      </Badge>
                      {request.riskScore && (
                        <Badge className={getRiskScoreColor(request.riskScore)}>
                          Risk: {request.riskScore}
                        </Badge>
                      )}
                    </div>
                    {request.user && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {request.user.email} • {request.user.country || 'N/A'}
                        {request.user.kycVerified && (
                          <span className="ml-2 inline-flex items-center text-xs text-green-600">
                            <Shield className="w-3 h-3 mr-1" />
                            KYC Verified
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Submitted {formatDate(request.submittedAt)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Updated {formatDate(request.progressUpdatedAt)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Business Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Legal Name</p>
                        <p className="text-gray-900 dark:text-white">
                          {request.legalName || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">EIN</p>
                        <p className="text-gray-900 dark:text-white">
                          {request.ein || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Address
                    </h4>
                    <p className="text-gray-900 dark:text-white">
                      {request.businessAddress || 'Not provided'}
                    </p>
                  </div>
                </div>

                {expandedRequests[request.id] && (
                  <div className="mb-6 space-y-6">
                    {/* Progress Tracking */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Loader className="w-5 h-5 text-blue-500" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Application Progress
                        </h4>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              request.progressStatus === 'rejected' ? 'bg-red-500' : 
                              request.progressStatus === 'approved' ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ 
                              width: request.progressStatus === 'submitted' ? '25%' : 
                                     request.progressStatus === 'documents_verified' ? '50%' : 
                                     request.progressStatus === 'manual_review' ? '75%' : '100%' 
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 ${
                            ['submitted', 'documents_verified', 'manual_review', 'approved', 'rejected'].includes(request.progressStatus) 
                              ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            1
                          </div>
                          <span>Submitted</span>
                        </div>
                        <div className="text-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 ${
                            ['documents_verified', 'manual_review', 'approved', 'rejected'].includes(request.progressStatus) 
                              ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            2
                          </div>
                          <span>Documents</span>
                        </div>
                        <div className="text-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 ${
                            ['manual_review', 'approved', 'rejected'].includes(request.progressStatus) 
                              ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            3
                          </div>
                          <span>Review</span>
                        </div>
                        <div className="text-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-1 ${
                            request.progressStatus === 'approved' ? 'bg-green-500 text-white' : 
                            request.progressStatus === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            4
                          </div>
                          <span>Complete</span>
                        </div>
                      </div>
                    </div>

                    {/* Risk Assessment Panel */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Risk Assessment
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-700 p-3 rounded">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Account Age</p>
                          <p className="text-sm font-medium">30 days</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 p-3 rounded">
                          <p className="text-xs text-gray-500 dark:text-gray-400">KYC Status</p>
                          <p className="text-sm font-medium">
                            {request.user?.kycVerified ? 'Verified' : 'Not Verified'}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 p-3 rounded">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Transaction History</p>
                          <p className="text-sm font-medium">0 transactions</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Risk Notes</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {request.user?.kycVerified ? 'KYC verified' : 'KYC verification not completed'}
                        </p>
                      </div>
                    </div>

                    {/* Document Verification Section */}
                    {(request.einDocumentId || request.businessLicenseId || request.addressProofId) && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Document Verification
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {request.einDocumentId && (
                            <div className="bg-white dark:bg-gray-700 p-3 rounded flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">EIN Document</p>
                                <p className="text-xs text-gray-500">PDF, 1.2 MB</p>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDocumentPreview(request.einDocumentId!)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDocumentDownload(request.einDocumentId!)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          {request.businessLicenseId && (
                            <div className="bg-white dark:bg-gray-700 p-3 rounded flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">Business License</p>
                                <p className="text-xs text-gray-500">PDF, 2.1 MB</p>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDocumentPreview(request.businessLicenseId!)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDocumentDownload(request.businessLicenseId!)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          {request.addressProofId && (
                            <div className="bg-white dark:bg-gray-700 p-3 rounded flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">Address Proof</p>
                                <p className="text-xs text-gray-500">PDF, 0.8 MB</p>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDocumentPreview(request.addressProofId!)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDocumentDownload(request.addressProofId!)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Audit Trail Section */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-5 h-5 text-purple-500" />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Audit Trail
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {auditLogs[request.id] && auditLogs[request.id].length > 0 ? (
                          auditLogs[request.id].map((log) => (
                            <div key={log.id} className="bg-white dark:bg-gray-700 p-3 rounded flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {log.action.includes('approved') ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : log.action.includes('rejected') ? (
                                  <XCircle className="w-5 h-5 text-red-500" />
                                ) : (
                                  <Server className="w-5 h-5 text-blue-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                    {log.action ? log.action.replace('seller_verification_', '').replace('_', ' ') : 'Unknown Action'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(log.createdAt)}
                                  </span>
                                </div>
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <div className="text-xs text-gray-600 dark:text-gray-300">
                                    {Object.entries(log.details).map(([key, value]) => (
                                      <div key={key} className="flex gap-1">
                                        <span className="font-medium">{key}:</span>
                                        <span>{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    <span>Admin ID: {log.adminId.substring(0, 8)}...</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Server className="w-3 h-3" />
                                    <span>IP: {log.ipAddress || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p>No audit trail entries found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {request.status === 'rejected' && request.rejectionReason && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Rejection Reason
                    </h4>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-red-800 dark:text-red-200">
                        {request.rejectionReason}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => handleApprove(request.id)}
                        variant="default"
                        disabled={actionLoading === request.id}
                        className="flex-1"
                      >
                        {actionLoading === request.id ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Verification
                          </>
                        )}
                      </Button>
                      
                      <div className="flex-1 space-y-3">
                        <TextArea
                          placeholder="Reason for rejection (required)"
                          value={rejectionReason[request.id] || ''}
                          onChange={(e) => setRejectionReason(prev => ({
                            ...prev,
                            [request.id]: e.target.value
                          }))}
                          rows={2}
                        />
                        <Button
                          onClick={() => handleReject(request.id)}
                          variant="destructive"
                          disabled={actionLoading === request.id || !rejectionReason[request.id]}
                          className="w-full"
                        >
                          {actionLoading === request.id ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Rejecting...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject Verification
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => toggleExpand(request.id)}
                    className="flex items-center gap-2"
                  >
                    {expandedRequests[request.id] ? (
                      <>
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>Show Details</span>
                      </>
                    )}
                  </Button>
                </div>

                {request.status === 'verified' && request.verifiedAt && (
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Verified on {formatDate(request.verifiedAt)}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};