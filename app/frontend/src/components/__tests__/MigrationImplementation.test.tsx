import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import { useWeb3 } from '@/context/Web3Context';
import SocialFeed from '@/pages/social';
import Web3SocialFeed from '@/pages/web3-social';
import LegacyFunctionalityPreserver from '@/components/LegacyFunctionalityPreserver';
import MigrationGuide from '@/components/MigrationGuide';

// Mock dependencies
jest.mock('next/router');
jest.mock('@/context/Web3Context');
jest.mock('@/context/ToastContext');
jest.mock('@/hooks/usePosts');
jest.mock('@/hooks/useProfile');

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  pathname: '/social',
  query: {}
};

const mockUseWeb3 = {
  address: '0x1234567890123456789012345678901234567890',
  isConnected: false
};

const mockUseFeed = {
  feed: [],
  isLoading: false,
  error: null
};

const mockUseCreatePost = {
  createPost: jest.fn(),
  isLoading: false,
  error: null,
  success: false
};

const mockUseProfile = {
  profile: null
};

const mockUseToast = {
  addToast: jest.fn()
};

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  (useWeb3 as jest.Mock).mockReturnValue(mockUseWeb3);
  
  // Mock hooks
  require('@/hooks/usePosts').useFeed.mockReturnValue(mockUseFeed);
  require('@/hooks/usePosts').useCreatePost.mockReturnValue(mockUseCreatePost);
  require('@/hooks/useProfile').useProfile.mockReturnValue(mockUseProfile);
  require('@/context/ToastContext').useToast.mockReturnValue(mockUseToast);
  
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Reset mocks
  jest.clearAllMocks();
});

describe('Migration Implementation - Task 18', () => {
  describe('Social Page Migration', () => {
    it('should show migration notice for non-connected users', async () => {
      render(<SocialFeed />);
      
      expect(screen.getByText('🎉 Social Feed Has Moved!')).toBeInTheDocument();
      expect(screen.getByText(/Your social feed is now part of our integrated dashboard/)).toBeInTheDocument();
      expect(screen.getByText('Learn More')).toBeInTheDocument();
    });

    it('should redirect connected users to dashboard', async () => {
      (useWeb3 as jest.Mock).mockReturnValue({
        ...mockUseWeb3,
        isConnected: true
      });

      render(<SocialFeed />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard?view=feed');
      });
    });

    it('should preserve feed state during migration', async () => {
      (useWeb3 as jest.Mock).mockReturnValue({
        ...mockUseWeb3,
        isConnected: true
      });

      render(<SocialFeed />);

      await waitFor(() => {
        const savedState = sessionStorage.getItem('legacy-feed-state');
        expect(savedState).toBeTruthy();
        
        const parsedState = JSON.parse(savedState!);
        expect(parsedState).toHaveProperty('activeTab');
        expect(parsedState).toHaveProperty('timeFilter');
      });
    });

    it('should show migration guide when Learn More is clicked', async () => {
      render(<SocialFeed />);
      
      const learnMoreButton = screen.getByText('Learn More');
      fireEvent.click(learnMoreButton);
      
      expect(screen.getByText('Welcome to the New Dashboard!')).toBeInTheDocument();
    });
  });

  describe('Web3 Social Page Migration', () => {
    it('should automatically redirect connected users', async () => {
      (useWeb3 as jest.Mock).mockReturnValue({
        ...mockUseWeb3,
        isConnected: true
      });

      render(<Web3SocialFeed />);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard?view=feed');
      });
    });

    it('should show enhanced migration notice for non-connected users', async () => {
      render(<Web3SocialFeed />);
      
      expect(screen.getByText('🚀 Web3 Social Has Evolved!')).toBeInTheDocument();
      expect(screen.getByText('Go to New Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Continue Here')).toBeInTheDocument();
    });
  });

  describe('Legacy Functionality Preservation', () => {
    it('should redirect social page URLs to dashboard', () => {
      const mockRouterWithSocial = {
        ...mockRouter,
        pathname: '/social'
      };
      
      (useRouter as jest.Mock).mockReturnValue(mockRouterWithSocial);
      (useWeb3 as jest.Mock).mockReturnValue({
        ...mockUseWeb3,
        isConnected: true
      });

      render(<LegacyFunctionalityPreserver />);

      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/dashboard',
        query: { view: 'feed' }
      });
    });

    it('should redirect web3-social page URLs to dashboard', () => {
      const mockRouterWithWeb3Social = {
        ...mockRouter,
        pathname: '/web3-social'
      };
      
      (useRouter as jest.Mock).mockReturnValue(mockRouterWithWeb3Social);
      (useWeb3 as jest.Mock).mockReturnValue({
        ...mockUseWeb3,
        isConnected: true
      });

      render(<LegacyFunctionalityPreserver />);

      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/dashboard',
        query: { view: 'feed' }
      });
    });

    it('should migrate localStorage preferences', () => {
      // Set up legacy preferences
      localStorage.setItem('social-preferences', JSON.stringify({
        theme: 'dark',
        notifications: true
      }));

      render(<LegacyFunctionalityPreserver />);

      const migratedPrefs = localStorage.getItem('dashboard-preferences');
      expect(migratedPrefs).toBeTruthy();
      
      const parsed = JSON.parse(migratedPrefs!);
      expect(parsed.theme).toBe('dark');
      expect(parsed.notifications).toBe(true);
      expect(parsed.migratedFrom).toBe('social-page');
      expect(parsed.migrationDate).toBeTruthy();
    });

    it('should migrate feed settings from session storage', () => {
      // Set up legacy feed state
      sessionStorage.setItem('legacy-feed-state', JSON.stringify({
        activeTab: 'hot',
        timeFilter: 'day',
        scrollPosition: 100
      }));

      render(<LegacyFunctionalityPreserver />);

      const migratedSettings = localStorage.getItem('dashboard-feed-settings');
      expect(migratedSettings).toBeTruthy();
      
      const parsed = JSON.parse(migratedSettings!);
      expect(parsed.activeTab).toBe('hot');
      expect(parsed.timeFilter).toBe('day');
      expect(parsed.scrollPosition).toBe(100);
    });

    it('should handle API endpoint redirects', () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn();

      render(<LegacyFunctionalityPreserver />);

      // Test that fetch is wrapped
      expect(global.fetch).not.toBe(originalFetch);
      
      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('Migration Guide', () => {
    it('should render all migration steps', () => {
      const mockOnClose = jest.fn();
      
      render(<MigrationGuide fromPage="social" onClose={mockOnClose} />);
      
      expect(screen.getByText('Welcome to the New Dashboard!')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('should navigate through steps', () => {
      const mockOnClose = jest.fn();
      
      render(<MigrationGuide fromPage="social" onClose={mockOnClose} />);
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      expect(screen.getByText('Your Data is Safe')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });

    it('should complete migration and redirect to dashboard', () => {
      const mockOnClose = jest.fn();
      
      render(<MigrationGuide fromPage="social" onClose={mockOnClose} />);
      
      // Navigate to last step
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton); // Step 2
      fireEvent.click(nextButton); // Step 3
      fireEvent.click(nextButton); // Step 4
      
      const completeButton = screen.getByText('Go to Dashboard');
      fireEvent.click(completeButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard?view=feed');
      expect(mockOnClose).toHaveBeenCalled();
      expect(localStorage.getItem('migration-guide-completed')).toBe('true');
    });

    it('should allow skipping the guide', () => {
      const mockOnClose = jest.fn();
      
      render(<MigrationGuide fromPage="social" onClose={mockOnClose} />);
      
      const skipButton = screen.getByText('Skip Guide');
      fireEvent.click(skipButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard?view=feed');
      expect(mockOnClose).toHaveBeenCalled();
      expect(localStorage.getItem('migration-guide-skipped')).toBe('true');
    });
  });

  describe('Existing Functionality Preservation', () => {
    it('should preserve all existing post creation functionality', async () => {
      (useWeb3 as jest.Mock).mockReturnValue({
        ...mockUseWeb3,
        isConnected: true
      });

      // Mock that migration notice has been seen
      localStorage.setItem('social-migration-seen', 'true');

      render(<SocialFeed />);

      // Should still render the legacy social feed interface
      expect(screen.getByText('Web3 Social Feed')).toBeInTheDocument();
    });

    it('should preserve wallet connection state', () => {
      (useWeb3 as jest.Mock).mockReturnValue({
        ...mockUseWeb3,
        isConnected: true
      });

      localStorage.setItem('social-migration-seen', 'true');

      render(<SocialFeed />);

      // Verify wallet-dependent features are available
      expect(screen.queryByText('Please connect your wallet')).not.toBeInTheDocument();
    });

    it('should preserve user preferences and settings', () => {
      // Set up user preferences
      localStorage.setItem('social-preferences', JSON.stringify({
        theme: 'dark',
        autoRefresh: true,
        notifications: false
      }));

      render(<LegacyFunctionalityPreserver />);

      // Verify preferences are migrated
      const migratedPrefs = localStorage.getItem('dashboard-preferences');
      expect(migratedPrefs).toBeTruthy();
      
      const parsed = JSON.parse(migratedPrefs!);
      expect(parsed.theme).toBe('dark');
      expect(parsed.autoRefresh).toBe(true);
      expect(parsed.notifications).toBe(false);
    });
  });

  describe('User Guidance and Migration Notices', () => {
    it('should show appropriate migration notices based on connection status', () => {
      // Test for non-connected users
      render(<SocialFeed />);
      expect(screen.getByText('Connect your wallet to access the new dashboard.')).toBeInTheDocument();

      // Test for connected users
      (useWeb3 as jest.Mock).mockReturnValue({
        ...mockUseWeb3,
        isConnected: true
      });

      render(<SocialFeed />);
      expect(screen.getByText(/Redirecting you to the new dashboard/)).toBeInTheDocument();
    });

    it('should provide clear migration instructions', () => {
      render(<SocialFeed />);
      
      // Check for feature highlights
      expect(screen.getByText('• Unified feed with community posts')).toBeInTheDocument();
      expect(screen.getByText('• Better mobile experience')).toBeInTheDocument();
      expect(screen.getByText('• Enhanced Web3 features')).toBeInTheDocument();
      expect(screen.getByText('• Seamless navigation')).toBeInTheDocument();
    });

    it('should remember user migration preferences', () => {
      localStorage.setItem('social-migration-seen', 'true');
      
      render(<SocialFeed />);
      
      // Should not show migration notice if already seen
      expect(screen.queryByText('🎉 Social Feed Has Moved!')).not.toBeInTheDocument();
    });
  });
});