import React, { useState } from 'react';
import { UserReputation, ReputationEvent, ReputationCategory, REPUTATION_LEVELS } from '../../types/reputation';
import ProgressIndicator from './ProgressIndicator';

interface ReputationBreakdownProps {
  reputation: UserReputation;
  recentEvents?: ReputationEvent[];
  showHistory?: boolean;
  showProjections?: boolean;
}

const ReputationBreakdown: React.FC<ReputationBreakdownProps> = ({
  reputation,
  recentEvents = [],
  showHistory = true,
  showProjections = true
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'projections'>('overview');

  const currentLevel = REPUTATION_LEVELS.find(
    level => reputation.totalScore >= level.minScore && reputation.totalScore <= level.maxScore
  ) || REPUTATION_LEVELS[0];

  const nextLevel = REPUTATION_LEVELS.find(
    level => level.minScore > reputation.totalScore
  );

  const getCategoryIcon = (category: ReputationCategory) => {
    const icons = {
      posting: '✍️',
      governance: '🏛️',
      community: '👥',
      trading: '💰',
      moderation: '🛡️'
    };
    return icons[category];
  };

  const getCategoryName = (category: ReputationCategory) => {
    const names = {
      posting: 'Content Creation',
      governance: 'Governance',
      community: 'Community',
      trading: 'Trading',
      moderation: 'Moderation'
    };
    return names[category];
  };

  const getEventTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      post_created: 'Created a post',
      post_liked: 'Post received likes',
      comment_created: 'Added a comment',
      vote_cast: 'Voted on proposal',
      proposal_created: 'Created proposal',
      community_joined: 'Joined community',
      tip_received: 'Received tip',
      tip_given: 'Gave tip',
      moderation_action: 'Moderation action',
      achievement_unlocked: 'Achievement unlocked'
    };
    return descriptions[type] || type;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const calculateCategoryPercentage = (categoryScore: number) => {
    return reputation.totalScore > 0 ? (categoryScore / reputation.totalScore) * 100 : 0;
  };

  const getProjectedTimeToNextLevel = () => {
    if (!nextLevel) return null;

    const recentEventsLast30Days = recentEvents.filter(
      event => Date.now() - event.timestamp.getTime() < 30 * 24 * 60 * 60 * 1000
    );

    if (recentEventsLast30Days.length === 0) return null;

    const avgPointsPerDay = recentEventsLast30Days.reduce((sum, event) => sum + event.points, 0) / 30;
    const pointsNeeded = nextLevel.minScore - reputation.totalScore;
    const daysNeeded = Math.ceil(pointsNeeded / avgPointsPerDay);

    return daysNeeded;
  };

  const projectedDays = getProjectedTimeToNextLevel();

  return (
    <div className="reputation-breakdown bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Reputation Analytics</h2>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium text-white`} style={{ backgroundColor: currentLevel.color }}>
              {currentLevel.icon} {currentLevel.name}
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {reputation.totalScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Level Progress */}
        {nextLevel && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Progress to {nextLevel.name}</span>
              <span className="text-sm text-gray-500">
                {reputation.totalScore} / {nextLevel.minScore}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((reputation.totalScore - currentLevel.minScore) / (nextLevel.minScore - currentLevel.minScore)) * 100)}%`,
                  backgroundColor: currentLevel.color
                }}
              />
            </div>
            {projectedDays && (
              <p className="text-xs text-gray-500 mt-1">
                Estimated {projectedDays} days to next level at current pace
              </p>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'overview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          {showHistory && (
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                activeTab === 'history'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
          )}
          {showProjections && (
            <button
              onClick={() => setActiveTab('projections')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                activeTab === 'projections'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Projections
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Category Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
              <div className="space-y-4">
                {Object.entries(reputation.breakdown).filter(([key]) => key !== 'total').map(([category, score]) => {
                  const percentage = calculateCategoryPercentage(score);
                  return (
                    <div key={category} className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 w-32">
                        <span className="text-lg">{getCategoryIcon(category as ReputationCategory)}</span>
                        <span className="text-sm font-medium text-gray-700">
                          {getCategoryName(category as ReputationCategory)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">{score} points</span>
                          <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress Milestones */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Milestones</h3>
              <ProgressIndicator milestones={reputation.progress} animated={true} />
            </div>

            {/* Achievements Summary */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reputation.achievements.slice(0, 4).map((achievement) => (
                  <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{achievement.name}</h4>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                      <p className="text-xs text-gray-500">+{achievement.points} points</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <span className="text-lg">{getCategoryIcon(event.category)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {getEventTypeDescription(event.type)}
                    </p>
                    <p className="text-sm text-gray-600 truncate">{event.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-sm font-medium ${event.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {event.points > 0 ? '+' : ''}{event.points}
                    </span>
                  </div>
                </div>
              ))}
              {recentEvents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'projections' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Projections</h3>
              
              {/* Next Level Projection */}
              {nextLevel && (
                <div className="p-4 bg-blue-50 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-900">Next Level: {nextLevel.name}</h4>
                    <span className="text-sm text-blue-700">
                      {nextLevel.minScore - reputation.totalScore} points needed
                    </span>
                  </div>
                  {projectedDays && (
                    <p className="text-sm text-blue-700">
                      At your current pace, you'll reach {nextLevel.name} in approximately {projectedDays} days
                    </p>
                  )}
                </div>
              )}

              {/* Category Recommendations */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Improvement Recommendations</h4>
                <div className="space-y-3">
                  {Object.entries(reputation.breakdown)
                    .filter(([key]) => key !== 'total')
                    .sort(([, a], [, b]) => a - b)
                    .slice(0, 3)
                    .map(([category, score]) => (
                      <div key={category} className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <span>{getCategoryIcon(category as ReputationCategory)}</span>
                          <span className="font-medium text-yellow-900">
                            {getCategoryName(category as ReputationCategory)}
                          </span>
                        </div>
                        <p className="text-sm text-yellow-700">
                          Focus on this area to boost your overall reputation. Current score: {score}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReputationBreakdown;