import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileNavigationOverlay, { useMobileOverlay } from '../MobileNavigationOverlay';

// Mock the useBreakpoints hook
jest.mock('@/hooks/useMediaQuery', () => ({
  useBreakpoints: jest.fn(),
}));

const mockUseBreakpoints = require('@/hooks/useMediaQuery').useBreakpoints;

describe('MobileNavigationOverlay', () => {
  const mockOnClose = jest.fn();
  const mockChildren = <div data-testid="overlay-content">Overlay Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock body style
    Object.defineProperty(document.body, 'style', {
      value: { overflow: '' },
      writable: true,
    });
  });

  describe('Mobile Behavior', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      });
    });

    it('renders overlay when open on mobile', () => {
      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('overlay-content')).toBeInTheDocument();
    });

    it('does not render overlay when closed', () => {
      render(
        <MobileNavigationOverlay isOpen={false} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('overlay-content')).not.toBeInTheDocument();
    });

    it('renders with title when provided', () => {
      render(
        <MobileNavigationOverlay
          isOpen={true}
          onClose={mockOnClose}
          title="Test Title"
        >
          {mockChildren}
        </MobileNavigationOverlay>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'overlay-title');
    });

    it('renders without title when not provided', () => {
      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-labelledby');
    });

    it('positions overlay on the left by default', () => {
      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      const overlay = screen.getByRole('dialog');
      expect(overlay).toHaveClass('left-0');
    });

    it('positions overlay on the right when specified', () => {
      render(
        <MobileNavigationOverlay
          isOpen={true}
          onClose={mockOnClose}
          position="right"
        >
          {mockChildren}
        </MobileNavigationOverlay>
      );

      const overlay = screen.getByRole('dialog');
      expect(overlay).toHaveClass('right-0');
    });

    it('applies custom className', () => {
      render(
        <MobileNavigationOverlay
          isOpen={true}
          onClose={mockOnClose}
          className="custom-overlay"
        >
          {mockChildren}
        </MobileNavigationOverlay>
      );

      const overlay = screen.getByRole('dialog');
      expect(overlay).toHaveClass('custom-overlay');
    });
  });

  describe('Desktop Behavior', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
      });
    });

    it('does not render on desktop even when open', () => {
      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('overlay-content')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      });
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      const closeButton = screen.getByRole('button', { name: /close overlay/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when other keys are pressed', () => {
      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      fireEvent.keyDown(document, { key: 'Enter', code: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space', code: 'Space' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Management', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      });
    });

    it('prevents body scroll when overlay is open', () => {
      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when overlay is closed', () => {
      const { rerender } = render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <MobileNavigationOverlay isOpen={false} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      expect(document.body.style.overflow).toBe('unset');
    });

    it('restores body scroll when component unmounts', () => {
      const { unmount } = render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      });
    });

    it('has proper ARIA attributes', () => {
      render(
        <MobileNavigationOverlay
          isOpen={true}
          onClose={mockOnClose}
          title="Test Title"
        >
          {mockChildren}
        </MobileNavigationOverlay>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'overlay-title');
    });

    it('has proper close button accessibility', () => {
      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      const closeButton = screen.getByRole('button', { name: /close overlay/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close overlay');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <MobileNavigationOverlay isOpen={true} onClose={mockOnClose}>
          {mockChildren}
        </MobileNavigationOverlay>
      );

      const closeButton = screen.getByRole('button', { name: /close overlay/i });
      
      // Tab to the close button
      await user.tab();
      expect(closeButton).toHaveFocus();

      // Press Enter to close
      await user.keyboard('{Enter}');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useMobileOverlay Hook', () => {
  beforeEach(() => {
    mockUseBreakpoints.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLargeDesktop: false,
    });
  });

  const TestComponent = ({ initialState = false }: { initialState?: boolean }) => {
    const overlay = useMobileOverlay(initialState);
    
    return (
      <div>
        <div data-testid="is-open">{overlay.isOpen.toString()}</div>
        <button onClick={overlay.open} data-testid="open-btn">Open</button>
        <button onClick={overlay.close} data-testid="close-btn">Close</button>
        <button onClick={overlay.toggle} data-testid="toggle-btn">Toggle</button>
      </div>
    );
  };

  it('initializes with default state', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });

  it('initializes with custom initial state', () => {
    render(<TestComponent initialState={true} />);
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
  });

  it('opens overlay when open is called', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByTestId('open-btn'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
  });

  it('closes overlay when close is called', async () => {
    const user = userEvent.setup();
    render(<TestComponent initialState={true} />);

    await user.click(screen.getByTestId('close-btn'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });

  it('toggles overlay state when toggle is called', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    // Initially false, toggle to true
    await user.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');

    // Toggle back to false
    await user.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });

  it('auto-closes when switching from mobile to desktop', () => {
    const { rerender } = render(<TestComponent initialState={true} />);
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');

    // Switch to desktop
    mockUseBreakpoints.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLargeDesktop: false,
    });

    rerender(<TestComponent initialState={true} />);
    
    // Should auto-close on desktop
    waitFor(() => {
      expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    });
  });
});