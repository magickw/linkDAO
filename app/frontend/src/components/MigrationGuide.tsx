import React, { useState } from 'react';
import { useRouter } from 'next/router';

interface MigrationGuideProps {
  onClose: () => void;
  fromPage: 'social' | 'web3-social' | 'dashboard';
}

export default function MigrationGuide({ onClose, fromPage }: MigrationGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const migrationSteps = [
    {
      title: 'Welcome to the New Dashboard!',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            We've redesigned your social experience to be more integrated and powerful. 
            Your {fromPage === 'social' ? 'social feed' : fromPage === 'web3-social' ? 'Web3 social features' : 'dashboard'} 
            is now part of a unified platform.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">What's New:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Unified social feed with community posts</li>
              <li>• Enhanced Web3 features and integrations</li>
              <li>• Better mobile experience</li>
              <li>• Seamless navigation between feeds and communities</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: 'Your Data is Safe',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            All your existing data has been preserved and migrated to the new dashboard:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">✓ Preserved</h4>
              <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
                <li>• All your posts and comments</li>
                <li>• Following relationships</li>
                <li>• Community memberships</li>
                <li>• Wallet connections</li>
                <li>• User preferences</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">✨ Enhanced</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Better post creation tools</li>
                <li>• Improved community features</li>
                <li>• Enhanced Web3 integrations</li>
                <li>• Mobile-optimized interface</li>
                <li>• Advanced search and discovery</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Navigation Guide',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Here's how to navigate your new dashboard:
          </p>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="bg-primary-100 dark:bg-primary-900 p-2 rounded-lg">
                <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Left Sidebar</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Navigate between Feed, Communities, Governance, and Marketplace</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="bg-primary-100 dark:bg-primary-900 p-2 rounded-lg">
                <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Create Posts</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Use the prominent "Create Post" button or the floating action button on mobile</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="bg-primary-100 dark:bg-primary-900 p-2 rounded-lg">
                <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Communities</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Join communities for topic-based discussions with Reddit-style threading</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Ready to Explore!',
      content: (
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-gray-700 dark:text-gray-300">
            You're all set! Your new dashboard is ready with all your data preserved and new features to explore.
          </p>
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 <strong>Tip:</strong> You can always access this guide again from the help menu in your dashboard.
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < migrationSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('migration-guide-completed', 'true');
    router.push('/dashboard?view=feed');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('migration-guide-skipped', 'true');
    router.push('/dashboard?view=feed');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{migrationSteps[currentStep].title}</h2>
              <p className="text-primary-100 mt-1">
                Step {currentStep + 1} of {migrationSteps.length}
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Skip guide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / migrationSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {migrationSteps[currentStep].content}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Skip Guide
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-colors font-medium"
            >
              {currentStep === migrationSteps.length - 1 ? 'Go to Dashboard' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}