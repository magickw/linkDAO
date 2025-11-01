import React, { useState, useEffect } from 'react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Badge } from '@/design-system/components/Badge';
import { Textarea } from '@/design-system/components/Textarea';
import { LoadingSpinner } from '@/components/animations/LoadingSkeletons';
import { Alert } from '@/design-system/components/Alert';

interface VerificationRequest {
  id: string;
  sellerId: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  legalName?: string;
  ein?: string;
  businessAddress?: string;
  submittedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  // Add seller information
  seller?: {
    name: string;
    email: string;
    walletAddress: string;
  };
}

export const SellerVerificationReview: React.FC = () => {
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});

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
              ? { ...req, status: 'verified', verifiedAt: new Date().toISOString() } 
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
              ? { ...req, status: 'rejected', rejectionReason: reason } 
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <Alert variant="error">
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
        <Button onClick={fetchPendingVerifications} variant="secondary">
          Refresh
        </Button>
      </div>

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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.legalName || 'Unnamed Business'}
                      </h3>
                      <Badge variant={request.status === 'pending' ? 'warning' : 'secondary'}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                    {request.seller && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {request.seller.name} • {request.seller.email}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Submitted {formatDate(request.submittedAt)}
                  </p>
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

                {request.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      onClick={() => handleApprove(request.id)}
                      variant="success"
                      disabled={actionLoading === request.id}
                      className="flex-1"
                    >
                      {actionLoading === request.id ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Approving...
                        </>
                      ) : (
                        'Approve Verification'
                      )}
                    </Button>
                    
                    <div className="flex-1 space-y-3">
                      <Textarea
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
                        variant="error"
                        disabled={actionLoading === request.id || !rejectionReason[request.id]}
                        className="w-full"
                      >
                        {actionLoading === request.id ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Rejecting...
                          </>
                        ) : (
                          'Reject Verification'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {request.status === 'verified' && request.verifiedAt && (
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
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