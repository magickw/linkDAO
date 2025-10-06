/**
 * ReputationDisplay Component
 * Shows user reputation score and badges
 */

import React, { useState, useEffect } from 'react';
import { userActivityService } from '../../services/userActivityService';

interface ReputationDisplayProps {
  userAddress: string;
  onBadgeClick: (badgeId: string) => void;
}

export const ReputationDisplay: React.FC<ReputationDisplayProps> = ({
  userAddress,
  onBadgeClick
}) => {
  const [reputation, setReputation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReputation();
  }, [userAddress]);

  const loadReputation = async () => {
    try {
      setLoading(true);
      const data = await userActivityService.getUserReputation(userAddress);
      setReputation(data);
    } catch (error) {
      console.error('Error loading reputation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading reputation...</div>;
  }

  if (!reputation) {
    return <div className="text-center py-4">No reputation data available</div>;
  }

  return (
    <div className="reputation-display">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Reputation & Badges
      </h3>
      
      {/* Total Score */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            {reputation.totalScore}
          </div>
          <p className="text-gray-600 dark:text-gray-400">Total Reputation Score</p>
        </div>
      </div>

      {/* Badges */}
      {reputation.badges.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Earned Badges
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {reputation.badges.map((badge: any) => (
              <div
                key={badge.id}
                className="text-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onBadgeClick(badge.id)}
              >
                <div className="text-3xl mb-2">{badge.iconUrl || '🏆'}</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {badge.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {badge.rarity}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReputationDisplay;