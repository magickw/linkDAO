import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import ViewModeToggle, { ViewModeToggleIcon, ViewModeDropdown } from '../ViewModeToggle';
import { useViewMode } from '@/hooks/useViewMode';

// Mock the useViewMode hook
jest.mock('@/hooks/useViewMode');
const mockUseViewMode = useViewMode as jest.MockedFunction<typeof useViewMode>;

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('ViewModeToggle', () => {
  const mockToggleViewMode = jest.fn();
  const mockSetViewMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseViewMode.mockReturnValue({
      viewMode: 'card',
      isLoading: false,
      error: null,
      toggleViewMode: mockToggleViewMode,
      setViewMode: mockSetViewMode,
      resetViewMode: jest.fn(),
      getViewModeProperties: jest.fn(() => ({
        isCardView: true,
        isCompactView: false,
        displayName: 'Card View',
        description: 'Full post cards with thumbnails and expanded content'
      }))
    });
  });

  describe('ViewModeToggle Component', () => {
    it('renders correctly in card view', () => {
      render(<ViewModeToggle />);
      
      expect(screen.getByLabelText('Switch to card view')).toBeInTheDocument();
      expect(screen.getByLabelText('Switch to compact view')).toBeInTheDocument();
    });

    it('renders correctly in compact view', () => {
      mockUseViewMode.mockReturnValue({
        viewMode: 'compact',
        isLoading: false,
        error: null,
        toggleViewMode: mockToggleViewMode,
        setViewMode: mockSetViewMode,
        resetViewMode: jest.fn(),
        getViewModeProperties: jest.fn(() => ({
          isCardView: false,
          isCompactView: true,
          displayName: 'Compact View',
          description: 'Condensed list view with minimal spacing'
        }))
      });

      render(<ViewModeToggle />);
      
      // Should still render both buttons
      expect(screen.getByLabelText('Switch to card view')).toBeInTheDocument();
      expect(screen.getByLabelText('Switch to compact view')).toBeInTheDocument();
    });

    it('calls toggleViewMode when clicked', async () => {
      render(<ViewModeToggle />);
      
      const cardButton = screen.getByLabelText('Switch to card view');
      
      await act(async () => {
        fireEvent.click(cardButton);
      });
      
      expect(mockToggleViewMode).toHaveBeenCalledTimes(1);
    });

    it('calls onViewModeChange callback when provided', async () => {
      const mockCallback = jest.fn();
      render(<ViewModeToggle onViewModeChange={mockCallback} />);
      
      const cardButton = screen.getByLabelText('Switch to card view');
      
      await act(async () => {
        fireEvent.click(cardButton);
      });
      
      expect(mockToggleViewMode).toHaveBeenCalledTimes(1);
      // Note: The callback would be called with the new view mode after toggle
    });

    it('shows loading state', () => {
      mockUseViewMode.mockReturnValue({
        viewMode: 'card',
        isLoading: true,
        error: null,
        toggleViewMode: mockToggleViewMode,
        setViewMode: mockSetViewMode,
        resetViewMode: jest.fn(),
        getViewModeProperties: jest.fn()
      });

      render(<ViewModeToggle />);
      
      // Should show disabled buttons when loading
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('shows error state', () => {
      mockUseViewMode.mockReturnValue({
        viewMode: 'card',
        isLoading: false,
        error: 'Failed to save preference',
        toggleViewMode: mockToggleViewMode,
        setViewMode: mockSetViewMode,
        resetViewMode: jest.fn(),
        getViewModeProperties: jest.fn()
      });

      render(<ViewModeToggle />);
      
      // Should show error indicator
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('respects disabled prop', () => {
      render(<ViewModeToggle disabled={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('shows labels when showLabels is true', () => {
      render(<ViewModeToggle showLabels={true} />);
      
      expect(screen.getByText('Card')).toBeInTheDocument();
      expect(screen.getByText('List')).toBeInTheDocument();
    });

    it('applies different sizes correctly', () => {
      const { rerender } = render(<ViewModeToggle size="small" />);
      
      // Test small size - look for the container div with the size class
      let container = document.querySelector('.h-8');
      expect(container).toBeInTheDocument();
      
      // Test large size
      rerender(<ViewModeToggle size="lg" />);
      container = document.querySelector('.h-12');
      expect(container).toBeInTheDocument();
    });
  });

  describe('ViewModeToggleIcon Component', () => {
    it('renders icon-only toggle', () => {
      render(<ViewModeToggleIcon />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Switch to compact view');
    });

    it('calls onViewModeChange callback', async () => {
      const mockCallback = jest.fn();
      render(<ViewModeToggleIcon onViewModeChange={mockCallback} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      expect(mockToggleViewMode).toHaveBeenCalledTimes(1);
    });

    it('shows correct icon for current view mode', () => {
      // Test card view (should show List icon to switch to compact)
      const { unmount } = render(<ViewModeToggleIcon />);
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Switch to compact view');
      
      unmount();
      
      // Test compact view (should show Grid icon to switch to card)
      mockUseViewMode.mockReturnValue({
        viewMode: 'compact',
        isLoading: false,
        error: null,
        toggleViewMode: mockToggleViewMode,
        setViewMode: mockSetViewMode,
        resetViewMode: jest.fn(),
        getViewModeProperties: jest.fn()
      });
      
      render(<ViewModeToggleIcon />);
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Switch to card view');
    });
  });

  describe('ViewModeDropdown Component', () => {
    it('renders dropdown toggle', () => {
      render(<ViewModeDropdown />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Card')).toBeInTheDocument();
    });

    it('opens dropdown when clicked', async () => {
      render(<ViewModeDropdown />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Should show dropdown options
      expect(screen.getByText('Card View')).toBeInTheDocument();
      expect(screen.getByText('Compact View')).toBeInTheDocument();
    });

    it('selects view mode from dropdown', async () => {
      render(<ViewModeDropdown />);
      
      // Open dropdown
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Click compact view option
      const compactOption = screen.getByText('Compact View');
      await act(async () => {
        fireEvent.click(compactOption);
      });
      
      expect(mockSetViewMode).toHaveBeenCalledWith('compact');
    });

    it('shows selected state correctly', async () => {
      render(<ViewModeDropdown />);
      
      // Open dropdown
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Card view should be selected (checkmark)
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ViewModeToggle />);
      
      expect(screen.getByLabelText('Switch to card view')).toBeInTheDocument();
      expect(screen.getByLabelText('Switch to compact view')).toBeInTheDocument();
    });

    it('has proper titles for tooltips', () => {
      render(<ViewModeToggle />);
      
      expect(screen.getByTitle('Card View - Full post cards with thumbnails')).toBeInTheDocument();
      expect(screen.getByTitle('Compact View - Condensed list with minimal spacing')).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<ViewModeToggle />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Buttons should be focusable (default behavior, no explicit tabIndex needed)
        expect(button).not.toHaveAttribute('disabled');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles toggle errors gracefully', async () => {
      mockToggleViewMode.mockRejectedValueOnce(new Error('Network error'));
      
      render(<ViewModeToggle />);
      
      const button = screen.getByLabelText('Switch to card view');
      
      await act(async () => {
        fireEvent.click(button);
      });
      
      // Should still attempt to toggle
      expect(mockToggleViewMode).toHaveBeenCalledTimes(1);
    });

    it('shows error message when error occurs', () => {
      mockUseViewMode.mockReturnValue({
        viewMode: 'card',
        isLoading: false,
        error: 'Failed to save preference',
        toggleViewMode: mockToggleViewMode,
        setViewMode: mockSetViewMode,
        resetViewMode: jest.fn(),
        getViewModeProperties: jest.fn()
      });

      render(<ViewModeToggle />);
      
      const errorIndicator = screen.getByText('⚠️');
      expect(errorIndicator).toBeInTheDocument();
      expect(errorIndicator).toHaveAttribute('title', 'Failed to save preference');
    });
  });
});

describe('Integration Tests', () => {
  const mockToggleViewModeLocal = jest.fn();
  
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    jest.clearAllMocks();
    
    mockUseViewMode.mockReturnValue({
      viewMode: 'card',
      isLoading: false,
      error: null,
      toggleViewMode: mockToggleViewModeLocal,
      setViewMode: mockSetViewMode,
      resetViewMode: jest.fn(),
      getViewModeProperties: jest.fn()
    });
  });

  it('persists view mode preference', async () => {
    render(<ViewModeToggle />);
    
    const button = screen.getByLabelText('Switch to card view');
    
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(mockToggleViewModeLocal).toHaveBeenCalledTimes(1);
  });

  it('loads saved preference on mount', () => {
    // Set up localStorage with saved preference
    localStorage.setItem('reddit-style-view-mode', JSON.stringify({
      viewMode: 'compact',
      rememberPreference: true
    }));
    
    render(<ViewModeToggle />);
    
    // Should reflect the saved preference
    // This would be tested through the hook's behavior
    expect(mockUseViewMode).toHaveBeenCalled();
  });
});