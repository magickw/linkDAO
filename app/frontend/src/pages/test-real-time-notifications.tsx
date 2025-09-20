import React, { useState, useEffect } from 'react';
import { RealTimeNotificationSystem } from '../components/RealTimeNotifications';
import { 
  RealTimeNotification, 
  NotificationCategory, 
  NotificationPriority,
  NotificationUrgency
} from '../types/realTimeNotifications';

const TestRealTimeNotifications: React.FC = () => {
  const [userId] = useState('test-user-123');
  const [token] = useState('test-token-456');
  const [communityIds] = useState(['community-1', 'community-2', 'community-3']);
  const [activePostId, setActivePostId] = useState<string>('post-123');

  // Mock notification data for testing
  const mockNotifications = [
    {
      id: 'notif-1',
      userId: userId,
      category: NotificationCategory.MENTION,
      priority: NotificationPriority.HIGH,
      urgency: NotificationUrgency.IMMEDIATE,
      title: 'You were mentioned',
      message: 'Alice mentioned you in a comment',
      timestamp: new Date(),
      read: false,
      dismissed: false,
      actionUrl: '/post/123#comment-456',
      metadata: {
        postId: 'post-123',
        commentId: 'comment-456',
        mentionedBy: 'alice-wallet',
        mentionedByUsername: 'Alice',
        mentionedByAvatar: '/avatars/alice.png',
        context: 'Great point about DeFi protocols! @testuser what do you think?'
      }
    },
    {
      id: 'notif-2',
      userId: userId,
      category: NotificationCategory.TIP,
      priority: NotificationPriority.HIGH,
      urgency: NotificationUrgency.IMMEDIATE,
      title: 'You received a tip!',
      message: 'Bob tipped you 5 USDC',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      read: false,
      dismissed: false,
      actionUrl: '/post/456',
      metadata: {
        postId: 'post-456',
        tipAmount: 5,
        tokenSymbol: 'USDC',
        tipperAddress: 'bob-wallet',
        tipperUsername: 'Bob',
        tipperAvatar: '/avatars/bob.png',
        message: 'Excellent analysis!'
      }
    },
    {
      id: 'notif-3',
      userId: userId,
      category: NotificationCategory.GOVERNANCE,
      priority: NotificationPriority.URGENT,
      urgency: NotificationUrgency.IMMEDIATE,
      title: 'Governance Proposal Voting Ends Soon',
      message: 'Voting ends in 2 hours for "Protocol Upgrade v2.0"',
      timestamp: new Date(Date.now() - 600000), // 10 minutes ago
      read: false,
      dismissed: false,
      actionUrl: '/governance/proposal/789',
      metadata: {
        proposalId: 'proposal-789',
        proposalTitle: 'Protocol Upgrade v2.0',
        action: 'voting_ending',
        votingDeadline: new Date(Date.now() + 7200000), // 2 hours from now
        timeRemaining: 7200000,
        quorumStatus: 'approaching',
        userVoteStatus: 'not_voted'
      }
    },
    {
      id: 'notif-4',
      userId: userId,
      category: NotificationCategory.COMMUNITY,
      priority: NotificationPriority.NORMAL,
      urgency: NotificationUrgency.TIMELY,
      title: 'New Community Event',
      message: 'DeFi Builders is hosting a virtual meetup',
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      read: false,
      dismissed: false,
      actionUrl: '/community/defi-builders/event/meetup-1',
      metadata: {
        communityId: 'community-1',
        communityName: 'DeFi Builders',
        communityIcon: '/communities/defi-builders.png',
        eventType: 'event',
        eventData: {
          canJoin: true,
          eventDate: new Date(Date.now() + 86400000), // Tomorrow
          participantCount: 42
        }
      }
    }
  ];

  // Simulate adding notifications for testing
  const addTestNotification = (type: 'mention' | 'tip' | 'governance' | 'community' | 'reaction') => {
    const baseNotification = {
      id: `test-${Date.now()}`,
      userId: userId,
      timestamp: new Date(),
      read: false,
      dismissed: false
    };

    let notification: RealTimeNotification;

    switch (type) {
      case 'mention':
        notification = {
          ...baseNotification,
          category: NotificationCategory.MENTION,
          priority: NotificationPriority.HIGH,
          urgency: NotificationUrgency.IMMEDIATE,
          title: 'New mention',
          message: 'Someone mentioned you in a post',
          metadata: {
            postId: 'post-' + Math.random(),
            mentionedBy: 'user-' + Math.random(),
            mentionedByUsername: 'TestUser' + Math.floor(Math.random() * 100),
            context: 'This is a test mention @testuser'
          }
        };
        break;

      case 'tip':
        notification = {
          ...baseNotification,
          category: NotificationCategory.TIP,
          priority: NotificationPriority.HIGH,
          urgency: NotificationUrgency.IMMEDIATE,
          title: 'New tip received',
          message: `You received ${Math.floor(Math.random() * 10) + 1} USDC`,
          metadata: {
            postId: 'post-' + Math.random(),
            tipAmount: Math.floor(Math.random() * 10) + 1,
            tokenSymbol: 'USDC',
            tipperUsername: 'Tipper' + Math.floor(Math.random() * 100)
          }
        };
        break;

      case 'governance':
        notification = {
          ...baseNotification,
          category: NotificationCategory.GOVERNANCE,
          priority: NotificationPriority.URGENT,
          urgency: NotificationUrgency.IMMEDIATE,
          title: 'Governance Alert',
          message: 'New proposal requires your vote',
          metadata: {
            proposalId: 'prop-' + Math.random(),
            proposalTitle: 'Test Proposal ' + Math.floor(Math.random() * 100),
            action: 'voting_started',
            userVoteStatus: 'not_voted'
          }
        };
        break;

      case 'community':
        notification = {
          ...baseNotification,
          category: NotificationCategory.COMMUNITY,
          priority: NotificationPriority.NORMAL,
          urgency: NotificationUrgency.TIMELY,
          title: 'Community Update',
          message: 'New activity in your community',
          metadata: {
            communityId: communityIds[Math.floor(Math.random() * communityIds.length)],
            communityName: 'Test Community',
            eventType: 'new_post'
          }
        };
        break;

      case 'reaction':
        notification = {
          ...baseNotification,
          category: NotificationCategory.REACTION,
          priority: NotificationPriority.LOW,
          urgency: NotificationUrgency.EVENTUAL,
          title: 'New reaction',
          message: 'Someone reacted to your post',
          metadata: {
            postId: 'post-' + Math.random(),
            reactionType: '🔥',
            reactionEmoji: '🔥',
            reactorUsername: 'Reactor' + Math.floor(Math.random() * 100)
          }
        };
        break;

      default:
        return;
    }

    // Simulate receiving the notification
    if (typeof window !== 'undefined' && (window as any).addImmediateNotification) {
      (window as any).addImmediateNotification(notification);
    }
  };

  const handleNotificationClick = (notification: RealTimeNotification) => {
    console.log('Notification clicked:', notification);
    alert(`Clicked notification: ${notification.title}`);
  };

  const handleSettingsChange = (settings: any) => {
    console.log('Settings changed:', settings);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Real-time Notification System Test
          </h1>
          <p className="text-gray-600 mb-6">
            Test the comprehensive real-time notification system with categorization, 
            live updates, priority notifications, and offline support.
          </p>

          {/* Test Controls */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => addTestNotification('mention')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Mention
              </button>
              <button
                onClick={() => addTestNotification('tip')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Tip
              </button>
              <button
                onClick={() => addTestNotification('governance')}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Governance
              </button>
              <button
                onClick={() => addTestNotification('community')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Community
              </button>
              <button
                onClick={() => addTestNotification('reaction')}
                className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Reaction
              </button>
            </div>

            <div className="mt-4 flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <span className="text-sm font-medium">Active Post ID:</span>
                <input
                  type="text"
                  value={activePostId}
                  onChange={(e) => setActivePostId(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  placeholder="post-123"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Notification System */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <RealTimeNotificationSystem
              userId={userId}
              token={token}
              communityIds={communityIds}
              activePostId={activePostId}
              onNotificationClick={handleNotificationClick}
              onSettingsChange={handleSettingsChange}
              className="h-fit"
            />
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Features Tested</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Notification categorization</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Real-time update indicators</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Immediate notifications</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Priority governance alerts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Live comment updates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Community event notifications</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Offline notification queue</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Test Data</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">User ID:</span> {userId}
                </div>
                <div>
                  <span className="font-medium">Communities:</span> {communityIds.length}
                </div>
                <div>
                  <span className="font-medium">Active Post:</span> {activePostId}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Instructions</h3>
              <ol className="space-y-2 text-sm list-decimal list-inside">
                <li>Click the test buttons to generate notifications</li>
                <li>Check different tabs in the notification system</li>
                <li>Test desktop notification permissions</li>
                <li>Try going offline to test queue functionality</li>
                <li>Subscribe to post updates for live comments</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestRealTimeNotifications;