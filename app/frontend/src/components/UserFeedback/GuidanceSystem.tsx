import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GuidanceStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface GuidanceSystemProps {
  steps: GuidanceStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

export const GuidanceSystem: React.FC<GuidanceSystemProps> = ({
  steps,
  isActive,
  onComplete,
  onSkip,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !steps[currentStep]?.target) return;

    const element = document.querySelector(steps[currentStep].target!) as HTMLElement;
    if (element) {
      setHighlightedElement(element);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => setHighlightedElement(null);
  }, [currentStep, isActive, steps]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isActive || steps.length === 0) return null;

  const currentStepData = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Highlight */}
      {highlightedElement && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: highlightedElement.offsetTop - 4,
            left: highlightedElement.offsetLeft - 4,
            width: highlightedElement.offsetWidth + 8,
            height: highlightedElement.offsetHeight + 8,
            border: '2px solid #3B82F6',
            borderRadius: '8px',
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3)'
          }}
        />
      )}

      {/* Guidance Card */}
      <AnimatePresence>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`fixed z-50 bg-white rounded-lg shadow-xl border max-w-sm p-6 ${className}`}
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {currentStep + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {currentStepData.title}
              </h3>
            </div>
            <button
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            {currentStepData.content}
          </p>

          {currentStepData.action && (
            <div className="mb-4">
              <button
                onClick={currentStepData.action.onClick}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {currentStepData.action.label}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <div className="flex space-x-2">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

// Seller Profile Setup Guidance
export const SellerProfileGuidance: React.FC<{
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}> = ({ isActive, onComplete, onSkip }) => {
  const steps: GuidanceStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Seller Setup',
      content: 'Let\'s set up your seller profile to start selling on the marketplace. This will only take a few minutes.',
    },
    {
      id: 'basic-info',
      title: 'Basic Information',
      content: 'Fill in your store name and description. This will be displayed on your public store page.',
      target: '[data-guide="basic-info"]'
    },
    {
      id: 'ens-handle',
      title: 'ENS Handle (Optional)',
      content: 'Add your ENS handle if you have one. This is completely optional but adds credibility to your profile.',
      target: '[data-guide="ens-handle"]'
    },
    {
      id: 'images',
      title: 'Profile Images',
      content: 'Upload a profile picture and cover image to make your store look professional.',
      target: '[data-guide="images"]'
    },
    {
      id: 'social-links',
      title: 'Social Media Links',
      content: 'Add your social media handles to help buyers connect with you.',
      target: '[data-guide="social-links"]'
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      content: 'Your seller profile is ready. You can now create your first listing and start selling.',
    }
  ];

  return (
    <GuidanceSystem
      steps={steps}
      isActive={isActive}
      onComplete={onComplete}
      onSkip={onSkip}
    />
  );
};

// Payment Method Selection Guidance
export const PaymentMethodGuidance: React.FC<{
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}> = ({ isActive, onComplete, onSkip }) => {
  const steps: GuidanceStep[] = [
    {
      id: 'payment-intro',
      title: 'Choose Payment Method',
      content: 'We offer three payment options to suit your needs. Let\'s explore each one.',
    },
    {
      id: 'crypto-payment',
      title: 'Crypto Payment',
      content: 'Direct wallet-to-wallet payment. Fast and decentralized, but requires sufficient crypto balance.',
      target: '[data-guide="crypto-payment"]'
    },
    {
      id: 'fiat-payment',
      title: 'Fiat Payment',
      content: 'Pay with credit card, bank transfer, or digital wallets. No crypto needed - we handle the conversion.',
      target: '[data-guide="fiat-payment"]'
    },
    {
      id: 'escrow-payment',
      title: 'Escrow Protection',
      content: 'Crypto payment with buyer protection. Funds are held in escrow until delivery is confirmed.',
      target: '[data-guide="escrow-payment"]'
    },
    {
      id: 'recommendation',
      title: 'Our Recommendation',
      content: 'New to crypto? Use fiat payment. Want protection? Choose escrow. For speed, use direct crypto.',
    }
  ];

  return (
    <GuidanceSystem
      steps={steps}
      isActive={isActive}
      onComplete={onComplete}
      onSkip={onSkip}
    />
  );
};

// Listing Creation Guidance
export const ListingCreationGuidance: React.FC<{
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}> = ({ isActive, onComplete, onSkip }) => {
  const steps: GuidanceStep[] = [
    {
      id: 'listing-intro',
      title: 'Create Your First Listing',
      content: 'Let\'s create your first product listing. Follow these steps to make it attractive to buyers.',
    },
    {
      id: 'product-details',
      title: 'Product Information',
      content: 'Add a compelling title and detailed description. Be specific about what you\'re selling.',
      target: '[data-guide="product-details"]'
    },
    {
      id: 'pricing',
      title: 'Set Your Price',
      content: 'Choose your price and currency. You can accept both crypto and fiat payments.',
      target: '[data-guide="pricing"]'
    },
    {
      id: 'images-upload',
      title: 'Upload Images',
      content: 'Add high-quality images of your product. Good photos significantly increase sales.',
      target: '[data-guide="images-upload"]'
    },
    {
      id: 'category',
      title: 'Select Category',
      content: 'Choose the right category to help buyers find your product easily.',
      target: '[data-guide="category"]'
    },
    {
      id: 'publish',
      title: 'Publish Your Listing',
      content: 'Review everything and publish your listing. It will be visible in the marketplace immediately.',
      target: '[data-guide="publish"]'
    }
  ];

  return (
    <GuidanceSystem
      steps={steps}
      isActive={isActive}
      onComplete={onComplete}
      onSkip={onSkip}
    />
  );
};

// Order Tracking Guidance
export const OrderTrackingGuidance: React.FC<{
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}> = ({ isActive, onComplete, onSkip }) => {
  const steps: GuidanceStep[] = [
    {
      id: 'orders-intro',
      title: 'Track Your Orders',
      content: 'Here you can view all your orders and track their progress from purchase to delivery.',
    },
    {
      id: 'order-status',
      title: 'Order Status',
      content: 'Each order shows its current status: pending, confirmed, shipped, or delivered.',
      target: '[data-guide="order-status"]'
    },
    {
      id: 'order-details',
      title: 'Order Details',
      content: 'Click on any order to see detailed information including payment method and tracking.',
      target: '[data-guide="order-details"]'
    },
    {
      id: 'contact-seller',
      title: 'Contact Seller',
      content: 'Need help with an order? You can contact the seller directly from the order page.',
      target: '[data-guide="contact-seller"]'
    }
  ];

  return (
    <GuidanceSystem
      steps={steps}
      isActive={isActive}
      onComplete={onComplete}
      onSkip={onSkip}
    />
  );
};