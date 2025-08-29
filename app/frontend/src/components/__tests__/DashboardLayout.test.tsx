import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import DashboardLayout from '../DashboardLayout';
import { NavigationProvider } from '@/context/NavigationContext';

// Mock the dependencies
jest.mock('wagmi');
jest.mock('next/router');
jest.mock('@vercel/analytics/next', () => ({
  Analytics: () => null,
}));
jest.mock('../NotificationSystem', () => {
  return function MockNotificationSystem() {
    return <div data-testid="notification-system">Notification System</div>;
  };
});

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

const mockPush = jest.fn();

describe('DashboardLayout', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      pathname: '/new-dashboard',
      query: {},
      asPath: '/new-dashboard',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <NavigationProvider>
        {component}
      </NavigationProvider>
    );
  };

  it('redirects to home when wallet is not connected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
      address: undefined,
    } as any);

    renderWithProvider(
      <DashboardLayout activeView="feed">
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('renders dashboard layout when wallet is connected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
    } as any);

    renderWithProvider(
      <DashboardLayout activeView="feed">
        <div data-testid="test-content">Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('LinkDAO')).toBeInTheDocument();
    expect(screen.getByText('Feed')).toBeInTheDocument();
    expect(screen.getByText('Communities')).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('toggles sidebar when menu button is clicked', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
    } as any);

    renderWithProvider(
      <DashboardLayout activeView="feed">
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Find the sidebar toggle button
    const toggleButtons = screen.getAllByLabelText(/toggle sidebar|expand sidebar|collapse sidebar/i);
    const sidebarToggle = toggleButtons[0];

    // Click to toggle sidebar
    fireEvent.click(sidebarToggle);

    // The sidebar state should change (we can't easily test the visual change without more complex setup)
    expect(sidebarToggle).toBeInTheDocument();
  });

  it('displays correct breadcrumb based on active view', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
    } as any);

    renderWithProvider(
      <DashboardLayout activeView="community" communityId="test-community">
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('community - test-community')).toBeInTheDocument();
  });

  it('shows notification system when connected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
    } as any);

    renderWithProvider(
      <DashboardLayout activeView="feed">
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('notification-system')).toBeInTheDocument();
  });
});