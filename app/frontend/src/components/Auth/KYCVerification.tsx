import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface KYCVerificationProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const KYCVerification: React.FC<KYCVerificationProps> = ({
  onSuccess,
  onError,
  className = ''
}) => {
  const [selectedTier, setSelectedTier] = useState<'basic' | 'intermediate' | 'advanced'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const { kycStatus, initiateKYC, refreshKYCStatus } = useAuth();

  useEffect(() => {
    // Refresh KYC status when component mounts
    refreshKYCStatus();
  }, []);

  const kycTiers = {
    basic: {
      name: 'Basic Verification',
      limits: {
        daily: '$1,000',
        monthly: '$10,000',
        transaction: '$500'
      },
      requirements: ['Government-issued ID'],
      processingTime: '1-2 business days',
      features: ['Basic trading', 'NFT marketplace', 'Enhanced features']
    },
    intermediate: {
      name: 'Intermediate Verification',
      limits: {
        daily: '$10,000',
        monthly: '$100,000',
        transaction: '$5,000'
      },
      requirements: ['Government-issued ID', 'Proof of address'],
      processingTime: '3-5 business days',
      features: ['All Basic features', 'High-value trading', 'Escrow services']
    },
    advanced: {
      name: 'Advanced Verification',
      limits: {
        daily: '$100,000',
        monthly: '$1,000,000',
        transaction: '$50,000'
      },
      requirements: ['Passport', 'Proof of address', 'Bank statement'],
      processingTime: '5-10 business days',
      features: ['All Intermediate features', 'Governance voting', 'Dispute resolution']
    }
  };

  const handleInitiateKYC = async () => {
    try {
      setIsSubmitting(true);
      
      const result = await initiateKYC(selectedTier);
      
      if (result.success) {
        onSuccess?.();
        await refreshKYCStatus();
      } else {
        onError?.(result.error || 'KYC initiation failed');
      }
    } catch (error: any) {
      console.error('KYC initiation failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError?.(errorMessage || 'KYC initiation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'under_review':
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Verified';
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Not Started';
    }
  };

  if (kycStatus && kycStatus.status === 'approved') {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">KYC Verification Complete</h3>
            <p className="text-green-700">
              Your {kycStatus.tier} tier verification has been approved
            </p>
          </div>
        </div>
        
        {kycStatus.expiresAt && (
          <div className="mt-4 text-sm text-green-700">
            Expires: {new Date(kycStatus.expiresAt).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  }

  if (kycStatus && ['pending', 'under_review'].includes(kycStatus.status)) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-yellow-900">KYC Verification In Progress</h3>
            <p className="text-yellow-700">
              Your {kycStatus.tier} tier verification is {getStatusText(kycStatus.status).toLowerCase()}
            </p>
          </div>
        </div>
        
        {kycStatus.submittedAt && (
          <div className="mt-4 text-sm text-yellow-700">
            Submitted: {new Date(kycStatus.submittedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">KYC Verification</h2>
        <p className="text-gray-600">
          Verify your identity to unlock higher trading limits and advanced features
        </p>
      </div>

      {kycStatus && kycStatus.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-red-900 font-semibold">Verification Rejected</h3>
          </div>
          {kycStatus.rejectionReason && (
            <p className="text-red-700 mt-2">{kycStatus.rejectionReason}</p>
          )}
          <p className="text-red-700 mt-2">You can resubmit your verification with corrected information.</p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Select Verification Tier</h3>
        
        <div className="grid gap-4">
          {Object.entries(kycTiers).map(([tier, details]) => (
            <div
              key={tier}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedTier === tier
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTier(tier as any)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    checked={selectedTier === tier}
                    onChange={() => setSelectedTier(tier as any)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{details.name}</h4>
                    <div className="text-sm text-gray-600 mt-1">
                      <p>Daily limit: {details.limits.daily}</p>
                      <p>Processing: {details.processingTime}</p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(!showDetails);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Details
                </button>
              </div>
              
              {showDetails && selectedTier === tier && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Trading Limits</h5>
                      <ul className="space-y-1 text-gray-600">
                        <li>Daily: {details.limits.daily}</li>
                        <li>Monthly: {details.limits.monthly}</li>
                        <li>Per transaction: {details.limits.transaction}</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Required Documents</h5>
                      <ul className="space-y-1 text-gray-600">
                        {details.requirements.map((req, index) => (
                          <li key={index}>• {req}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="md:col-span-2">
                      <h5 className="font-medium text-gray-900 mb-2">Features</h5>
                      <ul className="space-y-1 text-gray-600">
                        {details.features.map((feature, index) => (
                          <li key={index}>• {feature}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Important Information</p>
            <ul className="space-y-1">
              <li>• All personal information is encrypted and stored securely</li>
              <li>• You can upgrade your verification tier at any time</li>
              <li>• Verification is required for regulatory compliance</li>
              <li>• Processing times may vary during high demand periods</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={handleInitiateKYC}
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Starting Verification...' : `Start ${kycTiers[selectedTier].name}`}
      </button>
    </div>
  );
};