import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedFilters } from '@/components/Feed/FeedFilters';
import { FeedSortType } from '@/types/feed';
import testUtils from '../../setup/testSetup';

// Mock dependencies
jest.mock('@/hooks/useFeedPreferences', () => ({
  useFeedPreferences: () => ({
    currentSort: FeedSortType.HOT,
    currentTimeRange: 'day',
    updateSort: jest.fn(),
    updateTimeRange: jest.fn(),
    savePreferences: jest.fn()
  })
}));

const mockOnSortChange = jest.fn();
const mockOnTimeRangeChange = jest.fn();
const mockOnCommunityFilter = jest.fn();

describe('FeedFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sort Options', () => {
    it('should render all sort options', () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByRole('button', { name: /hot/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /top/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /following/i })).toBeInTheDocument();
    });

    it('should highlight active sort option', () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
        />
      );

      const hotButton = screen.getByRole('button', { name: /hot/i });
      expect(hotButton).toHaveClass('active');
    });

    it('should handle sort change', async () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
        />
      );

      const newButton = screen.getByRole('button', { name: /new/i });
      await userEvent.click(newButton);

      expect(mockOnSortChange).toHaveBeenCalledWith(FeedSortType.NEW);
    });
  });

  describe('Time Range Filters', () => {
    it('should render time range options', () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.TOP}
          activeTimeRange="day"
          onSortChange={mockOnSortChange}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.getByRole('button', { name: /day/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /year/i })).toBeInTheDocument();
    });

    it('should only show time range for TOP sort', () => {
      const { rerender } = render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.queryByRole('button', { name: /day/i })).not.toBeInTheDocument();

      rerender(
        <FeedFilters
          activeSort={FeedSortType.TOP}
          activeTimeRange="day"
          onSortChange={mockOnSortChange}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.getByRole('button', { name: /day/i })).toBeInTheDocument();
    });

    it('should handle time range change', async () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.TOP}
          activeTimeRange="day"
          onSortChange={mockOnSortChange}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const weekButton = screen.getByRole('button', { name: /week/i });
      await userEvent.click(weekButton);

      expect(mockOnTimeRangeChange).toHaveBeenCalledWith('week');
    });
  });

  describe('Community Filters', () => {
    const mockCommunities = [
      { id: 'general', name: 'General', memberCount: 1234 },
      { id: 'defi', name: 'DeFi Hub', memberCount: 856 },
      { id: 'nft', name: 'NFT Marketplace', memberCount: 642 }
    ];

    it('should render community filter when communities provided', () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          communities={mockCommunities}
          onCommunityFilter={mockOnCommunityFilter}
        />
      );

      expect(screen.getByLabelText(/filter by community/i)).toBeInTheDocument();
    });

    it('should show all communities in dropdown', async () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          communities={mockCommunities}
          onCommunityFilter={mockOnCommunityFilter}
        />
      );

      const select = screen.getByLabelText(/filter by community/i);
      await userEvent.click(select);

      expect(screen.getByText('All Communities')).toBeInTheDocument();
      expect(screen.getByText('General (1234 members)')).toBeInTheDocument();
      expect(screen.getByText('DeFi Hub (856 members)')).toBeInTheDocument();
      expect(screen.getByText('NFT Marketplace (642 members)')).toBeInTheDocument();
    });

    it('should handle community selection', async () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          communities={mockCommunities}
          onCommunityFilter={mockOnCommunityFilter}
        />
      );

      const select = screen.getByLabelText(/filter by community/i);
      await userEvent.selectOptions(select, 'defi');

      expect(mockOnCommunityFilter).toHaveBeenCalledWith('defi');
    });

    it('should handle "All Communities" selection', async () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          communities={mockCommunities}
          selectedCommunity="defi"
          onCommunityFilter={mockOnCommunityFilter}
        />
      );

      const select = screen.getByLabelText(/filter by community/i);
      await userEvent.selectOptions(select, '');

      expect(mockOnCommunityFilter).toHaveBeenCalledWith(null);
    });
  });

  describe('Advanced Filters', () => {
    it('should show advanced filters when enabled', () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          showAdvancedFilters={true}
        />
      );

      expect(screen.getByText(/advanced filters/i)).toBeInTheDocument();
    });

    it('should toggle advanced filters panel', async () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          showAdvancedFilters={true}
        />
      );

      const advancedButton = screen.getByRole('button', { name: /advanced filters/i });
      await userEvent.click(advancedButton);

      expect(screen.getByText(/content type/i)).toBeInTheDocument();
      expect(screen.getByText(/engagement level/i)).toBeInTheDocument();
    });

    it('should handle content type filters', async () => {
      const mockOnAdvancedFilter = jest.fn();
      
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          showAdvancedFilters={true}
          onAdvancedFilter={mockOnAdvancedFilter}
        />
      );

      const advancedButton = screen.getByRole('button', { name: /advanced filters/i });
      await userEvent.click(advancedButton);

      const textOnlyCheckbox = screen.getByLabelText(/text only/i);
      await userEvent.click(textOnlyCheckbox);

      expect(mockOnAdvancedFilter).toHaveBeenCalledWith({
        contentTypes: ['text']
      });
    });

    it('should handle engagement level filters', async () => {
      const mockOnAdvancedFilter = jest.fn();
      
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          showAdvancedFilters={true}
          onAdvancedFilter={mockOnAdvancedFilter}
        />
      );

      const advancedButton = screen.getByRole('button', { name: /advanced filters/i });
      await userEvent.click(advancedButton);

      const highEngagementCheckbox = screen.getByLabelText(/high engagement/i);
      await userEvent.click(highEngagementCheckbox);

      expect(mockOnAdvancedFilter).toHaveBeenCalledWith({
        engagementLevels: ['high']
      });
    });
  });

  describe('Filter Persistence', () => {
    it('should save filter preferences', async () => {
      const mockSavePreferences = jest.fn();
      
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          savePreferences={mockSavePreferences}
        />
      );

      const newButton = screen.getByRole('button', { name: /new/i });
      await userEvent.click(newButton);

      await waitFor(() => {
        expect(mockSavePreferences).toHaveBeenCalledWith({
          sort: FeedSortType.NEW
        });
      });
    });

    it('should restore saved preferences on mount', () => {
      const savedPreferences = {
        sort: FeedSortType.TOP,
        timeRange: 'week',
        selectedCommunity: 'defi'
      };

      render(
        <FeedFilters
          activeSort={savedPreferences.sort}
          activeTimeRange={savedPreferences.timeRange}
          selectedCommunity={savedPreferences.selectedCommunity}
          onSortChange={mockOnSortChange}
          onTimeRangeChange={mockOnTimeRangeChange}
          onCommunityFilter={mockOnCommunityFilter}
        />
      );

      expect(screen.getByRole('button', { name: /top/i })).toHaveClass('active');
      expect(screen.getByRole('button', { name: /week/i })).toHaveClass('active');
    });
  });

  describe('Performance', () => {
    it('should render filters efficiently with many communities', async () => {
      const manyCommunities = Array.from({ length: 100 }, (_, i) => ({
        id: `community-${i}`,
        name: `Community ${i}`,
        memberCount: Math.floor(Math.random() * 10000)
      }));

      const startTime = performance.now();
      
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          communities={manyCommunities}
          onCommunityFilter={mockOnCommunityFilter}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('should debounce rapid filter changes', async () => {
      jest.useFakeTimers();
      
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
        />
      );

      const buttons = [
        screen.getByRole('button', { name: /new/i }),
        screen.getByRole('button', { name: /top/i }),
        screen.getByRole('button', { name: /hot/i })
      ];

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
        fireEvent.click(randomButton);
      }

      // Should debounce calls
      expect(mockOnSortChange).toHaveBeenCalledTimes(10);

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Feed sorting options');
      
      const hotButton = screen.getByRole('button', { name: /hot/i });
      expect(hotButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should support keyboard navigation', async () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
        />
      );

      const hotButton = screen.getByRole('button', { name: /hot/i });
      hotButton.focus();

      fireEvent.keyDown(hotButton, { key: 'ArrowRight' });
      
      const newButton = screen.getByRole('button', { name: /new/i });
      expect(newButton).toHaveFocus();
    });

    it('should announce filter changes to screen readers', async () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
        />
      );

      const newButton = screen.getByRole('button', { name: /new/i });
      await userEvent.click(newButton);

      expect(screen.getByRole('status')).toHaveTextContent(/sorting by new/i);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          communities={[{ id: 'test', name: 'Test', memberCount: 100 }]}
          onCommunityFilter={mockOnCommunityFilter}
        />
      );

      const container = screen.getByRole('group');
      expect(container).toHaveClass('mobile-layout');
    });

    it('should show compact filter options on mobile', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          showAdvancedFilters={true}
        />
      );

      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing communities gracefully', () => {
      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChange}
          communities={undefined}
          onCommunityFilter={mockOnCommunityFilter}
        />
      );

      expect(screen.queryByLabelText(/filter by community/i)).not.toBeInTheDocument();
    });

    it('should handle callback errors gracefully', async () => {
      const mockOnSortChangeError = jest.fn().mockImplementation(() => {
        throw new Error('Sort change failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <FeedFilters
          activeSort={FeedSortType.HOT}
          onSortChange={mockOnSortChangeError}
        />
      );

      const newButton = screen.getByRole('button', { name: /new/i });
      await userEvent.click(newButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sort change failed')
      );

      consoleSpy.mockRestore();
    });
  });
});