/**
 * ReturnRefundModal - Comprehensive return and refund request interface
 * Features: Return reason selection, evidence upload, automatic refund processing
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  AlertCircle,
  CheckCircle,
  Package,
  RefreshCw,
  DollarSign,
  FileText,
  Camera,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { returnRefundService } from '@/services/returnRefundService';

export interface ReturnRefundRequest {
  orderId: string;
  productId: string;
  reason: string;
  reasonCategory: 'damaged' | 'wrong_item' | 'not_as_described' | 'defective' | 'changed_mind' | 'other';
  description: string;
  images: string[];
  requestedAction: 'return_refund' | 'refund_only' | 'replacement';
  returnShippingMethod?: 'buyer_pays' | 'seller_pays' | 'prepaid_label';
}

interface ReturnRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    amount: number;
    currency: string;
    orderDate: string;
    canReturn: boolean;
    canRefund: boolean;
    returnDeadline?: string;
    status?: string;
    sellerWalletAddress?: string;
  };
  onSubmit: (request: ReturnRefundRequest) => Promise<void>;
}

const RETURN_REASONS = [
  {
    value: 'damaged',
    label: 'Item arrived damaged',
    description: 'Product was damaged during shipping or arrived in poor condition',
    requiresEvidence: true
  },
  {
    value: 'wrong_item',
    label: 'Wrong item received',
    description: 'Received a different product than what was ordered',
    requiresEvidence: true
  },
  {
    value: 'not_as_described',
    label: 'Not as described',
    description: 'Product does not match the listing description or images',
    requiresEvidence: true
  },
  {
    value: 'defective',
    label: 'Defective/Not working',
    description: 'Product is defective or does not function as expected',
    requiresEvidence: true
  },
  {
    value: 'changed_mind',
    label: 'Changed my mind',
    description: 'No longer want or need the product',
    requiresEvidence: false
  },
  {
    value: 'other',
    label: 'Other reason',
    description: 'Different reason not listed above',
    requiresEvidence: false
  }
];

const ReturnRefundModal: React.FC<ReturnRefundModalProps> = ({
  isOpen,
  onClose,
  order,
  onSubmit
}) => {
  const { address } = useAccount();
  const { addToast } = useToast();

  const [step, setStep] = useState<'select_reason' | 'provide_details' | 'confirm' | 'processing' | 'success'>(
    'select_reason'
  );
  const [reasonCategory, setReasonCategory] = useState<ReturnRefundRequest['reasonCategory'] | ''>('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [requestedAction, setRequestedAction] = useState<ReturnRefundRequest['requestedAction']>('return_refund');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnEligibility, setReturnEligibility] = useState<{eligible: boolean; reason?: string; deadline?: string} | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<{riskScore: number; riskLevel: string; riskFactors: string[]} | null>(null);

  // Check return eligibility when modal opens
  useEffect(() => {
    if (isOpen && order.id) {
      checkReturnEligibility();
    }
  }, [isOpen, order.id]);

  const checkReturnEligibility = async () => {
    try {
      const eligibility = await returnRefundService.checkReturnEligibility(order.id, order.productId);
      setReturnEligibility(eligibility);
    } catch (error) {
      console.error('Error checking return eligibility:', error);
      addToast('Failed to check return eligibility. Please try again.', 'error');
    }
  };

  // Calculate risk assessment when details are provided
  useEffect(() => {
    if (step === 'provide_details' && reasonCategory && description) {
      calculateRiskAssessment();
    }
  }, [step, reasonCategory, description]);

  const calculateRiskAssessment = async () => {
    try {
      // Create a temporary return request object for risk assessment
      const tempRequest: ReturnRefundRequest = {
        orderId: order.id,
        productId: order.productId,
        reason: RETURN_REASONS.find(r => r.value === reasonCategory)?.label || '',
        reasonCategory: reasonCategory as ReturnRefundRequest['reasonCategory'],
        description,
        images,
        requestedAction
      };

      // In a real implementation, we would pass the actual order object
      const mockOrder = {
        id: order.id,
        productId: order.productId,
        amount: order.amount,
        currency: order.currency,
        orderDate: order.orderDate,
        status: order.status
      };

      const risk = await returnRefundService.calculateReturnRisk(tempRequest, mockOrder);
      setRiskAssessment(risk);
    } catch (error) {
      console.error('Error calculating risk assessment:', error);
    }
  };

  const selectedReason = RETURN_REASONS.find(r => r.value === reasonCategory);
  const requiresEvidence = selectedReason?.requiresEvidence || false;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // In a real implementation, you would upload to IPFS or a file storage service
    // For now, we'll create object URLs for preview
    const newImages: string[] = [];
    for (let i = 0; i < Math.min(files.length, 5 - images.length); i++) {
      const url = URL.createObjectURL(files[i]);
      newImages.push(url);
    }

    setImages([...images, ...newImages]);
    addToast(`${newImages.length} image(s) uploaded`, 'success');
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (step === 'select_reason' && reasonCategory) {
      // Check if user can proceed based on eligibility
      if (returnEligibility && !returnEligibility.eligible) {
        addToast(returnEligibility.reason || 'Return not eligible', 'error');
        return;
      }
      setStep('provide_details');
    } else if (step === 'provide_details') {
      if (!description.trim()) {
        addToast('Please provide a description', 'error');
        return;
      }
      if (requiresEvidence && images.length === 0) {
        addToast('Please upload at least one photo as evidence', 'error');
        return;
      }
      setStep('confirm');
    }
  };

  const handleSubmit = async () => {
    if (!reasonCategory) return;

    setIsSubmitting(true);
    setStep('processing');

    try {
      const request: ReturnRefundRequest = {
        orderId: order.id,
        productId: order.productId,
        reason: selectedReason?.label || '',
        reasonCategory: reasonCategory as ReturnRefundRequest['reasonCategory'],
        description,
        images,
        requestedAction,
        returnShippingMethod: requestedAction !== 'refund_only' ? 'seller_pays' : undefined
      };

      await onSubmit(request);

      setStep('success');
      addToast('Return request submitted successfully', 'success');

      setTimeout(() => {
        onClose();
        resetForm();
      }, 3000);
    } catch (error) {
      console.error('Error submitting return request:', error);
      addToast('Failed to submit return request', 'error');
      setStep('confirm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('select_reason');
    setReasonCategory('');
    setDescription('');
    setImages([]);
    setRequestedAction('return_refund');
    setReturnEligibility(null);
    setRiskAssessment(null);
  };

  const handleClose = () => {
    if (step !== 'processing') {
      onClose();
      setTimeout(resetForm, 300);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <GlassPanel variant="primary" className="relative">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <Package className="w-6 h-6 text-blue-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Request Return & Refund</h2>
                  <p className="text-sm text-white/60">Order #{order.id.slice(0, 8)}</p>
                </div>
              </div>
              {step !== 'processing' && (
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              )}
            </div>

            {/* Product Info */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center space-x-4">
                <img
                  src={order.productImage}
                  alt={order.productTitle}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-white">{order.productTitle}</h3>
                  <p className="text-sm text-white/60">
                    Purchased on {new Date(order.orderDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold text-white mt-1">
                    {order.amount} {order.currency}
                  </p>
                </div>
              </div>

              {order.returnDeadline && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center space-x-2 text-yellow-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      Return deadline: {new Date(order.returnDeadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
              
              {order.status && (
                <div className="mt-3 flex items-center gap-2 text-white/70 text-sm">
                  <Package className="w-4 h-4" />
                  <span>Order Status: {order.status}</span>
                </div>
              )}
              
              {returnEligibility && !returnEligibility.eligible && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">
                      {returnEligibility.reason || 'Return not eligible'}
                    </span>
                  </div>
                </div>
              )}
              
              {riskAssessment && riskAssessment.riskScore > 50 && (
                <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center space-x-2 text-orange-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">
                      Risk assessment: {riskAssessment.riskLevel} risk ({riskAssessment.riskScore}/100)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Step 1: Select Reason */}
              {step === 'select_reason' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Why are you returning this item?</h3>
                    <div className="space-y-2">
                      {RETURN_REASONS.map((reason) => (
                        <label
                          key={reason.value}
                          className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            reasonCategory === reason.value
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-white/10 hover:border-white/20 bg-white/5'
                          } ${returnEligibility && !returnEligibility.eligible ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="radio"
                            name="reason"
                            value={reason.value}
                            checked={reasonCategory === reason.value}
                            onChange={(e) => setReasonCategory(e.target.value as ReturnRefundRequest['reasonCategory'])}
                            className="sr-only"
                            disabled={returnEligibility && !returnEligibility.eligible}
                          />
                          <div className="flex items-start space-x-3">
                            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              reasonCategory === reason.value
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-white/30'
                            }`}>
                              {reasonCategory === reason.value && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-white">{reason.label}</div>
                              <div className="text-sm text-white/60 mt-1">{reason.description}</div>
                              {reason.requiresEvidence && (
                                <div className="flex items-center space-x-1 text-xs text-yellow-400 mt-2">
                                  <Camera className="w-3 h-3" />
                                  <span>Photo evidence required</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Provide Details */}
              {step === 'provide_details' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Provide additional details</h3>

                    {/* Action Type */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        What would you like?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            requestedAction === 'return_refund'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-white/10 hover:border-white/20 bg-white/5'
                          }`}
                        >
                          <input
                            type="radio"
                            name="action"
                            value="return_refund"
                            checked={requestedAction === 'return_refund'}
                            onChange={(e) => setRequestedAction(e.target.value as ReturnRefundRequest['requestedAction'])}
                            className="sr-only"
                          />
                          <div className="text-center">
                            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-white/80" />
                            <div className="text-sm font-medium text-white">Return & Refund</div>
                          </div>
                        </label>

                        <label
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            requestedAction === 'refund_only'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-white/10 hover:border-white/20 bg-white/5'
                          }`}
                        >
                          <input
                            type="radio"
                            name="action"
                            value="refund_only"
                            checked={requestedAction === 'refund_only'}
                            onChange={(e) => setRequestedAction(e.target.value as ReturnRefundRequest['requestedAction'])}
                            className="sr-only"
                          />
                          <div className="text-center">
                            <DollarSign className="w-6 h-6 mx-auto mb-2 text-white/80" />
                            <div className="text-sm font-medium text-white">Refund Only</div>
                          </div>
                        </label>

                        <label
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            requestedAction === 'replacement'
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-white/10 hover:border-white/20 bg-white/5'
                          }`}
                        >
                          <input
                            type="radio"
                            name="action"
                            value="replacement"
                            checked={requestedAction === 'replacement'}
                            onChange={(e) => setRequestedAction(e.target.value as ReturnRefundRequest['requestedAction'])}
                            className="sr-only"
                          />
                          <div className="text-center">
                            <Package className="w-6 h-6 mx-auto mb-2 text-white/80" />
                            <div className="text-sm font-medium text-white">Replacement</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Description <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        placeholder="Please explain the issue in detail..."
                      />
                      <p className="mt-2 text-xs text-white/40">
                        Minimum 20 characters ({description.length}/20)
                      </p>
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Upload photos {requiresEvidence && <span className="text-red-400">*</span>}
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
                        {images.map((image, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={image}
                              alt={`Evidence ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              onClick={() => handleRemoveImage(index)}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                        {images.length < 5 && (
                          <label className="aspect-square border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              className="sr-only"
                            />
                            <Upload className="w-6 h-6 text-white/40 mb-1" />
                            <span className="text-xs text-white/40">Upload</span>
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-white/40">
                        Upload up to 5 photos. {requiresEvidence && 'Photos are required for this return reason.'}
                      </p>
                    </div>
                    
                    {/* Risk Assessment */}
                    {riskAssessment && (
                      <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Risk Assessment</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-full bg-gray-700 rounded-full h-2`}>
                            <div 
                              className={`h-2 rounded-full ${
                                riskAssessment.riskScore < 30 ? 'bg-green-500' : 
                                riskAssessment.riskScore < 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${riskAssessment.riskScore}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-white/70">{riskAssessment.riskScore}/100</span>
                        </div>
                        <p className="text-xs text-white/60">
                          {riskAssessment.riskScore < 30 ? 'Low risk - return likely to be approved' : 
                           riskAssessment.riskScore < 70 ? 'Medium risk - additional review may be needed' : 
                           'High risk - return may require manual review'}
                        </p>
                        {riskAssessment.riskFactors.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-white/60">Risk factors:</p>
                            <ul className="text-xs text-white/60 list-disc list-inside">
                              {riskAssessment.riskFactors.map((factor, i) => (
                                <li key={i}>{factor}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 'confirm' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Review your request</h3>

                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div className="text-sm text-white/60 mb-1">Return Reason</div>
                        <div className="text-white font-medium">{selectedReason?.label}</div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div className="text-sm text-white/60 mb-1">Requested Action</div>
                        <div className="text-white font-medium">
                          {requestedAction === 'return_refund' && 'Return item and receive refund'}
                          {requestedAction === 'refund_only' && 'Keep item and receive refund'}
                          {requestedAction === 'replacement' && 'Return item and receive replacement'}
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div className="text-sm text-white/60 mb-2">Description</div>
                        <div className="text-white text-sm">{description}</div>
                      </div>

                      {images.length > 0 && (
                        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                          <div className="text-sm text-white/60 mb-2">Attached Photos</div>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {images.map((image, index) => (
                              <img
                                key={index}
                                src={image}
                                alt={`Evidence ${index + 1}`}
                                className="w-full aspect-square object-cover rounded"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-300">
                            <p className="font-medium mb-1">What happens next?</p>
                            <ul className="space-y-1 text-blue-200/80">
                              <li>• Seller will review your request within 48 hours</li>
                              <li>• If approved, you'll receive return shipping instructions</li>
                              <li>• Refund will be processed after seller confirms receipt</li>
                              <li>• Funds typically arrive within 3-5 business days</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Processing */}
              {step === 'processing' && (
                <div className="py-12 text-center">
                  <RefreshCw className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-semibold text-white mb-2">Processing your request...</h3>
                  <p className="text-white/60">Please wait while we submit your return request.</p>
                </div>
              )}

              {/* Step 5: Success */}
              {step === 'success' && (
                <div className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Request submitted successfully!</h3>
                  <p className="text-white/60 mb-4">
                    Your return request has been sent to the seller.
                  </p>
                  <p className="text-sm text-white/40">
                    You'll receive an email notification when the seller responds.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {(step === 'select_reason' || step === 'provide_details' || step === 'confirm') && (
              <div className="p-6 border-t border-white/10 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={step === 'select_reason' ? handleClose : () => setStep(step === 'provide_details' ? 'select_reason' : 'provide_details')}
                  disabled={isSubmitting}
                >
                  {step === 'select_reason' ? 'Cancel' : 'Back'}
                </Button>

                <Button
                  variant="primary"
                  onClick={step === 'confirm' ? handleSubmit : handleNext}
                  disabled={
                    (step === 'select_reason' && (!reasonCategory || (returnEligibility && !returnEligibility.eligible))) ||
                    (step === 'provide_details' && (description.length < 20 || (requiresEvidence && images.length === 0))) ||
                    isSubmitting
                  }
                >
                  {step === 'confirm' ? 'Submit Request' : 'Continue'}
                </Button>
              </div>
            )}
          </GlassPanel>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReturnRefundModal;
