import React, { useState } from 'react';
import { useOnboarding } from './OnboardingProvider';

export const OnboardingMenu: React.FC = () => {
  const { tours, progress, startTour, resetProgress } = useOnboarding();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Tours', icon: '📚' },
    { id: 'basic', name: 'Basic', icon: '🎯' },
    { id: 'advanced', name: 'Advanced', icon: '🚀' },
    { id: 'feature-specific', name: 'Features', icon: '⚙️' }
  ];

  const filteredTours = selectedCategory === 'all' 
    ? tours 
    : tours.filter(tour => tour.category === selectedCategory);

  const getTourStatus = (tourId: string) => {
    if (progress.completedTours.includes(tourId)) {
      return 'completed';
    }
    if (progress.currentTour === tourId) {
      return 'in-progress';
    }
    return 'not-started';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in-progress':
        return '🔄';
      default:
        return '⭕';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const canStartTour = (tour: any) => {
    if (!tour.prerequisites) return true;
    return tour.prerequisites.every(prereq => 
      progress.completedTours.includes(prereq)
    );
  };

  const completionPercentage = Math.round(
    (progress.completedTours.length / tours.length) * 100
  );

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span>🎓</span>
        <span>Training</span>
        {progress.completedTours.length > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {completionPercentage}%
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Admin Training Center
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Progress Overview */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{progress.completedTours.length} of {tours.length} completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex space-x-1">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-md transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tours List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredTours.map(tour => {
              const status = getTourStatus(tour.id);
              const canStart = canStartTour(tour);
              
              return (
                <div
                  key={tour.id}
                  className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">{getStatusIcon(status)}</span>
                        <h4 className="font-medium text-gray-900">{tour.name}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                          {status.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {tour.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>⏱️ {tour.estimatedTime} min</span>
                        <span>📝 {tour.steps.length} steps</span>
                        {tour.prerequisites && (
                          <span>🔗 {tour.prerequisites.length} prerequisites</span>
                        )}
                      </div>

                      {tour.prerequisites && tour.prerequisites.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Prerequisites:</p>
                          <div className="flex flex-wrap gap-1">
                            {tour.prerequisites.map(prereq => {
                              const prereqTour = tours.find(t => t.id === prereq);
                              const isCompleted = progress.completedTours.includes(prereq);
                              return (
                                <span
                                  key={prereq}
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                    isCompleted
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {isCompleted ? '✅' : '❌'} {prereqTour?.name || prereq}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      {status === 'completed' ? (
                        <button
                          onClick={() => startTour(tour.id)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Retake
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (canStart) {
                              startTour(tour.id);
                              setIsOpen(false);
                            }
                          }}
                          disabled={!canStart}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            canStart
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {status === 'in-progress' ? 'Continue' : 'Start'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Need help? Check our <a href="/docs/admin" className="text-blue-600 hover:text-blue-800">documentation</a>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all training progress?')) {
                    resetProgress();
                  }
                }}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Reset Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};