import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import PostSortingTabs, { PostSortOption, TimeFilter, usePostSorting } from '../PostSortingTabs';

// Mock component to test the hook
function TestHookComponent() {
  const {
    sortBy,
    timeFilter,
    isLoading,
    handleSortChange,
    handleTimeFilterChange
  } = usePostSorting();

  return (
    <div>
      <div data-testid="sort-by">{sortBy}</div>
      <div data-testid="time-filter">{timeFilter}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <button onClick={() => handleSortChange(PostSortOption.HOT)}>
        Change to Hot
      </button>
      <button onClick={() => handleTimeFilterChange(TimeFilter.WEEK)}>
        Change to Week
      </button>
    </div>
  );
}

describe('PostSortingTabs', () => {
  const defaultProps = {
    sortBy: PostSortOption.BEST,
    timeFilter: TimeFilter.DAY,
    onSortChange: jest.fn(),
    onTimeFilterChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all sorting options', () => {
      render(<PostSortingTabs {...defaultProps} />);

      expect(screen.getByText('Best')).toBeInTheDocument();
      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Top')).toBeInTheDocument();
      expect(screen.getByText('Rising')).toBeInTheDocument();
      expect(screen.getByText('Controversial')).toBeInTheDocument();
    });

    it('highlights the active sorting option', () => {
      render(<PostSortingTabs {...defaultProps} sortBy={PostSortOption.HOT} />);

      const hotButton = screen.getByRole('button', { name: /hot/i });
      expect(hotButton).toHaveClass('bg-blue-50');
      expect(hotButton).toHaveClass('text-blue-700');
    });

    it('shows time filter dropdown only when Top is selected', () => {
      const { rerender } = render(<PostSortingTabs {...defaultProps} sortBy={PostSortOption.BEST} />);
      
      expect(screen.queryByText('Time:')).not.toBeInTheDocument();

      rerender(<PostSortingTabs {...defaultProps} sortBy={PostSortOption.TOP} />);
      
      expect(screen.getByText('Time:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Day')).toBeInTheDocument();
    });

    it('displays post count when provided', () => {
      render(<PostSortingTabs {...defaultProps} postCount={1234} />);
      
      expect(screen.getByText('1,234 posts')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <PostSortingTabs {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Sorting Interactions', () => {
    it('calls onSortChange when a different sort option is clicked', async () => {
      render(<PostSortingTabs {...defaultProps} />);

      const hotButton = screen.getByRole('button', { name: /hot/i });
      fireEvent.click(hotButton);

      await waitFor(() => {
        expect(defaultProps.onSortChange).toHaveBeenCalledWith(PostSortOption.HOT);
      });
    });

    it('does not call onSortChange when the same sort option is clicked', () => {
      render(<PostSortingTabs {...defaultProps} sortBy={PostSortOption.BEST} />);

      const bestButton = screen.getByRole('button', { name: /best/i });
      fireEvent.click(bestButton);

      expect(defaultProps.onSortChange).not.toHaveBeenCalled();
    });

    it('shows loading state during sort change', async () => {
      render(<PostSortingTabs {...defaultProps} />);

      const hotButton = screen.getByRole('button', { name: /hot/i });
      fireEvent.click(hotButton);

      // Should show loading immediately
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(hotButton).toBeDisabled();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('prevents multiple rapid clicks during loading', async () => {
      render(<PostSortingTabs {...defaultProps} />);

      const hotButton = screen.getByRole('button', { name: /hot/i });
      const newButton = screen.getByRole('button', { name: /new/i });

      fireEvent.click(hotButton);
      fireEvent.click(newButton); // This should be ignored

      await waitFor(() => {
        expect(defaultProps.onSortChange).toHaveBeenCalledTimes(1);
        expect(defaultProps.onSortChange).toHaveBeenCalledWith(PostSortOption.HOT);
      });
    });
  });

  describe('Time Filter Interactions', () => {
    it('calls onTimeFilterChange when time filter is changed', () => {
      render(<PostSortingTabs {...defaultProps} sortBy={PostSortOption.TOP} />);

      const timeSelect = screen.getByDisplayValue('Day');
      fireEvent.change(timeSelect, { target: { value: TimeFilter.WEEK } });

      expect(defaultProps.onTimeFilterChange).toHaveBeenCalledWith(TimeFilter.WEEK);
    });

    it('does not call onTimeFilterChange when the same filter is selected', () => {
      render(<PostSortingTabs {...defaultProps} sortBy={PostSortOption.TOP} timeFilter={TimeFilter.WEEK} />);

      const timeSelect = screen.getByDisplayValue('Week');
      fireEvent.change(timeSelect, { target: { value: TimeFilter.WEEK } });

      expect(defaultProps.onTimeFilterChange).not.toHaveBeenCalled();
    });

    it('shows all time filter options', () => {
      render(<PostSortingTabs {...defaultProps} sortBy={PostSortOption.TOP} />);

      const timeSelect = screen.getByDisplayValue('Day');
      
      expect(screen.getByRole('option', { name: 'Hour' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Day' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Week' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Month' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Year' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'All Time' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper button roles and labels', () => {
      render(<PostSortingTabs {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(6); // 6 sorting options

      buttons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });
    });

    it('provides proper select accessibility', () => {
      render(<PostSortingTabs {...defaultProps} sortBy={PostSortOption.TOP} />);

      const timeSelect = screen.getByRole('combobox');
      expect(timeSelect).toBeInTheDocument();
      expect(timeSelect).toHaveAccessibleName('Time:');
    });

    it('handles keyboard navigation', () => {
      render(<PostSortingTabs {...defaultProps} />);

      const bestButton = screen.getByRole('button', { name: /best/i });
      bestButton.focus();
      
      expect(document.activeElement).toBe(bestButton);
    });
  });

  describe('Visual States', () => {
    it('shows correct icons for each sort option', () => {
      render(<PostSortingTabs {...defaultProps} />);

      expect(screen.getByText('🏆')).toBeInTheDocument(); // Best
      expect(screen.getByText('🔥')).toBeInTheDocument(); // Hot
      expect(screen.getByText('⚡')).toBeInTheDocument(); // New
      expect(screen.getByText('⭐')).toBeInTheDocument(); // Top
      expect(screen.getByText('📈')).toBeInTheDocument(); // Rising
      expect(screen.getByText('🌶️')).toBeInTheDocument(); // Controversial
    });

    it('applies hover styles correctly', () => {
      render(<PostSortingTabs {...defaultProps} />);

      const hotButton = screen.getByRole('button', { name: /hot/i });
      expect(hotButton).toHaveClass('hover:bg-gray-50');
    });

    it('shows active indicator for selected option', () => {
      render(<PostSortingTabs {...defaultProps} sortBy={PostSortOption.BEST} />);

      const bestButton = screen.getByRole('button', { name: /best/i });
      const indicator = bestButton.querySelector('.bg-blue-500');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('usePostSorting Hook', () => {
    it('initializes with default values', () => {
      render(<TestHookComponent />);

      expect(screen.getByTestId('sort-by')).toHaveTextContent(PostSortOption.BEST);
      expect(screen.getByTestId('time-filter')).toHaveTextContent(TimeFilter.DAY);
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    });

    it('updates sort option when handleSortChange is called', async () => {
      render(<TestHookComponent />);

      const changeButton = screen.getByText('Change to Hot');
      fireEvent.click(changeButton);

      expect(screen.getByTestId('sort-by')).toHaveTextContent(PostSortOption.HOT);
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('updates time filter when handleTimeFilterChange is called', async () => {
      render(<TestHookComponent />);

      const changeButton = screen.getByText('Change to Week');
      fireEvent.click(changeButton);

      expect(screen.getByTestId('time-filter')).toHaveTextContent(TimeFilter.WEEK);
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined postCount gracefully', () => {
      render(<PostSortingTabs {...defaultProps} postCount={undefined} />);
      
      expect(screen.queryByText(/posts$/)).not.toBeInTheDocument();
    });

    it('handles zero postCount', () => {
      render(<PostSortingTabs {...defaultProps} postCount={0} />);
      
      expect(screen.getByText('0 posts')).toBeInTheDocument();
    });

    it('formats large post counts correctly', () => {
      render(<PostSortingTabs {...defaultProps} postCount={1234567} />);
      
      expect(screen.getByText('1,234,567 posts')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('works correctly with all sort options', async () => {
      const onSortChange = jest.fn();
      render(<PostSortingTabs {...defaultProps} onSortChange={onSortChange} />);

      const sortOptions = [
        { button: 'Hot', value: PostSortOption.HOT },
        { button: 'New', value: PostSortOption.NEW },
        { button: 'Top', value: PostSortOption.TOP },
        { button: 'Rising', value: PostSortOption.RISING },
        { button: 'Controversial', value: PostSortOption.CONTROVERSIAL }
      ];

      for (const option of sortOptions) {
        const button = screen.getByRole('button', { name: new RegExp(option.button, 'i') });
        fireEvent.click(button);

        await waitFor(() => {
          expect(onSortChange).toHaveBeenCalledWith(option.value);
        });

        onSortChange.mockClear();
      }
    });

    it('works correctly with all time filter options', () => {
      const onTimeFilterChange = jest.fn();
      render(
        <PostSortingTabs 
          {...defaultProps} 
          sortBy={PostSortOption.TOP}
          onTimeFilterChange={onTimeFilterChange} 
        />
      );

      const timeSelect = screen.getByDisplayValue('Day');
      const timeOptions = [
        TimeFilter.HOUR,
        TimeFilter.WEEK,
        TimeFilter.MONTH,
        TimeFilter.YEAR,
        TimeFilter.ALL_TIME
      ];

      timeOptions.forEach(option => {
        fireEvent.change(timeSelect, { target: { value: option } });
        expect(onTimeFilterChange).toHaveBeenCalledWith(option);
        onTimeFilterChange.mockClear();
      });
    });
  });
});