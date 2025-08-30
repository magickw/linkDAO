import React, { useState } from 'react';
import { X, Upload, AlertTriangle } from 'lucide-react';

interface DisputeCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrowId: number;
  onSubmit: (disputeData: DisputeFormData) => Promise<void>;
}

export interface DisputeFormData {
  escrowId: number;
  disputeType: DisputeType;
  reason: string;
  evidence?: string;
}

export enum DisputeType {
  PRODUCT_NOT_RECEIVED = 'product_not_received',
  PRODUCT_NOT_AS_DESCRIBED = 'product_not_as_described',
  DAMAGED_PRODUCT = 'damaged_product',
  UNAUTHORIZED_TRANSACTION = 'unauthorized_transaction',
  SELLER_MISCONDUCT = 'seller_misconduct',
  BUYER_MISCONDUCT = 'buyer_misconduct',
  OTHER = 'other'
}

const disputeTypeLabels: Record<DisputeType, string> = {
  [DisputeType.PRODUCT_NOT_RECEIVED]: 'Product Not Received',
  [DisputeType.PRODUCT_NOT_AS_DESCRIBED]: 'Product Not as Described',
  [DisputeType.DAMAGED_PRODUCT]: 'Damaged Product',
  [DisputeType.UNAUTHORIZED_TRANSACTION]: 'Unauthorized Transaction',
  [DisputeType.SELLER_MISCONDUCT]: 'Seller Misconduct',
  [DisputeType.BUYER_MISCONDUCT]: 'Buyer Misconduct',
  [DisputeType.OTHER]: 'Other'
};

const disputeTypeDescriptions: Record<DisputeType, string> = {
  [DisputeType.PRODUCT_NOT_RECEIVED]: 'You paid for a product but never received it',
  [DisputeType.PRODUCT_NOT_AS_DESCRIBED]: 'The product received differs significantly from the description',
  [DisputeType.DAMAGED_PRODUCT]: 'The product arrived damaged or defective',
  [DisputeType.UNAUTHORIZED_TRANSACTION]: 'This transaction was made without your authorization',
  [DisputeType.SELLER_MISCONDUCT]: 'The seller engaged in fraudulent or inappropriate behavior',
  [DisputeType.BUYER_MISCONDUCT]: 'The buyer engaged in fraudulent or inappropriate behavior',
  [DisputeType.OTHER]: 'Other dispute reason not covered above'
};

export const DisputeCreationModal: React.FC<DisputeCreationModalProps> = ({
  isOpen,
  onClose,
  escrowId,
  onSubmit
}) => {
  const [formData, setFormData] = useState<DisputeFormData>({
    escrowId,
    disputeType: DisputeType.PRODUCT_NOT_RECEIVED,
    reason: '',
    evidence: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.reason.length < 10) {
      setError('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        escrowId,
        disputeType: DisputeType.PRODUCT_NOT_RECEIVED,
        reason: '',
        evidence: ''
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisputeTypeChange = (type: DisputeType) => {
    setFormData(prev => ({ ...prev, disputeType: type }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create Dispute</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Dispute Type
            </label>
            <div className="space-y-3">
              {Object.entries(disputeTypeLabels).map(([type, label]) => (
                <div key={type} className="relative">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="disputeType"
                      value={type}
                      checked={formData.disputeType === type}
                      onChange={() => handleDisputeTypeChange(type as DisputeType)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500">
                        {disputeTypeDescriptions[type as DisputeType]}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Reason *
            </label>
            <textarea
              id="reason"
              rows={4}
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Please provide a detailed explanation of the issue..."
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.reason.length}/1000 characters (minimum 10 required)
            </p>
          </div>

          <div>
            <label htmlFor="evidence" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Evidence (Optional)
            </label>
            <textarea
              id="evidence"
              rows={3}
              value={formData.evidence}
              onChange={(e) => setFormData(prev => ({ ...prev, evidence: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional information, links, or references that support your case..."
            />
            <p className="text-sm text-gray-500 mt-1">
              You can submit additional evidence (images, documents) after creating the dispute
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
                <div className="text-sm text-yellow-700 mt-1 space-y-1">
                  <p>• Once created, disputes cannot be cancelled</p>
                  <p>• You will have 3 days to submit evidence</p>
                  <p>• False disputes may negatively impact your reputation</p>
                  <p>• Resolution may take 5-10 business days</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.reason.length < 10}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating Dispute...' : 'Create Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};