import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { useSellerOnboarding, useSeller } from '../../../hooks/useSeller';
import { Button, GlassPanel, LoadingSkeleton } from '../../../design-system';

// Onboarding Step Components
import { WalletConnectStep } from './onboarding/WalletConnectStep';
import { ProfileSetupStep } from './onboarding/ProfileSetupStep';
import { VerificationStep } from './onboarding/VerificationStep';
import { PayoutSetupStep } from './onboarding/PayoutSetupStep';
import { FirstListingStep } from './onboarding/FirstListingStep';

interface SellerOnboardingProps {
  onComplete?: () => void;
}

export function SellerOnboarding({ onComplete }: SellerOnboardingProps) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { profile, createProfile } = useSeller();
  const {
    steps,
    currentStep,
    loading,
    error,
    updateStep,
    goToStep,
    nextStep,
    previousStep,
    isCompleted,
    progress,
  } = useSellerOnboarding();

  const [stepData, setStepData] = useState<Record<string, any>>({});

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h1>
            <p className="text-gray-300">
              Connect your Web3 wallet to start your seller journey on our decentralized marketplace.
            </p>
          </div>
          <WalletConnectStep
            onComplete={() => { }}
            onConnect={() => window.location.reload()}
          />
        </GlassPanel>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-2xl w-full">
          <LoadingSkeleton className="h-8 w-64 mb-4" />
          <LoadingSkeleton className="h-4 w-full mb-8" />
          <LoadingSkeleton className="h-64 w-full" />
        </GlassPanel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-lg font-semibold">Oops! Something went wrong</p>
            <p className="text-sm text-gray-300 mt-2">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="primary">
            Try Again
          </Button>
        </GlassPanel>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to the Marketplace! 🎉</h1>
            <p className="text-gray-300 mb-6">
              Your seller account is now set up and ready to go. Start listing your products and building your reputation!
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => router.push('/marketplace/seller/dashboard')}
              variant="primary"
              className="w-full"
            >
              Go to Seller Dashboard
            </Button>
            <Button
              onClick={() => router.push('/marketplace/seller/profile')}
              variant="outline"
              className="w-full"
            >
              View Your Profile
            </Button>
            <Button
              onClick={() => router.push('/marketplace/seller/listings/create')}
              variant="secondary"
              className="w-full"
            >
              Create Your First Listing
            </Button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  if (!currentStepData) return null;

  const handleStepComplete = async (data: any) => {
    try {
      // Special handling for profile setup step
      if (currentStepData.id === 'profile-setup') {
        // Create the actual seller profile
        await createProfile(data);
      }
      
      await updateStep(currentStepData.id, data);
      setStepData(prev => ({ ...prev, [currentStepData.id]: data }));

      // Auto-advance to next step
      if (currentStep < steps.length - 1) {
        nextStep();
      } else if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Failed to complete step:', err);
    }
  };

  const renderStepComponent = () => {
    const props = {
      onComplete: handleStepComplete,
      data: stepData[currentStepData.id] || currentStepData.data,
      profile,
    };

    switch (currentStepData.component) {
      case 'WalletConnect':
        return <WalletConnectStep {...props} />;
      case 'ProfileSetup':
        return <ProfileSetupStep {...props} />;
      case 'Verification':
        return <VerificationStep {...props} />;
      case 'PayoutSetup':
        return <PayoutSetupStep {...props} />;
      case 'FirstListing':
        return <FirstListingStep {...props} />;
      default:
        return <div>Unknown step component: {currentStepData.component}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Seller Onboarding</h1>
          <p className="text-gray-300">
            Complete these steps to unlock all seller features and start selling on our marketplace
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-300">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${index === currentStep
                  ? 'bg-purple-600 text-white'
                  : step.completed
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                disabled={index > currentStep && !step.completed}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step.completed ? 'bg-green-500' : index === currentStep ? 'bg-purple-500' : 'bg-gray-500'
                  }`}>
                  {step.completed ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="hidden sm:block text-sm">{step.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <GlassPanel className="mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">{currentStepData.title}</h2>
            <p className="text-gray-300">{currentStepData.description}</p>
            {currentStepData.required && (
              <span className="inline-block mt-2 px-2 py-1 bg-red-600 text-white text-xs rounded">
                Required
              </span>
            )}
          </div>

          {renderStepComponent()}
        </GlassPanel>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            onClick={previousStep}
            variant="secondary"
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          <div className="flex space-x-3">
            {!currentStepData.required && (
              <Button
                onClick={nextStep}
                variant="outline"
                disabled={currentStep >= steps.length - 1}
              >
                Skip
              </Button>
            )}

            {currentStep < steps.length - 1 && (
              <Button
                onClick={nextStep}
                variant="primary"
                disabled={currentStepData.required && !currentStepData.completed}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}