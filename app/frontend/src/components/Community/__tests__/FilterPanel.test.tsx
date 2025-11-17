import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPanel from '../FilterPanel';
import { FilterState, Flair, ContentType } from '../../../types/communityFilter';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock data
const mockFlairs: Flair[] = [
  {
    id: '1',
    name: 'Discussion',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    textColor: '#1E40AF',
    moderatorOnly: false
  },
  {
    id: '2',
    name: 'Question',
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    textColor: '#047857',
    moderatorOnly: false
  },
  {
    id: '3',
    name: 'Announcement',
    color: '#F59E0B',
    backgroundColor: '#FFFBEB',
    textColor: '#92400E',
    moderatorOnly: true
  }
];

const defaultFilterState: FilterState = {
  flair: [],
  author: [],
  timeRange: { startDate: null, endDate: null },
  contentType: []
};

const mockProps = {
  availableFlairs: mockFlairs,
  activeFilters: defaultFilterState,
  onFilterChange: jest.fn(),
  onClearFilters: jest.fn(),
};

describe('FilterPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Collapsed State', () => {
    it('renders collapsed view correctly', () => {
      render(<FilterPanel {...mockProps} isCollapsed={true} />);
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('🔽')).toBeInTheDocument();
      expect(screen.queryByText('Advanced Filters')).not.toBeInTheDocument();
    });

    it('shows active filter count when collapsed', () => {
      const activeFilters: FilterState = {
        ...defaultFilterState,
        flair: ['1', '2'],
        author: ['user1']
      };

      render(
        <FilterPanel 
          {...mockProps} 
          activeFilters={activeFilters}
          isCollapsed={true} 
        />
      );
      
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows clear all button when filters are active and collapsed', () => {
      const activeFilters: FilterState = {
        ...defaultFilterState,
        flair: ['1']
      };

      render(
        <FilterPanel 
          {...mockProps} 
          activeFilters={activeFilters}
          isCollapsed={true} 
        />
      );
      
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('calls onToggleCollapse when collapse button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleCollapse = jest.fn();

      render(
        <FilterPanel 
          {...mockProps} 
          isCollapsed={true}
          onToggleCollapse={onToggleCollapse}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /filters/i }));
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });
  });

  describe('Expanded State', () => {
    it('renders expanded view correctly', () => {
      render(<FilterPanel {...mockProps} isCollapsed={false} />);
      
      expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
      expect(screen.getByText('🔼')).toBeInTheDocument();
      expect(screen.getByText('Filter by Flair')).toBeInTheDocument();
      expect(screen.getByText('Filter by Author')).toBeInTheDocument();
      expect(screen.getByText('Content Type')).toBeInTheDocument();
      expect(screen.getByText('Time Period')).toBeInTheDocument();
    });

    it('displays all available flairs', () => {
      render(<FilterPanel {...mockProps} isCollapsed={false} />);
      
      expect(screen.getByText('Discussion')).toBeInTheDocument();
      expect(screen.getByText('Question')).toBeInTheDocument();
      expect(screen.getByText('Announcement')).toBeInTheDocument();
    });

    it('displays all content type options', () => {
      render(<FilterPanel {...mockProps} isCollapsed={false} />);
      
      expect(screen.getByText('Text Posts')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Videos')).toBeInTheDocument();
      expect(screen.getByText('Links')).toBeInTheDocument();
      expect(screen.getByText('Polls')).toBeInTheDocument();
      expect(screen.getByText('Proposals')).toBeInTheDocument();
    });

    it('displays time range presets', () => {
      render(<FilterPanel {...mockProps} isCollapsed={false} />);
      
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
      expect(screen.getByText('This Year')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  describe('Flair Filtering', () => {
    it('highlights active flair filters', () => {
      const activeFilters: FilterState = {
        ...defaultFilterState,
        flair: ['1']
      };

      render(
        <FilterPanel 
          {...mockProps} 
          activeFilters={activeFilters}
          isCollapsed={false} 
        />
      );
      
      const discussionButton = screen.getByText('Discussion').closest('button');
      expect(discussionButton).toHaveClass('border-blue-500');
    });

    it('calls onFilterChange when flair is toggled', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();

      render(
        <FilterPanel 
          {...mockProps} 
          onFilterChange={onFilterChange}
          isCollapsed={false} 
        />
      );
      
      await user.click(screen.getByText('Discussion'));
      
      expect(onFilterChange).toHaveBeenCalledWith({
        ...defaultFilterState,
        flair: ['1']
      });
    });

    it('removes flair filter when clicked again', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();
      const activeFilters: FilterState = {
        ...defaultFilterState,
        flair: ['1']
      };

      render(
        <FilterPanel 
          {...mockProps} 
          activeFilters={activeFilters}
          onFilterChange={onFilterChange}
          isCollapsed={false} 
        />
      );
      
      await user.click(screen.getByText('Discussion'));
      
      expect(onFilterChange).toHaveBeenCalledWith({
        ...activeFilters,
        flair: []
      });
    });
  });

  describe('Author Filtering', () => {
    it('displays selected authors', () => {
      const activeFilters: FilterState = {
        ...defaultFilterState,
        author: ['user1', 'user2']
      };

      render(
        <FilterPanel 
          {...mockProps} 
          activeFilters={activeFilters}
          isCollapsed={false} 
        />
      );
      
      expect(screen.getByText('@user1')).toBeInTheDocument();
      expect(screen.getByText('@user2')).toBeInTheDocument();
    });

    it('allows removing author filters', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();
      const activeFilters: FilterState = {
        ...defaultFilterState,
        author: ['user1', 'user2']
      };

      render(
        <FilterPanel 
          {...mockProps} 
          activeFilters={activeFilters}
          onFilterChange={onFilterChange}
          isCollapsed={false} 
        />
      );
      
      const removeButtons = screen.getAllByText('×');
      await user.click(removeButtons[0]);
      
      expect(onFilterChange).toHaveBeenCalledWith({
        ...defaultFilterState,
        author: ['user2']
      });
    });

    it('shows author search input', () => {
      render(<FilterPanel {...mockProps} isCollapsed={false} />);
      
      expect(screen.getByPlaceholderText('Search for authors...')).toBeInTheDocument();
    });

    it('shows author suggestions when typing', async () => {
      const user = userEvent.setup();

      render(<FilterPanel {...mockProps} isCollapsed={false} />);
      
      const searchInput = screen.getByPlaceholderText('Search for authors...');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('@testuser1')).toBeInTheDocument();
        expect(screen.getByText('@testuser2')).toBeInTheDocument();
      });
    });
  });

  describe('Content Type Filtering', () => {
    it('highlights active content type filters', () => {
      const activeFilters: FilterState = {
        ...defaultFilterState,
        contentType: [ContentType.TEXT, ContentType.IMAGE]
      };

      render(
        <FilterPanel 
          {...mockProps} 
          activeFilters={activeFilters}
          isCollapsed={false} 
        />
      );
      
      const textButton = screen.getByText('Text Posts').closest('button');
      const imageButton = screen.getByText('Images').closest('button');
      
      expect(textButton).toHaveClass('border-blue-500');
      expect(imageButton).toHaveClass('border-blue-500');
    });

    it('calls onFilterChange when content type is toggled', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();

      render(
        <FilterPanel 
          {...mockProps} 
          onFilterChange={onFilterChange}
          isCollapsed={false} 
        />
      );
      
      await user.click(screen.getByText('Text Posts'));
      
      expect(onFilterChange).toHaveBeenCalledWith({
        ...defaultFilterState,
        contentType: [ContentType.TEXT]
      });
    });
  });

  describe('Time Range Filtering', () => {
    it('highlights active time preset', async () => {
      const user = userEvent.setup();

      render(<FilterPanel {...mockProps} isCollapsed={false} />);
      
      await user.click(screen.getByText('Today'));
      
      const todayButton = screen.getByText('Today').closest('button');
      expect(todayButton).toHaveClass('border-blue-500');
    });

    it('shows custom date inputs when Custom is selected', async () => {
      const user = userEvent.setup();

      render(<FilterPanel {...mockProps} isCollapsed={false} />);
      
      await user.click(screen.getByText('Custom'));
      
      expect(screen.getByLabelText('From')).toBeInTheDocument();
      expect(screen.getByLabelText('To')).toBeInTheDocument();
    });

    it('calls onFilterChange when time preset is selected', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();

      render(
        <FilterPanel 
          {...mockProps} 
          onFilterChange={onFilterChange}
          isCollapsed={false} 
        />
      );
      
      await user.click(screen.getByText('Today'));
      
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date)
          })
        })
      );
    });
  });

  describe('Clear Filters', () => {
    it('shows clear all button when filters are active', () => {
      const activeFilters: FilterState = {
        ...defaultFilterState,
        flair: ['1']
      };

      render(
        <FilterPanel 
          {...mockProps} 
          activeFilters={activeFilters}
          isCollapsed={false} 
        />
      );
      
      expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
    });

    it('calls onClearFilters when clear all is clicked', async () => {
      const user = userEvent.setup();
      const onClearFilters = jest.fn();
      const activeFilters: FilterState = {
        ...defaultFilterState,
        flair: ['1']
      };

      render(
        <FilterPanel 
          {...mockProps} 
          activeFilters={activeFilters}
          onClearFilters={onClearFilters}
          isCollapsed={false} 
        />
      );
      
      await user.click(screen.getByText('Clear All Filters'));
      expect(onClearFilters).toHaveBeenCalledTimes(1);
    });

    it('hides clear all button when no filters are active', () => {
      render(<FilterPanel {...mockProps} isCollapsed={false} />);
      
      expect(screen.queryByText('Clear All Filters')).not.toBeInTheDocument();
    });
  });

  describe('Filter Combinations', () => {
    it('handles multiple simultaneous filters', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();

      render(
        <FilterPanel 
          {...mockProps} 
          onFilterChange={onFilterChange}
          isCollapsed={false} 
        />
      );
      
      // Add flair filter
      await user.click(screen.getByText('Discussion'));
      
      // Add content type filter
      await user.click(screen.getByText('Text Posts'));
      
      // Add time filter
      await user.click(screen.getByText('Today'));
      
      expect(onFilterChange).toHaveBeenCalledTimes(3);
    });

    it('displays correct active filter count with multiple filters', () => {
      const activeFilters: FilterState = {
        flair: ['1', '2'],
        author: ['user1'],
        timeRange: { startDate: new Date(), endDate: new Date() },
        contentType: [ContentType.TEXT, ContentType.IMAGE]
      };

      render(
        <FilterPanel 
          {...mockProps} 
          activeFilters={activeFilters}
          isCollapsed={true} 
        />
      );
      
      // 2 flairs + 1 author + 1 time range + 2 content types = 6
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<FilterPanel {...mockProps} isCollapsed={false} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();

      render(
        <FilterPanel 
          {...mockProps} 
          onFilterChange={onFilterChange}
          isCollapsed={false} 
        />
      );
      
      // Focus on first flair button and press Enter
      const firstFlairButton = screen.getByText('Discussion');
      firstFlairButton.focus();
      await user.keyboard('{Enter}');
      
      expect(onFilterChange).toHaveBeenCalled();
    });
  });
});