import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import MigrationNotice from '../MigrationNotice';
import DashboardTour from '../DashboardTour';
import LegacyFunctionalityPreserver from '../LegacyFunctionalityPreserver';

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    pathname: '/dashboard',
    query: {},
    asPath: '/dashboard'
  })
}));

// Mock Web3 Context
jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => ({
    isConnected: true,
    address: '0x1234567890123456789012345678901234567890'
  })
}));

describe('Migration Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('MigrationNotice', () => {
    it('should render dashboard migration notice correctly', () => {
      const onDismiss = jest.fn();
      
      render(
        <MigrationNotice type="dashboard" onDismiss={onDismiss} />
      );

      expect(screen.getByText('🎉 Welcome to the New Dashboard!')).toBeInTheDocument();
      expect(screen.getByText(/We've redesigned your dashboard/)).toBeInTheDocument();
      expect(screen.getByText('Unified social feed with community posts')).toBeInTheDocument();
    });

    it('should render social migration notice correctly', () => {
      const onDismiss = jest.fn();
      
      render(
        <MigrationNotice type="social" onDismiss={onDismiss} />
      );

      expect(screen.getByText('📱 Social Feed Has Moved!')).toBeInTheDocument();
      expect(screen.getByText(/Your social feed is now part of the integrated dashboard/)).toBeInTheDocument();
    });

    it('should call onDismiss when dismissed', async () => {
      const user = userEvent.setup();
      const onDismiss = jest.fn();
      
      render(
        <MigrationNotice type="dashboard" onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByText('Got it!');
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalled();
    });

    it('should close when X button is clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = jest.fn();
      
      render(
        <MigrationNotice type="dashboard" onDismiss={onDismiss} />
      );

      const closeButton = screen.getByLabelText('Close notice');
      await user.click(closeButton);

      expect(onDismiss).toHaveBeenCalled();
    });

    it('should render custom message when provided', () => {
      const customMessage = 'This is a custom migration message';
      const onDismiss = jest.fn();
      
      render(
        <MigrationNotice 
          type="general" 
          onDismiss={onDismiss} 
          customMessage={customMessage}
        />
      );

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('DashboardTour', () => {
    beforeEach(() => {
      // Mock DOM elements for tour targets
      document.body.innerHTML = `
        <div data-tour="user-profile">User Profile</div>
        <div data-tour="navigation">Navigation</div>
        <div data-tour="create-post">Create Post</div>
        <div data-tour="feed-view">Feed View</div>
        <div data-tour="quick-actions">Quick Actions</div>
      `;
    });

    it('should not show tour if already seen', () => {
      localStorage.setItem('dashboard-tour-seen', 'true');
      
      render(<DashboardTour />);

      expect(screen.queryByText('Your Profile Hub')).not.toBeInTheDocument();
    });

    it('should show tour button when tour has been seen', () => {
      localStorage.setItem('dashboard-tour-seen', 'true');
      
      render(<DashboardTour />);

      expect(screen.getByTitle('Take dashboard tour')).toBeInTheDocument();
    });

    it('should start tour when tour button is clicked', async () => {
      const user = userEvent.setup();
      localStorage.setItem('dashboard-tour-seen', 'true');
      
      render(<DashboardTour />);

      const tourButton = screen.getByTitle('Take dashboard tour');
      await user.click(tourButton);

      await waitFor(() => {
        expect(screen.getByText('Your Profile Hub')).toBeInTheDocument();
      });
    });

    it('should navigate through tour steps', async () => {
      const user = userEvent.setup();
      
      render(<DashboardTour />);

      await waitFor(() => {
        expect(screen.getByText('Your Profile Hub')).toBeInTheDocument();
      });

      // Click next
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      expect(screen.getByText('Navigation Sidebar')).toBeInTheDocument();
    });

    it('should go back to previous step', async () => {
      const user = userEvent.setup();
      
      render(<DashboardTour />);

      await waitFor(() => {
        expect(screen.getByText('Your Profile Hub')).toBeInTheDocument();
      });

      // Go to next step
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      // Go back
      const previousButton = screen.getByText('Previous');
      await user.click(previousButton);

      expect(screen.getByText('Your Profile Hub')).toBeInTheDocument();
    });

    it('should skip tour when skip button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<DashboardTour />);

      await waitFor(() => {
        expect(screen.getByText('Your Profile Hub')).toBeInTheDocument();
      });

      const skipButton = screen.getByText('Skip Tour');
      await user.click(skipButton);

      expect(screen.queryByText('Your Profile Hub')).not.toBeInTheDocument();
      expect(localStorage.getItem('dashboard-tour-seen')).toBe('true');
    });

    it('should complete tour on last step', async () => {
      const user = userEvent.setup();
      
      render(<DashboardTour />);

      await waitFor(() => {
        expect(screen.getByText('Your Profile Hub')).toBeInTheDocument();
      });

      // Navigate to last step
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next');
        await user.click(nextButton);
      }

      // Should show finish button on last step
      const finishButton = screen.getByText('Finish');
      await user.click(finishButton);

      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
      expect(localStorage.getItem('dashboard-tour-seen')).toBe('true');
    });
  });

  describe('LegacyFunctionalityPreserver', () => {
    it('should render without errors', () => {
      render(<LegacyFunctionalityPreserver />);
      // Component should not render any visible content
      expect(document.body).toBeInTheDocument();
    });

    it('should preserve scroll position in session storage', () => {
      // Mock scroll position
      Object.defineProperty(window, 'scrollX', { value: 100, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 200, writable: true });

      render(<LegacyFunctionalityPreserver />);

      // Simulate beforeunload event
      const beforeUnloadEvent = new Event('beforeunload');
      window.dispatchEvent(beforeUnloadEvent);

      const savedPosition = sessionStorage.getItem('legacy-scroll-position');
      expect(savedPosition).toBe(JSON.stringify({ x: 100, y: 200 }));
    });

    it('should migrate legacy localStorage data', () => {
      // Set up legacy data
      localStorage.setItem('social-preferences', JSON.stringify({
        theme: 'dark',
        notifications: true
      }));

      render(<LegacyFunctionalityPreserver />);

      const migratedPreferences = localStorage.getItem('dashboard-preferences');
      expect(migratedPreferences).toBeTruthy();
      
      const parsed = JSON.parse(migratedPreferences!);
      expect(parsed.theme).toBe('dark');
      expect(parsed.notifications).toBe(true);
      expect(parsed.migratedFrom).toBe('social-page');
    });

    it('should not overwrite existing dashboard preferences', () => {
      // Set up existing dashboard preferences
      localStorage.setItem('dashboard-preferences', JSON.stringify({
        theme: 'light',
        existing: true
      }));

      // Set up legacy data
      localStorage.setItem('social-preferences', JSON.stringify({
        theme: 'dark',
        notifications: true
      }));

      render(<LegacyFunctionalityPreserver />);

      const preferences = localStorage.getItem('dashboard-preferences');
      const parsed = JSON.parse(preferences!);
      
      // Should not overwrite existing preferences
      expect(parsed.theme).toBe('light');
      expect(parsed.existing).toBe(true);
    });

    it('should handle legacy custom events', () => {
      const eventListener = jest.fn();
      window.addEventListener('dashboard-post-created', eventListener);

      render(<LegacyFunctionalityPreserver />);

      // Dispatch legacy event
      const legacyEvent = new CustomEvent('social-post-created', {
        detail: { postId: '123' }
      });
      window.dispatchEvent(legacyEvent);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            postId: '123',
            source: 'legacy-compatibility'
          })
        })
      );

      window.removeEventListener('dashboard-post-created', eventListener);
    });
  });

  describe('Integration Tests', () => {
    it('should show migration notice on first dashboard visit', () => {
      const onDismiss = jest.fn();
      
      render(
        <MigrationNotice type="dashboard" onDismiss={onDismiss} />
      );

      expect(screen.getByText('🎉 Welcome to the New Dashboard!')).toBeInTheDocument();
      expect(screen.getByText('Got it!')).toBeInTheDocument();
      expect(screen.getByText('Take Tour')).toBeInTheDocument();
    });

    it('should handle tour and migration notice interaction', async () => {
      const user = userEvent.setup();
      
      // Render migration notice first
      const { rerender } = render(
        <MigrationNotice type="dashboard" onDismiss={() => {}} />
      );

      const takeTourButton = screen.getByText('Take Tour');
      await user.click(takeTourButton);

      // Rerender with tour component
      rerender(<DashboardTour />);

      await waitFor(() => {
        expect(screen.getByText('Your Profile Hub')).toBeInTheDocument();
      });
    });
  });
});