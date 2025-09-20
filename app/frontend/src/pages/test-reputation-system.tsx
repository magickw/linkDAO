import React, { useState, useEffect } from 'react';
import {
  BadgeCollection,
  ProgressIndicator,
  MiniProfileCard,
  AchievementNotification,
  ReputationBreakdown,
  UserReputation,
  Achievement,
  MiniProfileData,
  ReputationEvent
} from '../components/Reputation';
import reputationService from '../services/reputationService';

const TestReputationSystem: React.FC = () => {
  const [userReputation, setUserReputation] = useState<UserReputation | null>(null);
  const [miniProfileData, setMiniProfileData] = useState<MiniProfileData | null>(null);
  const [reputationEvents, setReputationEvents] = useState<ReputationEvent[]>([]);
  const [showAchievement, setShowAchievement] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reputation, profileData, events] = await Promise.all([
        reputationService.getUserReputation('user123'),
        reputationService.getMiniProfileData('user123'),
        reputationService.getReputationEvents('user123')
      ]);

      setUserReputation(reputation);
      setMiniProfileData(profileData);
      setReputationEvents(events);
    } catch (error) {
      console.error('Error loading reputation data:', error);
    }
  };

  const handleShowAchievement = () => {
    if (userReputation?.achievements.length) {
      setSelectedAchievement(userReputation.achievements[0]);
      setShowAchievement(true);
    }
  };

  const handleBadgeClick = (badge: any) => {
    alert(`Badge: ${badge.name}\n${badge.description}\nEarned: ${badge.earnedAt.toLocaleDateString()}`);
  };

  const handleFollow = async (userId: string) => {
    console.log('Following user:', userId);
    if (miniProfileData) {
      setMiniProfileData({
        ...miniProfileData,
        isFollowing: true
      });
    }
  };

  const handleUnfollow = async (userId: string) => {
    console.log('Unfollowing user:', userId);
    if (miniProfileData) {
      setMiniProfileData({
        ...miniProfileData,
        isFollowing: false
      });
    }
  };

  const handleViewProfile = (userId: string) => {
    console.log('Viewing profile:', userId);
  };

  const handleViewAchievementDetails = (achievement: Achievement) => {
    alert(`Achievement Details:\n${achievement.name}\n${achievement.description}\nPoints: ${achievement.points}`);
  };

  if (!userReputation || !miniProfileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reputation system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reputation System Test Page
          </h1>
          <p className="text-gray-600">
            Testing all components of the reputation and badge system
          </p>
        </div>

        {/* Achievement Notification */}
        {showAchievement && selectedAchievement && (
          <AchievementNotification
            achievement={selectedAchievement}
            onClose={() => setShowAchievement(false)}
            onViewDetails={handleViewAchievementDetails}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Badge Collection Demo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Badge Collection</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Small Size</h3>
                <BadgeCollection
                  badges={userReputation.badges}
                  onBadgeClick={handleBadgeClick}
                  size="small"
                  maxDisplay={4}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Medium Size</h3>
                <BadgeCollection
                  badges={userReputation.badges}
                  onBadgeClick={handleBadgeClick}
                  size="medium"
                  maxDisplay={4}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Large Size</h3>
                <BadgeCollection
                  badges={userReputation.badges}
                  onBadgeClick={handleBadgeClick}
                  size="large"
                  maxDisplay={3}
                />
              </div>
            </div>
          </div>

          {/* Progress Indicator Demo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Progress Indicators</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Horizontal Layout</h3>
                <ProgressIndicator
                  milestones={userReputation.progress}
                  animated={true}
                  showLabels={true}
                  size="medium"
                  orientation="horizontal"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mini Profile Card Demo */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Mini Profile Card</h2>
          <div className="flex flex-wrap gap-4">
            <MiniProfileCard
              profileData={miniProfileData}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              onViewProfile={handleViewProfile}
              position="top"
              showOnHover={true}
              trigger={
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  Hover for Profile (Top)
                </button>
              }
            />
            <MiniProfileCard
              profileData={miniProfileData}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              onViewProfile={handleViewProfile}
              position="bottom"
              showOnHover={true}
              trigger={
                <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  Hover for Profile (Bottom)
                </button>
              }
            />
            <MiniProfileCard
              profileData={miniProfileData}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              onViewProfile={handleViewProfile}
              position="right"
              showOnHover={true}
              trigger={
                <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                  Hover for Profile (Right)
                </button>
              }
            />
          </div>
        </div>

        {/* Reputation Breakdown */}
        <div className="mb-8">
          <ReputationBreakdown
            reputation={userReputation}
            recentEvents={reputationEvents}
            showHistory={true}
            showProjections={true}
          />
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleShowAchievement}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Show Achievement Notification
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reload Data
            </button>
          </div>
        </div>

        {/* Component Information */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Component Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">BadgeCollection</h3>
              <ul className="text-blue-700 space-y-1">
                <li>• Multiple sizes (small, medium, large)</li>
                <li>• Rarity indicators and tooltips</li>
                <li>• Show more/less functionality</li>
                <li>• Click handlers for badge details</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">ProgressIndicator</h3>
              <ul className="text-blue-700 space-y-1">
                <li>• Animated progress bars</li>
                <li>• Category-specific colors</li>
                <li>• Milestone tracking</li>
                <li>• Horizontal/vertical layouts</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">MiniProfileCard</h3>
              <ul className="text-blue-700 space-y-1">
                <li>• Hover-triggered display</li>
                <li>• Multiple positioning options</li>
                <li>• Follow/unfollow functionality</li>
                <li>• Reputation and stats display</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">AchievementNotification</h3>
              <ul className="text-blue-700 space-y-1">
                <li>• Celebration animations</li>
                <li>• Rarity-based styling</li>
                <li>• Auto-close functionality</li>
                <li>• Particle effects</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">ReputationBreakdown</h3>
              <ul className="text-blue-700 space-y-1">
                <li>• Detailed analytics</li>
                <li>• Activity history</li>
                <li>• Growth projections</li>
                <li>• Category breakdowns</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestReputationSystem;