import React, { useState } from 'react';
import { Flag, X, AlertCircle } from 'lucide-react';

interface ReportContentButtonProps {
  contentId: string;
  contentType: 'post' | 'comment' | 'listing' | 'dm' | 'username';
  onReport?: (reportData: ReportData) => Promise<void>;
  className?: string;
}

interface ReportData {
  contentId: string;
  contentType: string;
  reason: string;
  details: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or Misleading', description: 'Repetitive, commercial, or deceptive content' },
  { value: 'harassment', label: 'Harassment or Bullying', description: 'Targeted attacks or intimidation' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Discriminatory or hateful content' },
  { value: 'violence', label: 'Violence or Threats', description: 'Violent content or threatening behavior' },
  { value: 'nsfw', label: 'Adult Content', description: 'Inappropriate sexual or graphic content' },
  { value: 'scam', label: 'Scam or Fraud', description: 'Fraudulent schemes or phishing attempts' },
  { value: 'fake_content', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'copyright', label: 'Copyright Violation', description: 'Unauthorized use of copyrighted material' },
  { value: 'other', label: 'Other', description: 'Other community guideline violations' }
];

/**
 * ReportContentButton Component
 *
 * Button to report content that violates community guidelines
 * Opens a modal with report reasons and allows users to provide details
 */
export const ReportContentButton: React.FC<ReportContentButtonProps> = ({
  contentId,
  contentType,
  onReport,
  className = ''
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason) {
      setSubmitError('Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const reportData: ReportData = {
        contentId,
        contentType,
        reason: selectedReason,
        details
      };

      if (onReport) {
        await onReport(reportData);
      } else {
        // Default API call if no custom handler
        const response = await fetch('/api/moderation/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportData)
        });

        if (!response.ok) {
          throw new Error('Failed to submit report');
        }
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSelectedReason('');
        setDetails('');
        setSubmitSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error submitting report:', error);
      setSubmitError('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setShowModal(false);
      setSelectedReason('');
      setDetails('');
      setSubmitError('');
      setSubmitSuccess(false);
    }
  };

  return (
    <>
      {/* Report Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        className={`flex items-center space-x-1 px-2 py-1 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ${className}`}
        title="Report content"
      >
        <Flag className="w-4 h-4" />
        <span className="text-xs">Report</span>
      </button>

      {/* Report Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50" onClick={handleClose}>
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Flag className="w-5 h-5 text-red-600" />
                <span>Report Content</span>
              </h3>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    Report Submitted
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Thank you for helping keep our community safe.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Please select a reason for reporting this {contentType}. Our moderation team will review your report.
                  </p>

                  {/* Reason Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reason for Report *
                    </label>
                    {REPORT_REASONS.map((reason) => (
                      <label
                        key={reason.value}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedReason === reason.value
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          value={reason.value}
                          checked={selectedReason === reason.value}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {reason.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {reason.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Additional Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Details (Optional)
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Provide any additional context that might help our review..."
                    />
                  </div>

                  {/* Error Message */}
                  {submitError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!submitSuccess && (
              <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedReason}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ReportContentButton;
