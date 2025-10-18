import React, { useState } from 'react';
import { useOnboarding } from './OnboardingProvider';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'completion' | 'efficiency' | 'expertise' | 'milestone';
  requirements: {
    type: 'tours_completed' | 'steps_completed' | 'time_spent' | 'consecutive_days';
    value: number;
  };
  unlockedAt?: Date;
}

const achievements: Achievement[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Complete your first onboarding tour',
    icon: '👶',
    category: 'milestone',
    requirements: { type: 'tours_completed', value: 1 }
  },
  {
    id: 'quick-learner',
    title: 'Quick Learner',
    description: 'Complete 3 tours in one session',
    icon: '🚀',
    category: 'efficiency',
    requirements: { type: 'tours_completed', value: 3 }
  },
  {
    id: 'admin-expert',
    title: 'Admin Expert',
    description: 'Complete all available tours',
    icon: '🎓',
    category: 'expertise',
    requirements: { type: 'tours_completed', value: 10 }
  },
  {
    id: 'step-master',
    title: 'Step Master',
    description: 'Complete 50 individual steps',
    icon: '📈',
    category: 'completion',
    requirements: { type: 'steps_completed', value: 50 }
  },
  {
    id: 'dedicated-learner',
    title: 'Dedicated Learner',
    description: 'Use training for 7 consecutive days',
    icon: '🔥',
    category: 'milestone',
    requirements: { type: 'consecutive_days', value: 7 }
  }
];

export const ProgressTracker: React.FC = () => {
  const { tours, progress } = useOnboarding();
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate statistics
  const totalTours = tours.length;
  const completedTours = progress.completedTours.length;
  const totalSteps = tours.reduce((sum, tour) => sum + tour.steps.length, 0);
  const completedSteps = progress.completedSteps.length;
  const completionPercentage = Math.round((completedTours / totalTours) * 100);

  // Calculate achievements
  const unlockedAchievements = achievements.filter(achievement => {
    switch (achievement.requirements.type) {
      case 'tours_completed':
        return completedTours >= achievement.requirements.value;
      case 'steps_completed':
        return completedSteps >= achievement.requirements.value;
      case 'time_spent':
        // This would require tracking time spent
        return false;
      case 'consecutive_days':
        // This would require tracking daily usage
        return false;
      default:
        return false;
    }
  });

  const nextAchievement = achievements.find(achievement => 
    !unlockedAchievements.includes(achievement)
  );

  // Calculate learning streak (simplified)
  const learningStreak = progress.lastActivity 
    ? Math.floor((Date.now() - new Date(progress.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Learning Progress</h3>
              <p className="text-sm text-gray-600">
                {completedTours} of {totalTours} tours completed ({completionPercentage}%)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{completionPercentage}%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Statistics Grid */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedTours}</div>
              <div className="text-sm text-gray-600">Tours Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedSteps}</div>
              <div className="text-sm text-gray-600">Steps Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{unlockedAchievements.length}</div>
              <div className="text-sm text-gray-600">Achievements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{learningStreak}</div>
              <div className="text-sm text-gray-600">Day Streak</div>
            </div>
          </div>

          {/* Recent Achievements */}
          {unlockedAchievements.length > 0 && (
            <div className="p-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3">Recent Achievements</h4>
              <div className="space-y-2">
                {unlockedAchievements.slice(-3).map(achievement => (
                  <div key={achievement.id} className="flex items-center space-x-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{achievement.title}</div>
                      <div className="text-sm text-gray-600">{achievement.description}</div>
                    </div>
                    <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                      Unlocked!
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Achievement */}
          {nextAchievement && (
            <div className="p-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3">Next Achievement</h4>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-2xl opacity-50">{nextAchievement.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{nextAchievement.title}</div>
                  <div className="text-sm text-gray-600">{nextAchievement.description}</div>
                  <div className="mt-1">
                    {nextAchievement.requirements.type === 'tours_completed' && (
                      <div className="text-xs text-gray-500">
                        Progress: {completedTours} / {nextAchievement.requirements.value} tours
                      </div>
                    )}
                    {nextAchievement.requirements.type === 'steps_completed' && (
                      <div className="text-xs text-gray-500">
                        Progress: {completedSteps} / {nextAchievement.requirements.value} steps
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tour Progress Breakdown */}
          <div className="p-4 border-t border-gray-100">
            <h4 className="font-medium text-gray-900 mb-3">Tour Progress</h4>
            <div className="space-y-2">
              {tours.map(tour => {
                const isCompleted = progress.completedTours.includes(tour.id);
                const isInProgress = progress.currentTour === tour.id;
                const completedStepsInTour = tour.steps.filter(step => 
                  progress.completedSteps.includes(step.id)
                ).length;
                const tourProgress = Math.round((completedStepsInTour / tour.steps.length) * 100);

                return (
                  <div key={tour.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <span className="text-green-500">✅</span>
                        ) : isInProgress ? (
                          <span className="text-blue-500">🔄</span>
                        ) : (
                          <span className="text-gray-400">⭕</span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{tour.name}</div>
                        <div className="text-sm text-gray-600">
                          {completedStepsInTour} of {tour.steps.length} steps
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{tourProgress}%</div>
                      <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                        <div
                          className={`h-1 rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-green-500' : isInProgress ? 'bg-blue-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${tourProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Learning Tips */}
          <div className="p-4 border-t border-gray-100 bg-blue-50">
            <h4 className="font-medium text-blue-900 mb-2">💡 Learning Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Complete tours in order to build on previous knowledge</li>
              <li>• Take breaks between complex tours to absorb information</li>
              <li>• Practice what you learn in the actual admin interface</li>
              <li>• Revisit completed tours to refresh your knowledge</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};