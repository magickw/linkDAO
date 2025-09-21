import React, { useState } from 'react';
import { ModeratorListWidget } from '../components/Community/ModeratorListWidget';
import { Moderator } from '../types/community';

const TestModeratorListWidget: React.FC = () => {
  const [selectedModerator, setSelectedModerator] = useState<Moderator | null>(null);

  // Mock moderator data for testing
  const mockModerators: Moderator[] = [
    {
      id: '1',
      username: 'community_founder',
      displayName: 'Alice Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      role: 'owner',
      tenure: 730, // 2 years
      lastActive: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      isOnline: true
    },
    {
      id: '2',
      username: 'senior_admin',
      displayName: 'Bob Smith',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      role: 'admin',
      tenure: 365, // 1 year
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      isOnline: false
    },
    {
      id: '3',
      username: 'tech_mod',
      displayName: 'Carol Davis',
      role: 'admin',
      tenure: 180, // 6 months
      lastActive: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      isOnline: true
    },
    {
      id: '4',
      username: 'content_mod',
      displayName: 'David Wilson',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      role: 'moderator',
      tenure: 90, // 3 months
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      isOnline: false
    },
    {
      id: '5',
      username: 'community_helper',
      displayName: 'Eva Martinez',
      role: 'moderator',
      tenure: 45, // 1.5 months
      lastActive: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      isOnline: true
    },
    {
      id: '6',
      username: 'night_mod',
      displayName: 'Frank Thompson',
      role: 'moderator',
      tenure: 120, // 4 months
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
      isOnline: false
    },
    {
      id: '7',
      username: 'weekend_mod',
      displayName: 'Grace Lee',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      role: 'moderator',
      tenure: 30, // 1 month
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      isOnline: false
    }
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moderators, setModerators] = useState(mockModerators);

  const handleModeratorClick = (moderator: Moderator) => {
    setSelectedModerator(moderator);
  };

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  const simulateError = () => {
    setError('Failed to load moderators. Please try again.');
    setTimeout(() => {
      setError(null);
    }, 3000);
  };

  const simulateEmpty = () => {
    setModerators([]);
    setTimeout(() => {
      setModerators(mockModerators);
    }, 3000);
  };

  const toggleOnlineStatus = (moderatorId: string) => {
    setModerators(prev => prev.map(mod => 
      mod.id === moderatorId 
        ? { ...mod, isOnline: !mod.isOnline, lastActive: new Date() }
        : mod
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Moderator List Widget Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing the ModeratorListWidget component with various states and interactions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Widget */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Moderator List Widget
              </h2>
              <ModeratorListWidget
                moderators={moderators}
                loading={loading}
                error={error}
                onModeratorClick={handleModeratorClick}
              />
            </div>

            {/* Control Buttons */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Test Controls
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={simulateLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Test Loading
                </button>
                <button
                  onClick={simulateError}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  Test Error
                </button>
                <button
                  onClick={simulateEmpty}
                  className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                >
                  Test Empty
                </button>
                <button
                  onClick={() => setSelectedModerator(null)}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>

          {/* Selected Moderator Details */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Selected Moderator
            </h2>
            {selectedModerator ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center space-x-4 mb-4">
                  {selectedModerator.avatar ? (
                    <img
                      src={selectedModerator.avatar}
                      alt={`${selectedModerator.displayName}'s avatar`}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-xl font-medium text-gray-600 dark:text-gray-300">
                        {selectedModerator.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedModerator.displayName}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      @{selectedModerator.username}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Role:</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {selectedModerator.role}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Tenure:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedModerator.tenure} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedModerator.isOnline ? 'bg-green-400' : 'bg-gray-300'
                      }`} />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedModerator.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  {!selectedModerator.isOnline && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Last Active:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedModerator.lastActive.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleOnlineStatus(selectedModerator.id)}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Toggle Online Status
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Click on a moderator to see their details
                </p>
              </div>
            )}
          </div>

          {/* Widget Features */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Widget Features
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    ✅ Requirements Fulfilled
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Displays moderator list in sidebar widget</li>
                    <li>• Shows usernames, roles, and tenure</li>
                    <li>• Special badges for different mod roles</li>
                    <li>• Last active time for offline moderators</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    🎨 Visual Features
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Role-based color coding</li>
                    <li>• Online/offline indicators</li>
                    <li>• Avatar support with fallbacks</li>
                    <li>• Expandable/collapsible widget</li>
                    <li>• Show more/less for large lists</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    ⚡ Interactive Features
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Clickable moderator profiles</li>
                    <li>• Keyboard navigation support</li>
                    <li>• Loading and error states</li>
                    <li>• Responsive design</li>
                    <li>• Dark mode support</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    📊 Sorting Logic
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Owner → Admin → Moderator</li>
                    <li>• Online status priority</li>
                    <li>• Tenure-based sub-sorting</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Online Status Controls */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                Toggle Online Status
              </h3>
              <div className="space-y-2">
                {moderators.slice(0, 4).map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => toggleOnlineStatus(mod.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span className="text-gray-900 dark:text-white">
                      {mod.displayName}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      mod.isOnline ? 'bg-green-400' : 'bg-gray-300'
                    }`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestModeratorListWidget;