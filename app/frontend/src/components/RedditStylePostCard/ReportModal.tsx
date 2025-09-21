import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, AlertTriangle } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details?: string) => Promise<void>;
  isLoading: boolean;
  postId: string;
  postAuthor: string;
}

const REPORT_CATEGORIES = [
  {
    id: 'spam',
    label: 'Spam',
    description: 'Unwanted commercial content or repetitive posts',
    icon: '🚫'
  },
  {
    id: 'harassment',
    label: 'Harassment or Bullying',
    description: 'Targeted harassment, threats, or bullying behavior',
    icon: '⚠️'
  },
  {
    id: 'hate',
    label: 'Hate Speech',
    description: 'Content that promotes hatred based on identity or vulnerability',
    icon: '🛑'
  },
  {
    id: 'misinformation',
    label: 'Misinformation',
    description: 'False or misleading information',
    icon: '❌'
  },
  {
    id: 'violence',
    label: 'Violence or Threats',
    description: 'Content that threatens, encourages, or depicts violence',
    icon: '🔴'
  },
  {
    id: 'nsfw',
    label: 'NSFW Content',
    description: 'Adult content not properly marked or inappropriate for community',
    icon: '🔞'
  },
  {
    id: 'copyright',
    label: 'Copyright Violation',
    description: 'Unauthorized use of copyrighted material',
    icon: '©️'
  },
  {
    id: 'scam',
    label: 'Scam or Fraud',
    description: 'Fraudulent schemes, phishing, or financial scams',
    icon: '💰'
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Something else that violates community guidelines',
    icon: '📝'
  }
];

export default function ReportModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  postId,
  postAuthor
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select');

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedReason('');
      setDetails('');
      setStep('select');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReason) return;
    
    try {
      await onSubmit(selectedReason, details.trim() || undefined);
      handleClose();
    } catch (error) {
      console.error('Report submission failed:', error);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDetails('');
    setStep('select');
    onClose();
  };

  const selectedCategory = REPORT_CATEGORIES.find(cat => cat.id === selectedReason);

  const handleNext = () => {
    if (step === 'select' && selectedReason) {
      setStep('details');
    } else if (step === 'details') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('select');
    } else if (step === 'confirm') {
      setStep('details');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Flag className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Report Post</h2>
          </div>
          <button 
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Step 1: Select Reason */}
          {step === 'select' && (
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Why are you reporting this post by <span className="font-medium">{postAuthor.slice(0, 8)}...{postAuthor.slice(-6)}</span>?
                </p>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {REPORT_CATEGORIES.map((category) => (
                  <label
                    key={category.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedReason === category.id
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={category.id}
                      checked={selectedReason === category.id}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="mt-1 text-red-600 focus:ring-red-500"
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{category.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {category.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {category.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Additional Details */}
          {step === 'details' && selectedCategory && (
            <div>
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{selectedCategory.icon}</span>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {selectedCategory.label}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please provide additional details about why this post violates our guidelines.
                </p>
              </div>

              <div className="mb-4">
                <label htmlFor="details" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide specific examples or additional context..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white resize-none"
                  disabled={isLoading}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {details.length}/500 characters
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && selectedCategory && (
            <div>
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Review Your Report
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      You are reporting this post for: <strong>{selectedCategory.label}</strong>
                    </p>
                    {details && (
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                        <strong>Details:</strong> {details}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our moderation team will review this report. False reports may result in action against your account.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              {step !== 'select' && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>

              {step === 'confirm' ? (
                <button
                  type="submit"
                  disabled={isLoading || !selectedReason}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {isLoading ? 'Submitting...' : 'Submit Report'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!selectedReason}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {step === 'select' ? 'Next' : 'Review'}
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}