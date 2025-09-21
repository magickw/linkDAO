import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MobileSidebarManager, { useMobileSidebarControl } from '../MobileSidebarManager';

// Mock the hooks
jest.mock('@/hooks/useMobileSidebar', () => ({
  useMobileSidebar: jest.fn(() => ({
    sidebarState: {
      leftSidebarOpen: false,
      rightSidebarOpen: false,
      activeOverlay: null
    },
    toggleLeftSidebar: jest.fn(),
    toggleRightSidebar: jest.fn(),
    closeSidebars: jest.fn(),
    isAnyOpen: false,
    focusManagement: {
      trapFocus: jest.fn(),
      restoreFocus: jest.fn()
    }
  }))
}));

jest.mock('@/design-system/hooks/useResponsive', () => ({
  useResponsive: jest.fn(() => ({
    isMobile: true,
    isTablet: false,
    isDesktop: false
  }))
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileTap, animate, initial, exit, variants, transition, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, whileTap, animate, initial, exit, variants, transition, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('MobileSidebarManager', () => {
  const mockLeftContent = <div>Left Sidebar Content</div>;
  const mockRightContent = <div>Right Sidebar Content</div>;
  const mockChildren = <div>Main Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render main content', () => {
    render(
      <MobileSidebarManager>
        {mockChildren}
      </MobileSidebarManager>
    );

    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('should render left sidebar toggle when left content is provided', () => {
    render(
      <MobileSidebarManager
        leftSidebarContent={mockLeftContent}
        showLeftToggle={true}
      >
        {mockChildren}
      </MobileSidebarManager>
    );

    expect(screen.getByLabelText(/open left menu/i)).toBeInTheDocument();
  });

  it('should render right sidebar toggle when right content is provided', () => {
    render(
      <MobileSidebarManager
        rightSidebarContent={mockRightContent}
        showRightToggle={true}
      >
        {mockChildren}
      </MobileSidebarManager>
    );

    expect(screen.getByLabelText(/open right information/i)).toBeInTheDocument();
  });

  it('should not render toggles when content is not provided', () => {
    render(
      <MobileSidebarManager>
        {mockChildren}
      </MobileSidebarManager>
    );

    expect(screen.queryByLabelText(/open left/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/open right/i)).not.toBeInTheDocument();
  });

  it('should not render toggles when disabled', () => {
    render(
      <MobileSidebarManager
        leftSidebarContent={mockLeftContent}
        rightSidebarContent={mockRightContent}
        showLeftToggle={false}
        showRightToggle={false}
      >
        {mockChildren}
      </MobileSidebarManager>
    );

    expect(screen.queryByLabelText(/open left/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/open right/i)).not.toBeInTheDocument();
  });

  it('should call toggle functions when buttons are clicked', () => {
    const mockToggleLeft = jest.fn();
    const mockToggleRight = jest.fn();

    const { useMobileSidebar } = require('@/hooks/useMobileSidebar');
    useMobileSidebar.mockReturnValue({
      sidebarState: {
        leftSidebarOpen: false,
        rightSidebarOpen: false,
        activeOverlay: null
      },
      toggleLeftSidebar: mockToggleLeft,
      toggleRightSidebar: mockToggleRight,
      closeSidebars: jest.fn(),
      isAnyOpen: false,
      focusManagement: {
        trapFocus: jest.fn(),
        restoreFocus: jest.fn()
      }
    });

    render(
      <MobileSidebarManager
        leftSidebarContent={mockLeftContent}
        rightSidebarContent={mockRightContent}
      >
        {mockChildren}
      </MobileSidebarManager>
    );

    const leftToggle = screen.getByLabelText(/open left menu/i);
    const rightToggle = screen.getByLabelText(/open right information/i);

    fireEvent.click(leftToggle);
    expect(mockToggleLeft).toHaveBeenCalled();

    fireEvent.click(rightToggle);
    expect(mockToggleRight).toHaveBeenCalled();
  });

  it('should render sidebar overlays when open', () => {
    const { useMobileSidebar } = require('@/hooks/useMobileSidebar');
    useMobileSidebar.mockReturnValue({
      sidebarState: {
        leftSidebarOpen: true,
        rightSidebarOpen: false,
        activeOverlay: 'left'
      },
      toggleLeftSidebar: jest.fn(),
      toggleRightSidebar: jest.fn(),
      closeSidebars: jest.fn(),
      isAnyOpen: true,
      focusManagement: {
        trapFocus: jest.fn(),
        restoreFocus: jest.fn()
      }
    });

    render(
      <MobileSidebarManager
        leftSidebarContent={mockLeftContent}
        leftSidebarTitle="Navigation"
      >
        {mockChildren}
      </MobileSidebarManager>
    );

    expect(screen.getByText('Left Sidebar Content')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('should not render on desktop', () => {
    const { useResponsive } = require('@/design-system/hooks/useResponsive');
    useResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true
    });

    render(
      <MobileSidebarManager
        leftSidebarContent={mockLeftContent}
        rightSidebarContent={mockRightContent}
      >
        {mockChildren}
      </MobileSidebarManager>
    );

    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(screen.queryByLabelText(/open left/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/open right/i)).not.toBeInTheDocument();
  });

  it('should disable main content pointer events when sidebar is open', () => {
    const { useMobileSidebar } = require('@/hooks/useMobileSidebar');
    useMobileSidebar.mockReturnValue({
      sidebarState: {
        leftSidebarOpen: true,
        rightSidebarOpen: false,
        activeOverlay: 'left'
      },
      toggleLeftSidebar: jest.fn(),
      toggleRightSidebar: jest.fn(),
      closeSidebars: jest.fn(),
      isAnyOpen: true,
      focusManagement: {
        trapFocus: jest.fn(),
        restoreFocus: jest.fn()
      }
    });

    render(
      <MobileSidebarManager
        leftSidebarContent={mockLeftContent}
      >
        {mockChildren}
      </MobileSidebarManager>
    );

    const mainContent = screen.getByText('Main Content').parentElement;
    expect(mainContent?.className).toContain('pointer-events-none');
  });

  it('should use custom toggle variants', () => {
    render(
      <MobileSidebarManager
        leftSidebarContent={mockLeftContent}
        rightSidebarContent={mockRightContent}
        leftToggleVariant="filter"
        rightToggleVariant="custom"
      >
        {mockChildren}
      </MobileSidebarManager>
    );

    // The toggles should be rendered with custom variants
    expect(screen.getByRole('button', { name: /open left/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open right/i })).toBeInTheDocument();
  });
});

describe('useMobileSidebarControl', () => {
  it('should provide sidebar control functions', () => {
    const TestComponent = () => {
      const control = useMobileSidebarControl();
      
      return (
        <div>
          <div>Left Open: {control.isLeftOpen.toString()}</div>
          <div>Right Open: {control.isRightOpen.toString()}</div>
          <div>Any Open: {control.isAnyOpen.toString()}</div>
          <button onClick={control.openLeft}>Open Left</button>
          <button onClick={control.openRight}>Open Right</button>
          <button onClick={control.close}>Close</button>
          <button onClick={control.toggleLeft}>Toggle Left</button>
          <button onClick={control.toggleRight}>Toggle Right</button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText(/Left Open:/)).toBeInTheDocument();
    expect(screen.getByText(/Right Open:/)).toBeInTheDocument();
    expect(screen.getByText(/Any Open:/)).toBeInTheDocument();
    expect(screen.getByText('Open Left')).toBeInTheDocument();
    expect(screen.getByText('Open Right')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.getByText('Toggle Left')).toBeInTheDocument();
    expect(screen.getByText('Toggle Right')).toBeInTheDocument();
  });
});