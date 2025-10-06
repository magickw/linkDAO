import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Import components for cross-feature testing
import { FeedPage } from '@/components/Feed/FeedPage';
import { CommunityPage } from '@/components/Community/CommunityPage';
import { MessagingPage } from '@/components/Messaging/MessagingPage';
import { NotificationSystem } from '@/components/Notifications/NotificationSystem';
import { GlobalSearchInterface } from '@/components/Search/GlobalSearchInterface';

// Import services
import * as contentSharingService from '@/services/contentSharingService';
import * as realTimeNotificationService from '@/services/realTimeNotificationService';
import * as globalSearchService from '@/services/globalSearchService';
import * as webSocketClientService from '@/services/webSocketClientService';

// Test providers
import { TestProviders } from '@/__tests__/setup/testSetup';

// Mock services
jest.mock('@/services/contentSharingService');
jest.mock('@/services/realTimeNotificationService');
jest.mock('@/services/globalSearchService');
jest.mock('@/services/webSocketClientService');

const mockContentSharingService = contentSharingService as jest.Mocked<typeof contentSharingService>;
const mockRealTimeNotificationService = realTimeNotificationService as jest.Mocked<typeof realTimeNotificationService>;
const mockGlobalSearchService = globalSearchService as jest.Mocked<typeof globalSearchService>;
const mockWebSocketClientService = webSocketClientService as jest.Mocked<typeof webSocketClientService>;

describe('Cross-Feature Workflows Integration Tests', () => {
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    walletAddress: '0x123456789abcdef',
    reputation: { totalScore: 1500, level: 'Expert' }
  };

  const mockPost = {
    id: 'post-1',
    author: mockUser,
    content: 'Check out this amazing DeFi protocol! #DeFi #Web3',
    communityId: 'community-1',
    createdAt: new Date(),
    reactions: [],
    tips: []
  };

  const mockCommunity = {
    id: 'community-1',
    name: 'defi-discussion',
    displayName: 'DeFi Discussion',
    description: 'Discuss DeFi protocols and strategies',
    memberCount: 1250,
    isPublic: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockContentSharingService.shareToDirectMessage.mockResolvedValue({ success: true });
    mockRealTimeNotificationService.subscribeToNotifications.mockResolvedValue({ success: true });
    mockGlobalSearchService.searchAll.mockResolvedValue({
      posts: [mockPost],
      communities: [mockCommunity],
      users: [mockUser]
    });
    mockWebSocketClientService.connect.mockResolvedValue({ success: true });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <TestProviders initialUser={mockUser}>
        {component}
      </TestProviders>
    );
  };

  describe('Feed to Messaging Integration', () => {
    it('should share post to direct message successfully', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<FeedPage />);
      
      // Wait for feed to load
      await waitFor(() => {
        expect(screen.getByTestId('feed-page')).toBeInTheDocument();
      });
      
      // Find post and share button
      const postCard = screen.getByTestId(`post-card-${mockPost.id}`);
      const shareButton = within(postCard).getByTestId('share-button');
      
      await user.click(shareButton);
      
      // Verify share modal opens
      await waitFor(() => {
        expect(screen.getByTestId('share-modal')).toBeInTheDocument();
      });
      
      // Select "Share to DM" option
      const shareToDMButton = screen.getByTestId('share-to-dm-button');
      await user.click(shareToDMButton);
      
      // Enter recipient wallet address
      const recipientInput = screen.getByPlaceholderText('Enter wallet address or ENS name');
      await user.type(recipientInput, '0xabcdef123456789');
      
      // Add message
      const messageInput = screen.getByPlaceholderText('Add a message (optional)');
      await user.type(messageInput, 'Thought you might find this interesting!');
      
      // Send message
      const sendButton = screen.getByText('Send Message');
      await user.click(sendButton);
      
      // Verify service call
      await waitFor(() => {
        expect(mockContentSharingService.shareToDirectMessage).toHaveBeenCalledWith({
          postId: mockPost.id,
          recipientAddress: '0xabcdef123456789',
          message: 'Thought you might find this interesting!',
          sharedContent: {
            type: 'post',
            title: mockPost.content.substring(0, 50),
            preview: mockPost.content,
            url: `/post/${mockPost.id}`
          }
        });
      });
      
      // Verify success message
      expect(screen.getByText('Message sent successfully!')).toBeInTheDocument();
    });  
  it('should navigate from shared post in message to original post', async () => {
      const user = userEvent.setup();
      
      const mockConversation = {
        id: 'conv-1',
        participants: [mockUser.walletAddress, '0xabcdef123456789'],
        lastMessage: {
          id: 'msg-1',
          fromAddress: '0xabcdef123456789',
          content: 'Check this out!',
          sharedContent: {
            type: 'post',
            postId: mockPost.id,
            title: mockPost.content.substring(0, 50),
            preview: mockPost.content
          },
          timestamp: new Date()
        }
      };
      
      renderWithProviders(<MessagingPage />);
      
      // Wait for messaging page to load
      await waitFor(() => {
        expect(screen.getByTestId('messaging-page')).toBeInTheDocument();
      });
      
      // Click on conversation with shared post
      const conversationItem = screen.getByTestId(`conversation-${mockConversation.id}`);
      await user.click(conversationItem);
      
      // Find shared post preview in message
      const sharedPostPreview = screen.getByTestId('shared-post-preview');
      expect(sharedPostPreview).toBeInTheDocument();
      
      // Click on shared post to navigate to original
      await user.click(sharedPostPreview);
      
      // Verify navigation to post detail view
      await waitFor(() => {
        expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
        expect(screen.getByText(mockPost.content)).toBeInTheDocument();
      });
    });

    it('should share community invitation via direct message', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<CommunityPage communityId={mockCommunity.id} />);
      
      // Wait for community page to load
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });
      
      // Find community invite button
      const inviteButton = screen.getByTestId('invite-to-community-button');
      await user.click(inviteButton);
      
      // Verify invite modal opens
      await waitFor(() => {
        expect(screen.getByTestId('community-invite-modal')).toBeInTheDocument();
      });
      
      // Select direct message option
      const dmInviteOption = screen.getByTestId('dm-invite-option');
      await user.click(dmInviteOption);
      
      // Enter recipient address
      const recipientInput = screen.getByPlaceholderText('Enter wallet address');
      await user.type(recipientInput, '0xnewuser123');
      
      // Add personal message
      const personalMessage = screen.getByPlaceholderText('Add a personal message');
      await user.type(personalMessage, 'You should join this community!');
      
      // Send invitation
      const sendInviteButton = screen.getByText('Send Invitation');
      await user.click(sendInviteButton);
      
      // Verify service call
      await waitFor(() => {
        expect(mockContentSharingService.shareToDirectMessage).toHaveBeenCalledWith({
          communityId: mockCommunity.id,
          recipientAddress: '0xnewuser123',
          message: 'You should join this community!',
          sharedContent: {
            type: 'community_invitation',
            title: `Join ${mockCommunity.displayName}`,
            preview: mockCommunity.description,
            url: `/community/${mockCommunity.name}`,
            metadata: {
              memberCount: mockCommunity.memberCount,
              isPublic: mockCommunity.isPublic
            }
          }
        });
      });
    });
  });

  describe('Community to Feed Integration', () => {
    it('should cross-post from community to personal feed', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<CommunityPage communityId={mockCommunity.id} />);
      
      // Wait for community page to load
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });
      
      // Create a post in the community
      const postComposer = screen.getByTestId('community-post-composer');
      const textArea = within(postComposer).getByRole('textbox');
      
      await user.type(textArea, 'This is a great community post about DeFi strategies!');
      
      // Enable cross-posting to personal feed
      const crossPostCheckbox = within(postComposer).getByLabelText('Also post to my feed');
      await user.click(crossPostCheckbox);
      
      // Submit post
      const submitButton = within(postComposer).getByText('Post');
      await user.click(submitButton);
      
      // Verify post appears in community
      await waitFor(() => {
        expect(screen.getByText('This is a great community post about DeFi strategies!')).toBeInTheDocument();
      });
      
      // Navigate to personal feed
      const feedNavButton = screen.getByTestId('nav-feed');
      await user.click(feedNavButton);
      
      // Verify post also appears in personal feed with community attribution
      await waitFor(() => {
        expect(screen.getByText('This is a great community post about DeFi strategies!')).toBeInTheDocument();
        expect(screen.getByText(`Posted in ${mockCommunity.displayName}`)).toBeInTheDocument();
      });
    });

    it('should follow user from community and update feed', async () => {
      const user = userEvent.setup();
      
      const communityMember = {
        id: 'member-1',
        username: 'communitymember',
        walletAddress: '0xmember123',
        reputation: { totalScore: 800, level: 'Active' }
      };
      
      renderWithProviders(<CommunityPage communityId={mockCommunity.id} />);
      
      // Wait for community page to load
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });
      
      // Find a post by another community member
      const memberPost = screen.getByTestId(`post-card-member-post`);
      const authorProfile = within(memberPost).getByTestId('author-profile');
      
      await user.click(authorProfile);
      
      // Verify mini profile card appears
      await waitFor(() => {
        expect(screen.getByTestId('mini-profile-card')).toBeInTheDocument();
      });
      
      // Follow the user
      const followButton = screen.getByText('Follow');
      await user.click(followButton);
      
      // Verify follow confirmation
      await waitFor(() => {
        expect(screen.getByText('Following')).toBeInTheDocument();
      });
      
      // Navigate to personal feed
      const feedNavButton = screen.getByTestId('nav-feed');
      await user.click(feedNavButton);
      
      // Verify feed now includes posts from followed user
      await waitFor(() => {
        expect(screen.getByTestId('feed-page')).toBeInTheDocument();
        // Should see posts from the newly followed user
        expect(screen.getByText(`@${communityMember.username}`)).toBeInTheDocument();
      });
    });
  });

  describe('Search Integration Across Features', () => {
    it('should perform global search and navigate to different content types', async () => {
      const user = userEvent.setup();
      
      const searchResults = {
        posts: [
          { ...mockPost, id: 'search-post-1', content: 'DeFi yield farming strategies' },
          { ...mockPost, id: 'search-post-2', content: 'Best DeFi protocols 2024' }
        ],
        communities: [
          { ...mockCommunity, id: 'search-community-1', name: 'defi-yield' },
          { ...mockCommunity, id: 'search-community-2', name: 'defi-protocols' }
        ],
        users: [
          { ...mockUser, id: 'search-user-1', username: 'defiexpert' },
          { ...mockUser, id: 'search-user-2', username: 'yieldfarmer' }
        ]
      };
      
      mockGlobalSearchService.searchAll.mockResolvedValue(searchResults);
      
      renderWithProviders(<GlobalSearchInterface />);
      
      // Perform search
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'DeFi');
      
      // Wait for search results
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'DeFi',
          filters: {
            includeTypes: ['posts', 'communities', 'users'],
            sortBy: 'relevance'
          }
        });
      });
      
      // Verify search results appear
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
      
      // Test navigation to post result
      const postResult = screen.getByTestId('search-result-post-search-post-1');
      await user.click(postResult);
      
      await waitFor(() => {
        expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
        expect(screen.getByText('DeFi yield farming strategies')).toBeInTheDocument();
      });
      
      // Go back to search
      const backButton = screen.getByTestId('back-to-search');
      await user.click(backButton);
      
      // Test navigation to community result
      const communityResult = screen.getByTestId('search-result-community-search-community-1');
      await user.click(communityResult);
      
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });
    });

    it('should filter search results by content type', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<GlobalSearchInterface />);
      
      // Perform initial search
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      await user.type(searchInput, 'blockchain');
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      });
      
      // Filter by posts only
      const postsFilter = screen.getByTestId('filter-posts');
      await user.click(postsFilter);
      
      // Verify filtered search call
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'blockchain',
          filters: {
            includeTypes: ['posts'],
            sortBy: 'relevance'
          }
        });
      });
      
      // Filter by communities only
      const communitiesFilter = screen.getByTestId('filter-communities');
      await user.click(communitiesFilter);
      
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'blockchain',
          filters: {
            includeTypes: ['communities'],
            sortBy: 'relevance'
          }
        });
      });
    });

    it('should save and recall search history', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<GlobalSearchInterface />);
      
      const searchInput = screen.getByPlaceholderText('Search posts, users, communities...');
      
      // Perform multiple searches
      await user.type(searchInput, 'DeFi');
      await user.press('Enter');
      
      await user.clear(searchInput);
      await user.type(searchInput, 'NFT');
      await user.press('Enter');
      
      await user.clear(searchInput);
      await user.type(searchInput, 'Web3');
      await user.press('Enter');
      
      // Click on search input to show history
      await user.click(searchInput);
      
      // Verify search history appears
      await waitFor(() => {
        expect(screen.getByTestId('search-history')).toBeInTheDocument();
        expect(screen.getByText('DeFi')).toBeInTheDocument();
        expect(screen.getByText('NFT')).toBeInTheDocument();
        expect(screen.getByText('Web3')).toBeInTheDocument();
      });
      
      // Click on a previous search
      const previousSearch = screen.getByText('DeFi');
      await user.click(previousSearch);
      
      // Verify search is performed again
      expect(searchInput).toHaveValue('DeFi');
      await waitFor(() => {
        expect(mockGlobalSearchService.searchAll).toHaveBeenCalledWith({
          query: 'DeFi',
          filters: {
            includeTypes: ['posts', 'communities', 'users'],
            sortBy: 'relevance'
          }
        });
      });
    });
  });  describe(
'Real-Time Notification Integration', () => {
    it('should receive and handle mention notifications across features', async () => {
      const user = userEvent.setup();
      
      // Mock WebSocket connection
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
      
      mockWebSocketClientService.connect.mockResolvedValue({
        success: true,
        connection: mockWebSocket
      });
      
      renderWithProviders(<NotificationSystem />);
      
      // Wait for notification system to initialize
      await waitFor(() => {
        expect(screen.getByTestId('notification-system')).toBeInTheDocument();
      });
      
      // Simulate receiving a mention notification
      const mentionNotification = {
        id: 'notif-1',
        type: 'mention',
        title: 'You were mentioned',
        message: '@testuser check out this post!',
        data: {
          postId: 'mention-post-1',
          authorId: 'author-1',
          communityId: 'community-1'
        },
        timestamp: new Date(),
        read: false
      };
      
      // Trigger notification via WebSocket event
      const notificationEvent = new CustomEvent('notification', {
        detail: mentionNotification
      });
      
      fireEvent(screen.getByTestId('notification-system'), notificationEvent);
      
      // Verify notification appears
      await waitFor(() => {
        expect(screen.getByTestId('notification-toast')).toBeInTheDocument();
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
        expect(screen.getByText('@testuser check out this post!')).toBeInTheDocument();
      });
      
      // Click on notification to navigate
      const notificationToast = screen.getByTestId('notification-toast');
      await user.click(notificationToast);
      
      // Verify navigation to mentioned post
      await waitFor(() => {
        expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
      });
      
      // Verify notification is marked as read
      expect(mockRealTimeNotificationService.markAsRead).toHaveBeenCalledWith('notif-1');
    });

    it('should handle community announcement notifications', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<NotificationSystem />);
      
      // Simulate community announcement notification
      const announcementNotification = {
        id: 'notif-2',
        type: 'community_announcement',
        title: 'New Community Announcement',
        message: 'Important update from DeFi Discussion community',
        data: {
          communityId: mockCommunity.id,
          announcementId: 'announcement-1',
          priority: 'high'
        },
        timestamp: new Date(),
        read: false
      };
      
      const notificationEvent = new CustomEvent('notification', {
        detail: announcementNotification
      });
      
      fireEvent(screen.getByTestId('notification-system'), notificationEvent);
      
      // Verify high-priority notification styling
      await waitFor(() => {
        expect(screen.getByTestId('notification-toast')).toHaveClass('priority-high');
        expect(screen.getByText('New Community Announcement')).toBeInTheDocument();
      });
      
      // Click to view announcement
      await user.click(screen.getByTestId('notification-toast'));
      
      // Verify navigation to community with announcement highlighted
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
        expect(screen.getByTestId('highlighted-announcement')).toBeInTheDocument();
      });
    });

    it('should batch and categorize multiple notifications', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<NotificationSystem />);
      
      // Simulate multiple notifications of same type
      const notifications = [
        {
          id: 'notif-3',
          type: 'reaction',
          title: 'New reaction',
          message: 'user1 reacted to your post',
          timestamp: new Date()
        },
        {
          id: 'notif-4',
          type: 'reaction',
          title: 'New reaction',
          message: 'user2 reacted to your post',
          timestamp: new Date()
        },
        {
          id: 'notif-5',
          type: 'reaction',
          title: 'New reaction',
          message: 'user3 reacted to your post',
          timestamp: new Date()
        }
      ];
      
      // Send notifications rapidly
      notifications.forEach(notification => {
        const event = new CustomEvent('notification', { detail: notification });
        fireEvent(screen.getByTestId('notification-system'), event);
      });
      
      // Verify notifications are batched
      await waitFor(() => {
        expect(screen.getByTestId('batched-notification')).toBeInTheDocument();
        expect(screen.getByText('3 new reactions to your post')).toBeInTheDocument();
      });
      
      // Click to expand batched notifications
      await user.click(screen.getByTestId('batched-notification'));
      
      // Verify individual notifications are shown
      await waitFor(() => {
        expect(screen.getByText('user1 reacted to your post')).toBeInTheDocument();
        expect(screen.getByText('user2 reacted to your post')).toBeInTheDocument();
        expect(screen.getByText('user3 reacted to your post')).toBeInTheDocument();
      });
    });

    it('should handle offline notification queuing', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<NotificationSystem />);
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      window.dispatchEvent(new Event('offline'));
      
      // Verify offline indicator
      await waitFor(() => {
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      });
      
      // Simulate receiving notifications while offline (should be queued)
      const offlineNotification = {
        id: 'notif-offline-1',
        type: 'tip',
        title: 'New tip received',
        message: 'You received 5 USDC tip',
        timestamp: new Date()
      };
      
      const event = new CustomEvent('notification', { detail: offlineNotification });
      fireEvent(screen.getByTestId('notification-system'), event);
      
      // Notification should be queued, not displayed immediately
      expect(screen.queryByText('New tip received')).not.toBeInTheDocument();
      
      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      window.dispatchEvent(new Event('online'));
      
      // Verify queued notifications are now displayed
      await waitFor(() => {
        expect(screen.getByText('New tip received')).toBeInTheDocument();
        expect(screen.getByText('You received 5 USDC tip')).toBeInTheDocument();
      });
    });
  });

  describe('User Activity and Analytics Integration', () => {
    it('should track cross-feature user engagement', async () => {
      const user = userEvent.setup();
      
      // Mock analytics service
      const mockAnalyticsService = {
        trackEvent: jest.fn(),
        trackUserJourney: jest.fn()
      };
      
      renderWithProviders(<FeedPage />);
      
      // Simulate user journey across features
      // 1. View post in feed
      const postCard = screen.getByTestId(`post-card-${mockPost.id}`);
      await user.click(postCard);
      
      // 2. React to post
      const reactionButton = screen.getByTestId('reaction-fire');
      await user.click(reactionButton);
      
      // 3. Share to community
      const shareButton = screen.getByTestId('share-button');
      await user.click(shareButton);
      
      const shareToCommunityButton = screen.getByTestId('share-to-community');
      await user.click(shareToCommunityButton);
      
      // 4. Navigate to community
      const communityLink = screen.getByText(mockCommunity.displayName);
      await user.click(communityLink);
      
      // 5. Create new post in community
      const communityComposer = screen.getByTestId('community-post-composer');
      const textArea = within(communityComposer).getByRole('textbox');
      await user.type(textArea, 'Great discussion happening here!');
      
      const submitButton = within(communityComposer).getByText('Post');
      await user.click(submitButton);
      
      // Verify analytics tracking calls
      await waitFor(() => {
        expect(mockAnalyticsService.trackUserJourney).toHaveBeenCalledWith({
          userId: mockUser.id,
          journey: [
            { action: 'view_post', feature: 'feed', timestamp: expect.any(Date) },
            { action: 'react_to_post', feature: 'feed', timestamp: expect.any(Date) },
            { action: 'share_post', feature: 'feed', timestamp: expect.any(Date) },
            { action: 'navigate_to_community', feature: 'community', timestamp: expect.any(Date) },
            { action: 'create_post', feature: 'community', timestamp: expect.any(Date) }
          ]
        });
      });
    });

    it('should update user reputation based on cross-feature activity', async () => {
      const user = userEvent.setup();
      
      const mockReputationService = {
        updateReputation: jest.fn(),
        getReputationBreakdown: jest.fn()
      };
      
      renderWithProviders(<FeedPage />);
      
      // Simulate high-engagement activities
      // 1. Create valuable content
      const postComposer = screen.getByTestId('enhanced-post-composer');
      const textArea = within(postComposer).getByRole('textbox');
      await user.type(textArea, 'Comprehensive guide to DeFi yield farming strategies with detailed analysis...');
      
      const submitButton = within(postComposer).getByText('Post');
      await user.click(submitButton);
      
      // 2. Receive multiple reactions and tips (simulated)
      const newPost = screen.getByText('Comprehensive guide to DeFi yield farming strategies');
      
      // Simulate receiving reactions
      fireEvent(newPost, new CustomEvent('reactionReceived', {
        detail: { type: 'fire', amount: 10, fromUser: 'user1' }
      }));
      
      fireEvent(newPost, new CustomEvent('tipReceived', {
        detail: { amount: 25, token: 'USDC', fromUser: 'user2' }
      }));
      
      // 3. Help moderate community (simulate)
      const moderationAction = new CustomEvent('moderationAction', {
        detail: { action: 'approve_post', communityId: mockCommunity.id }
      });
      
      fireEvent(document, moderationAction);
      
      // Verify reputation updates
      await waitFor(() => {
        expect(mockReputationService.updateReputation).toHaveBeenCalledWith({
          userId: mockUser.id,
          activities: [
            { type: 'content_creation', value: 50, source: 'feed' },
            { type: 'received_reactions', value: 30, source: 'feed' },
            { type: 'received_tips', value: 25, source: 'feed' },
            { type: 'community_moderation', value: 15, source: 'community' }
          ]
        });
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle cross-feature operation failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock service failure
      mockContentSharingService.shareToDirectMessage.mockRejectedValue(
        new Error('Sharing service unavailable')
      );
      
      renderWithProviders(<FeedPage />);
      
      // Attempt to share post
      const postCard = screen.getByTestId(`post-card-${mockPost.id}`);
      const shareButton = within(postCard).getByTestId('share-button');
      await user.click(shareButton);
      
      const shareToDMButton = screen.getByTestId('share-to-dm-button');
      await user.click(shareToDMButton);
      
      const recipientInput = screen.getByPlaceholderText('Enter wallet address or ENS name');
      await user.type(recipientInput, '0xrecipient123');
      
      const sendButton = screen.getByText('Send Message');
      await user.click(sendButton);
      
      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText('Failed to send message. Please try again.')).toBeInTheDocument();
      });
      
      // Verify retry option
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      // Test retry functionality
      mockContentSharingService.shareToDirectMessage.mockResolvedValue({ success: true });
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Message sent successfully!')).toBeInTheDocument();
      });
    });

    it('should maintain data consistency during partial failures', async () => {
      const user = userEvent.setup();
      
      // Mock partial failure scenario
      mockRealTimeNotificationService.subscribeToNotifications.mockRejectedValue(
        new Error('Notification service unavailable')
      );
      
      renderWithProviders(<FeedPage />);
      
      // Core functionality should still work
      await waitFor(() => {
        expect(screen.getByTestId('feed-page')).toBeInTheDocument();
      });
      
      // Verify graceful degradation message
      expect(screen.getByText('Real-time notifications temporarily unavailable')).toBeInTheDocument();
      
      // Verify core features still function
      const postCard = screen.getByTestId(`post-card-${mockPost.id}`);
      expect(postCard).toBeInTheDocument();
      
      // User can still interact with posts
      const reactionButton = within(postCard).getByTestId('reaction-fire');
      await user.click(reactionButton);
      
      // Reaction should work even without real-time notifications
      await waitFor(() => {
        expect(within(postCard).getByText('🔥 1')).toBeInTheDocument();
      });
    });
  });
});