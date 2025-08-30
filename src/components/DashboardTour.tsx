import React, { useState, useEffect } from 'react';
import { useNavigation } from '@/context/NavigationContext';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your New Dashboard!',
    description: 'Your dashboard now combines social feeds, communities, and web3 features in one place.',
    position: 'center'
  },
  {
    id: 'navigation',
    title: 'Navigation Sidebar',
    description: 'Use the sidebar to switch between your personal feed, communities, governance, and marketplace.',
    target: 'navigation-sidebar',
    position: 'right'
  },
  {
    id: 'feed',
    title: 'Integrated Social Feed',
    description: 'Your social feed now appears directly in the dashboard. Create posts, interact with content, and stay connected.',
    target: 'main-content',
    position: 'left'
  },
  {
    id: 'communities',
    title: 'Community Features',
    description: 'Join communities for topic-based discussions with Reddit-style threading and voting.',
    target: 'communities-section',
    position: 'right'
  },
  {
    id: 'sidebar',
    title: 'Quick Actions & Info',
    description: 'The right sidebar shows trending content, wallet info, and quick actions.',
    target: 'right-sidebar',
    position: 'left'
  }
];

interface DashboardTourProps {
  onComplete?: () => void;
}

export default function DashboardTour({ onComplete }: DashboardTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const { navigationState } = useNavigation();

  // Check if user should see the tour
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('dashboard-tour-completed');
    const hasSeenMigration = localStorage.getItem('dashboard-migration-seen');
    
    // Show tour if user has seen migration notice but not the tour
    if (hasSeenMigration && !hasSeenTour) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000); // Show after migration notice
      return () => clearTimeout(timer);
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

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('dashboard-tour-completed', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) {
    return null;
  }

  const step = tourSteps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />
      
      {/* Tour Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Step {currentStep + 1} of {tourSteps.length}
                </span>
              </div>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {step.description}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Skip Tour
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}