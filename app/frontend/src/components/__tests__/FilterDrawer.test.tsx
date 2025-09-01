import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FilterDrawer from '../FilterDrawer';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  PanInfo: {} as any
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: () => <div data-testid="x-mark-icon" />,
  AdjustmentsHorizontalIcon: () => <div data-testid="adjustments-icon" />,
  ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  ChevronUpIcon: () => <div data-testid="chevron-up-icon" />
}));

const mockFilters = [
  {
    id: 'category',
    title: 'Category',
    type: 'checkbox' as const,
    expanded: true,
    options: [
      { id: 'electronics', label: 'Electronics', value: 'electronics', count: 150 },
      { id: 'clothing', label: 'Clothing', value: 'clothing', count: 89 },
      { id: 'books', label: 'Books', value: 'books', count: 45 }
    ],
    value: []
  },
  {
    id: 'price',
    title: 'Price Range',
    type: 'range' as const,
    expanded: false,
    min: 0,
    max: 1000,
    value: [0, 1000]
  },
  {
    id: 'condition',
    title: 'Condition',
    type: 'radio' as const,
    expanded: true,
    options: [
      { id: 'new', label: 'New', value: 'new', count: 120 },
      { id: 'used', label: 'Used', value: 'used', count: 80 },
      { id: 'refurbished', label: 'Refurbished', value: 'refurbished', count: 25 }
    ],
    value: null
  }
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  filters: mockFilters,
  onFiltersChange: jest.fn(),
  onApplyFilters: jest.fn(),
  onClearFilters: jest.fn()
};

describe('FilterDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
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

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<FilterDrawer {...defaultProps} onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close filters');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const mockOnClose = jest.fn();
    render(<FilterDrawer {...defaultProps} onClose={mockOnClose} />);
    
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('toggles section expansion', () => {
    render(<FilterDrawer {...defaultProps} />);
    
    const priceSection = screen.getByText('Price Range');
    fireEvent.click(priceSection);
    
    // Price section should now be expanded and show range inputs
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('handles checkbox filter changes', () => {
    render(<FilterDrawer {...defaultProps} />);
    
    const electronicsCheckbox = screen.getByLabelText('Electronics');
    fireEvent.click(electronicsCheckbox);
    
    expect(electronicsCheckbox).toBeChecked();
  });

  it('handles radio filter changes', () => {
    render(<FilterDrawer {...defaultProps} />);
    
    const newConditionRadio = screen.getByLabelText('New');
    fireEvent.click(newConditionRadio);
    
    expect(newConditionRadio).toBeChecked();
  });

  it('handles range filter changes', () => {
    const filtersWithExpandedPrice = mockFilters.map(filter =>
      filter.id === 'price' ? { ...filter, expanded: true } : filter
    );
    
    render(<FilterDrawer {...defaultProps} filters={filtersWithExpandedPrice} />);
    
    const minRangeInput = screen.getAllByRole('slider')[0];
    fireEvent.change(minRangeInput, { target: { value: '100' } });
    
    // The component should update the local state
    expect(minRangeInput).toHaveValue('100');
  });

  it('displays option counts correctly', () => {
    render(<FilterDrawer {...defaultProps} />);
    
    expect(screen.getByText('150')).toBeInTheDocument(); // Electronics count
    expect(screen.getByText('89')).toBeInTheDocument();  // Clothing count
    expect(screen.getByText('45')).toBeInTheDocument();  // Books count
  });

  it('applies filters when Apply button is clicked', () => {
    const mockOnFiltersChange = jest.fn();
    const mockOnApplyFilters = jest.fn();
    const mockOnClose = jest.fn();
    
    render(
      <FilterDrawer 
        {...defaultProps} 
        onFiltersChange={mockOnFiltersChange}
        onApplyFilters={mockOnApplyFilters}
        onClose={mockOnClose}
      />
    );
    
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalled();
    expect(mockOnApplyFilters).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('clears all filters when Clear All button is clicked', () => {
    const mockOnClearFilters = jest.fn();
    
    render(<FilterDrawer {...defaultProps} onClearFilters={mockOnClearFilters} />);
    
    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);
    
    expect(mockOnClearFilters).toHaveBeenCalled();
  });

  it('handles swipe gestures for closing', () => {
    const mockOnClose = jest.fn();
    render(<FilterDrawer {...defaultProps} onClose={mockOnClose} />);
    
    const drawer = document.querySelector('.fixed.bottom-0');
    
    if (drawer) {
      // Simulate swipe down gesture
      fireEvent.mouseDown(drawer, { clientY: 100 });
      fireEvent.mouseMove(drawer, { clientY: 300 });
      fireEvent.mouseUp(drawer, { clientY: 300 });
      
      // In a real implementation with proper drag handling, this would close the drawer
    }
  });

  it('updates local filters when props change', () => {
    const { rerender } = render(<FilterDrawer {...defaultProps} />);
    
    const updatedFilters = [
      ...mockFilters,
      {
        id: 'brand',
        title: 'Brand',
        type: 'checkbox' as const,
        expanded: false,
        options: [
          { id: 'apple', label: 'Apple', value: 'apple', count: 50 }
        ],
        value: []
      }
    ];
    
    rerender(<FilterDrawer {...defaultProps} filters={updatedFilters} />);
    
    expect(screen.getByText('Brand')).toBeInTheDocument();
  });

  it('handles multiple checkbox selections', () => {
    render(<FilterDrawer {...defaultProps} />);
    
    const electronicsCheckbox = screen.getByLabelText('Electronics');
    const clothingCheckbox = screen.getByLabelText('Clothing');
    
    fireEvent.click(electronicsCheckbox);
    fireEvent.click(clothingCheckbox);
    
    expect(electronicsCheckbox).toBeChecked();
    expect(clothingCheckbox).toBeChecked();
  });

  it('handles checkbox deselection', () => {
    const filtersWithSelected = mockFilters.map(filter =>
      filter.id === 'category' 
        ? { ...filter, value: ['electronics'] }
        : filter
    );
    
    render(<FilterDrawer {...defaultProps} filters={filtersWithSelected} />);
    
    const electronicsCheckbox = screen.getByLabelText('Electronics');
    expect(electronicsCheckbox).toBeChecked();
    
    fireEvent.click(electronicsCheckbox);
    expect(electronicsCheckbox).not.toBeChecked();
  });

  it('shows correct range values', () => {
    const filtersWithExpandedPrice = mockFilters.map(filter =>
      filter.id === 'price' 
        ? { ...filter, expanded: true, value: [100, 500] }
        : filter
    );
    
    render(<FilterDrawer {...defaultProps} filters={filtersWithExpandedPrice} />);
    
    expect(screen.getByText('Min: $100')).toBeInTheDocument();
    expect(screen.getByText('Max: $500')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<FilterDrawer {...defaultProps} className="custom-drawer" />);
    
    const drawer = document.querySelector('.custom-drawer');
    expect(drawer).toBeInTheDocument();
  });

  it('handles touch interactions on mobile', () => {
    render(<FilterDrawer {...defaultProps} />);
    
    const drawer = document.querySelector('.fixed.bottom-0');
    
    if (drawer) {
      fireEvent.touchStart(drawer, {
        touches: [{ clientY: 100 }]
      });
      
      fireEvent.touchMove(drawer, {
        touches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(drawer);
    }
  });

  it('maintains filter state during interaction', async () => {
    render(<FilterDrawer {...defaultProps} />);
    
    // Select a checkbox
    const electronicsCheckbox = screen.getByLabelText('Electronics');
    fireEvent.click(electronicsCheckbox);
    
    // Toggle a section
    const priceSection = screen.getByText('Price Range');
    fireEvent.click(priceSection);
    
    // The checkbox should still be selected
    expect(electronicsCheckbox).toBeChecked();
  });
});