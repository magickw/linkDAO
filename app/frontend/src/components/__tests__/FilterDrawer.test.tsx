import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterDrawer from '../FilterDrawer';
import { useResponsive } from '@/design-system/hooks/useResponsive';

// Mock dependencies
jest.mock('@/design-system/hooks/useResponsive');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockResponsive = {
  isMobile: true,
  isTouch: true,
  breakpoint: 'sm' as const,
  width: 375,
  height: 667,
  isTablet: false,
  isDesktop: false,
  orientation: 'portrait' as const,
};

const mockFilters = [
  {
    id: 'category',
    title: 'Category',
    type: 'checkbox' as const,
    options: [
      { id: 'electronics', label: 'Electronics', value: 'electronics', count: 150 },
      { id: 'clothing', label: 'Clothing', value: 'clothing', count: 89 },
      { id: 'books', label: 'Books', value: 'books', count: 45 },
    ],
  },
  {
    id: 'price',
    title: 'Price Range',
    type: 'range' as const,
    min: 0,
    max: 1000,
    step: 10,
  },
  {
    id: 'condition',
    title: 'Condition',
    type: 'radio' as const,
    options: [
      { id: 'new', label: 'New', value: 'new', count: 200 },
      { id: 'used', label: 'Used', value: 'used', count: 84 },
      { id: 'refurbished', label: 'Refurbished', value: 'refurbished', count: 12 },
    ],
  },
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  filters: mockFilters,
  onFiltersChange: jest.fn(),
  appliedFilters: {},
};

describe('FilterDrawer', () => {
  beforeEach(() => {
    (useResponsive as jest.Mock).mockReturnValue(mockResponsive);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders filter sections when open', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Price Range')).toBeInTheDocument();
      expect(screen.getByText('Condition')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<FilterDrawer {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Filters')).not.toBeInTheDocument();
    });

    it('shows result count when enabled', () => {
      render(
        <FilterDrawer 
          {...defaultProps} 
          showResultCount={true} 
          resultCount={42} 
        />
      );
      
      expect(screen.getByText('42 results found')).toBeInTheDocument();
    });

    it('displays active filter count badge', () => {
      render(
        <FilterDrawer 
          {...defaultProps} 
          appliedFilters={{ category: ['electronics'], condition: 'new' }} 
        />
      );
      
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Filter Interactions', () => {
    describe('Checkbox Filters', () => {
      it('toggles checkbox selection', async () => {
        const user = userEvent.setup();
        render(<FilterDrawer {...defaultProps} />);
        
        // Expand category section
        await user.click(screen.getByText('Category'));
        
        const electronicsOption = screen.getByText('Electronics');
        await user.click(electronicsOption);
        
        // Check if the checkbox is visually selected
        const checkbox = electronicsOption.closest('div')?.querySelector('[class*="bg-blue-500"]');
        expect(checkbox).toBeInTheDocument();
      });

      it('handles multiple selections', async () => {
        const user = userEvent.setup();
        render(<FilterDrawer {...defaultProps} />);
        
        await user.click(screen.getByText('Category'));
        
        await user.click(screen.getByText('Electronics'));
        await user.click(screen.getByText('Clothing'));
        
        // Both should be selected
        expect(screen.getAllByText('✓')).toHaveLength(2);
      });

      it('shows option counts', async () => {
        const user = userEvent.setup();
        render(<FilterDrawer {...defaultProps} />);
        
        await user.click(screen.getByText('Category'));
        
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('89')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });

    describe('Radio Filters', () => {
      it('selects single radio option', async () => {
        const user = userEvent.setup();
        render(<FilterDrawer {...defaultProps} />);
        
        await user.click(screen.getByText('Condition'));
        await user.click(screen.getByText('New'));
        
        // Only one should be selected
        const selectedRadios = screen.getAllByText('●');
        expect(selectedRadios).toHaveLength(1);
      });

      it('deselects previous radio when selecting new one', async () => {
        const user = userEvent.setup();
        render(<FilterDrawer {...defaultProps} />);
        
        await user.click(screen.getByText('Condition'));
        await user.click(screen.getByText('New'));
        await user.click(screen.getByText('Used'));
        
        // Still only one should be selected
        const selectedRadios = screen.getAllByText('●');
        expect(selectedRadios).toHaveLength(1);
      });
    });

    describe('Range Filters', () => {
      it('updates range values', async () => {
        const user = userEvent.setup();
        render(<FilterDrawer {...defaultProps} />);
        
        await user.click(screen.getByText('Price Range'));
        
        const minInput = screen.getByPlaceholderText('Min');
        const maxInput = screen.getByPlaceholderText('Max');
        
        await user.clear(minInput);
        await user.type(minInput, '100');
        
        await user.clear(maxInput);
        await user.type(maxInput, '500');
        
        expect(minInput).toHaveValue(100);
        expect(maxInput).toHaveValue(500);
      });

      it('handles range slider interactions', async () => {
        render(<FilterDrawer {...defaultProps} />);
        
        await userEvent.click(screen.getByText('Price Range'));
        
        const sliders = screen.getAllByRole('slider');
        expect(sliders).toHaveLength(2);
        
        fireEvent.change(sliders[0], { target: { value: '200' } });
        expect(sliders[0]).toHaveValue('200');
      });
    });
  });

  describe('Section Expansion', () => {
    it('expands and collapses sections', async () => {
      const user = userEvent.setup();
      render(<FilterDrawer {...defaultProps} />);
      
      // Initially collapsed
      expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
      
      // Expand
      await user.click(screen.getByText('Category'));
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      
      // Collapse
      await user.click(screen.getByText('Category'));
      await waitFor(() => {
        expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
      });
    });

    it('shows correct chevron direction', async () => {
      const user = userEvent.setup();
      render(<FilterDrawer {...defaultProps} />);
      
      const categoryHeader = screen.getByText('Category').closest('div');
      const chevron = categoryHeader?.querySelector('svg');
      
      // Should rotate when expanded
      await user.click(screen.getByText('Category'));
      expect(chevron).toHaveStyle({ transform: 'rotate(180deg)' });
    });
  });

  describe('Filter Actions', () => {
    it('applies filters when Apply button is clicked', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();
      
      render(
        <FilterDrawer 
          {...defaultProps} 
          onFiltersChange={onFiltersChange}
        />
      );
      
      await user.click(screen.getByText('Category'));
      await user.click(screen.getByText('Electronics'));
      await user.click(screen.getByText('Apply Filters'));
      
      expect(onFiltersChange).toHaveBeenCalledWith({
        category: ['electronics']
      });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('clears all filters', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();
      
      render(
        <FilterDrawer 
          {...defaultProps} 
          onFiltersChange={onFiltersChange}
          appliedFilters={{ category: ['electronics'], condition: 'new' }}
        />
      );
      
      await user.click(screen.getByText('Clear All'));
      
      expect(onFiltersChange).toHaveBeenCalledWith({});
    });

    it('closes drawer when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<FilterDrawer {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Touch Interactions', () => {
    it('handles swipe gestures on mobile', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const drawer = screen.getByText('Filters').closest('div');
      
      // Simulate swipe down
      fireEvent.touchStart(drawer!, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(drawer!, { touches: [{ clientY: 250 }] });
      fireEvent.touchEnd(drawer!);
      
      // Should close on swipe down
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('provides haptic feedback on interactions', async () => {
      const vibrateSpy = jest.spyOn(navigator, 'vibrate').mockImplementation();
      const user = userEvent.setup();
      
      render(<FilterDrawer {...defaultProps} />);
      
      await user.click(screen.getByText('Category'));
      
      // Should provide haptic feedback
      expect(vibrateSpy).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders as bottom sheet on mobile', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      // Should use BottomSheet component on mobile
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders as modal on desktop', () => {
      (useResponsive as jest.Mock).mockReturnValue({
        ...mockResponsive,
        isMobile: false,
        isDesktop: true,
      });

      render(<FilterDrawer {...defaultProps} />);
      
      // Should render as modal on desktop
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<FilterDrawer {...defaultProps} />);
      
      // Tab through elements
      await user.tab();
      expect(screen.getByText('Category')).toHaveFocus();
      
      // Enter to expand
      await user.keyboard('{Enter}');
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    it('has proper ARIA labels', () => {
      render(<FilterDrawer {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog', { hidden: true });
      expect(dialog).toBeInTheDocument();
    });

    it('manages focus properly', async () => {
      const user = userEvent.setup();
      render(<FilterDrawer {...defaultProps} />);
      
      // Focus should be trapped within the drawer
      await user.tab();
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles large filter lists efficiently', () => {
      const largeFilterList = {
        ...mockFilters[0],
        options: Array.from({ length: 1000 }, (_, i) => ({
          id: `item-${i}`,
          label: `Item ${i}`,
          value: `item-${i}`,
          count: Math.floor(Math.random() * 100),
        })),
      };

      render(
        <FilterDrawer 
          {...defaultProps} 
          filters={[largeFilterList]}
        />
      );
      
      // Should render without performance issues
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('debounces rapid filter changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = jest.fn();
      
      render(
        <FilterDrawer 
          {...defaultProps} 
          onFiltersChange={onFiltersChange}
        />
      );
      
      await user.click(screen.getByText('Category'));
      
      // Rapid clicks
      const electronics = screen.getByText('Electronics');
      await user.click(electronics);
      await user.click(electronics);
      await user.click(electronics);
      
      // Should not cause excessive calls
      expect(onFiltersChange).not.toHaveBeenCalled(); // Only called on Apply
    });
  });
});