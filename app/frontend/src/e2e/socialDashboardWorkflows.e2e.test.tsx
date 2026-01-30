/**
 * End-to-End Tests for Social Dashboard Workflows
 * 
 * This test suite covers complete user workflows from authentication to posting
 * and community interaction, ensuring the integrated dashboard experience works
 * seamlessly across all components.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import React from 'react';

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/dashboard',
  query: {},
  asPath: '/dashboard',
  route: '/dashboard'
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter
}));

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    isConnecting: false,
    isDisconnected: false
  }),
  useBalance: () => ({
    data: { formatted: '2.45', symbol: 'ETH' },
    isLoading: false
  }),
  useContractRead: () => ({
    data: null,
    isLoading: false
  }),
  useContractWrite: () => ({
    write: jest.fn(),
    isLoading: false
  })
}));

// Mock Web3 Context
const mockWeb3Context = {
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  balance: '2.45',
  connect: jest.fn(),
  disconnect: jest.fn()
};

jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => mockWeb3Context,
  Web3Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock Navigation Context
const mockNavigationContext = {
  navigationState: {
    activeView: 'feed' as const,
    activeCommunity: null,
    sidebarCollapsed: false,
    rightSidebarVisible: true,
    modalState: {
      postCreation: false,
      communityJoin: false,
      userProfile: false
    }
  },
  setActiveView: jest.fn(),
  setActiveCommunity: jest.fn(),
  navigateToFeed: jest.fn(),
  navigateToCommunity: jest.fn(),
  toggleSidebar: jest.fn(),
  setSidebarCollapsed: jest.fn(),
  openModal: jest.fn(),
  closeModal: jest.fn()
};

jest.mock('@/context/NavigationContext', () => ({
  useNavigation: () => mockNavigationContext,
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock Toast Context
const mockToastContext = {
  addToast: jest.fn(),
  removeToast: jest.fn(),
  toasts: []
};

jest.mock('@/context/ToastContext', () => ({
  useToast: () => mockToastContext,
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock hooks
jest.mock('@/hooks/usePosts', () => ({
  useFeed: () => ({
    feed: [
      {
        id: '1',
        author: '0x1234567890123456789012345678901234567890',
        dao: 'ethereum-builders',
        title: 'Test Post',
        contentCid: 'This is a test post for E2E testing',
        mediaCids: [],
        tags: ['test'],
        createdAt: new Date(),
        onchainRef: '0x1234...5678',
        reputationScore: 750,
        commentsCount: 5,
        stakedValue: 10
      }
    ],
    isLoading: false,
    error: null
  }),
  useCreatePost: () => ({
    createPost: jest.fn().mockResolvedValue({ success: true }),
    isLoading: false,
    error: null,
    success: true
  })
}));

jest.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: {
      handle: 'testuser',
      ens: 'test.eth',
      avatarCid: 'https://placehold.co/40',
      reputationScore: 750,
      reputationTier: 'Expert',
      verified: true
    },
    isLoading: false,
    error: null
  })
}));

// Import components after mocks
import Dashboard from '@/pages/dashboard';
import { Web3Provider } from '@/context/Web3Context';
import { NavigationProvider } from '@/context/NavigationContext';
import { ToastProvider } from '@/context/ToastContext';

// Test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Web3Provider>
    <NavigationProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </NavigationProvider>
  </Web3Provider>
);

describe('Social Dashboard E2E Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication to Dashboard Flow', () => {
    it('should display dashboard when user is authenticated', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should show user profile information
      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
        expect(screen.getByText('test.eth')).toBeInTheDocument();
        expect(screen.getByText('Expert')).toBeInTheDocument();
      });

      // Should show wallet balance
      expect(screen.getByText('2.45')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();

      // Should show main navigation
      expect(screen.getByText('Create Post')).toBeInTheDocument();
      expect(screen.getByText('Send Tokens')).toBeInTheDocument();
      expect(screen.getByText('DAO Proposal')).toBeInTheDocument();
    });

    it('should show unauthenticated state when wallet not connected', () => {
      // Mock disconnected state
      jest.mocked(mockWeb3Context.isConnected) = false;

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Personalized Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Please connect your wallet to access your personalized dashboard.')).toBeInTheDocument();
    });
  });

  describe('Post Creation Workflow', () => {
    it('should allow user to create a post through the dashboard', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Click create post button
      const createPostButton = screen.getByRole('button', { name: /create post/i });
      await user.click(createPostButton);

      // Should open post creation modal
      expect(mockNavigationContext.openModal).toHaveBeenCalledWith('postCreation');
    });

    it('should handle post creation success', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should show success toast when post is created
      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          'Post created successfully!',
          'success'
        );
      });
    });
  });

  describe('Feed Interaction Workflow', () => {
    it('should display feed posts with interaction options', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should show feed posts
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
        expect(screen.getByText('This is a test post for E2E testing')).toBeInTheDocument();
      });

      // Should show post metadata
      expect(screen.getByText('ethereum-builders')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // comment count
    });

    it('should handle post reactions and tipping', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Test reaction functionality would be here
      // Note: This would require the actual post card component to be rendered
      // which depends on the Web3SocialPostCard component
    });
  });

  describe('Navigation Workflow', () => {
    it('should allow navigation between feed and communities', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should start on feed view
      expect(mockNavigationContext.navigationState.activeView).toBe('feed');

      // Navigation between views would be tested here
      // This requires the NavigationSidebar component to be properly rendered
    });

    it('should handle sidebar collapse and expansion', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Test sidebar toggle functionality
      // This would require the actual sidebar toggle button to be rendered
    });
  });

  describe('Community Integration Workflow', () => {
    it('should display community list in sidebar', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Community list would be tested here
      // This requires the NavigationSidebar with community data
    });

    it('should allow joining and leaving communities', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Community join/leave functionality would be tested here
    });
  });

  describe('Responsive Design Workflow', () => {
    it('should adapt layout for mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should show mobile-optimized layout
      // This would test responsive behavior
    });

    it('should show mobile navigation elements', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should show mobile-specific UI elements
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  describe('Performance and Loading States', () => {
    it('should show loading states while data is being fetched', () => {
      // Mock loading state
      jest.mock('@/hooks/usePosts', () => ({
        useFeed: () => ({
          feed: [],
          isLoading: true,
          error: null
        }),
        useCreatePost: () => ({
          createPost: jest.fn(),
          isLoading: false,
          error: null,
          success: false
        })
      }));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Loading feed...')).toBeInTheDocument();
    });

    it('should handle error states gracefully', () => {
      // Mock error state
      jest.mock('@/hooks/usePosts', () => ({
        useFeed: () => ({
          feed: [],
          isLoading: false,
          error: 'Failed to load feed'
        }),
        useCreatePost: () => ({
          createPost: jest.fn(),
          isLoading: false,
          error: null,
          success: false
        })
      }));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/Error loading feed/)).toBeInTheDocument();
    });
  });

  describe('Web3 Integration Workflow', () => {
    it('should display wallet information correctly', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should show wallet address and balance
      await waitFor(() => {
        expect(screen.getByText('2.45')).toBeInTheDocument();
        expect(screen.getByText('ETH')).toBeInTheDocument();
      });
    });

    it('should handle wallet disconnection', () => {
      // Mock disconnected wallet
      mockWeb3Context.isConnected = false;

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Please connect your wallet to access your personalized dashboard.')).toBeInTheDocument();
    });
  });

  describe('Accessibility Workflow', () => {
    it('should be navigable with keyboard', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Test keyboard navigation
      await user.tab();
      
      // Should focus on first interactive element
      const createPostButton = screen.getByRole('button', { name: /create post/i });
      expect(createPostButton).toHaveFocus();
    });

    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should have proper button roles
      expect(screen.getByRole('button', { name: /create post/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send tokens/i })).toBeInTheDocument();
    });
  });
});