import React, { useState, useEffect } from 'react';
import { Card } from '@/design-system/components/Card';
import { Badge } from '@/design-system/components/Badge';
import { LoadingSpinner } from '@/components/animations/LoadingSkeletons';
import { Alert } from '@/design-system/components/Alert';

interface SellerVerificationStatusProps {
  sellerId: string;
}

export const SellerVerificationStatus: React.FC<SellerVerificationStatusProps> = ({ sellerId }) => {
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/marketplace/sellers/${sellerId}/verification`);
        const result = await response.json();
        
        if (response.ok && result.success) {
          setVerification(result.data);
        } else {
          setError(result.message || 'Failed to fetch verification status');
        }
      } catch (err) {
        console.error('Error fetching verification status:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchVerificationStatus();
    }
  }, [sellerId]);

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <div className="p-6 flex items-center justify-center">
          <LoadingSpinner />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading verification status...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <div className="p-6">
          <Alert variant="error">
            {error}
          </Alert>
        </div>
      </Card>
    );
  }

  if (!verification) {
    return (
      <Card className="max-w-2xl mx-auto">
        <div className="p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No verification request found for this seller.
          </p>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success">Verified</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="error">Rejected</Badge>;
      case 'expired':
        return <Badge variant="error">Expired</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Your business has been successfully verified. You now have access to premium marketplace features.';
      case 'pending':
        return 'Your verification request is under review. This typically takes 2-3 business days.';
      case 'rejected':
        return 'Your verification request was rejected. Please check the reason below and submit a new request.';
      case 'expired':
        return 'Your verification has expired. Please submit a new verification request to continue selling.';
      default:
        return 'Unknown verification status.';
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Verification Status
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {getStatusDescription(verification.status)}
            </p>
          </div>
          <div>
            {getStatusBadge(verification.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Legal Name
            </h3>
            <p className="text-gray-900 dark:text-white">
              {verification.legalName || 'Not provided'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              EIN
            </h3>
            <p className="text-gray-900 dark:text-white">
              {verification.ein ? verification.ein : 'Not provided'}
            </p>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Business Address
            </h3>
            <p className="text-gray-900 dark:text-white">
              {verification.businessAddress || 'Not provided'}
            </p>
          </div>
        </div>

        {verification.status === 'rejected' && verification.rejectionReason && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Rejection Reason
            </h3>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">
                {verification.rejectionReason}
              </p>
            </div>
          </div>
        )}

        {verification.status === 'verified' && verification.verifiedAt && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Verification Details
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-green-800 dark:text-green-200">
                Verified on {new Date(verification.verifiedAt).toLocaleDateString()}
              </p>
              {verification.expiresAt && (
                <p className="text-green-700 dark:text-green-300 mt-1">
                  Expires on {new Date(verification.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {verification.notes && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Additional Notes
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {verification.notes}
            </p>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {verification.status === 'verified' 
              ? 'Your verification is valid for 1 year from the verification date.'
              : 'Need help with your verification? Contact our support team.'}
          </p>
        </div>
      </div>
    </Card>
  );
};