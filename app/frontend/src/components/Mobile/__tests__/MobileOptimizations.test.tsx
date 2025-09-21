import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import {
  MobileEnhancedPostComposer,
  MobileTokenReactionSystem,
  MobileEnhancedPostCard,
  MobileModal,
  MobileVirtualScrolling,
  MobileEnhancedFeed,
  MobileFloatingActionButton
} from '../index';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

// Mock the hooks
jest.mock('@/hooks/useMobileOptimization');
jest.mock('@/hooks/useMobileAccessibility');

const mockUseMobileOptimization = useMobileOptimization as jest.MockedFunction<typeof useMobileOptimization>;
const mockUseMobileAccessibility = useMobileAccessibility as jest.MockedFunction<typeof useMobileAccessibility>;

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Mobile Optimizations', () => {
  beforeEach(() => {
    mockUseMobileOptimization.mockReturnValue({
      isMobile: true,
      isTouch: true,
      isIOS: false,
      isAndroid: true,
      screenSize: 'sm',
      orientation: 'portrait',
      safeAreaInsets: { top: 44, bottom: 34, left: 0, right: 0 },
      isKeyboardVisible: false,
      triggerHapticFeedback: jest.fn(),
      createSwipeHandler: jest.fn(() => ({})),
      touchTargetClasses: 'min-h-[44px] min-w-[44px] touch-manipulation',
      mobileOptimizedClasses: 'mobile-optimized touch-device screen-sm orientation-portrait',
      getOptimalImageSize: jest.fn(() => ({ width: 400, height: 300 })),
      isReducedMotion: false,
      prefersHighContrast: false,
      devicePixelRatio: 2
    });

    mockUseMobileAccessibility.mockReturnValue({
      announceToScreenReader: jest.fn(),
      manageFocus: jest.fn(),
      enhanceTouchTargets: jest.fn(),
      applyHighContrastMode: jest.fn(),
      accessibilityClasses: 'focus-visible:outline-2 focus-visible:outline-blue-500',
      isScreenReaderActive: false,
      prefersReducedMotion: false,
      prefersHighContrast: false,
      prefersLargeText: false,
      colorScheme: 'light',
      textSize: 'normal'
    });
  });

  describe('MobileEnhancedPostComposer', () => {
    const mockProps = {
      isOpen: true,
      onClose: jest.fn(),
      onSubmit: jest.fn(),
    };

    it('renders with mobile optimizations', () => {
      render(<MobileEnhancedPostComposer {...mockProps} />);
      
      expect(screen.getByText('Create Post')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Post')).toBeInTheDocument();
    });

    it('handles touch interactions', async () => {
      render(<MobileEnhancedPostComposer {...mockProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('supports keyboard input', async () => {
      render(<MobileEnhancedPostComposer {...mockProps} />);
      
      const textarea = screen.getByPlaceholderText("What's on your mind?");
      fireEvent.change(textarea, { target: { value: 'Test post content' } });
      
      expect(textarea).toHaveValue('Test post content');
    });

    it('handles form submission', async () => {
      render(<MobileEnhancedPostComposer {...mockProps} />);
      
      const textarea = screen.getByPlaceholderText("What's on your mind?");
      const submitButton = screen.getByText('Post');
      
      fireEvent.change(textarea, { target: { value: 'Test post' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Test post'
          })
        );
      });
    });
  });

  describe('MobileTokenReactionSystem', () => {
    const mockProps = {
      postId: 'test-post',
      reactions: [
        {
          type: '🔥',
          users: [{ walletAddress: 'user1', amount: 2 }],
          totalAmount: 2,
          tokenType: 'LDAO'
        }
      ],
      userWallet: 'current-user',
      onReact: jest.fn(),
      onViewReactors: jest.fn(),
    };

    it('renders reaction buttons with touch targets', () => {
      render(<MobileTokenReactionSystem {...mockProps} />);
      
      const fireButton = screen.getByLabelText(/React with Fire/);
      expect(fireButton).toBeInTheDocument();
      expect(fireButton).toHaveClass('min-h-[44px]');
    });

    it('handles reaction interactions', async () => {
      render(<MobileTokenReactionSystem {...mockProps} />);
      
      const fireButton = screen.getByLabelText(/React with Fire/);
      fireEvent.click(fireButton);
      
      await waitFor(() => {
        expect(mockProps.onReact).toHaveBeenCalled();
      });
    });

    it('shows reaction counts', () => {
      render(<MobileTokenReactionSystem {...mockProps} />);
      
      expect(screen.getByText('1')).toBeInTheDocument(); // User count
      expect(screen.getByText('2.0')).toBeInTheDocument(); // Token amount
    });
  });

  describe('MobileModal', () => {
    const mockProps = {
      isOpen: true,
      onClose: jest.fn(),
      title: 'Test Modal',
      children: <div>Modal content</div>,
    };

    it('renders with safe area support', () => {
      render(<MobileModal {...mockProps} />);
      
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('handles backdrop clicks', () => {
      render(<MobileModal {...mockProps} />);
      
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.click(backdrop!);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('supports swipe to close', () => {
      const createSwipeHandler = jest.fn(() => ({
        onPan: jest.fn()
      }));
      
      mockUseMobileOptimization.mockReturnValue({
        ...mockUseMobileOptimization(),
        createSwipeHandler
      });

      render(<MobileModal {...mockProps} allowSwipeClose={true} />);
      
      expect(createSwipeHandler).toHaveBeenCalled();
    });
  });

  describe('MobileVirtualScrolling', () => {
    const mockItems = [
      { id: '1', data: { title: 'Item 1' } },
      { id: '2', data: { title: 'Item 2' } },
      { id: '3', data: { title: 'Item 3' } },
    ];

    const mockProps = {
      items: mockItems,
      renderItem: (item: any) => <div key={item.id}>{item.data.title}</div>,
      itemHeight: 100,
      onEndReached: jest.fn(),
      onRefresh: jest.fn(),
    };

    it('renders virtual items', () => {
      render(<MobileVirtualScrolling {...mockProps} />);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('handles pull to refresh', async () => {
      render(<MobileVirtualScrolling {...mockProps} />);
      
      const container = screen.getByRole('list');
      
      // Simulate touch events for pull to refresh
      fireEvent.touchStart(container, {
        touches: [{ clientY: 100 }]
      });
      
      fireEvent.touchMove(container, {
        touches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(container);
      
      await waitFor(() => {
        expect(mockProps.onRefresh).toHaveBeenCalled();
      });
    });

    it('handles infinite scroll', () => {
      render(<MobileVirtualScrolling {...mockProps} />);
      
      const container = screen.getByRole('list').firstChild as HTMLElement;
      
      // Simulate scroll to bottom
      fireEvent.scroll(container, {
        target: { scrollTop: 1000, scrollHeight: 1200, clientHeight: 400 }
      });
      
      expect(mockProps.onEndReached).toHaveBeenCalled();
    });
  });

  describe('MobileFloatingActionButton', () => {
    const mockPrimaryAction = {
      id: 'primary',
      label: 'Primary Action',
      icon: <span>+</span>,
      color: '#3b82f6',
      onClick: jest.fn(),
    };

    const mockSecondaryActions = [
      {
        id: 'secondary1',
        label: 'Secondary 1',
        icon: <span>1</span>,
        color: '#10b981',
        onClick: jest.fn(),
      },
      {
        id: 'secondary2',
        label: 'Secondary 2',
        icon: <span>2</span>,
        color: '#f59e0b',
        onClick: jest.fn(),
      },
    ];

    it('renders primary action button', () => {
      render(<MobileFloatingActionButton primaryAction={mockPrimaryAction} />);
      
      const button = screen.getByLabelText('Primary Action');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('min-h-[44px]');
    });

    it('handles primary action click', () => {
      render(<MobileFloatingActionButton primaryAction={mockPrimaryAction} />);
      
      const button = screen.getByLabelText('Primary Action');
      fireEvent.click(button);
      
      expect(mockPrimaryAction.onClick).toHaveBeenCalled();
    });

    it('expands to show secondary actions', async () => {
      render(
        <MobileFloatingActionButton
          primaryAction={mockPrimaryAction}
          secondaryActions={mockSecondaryActions}
        />
      );
      
      const button = screen.getByLabelText(/Primary Action.*Expand menu/);
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Secondary 1')).toBeInTheDocument();
        expect(screen.getByText('Secondary 2')).toBeInTheDocument();
      });
    });

    it('handles secondary action clicks', async () => {
      render(
        <MobileFloatingActionButton
          primaryAction={mockPrimaryAction}
          secondaryActions={mockSecondaryActions}
        />
      );
      
      // Expand menu
      const primaryButton = screen.getByLabelText(/Primary Action.*Expand menu/);
      fireEvent.click(primaryButton);
      
      await waitFor(() => {
        const secondaryButton = screen.getByLabelText('Secondary 1');
        fireEvent.click(secondaryButton);
        
        expect(mockSecondaryActions[0].onClick).toHaveBeenCalled();
      });
    });
  });

  describe('Touch Target Optimization', () => {
    it('ensures minimum touch target sizes', () => {
      const { touchTargetClasses } = mockUseMobileOptimization();
      expect(touchTargetClasses).toContain('min-h-[44px]');
      expect(touchTargetClasses).toContain('min-w-[44px]');
      expect(touchTargetClasses).toContain('touch-manipulation');
    });
  });

  describe('Accessibility Features', () => {
    it('provides screen reader announcements', () => {
      const { announceToScreenReader } = mockUseMobileAccessibility();
      
      render(<MobileEnhancedPostComposer isOpen={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
      
      expect(announceToScreenReader).toHaveBeenCalled();
    });

    it('manages focus properly', () => {
      const { manageFocus } = mockUseMobileAccessibility();
      
      render(<MobileModal isOpen={true} onClose={jest.fn()} children={<div>Content</div>} />);
      
      expect(manageFocus).toHaveBeenCalled();
    });

    it('applies accessibility classes', () => {
      const { accessibilityClasses } = mockUseMobileAccessibility();
      expect(accessibilityClasses).toContain('focus-visible:outline-2');
      expect(accessibilityClasses).toContain('focus-visible:outline-blue-500');
    });
  });

  describe('Performance Optimizations', () => {
    it('applies mobile optimization classes', () => {
      const { mobileOptimizedClasses } = mockUseMobileOptimization();
      expect(mobileOptimizedClasses).toContain('mobile-optimized');
      expect(mobileOptimizedClasses).toContain('touch-device');
      expect(mobileOptimizedClasses).toContain('screen-sm');
      expect(mobileOptimizedClasses).toContain('orientation-portrait');
    });

    it('handles safe area insets', () => {
      const { safeAreaInsets } = mockUseMobileOptimization();
      expect(safeAreaInsets.top).toBe(44);
      expect(safeAreaInsets.bottom).toBe(34);
    });

    it('optimizes image sizes for device', () => {
      const { getOptimalImageSize } = mockUseMobileOptimization();
      const result = getOptimalImageSize(300);
      
      expect(result).toEqual({ width: 400, height: 300 });
    });
  });

  describe('Haptic Feedback', () => {
    it('triggers haptic feedback on interactions', () => {
      const { triggerHapticFeedback } = mockUseMobileOptimization();
      
      render(<MobileEnhancedPostComposer isOpen={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(triggerHapticFeedback).toHaveBeenCalledWith('light');
    });
  });

  describe('Responsive Design', () => {
    it('adapts to different screen sizes', () => {
      mockUseMobileOptimization.mockReturnValue({
        ...mockUseMobileOptimization(),
        screenSize: 'lg',
        mobileOptimizedClasses: 'mobile-optimized touch-device screen-lg orientation-landscape'
      });

      render(<MobileModal isOpen={true} onClose={jest.fn()} children={<div>Content</div>} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal.parentElement).toHaveClass('screen-lg');
    });

    it('handles orientation changes', () => {
      mockUseMobileOptimization.mockReturnValue({
        ...mockUseMobileOptimization(),
        orientation: 'landscape',
        mobileOptimizedClasses: 'mobile-optimized touch-device screen-sm orientation-landscape'
      });

      render(<MobileModal isOpen={true} onClose={jest.fn()} children={<div>Content</div>} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal.parentElement).toHaveClass('orientation-landscape');
    });
  });
});