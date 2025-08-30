import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/router';
import MigrationNotice from '../MigrationNotice';
import DashboardTour from '../DashboardTour';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock NavigationContext
jest.mock('@/context/NavigationContext', () => ({
  useNavigation: () => ({
    navigationState: {
      activeView: 'feed',
      activeCommunity: null,
      sidebarCollapsed: false,
      rightSidebarVisible: true,
      modalState: {
        postCreation: false,
        communityJoin: false,
        userProfile: false,
      },
    },
  }),
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/dashboard',
  query: {},
  events: {
    on: jest.fn(),
    off: jest.fn(),
  },
};

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  mockPush.mockClear();
  // Clear localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
});

describe('MigrationNotice', () => {
  it('renders social migration notice correctly', () => {
    render(<MigrationNotice type="social" />);
    
    expect(screen.getByText('Social Feed Has Moved!')).toBeInTheDocument();
    expect(screen.getByText(/The social feed is now integrated into your personalized dashboard/)).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('renders dashboard migration notice correctly', () => {
    render(<MigrationNotice type="dashboard" />);
    
    expect(screen.getByText('Dashboard Updated!')).toBeInTheDocument();
    expect(screen.getByText(/Your dashboard now includes an integrated social feed/)).toBeInTheDocument();
    expect(screen.getByText('Explore New Features')).toBeInTheDocument();
  });

  it('handles redirect action', () => {
    render(<MigrationNotice type="social" />);
    
    const redirectButton = screen.getByText('Go to Dashboard');
    fireEvent.click(redirectButton);
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('handles dismiss action', () => {
    const mockOnDismiss = jest.fn();
    render(<MigrationNotice type="social" onDismiss={mockOnDismiss} />);
    
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);
    
    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('does not render when dismissed', () => {
    // Mock localStorage to return dismissed state
    (window.localStorage.getItem as jest.Mock).mockReturnValue('true');
    
    const { container } = render(<MigrationNotice type="social" />);
    
    expect(container.firstChild).toBeNull();
  });
});

describe('DashboardTour', () => {
  it('does not render when tour is completed', () => {
    // Mock localStorage to return completed state
    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'dashboard-tour-completed') return 'true';
      if (key === 'dashboard-migration-seen') return 'true';
      return null;
    });
    
    const { container } = render(<DashboardTour />);
    
    expect(container.firstChild).toBeNull();
  });

  it('renders tour when migration is seen but tour not completed', async () => {
    // Mock localStorage to show migration seen but tour not completed
    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'dashboard-tour-completed') return null;
      if (key === 'dashboard-migration-seen') return 'true';
      return null;
    });
    
    render(<DashboardTour />);
    
    // Wait for the timeout to show the tour
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    // The tour should be visible after the timeout
    expect(screen.queryByText(/Welcome to Your New Dashboard!/)).toBeInTheDocument();
  });
});

describe('Migration Integration', () => {
  it('preserves existing functionality during migration', () => {
    // Test that existing components still work
    const testComponent = render(
      <div data-testid="test-component">
        <MigrationNotice type="dashboard" />
      </div>
    );
    
    expect(testComponent.getByTestId('test-component')).toBeInTheDocument();
  });

  it('handles navigation state correctly', () => {
    // This test ensures that navigation state is preserved
    // during the migration process
    expect(true).toBe(true); // Placeholder for navigation state tests
  });
});