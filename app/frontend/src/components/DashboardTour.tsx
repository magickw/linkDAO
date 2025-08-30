import React, { useState, useEffect } from 'react';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    id: 'user-profile',
    title: 'Your Profile Hub',
    content: 'Your profile information, reputation score, and wallet balance are displayed here. Click to access profile settings.',
    target: '[data-tour="user-profile"]',
    position: 'bottom'
  },
  {
    id: 'navigation',
    title: 'Navigation Sidebar',
    content: 'Navigate between your feed, communities, governance, and marketplace. Your joined communities are listed below.',
    target: '[data-tour="navigation"]',
    position: 'right'
  },
  {
    id: 'create-post',
    title: 'Create Posts',
    content: 'Share your thoughts, proposals, or Web3 content with the community. Support for text, images, and blockchain embeds.',
    target: '[data-tour="create-post"]',
    position: 'bottom'
  },
  {
    id: 'feed-view',
    title: 'Your Social Feed',
    content: 'See posts from people you follow and communities you\'ve joined. Interact with reactions, comments, and tips.',
    target: '[data-tour="feed-view"]',
    position: 'top'
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    content: 'Access wallet functions, governance votes, and marketplace activities without leaving the dashboard.',
    target: '[data-tour="quick-actions"]',
    position: 'top'
  }
];

export default function DashboardTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour
    const tourSeen = localStorage.getItem('dashboard-tour-seen');
    if (!tourSeen) {
      // Show tour after a short delay to let the page load
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setHasSeenTour(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
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
    setIsActive(false);
    setHasSeenTour(true);
    localStorage.setItem('dashboard-tour-seen', 'true');
  };

  const handleSkip = () => {
    handleComplete();
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  if (!isActive && hasSeenTour) {
    // Show a small tour button for users who want to replay
    return (
      <button
        onClick={restartTour}
        className="fixed bottom-4 right-4 bg-primary-600 text-white p-3 rounded-full shadow-lg hover:bg-primary-700 transition-colors z-40"
        title="Take dashboard tour"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  if (!isActive) return null;

  const step = tourSteps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />
      
      {/* Tour Tooltip */}
      <div className="fixed z-50 max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{step.title}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm opacity-75">
                  {currentStep + 1} of {tourSteps.length}
                </span>
                <button
                  onClick={handleSkip}
                  className="text-white hover:text-gray-200 transition-colors"
                  aria-label="Skip tour"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {step.content}
            </p>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Skip Tour
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow pointer */}
        <div className={`absolute w-3 h-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transform rotate-45 ${
          step.position === 'top' ? '-bottom-1.5 left-1/2 -translate-x-1/2' :
          step.position === 'bottom' ? '-top-1.5 left-1/2 -translate-x-1/2' :
          step.position === 'left' ? '-right-1.5 top-1/2 -translate-y-1/2' :
          '-left-1.5 top-1/2 -translate-y-1/2'
        }`} />
      </div>
    </>
  );
}