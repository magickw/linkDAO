import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuccessConfirmationProps {
  isVisible: boolean;
  title: string;
  message: string;
  nextSteps?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
  autoHide?: boolean;
  autoHideDelay?: number;
  onClose?: () => void;
  className?: string;
}

export const SuccessConfirmation: React.FC<SuccessConfirmationProps> = ({
  isVisible,
  title,
  message,
  nextSteps = [],
  autoHide = false,
  autoHideDelay = 5000,
  onClose,
  className = ''
}) => {
  const [shouldShow, setShouldShow] = useState(isVisible);

  useEffect(() => {
    setShouldShow(isVisible);

    if (isVisible && autoHide) {
      const timer = setTimeout(() => {
        setShouldShow(false);
        onClose?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHide, autoHideDelay, onClose]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`bg-white rounded-lg shadow-lg border border-green-200 p-6 ${className}`}
        >
          <div className="flex items-start space-x-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
              className="flex-shrink-0"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </motion.div>

            <div className="flex-1 min-w-0">
              <motion.h3
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="text-lg font-semibold text-gray-900 mb-2"
              >
                {title}
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="text-gray-600 mb-4"
              >
                {message}
              </motion.p>

              {nextSteps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="space-y-2"
                >
                  <p className="text-sm font-medium text-gray-700 mb-3">What's next?</p>
                  <div className="flex flex-wrap gap-2">
                    {nextSteps.map((step, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + index * 0.1, duration: 0.2 }}
                        onClick={step.action}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          step.primary
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {step.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {onClose && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.2 }}
                onClick={() => {
                  setShouldShow(false);
                  onClose();
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Profile Update Success
export const ProfileUpdateSuccess: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onCreateListing: () => void;
}> = ({ isVisible, onClose, onViewProfile, onCreateListing }) => {
  return (
    <SuccessConfirmation
      isVisible={isVisible}
      title="Profile Updated Successfully!"
      message="Your seller profile has been updated and is now live on your store page."
      nextSteps={[
        {
          label: 'View My Store',
          action: onViewProfile,
          primary: true
        },
        {
          label: 'Create First Listing',
          action: onCreateListing
        }
      ]}
      onClose={onClose}
    />
  );
};

// Listing Created Success
export const ListingCreatedSuccess: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  onViewListing: () => void;
  onCreateAnother: () => void;
  onViewMarketplace: () => void;
}> = ({ isVisible, onClose, onViewListing, onCreateAnother, onViewMarketplace }) => {
  return (
    <SuccessConfirmation
      isVisible={isVisible}
      title="Listing Created Successfully!"
      message="Your product is now live in the marketplace and ready for buyers to discover."
      nextSteps={[
        {
          label: 'View Listing',
          action: onViewListing,
          primary: true
        },
        {
          label: 'Create Another',
          action: onCreateAnother
        },
        {
          label: 'Browse Marketplace',
          action: onViewMarketplace
        }
      ]}
      onClose={onClose}
    />
  );
};

// Order Placed Success
export const OrderPlacedSuccess: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  onViewOrder: () => void;
  onContinueShopping: () => void;
  orderNumber: string;
}> = ({ isVisible, onClose, onViewOrder, onContinueShopping, orderNumber }) => {
  return (
    <SuccessConfirmation
      isVisible={isVisible}
      title="Order Placed Successfully!"
      message={`Your order #${orderNumber} has been confirmed and the seller has been notified.`}
      nextSteps={[
        {
          label: 'Track Order',
          action: onViewOrder,
          primary: true
        },
        {
          label: 'Continue Shopping',
          action: onContinueShopping
        }
      ]}
      onClose={onClose}
    />
  );
};

// Payment Success
export const PaymentSuccess: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  onViewReceipt: () => void;
  paymentMethod: string;
  amount: string;
}> = ({ isVisible, onClose, onViewReceipt, paymentMethod, amount }) => {
  return (
    <SuccessConfirmation
      isVisible={isVisible}
      title="Payment Processed Successfully!"
      message={`Your ${paymentMethod} payment of ${amount} has been processed and confirmed.`}
      nextSteps={[
        {
          label: 'View Receipt',
          action: onViewReceipt,
          primary: true
        }
      ]}
      onClose={onClose}
    />
  );
};

// Image Upload Success
export const ImageUploadSuccess: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  onContinue: () => void;
  imageCount: number;
}> = ({ isVisible, onClose, onContinue, imageCount }) => {
  return (
    <SuccessConfirmation
      isVisible={isVisible}
      title="Images Uploaded Successfully!"
      message={`${imageCount} image${imageCount > 1 ? 's' : ''} uploaded and processed. Your images are now stored securely and ready to use.`}
      nextSteps={[
        {
          label: 'Continue',
          action: onContinue,
          primary: true
        }
      ]}
      autoHide={true}
      autoHideDelay={3000}
      onClose={onClose}
    />
  );
};

// ENS Verification Success
export const ENSVerificationSuccess: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  onContinue: () => void;
  ensHandle: string;
}> = ({ isVisible, onClose, onContinue, ensHandle }) => {
  return (
    <SuccessConfirmation
      isVisible={isVisible}
      title="ENS Handle Verified!"
      message={`Your ENS handle "${ensHandle}" has been successfully verified and linked to your profile.`}
      nextSteps={[
        {
          label: 'Continue Setup',
          action: onContinue,
          primary: true
        }
      ]}
      autoHide={true}
      autoHideDelay={4000}
      onClose={onClose}
    />
  );
};