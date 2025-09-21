import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommunityLayout from '../CommunityLayout';

// Mock the useMediaQuery hook
jest.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: jest.fn(),
  useBreakpoints: jest.fn(),
}));

const mockUseMediaQuery = require('@/hooks/useMediaQuery').useMediaQuery;
const mockUseBreakpoints = require('@/hooks/useMediaQuery').useBreakpoints;

describe('CommunityLayout', () => {
  const mockLeftSidebar = <div data-testid="left-sidebar">Left Sidebar Content</div>;
  const mockRightSidebar = <div data-testid="right-sidebar">Right Sidebar Content</div>;
  const mockMainContent = <div data-testid="main-content">Main Content</div>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Desktop Layout (≥1024px)', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
      });
      
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query === '(max-width: 767px)') return false;
        if (query === '(min-width: 768px) and (max-width: 1023px)') return false;
        if (query === '(min-width: 1024px)') return true;
        return false;
      });
    });

    it('renders three-column layout on desktop', () => {
      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
    });

    it('applies correct grid columns for desktop', () => {
      const { container } = render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      const layoutElement = container.querySelector('.community-layout');
      expect(layoutElement).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: '250px 1fr 300px',
      });
    });

    it('shows sidebars as sticky positioned elements', () => {
      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      const leftSidebar = screen.getByRole('complementary', { name: /navigation sidebar/i });
      const rightSidebar = screen.getByRole('complementary', { name: /community information sidebar/i });

      expect(leftSidebar).toHaveClass('sticky');
      expect(rightSidebar).toHaveClass('sticky');
    });
  });

  describe('Tablet Layout (768px - 1023px)', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isLargeDesktop: false,
      });
      
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query === '(max-width: 767px)') return false;
        if (query === '(min-width: 768px) and (max-width: 1023px)') return true;
        if (query === '(min-width: 1024px)') return false;
        return false;
      });
    });

    it('renders two-column layout on tablet', () => {
      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      // Left sidebar should be collapsed on tablet
      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
    });

    it('applies correct grid columns for tablet', () => {
      const { container } = render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      const layoutElement = container.querySelector('.community-layout');
      expect(layoutElement).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
      });
    });
  });

  describe('Mobile Layout (≤767px)', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      });
      
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query === '(max-width: 767px)') return true;
        if (query === '(min-width: 768px) and (max-width: 1023px)') return false;
        if (query === '(min-width: 1024px)') return false;
        return false;
      });
    });

    it('renders single-column layout on mobile', () => {
      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      // Sidebars should be collapsed on mobile
      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-sidebar')).not.toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('applies correct grid columns for mobile', () => {
      const { container } = render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      const layoutElement = container.querySelector('.community-layout');
      expect(layoutElement).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: '1fr',
      });
    });

    it('shows mobile toggle buttons', () => {
      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      expect(screen.getByRole('button', { name: /open navigation sidebar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open community sidebar/i })).toBeInTheDocument();
    });

    it('opens left sidebar overlay when menu button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      const menuButton = screen.getByRole('button', { name: /open navigation sidebar/i });
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
      });
    });

    it('opens right sidebar overlay when info button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      const infoButton = screen.getByRole('button', { name: /open community sidebar/i });
      await user.click(infoButton);

      await waitFor(() => {
        expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
      });
    });

    it('closes sidebar overlay when close button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      // Open left sidebar
      const menuButton = screen.getByRole('button', { name: /open navigation sidebar/i });
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
      });

      // Close sidebar
      const closeButton = screen.getByRole('button', { name: /close navigation sidebar/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
      });
    });

    it('closes sidebar overlay when backdrop is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      // Open left sidebar
      const menuButton = screen.getByRole('button', { name: /open navigation sidebar/i });
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
      });

      // Click backdrop
      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
      });
    });

    it('has proper ARIA roles and labels', () => {
      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      expect(screen.getByRole('main', { name: /main content/i })).toBeInTheDocument();
      expect(screen.getByRole('complementary', { name: /navigation sidebar/i })).toBeInTheDocument();
      expect(screen.getByRole('complementary', { name: /community information sidebar/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation for mobile toggles', async () => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      });

      render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      const menuButton = screen.getByRole('button', { name: /open navigation sidebar/i });
      
      // Focus the button
      menuButton.focus();
      expect(menuButton).toHaveFocus();

      // Press Enter
      fireEvent.keyDown(menuButton, { key: 'Enter', code: 'Enter' });
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('updates layout when screen size changes', () => {
      // Start with desktop
      mockUseBreakpoints.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
      });

      const { rerender } = render(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();

      // Change to mobile
      mockUseBreakpoints.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      });

      rerender(
        <CommunityLayout
          leftSidebar={mockLeftSidebar}
          rightSidebar={mockRightSidebar}
        >
          {mockMainContent}
        </CommunityLayout>
      );

      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open navigation sidebar/i })).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <CommunityLayout className="custom-class">
          {mockMainContent}
        </CommunityLayout>
      );

      const layoutElement = container.querySelector('.community-layout');
      expect(layoutElement).toHaveClass('custom-class');
    });

    it('renders without sidebars', () => {
      render(
        <CommunityLayout>
          {mockMainContent}
        </CommunityLayout>
      );

      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('renders with only left sidebar', () => {
      render(
        <CommunityLayout leftSidebar={mockLeftSidebar}>
          {mockMainContent}
        </CommunityLayout>
      );

      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByRole('complementary', { name: /navigation sidebar/i })).toBeInTheDocument();
      expect(screen.queryByRole('complementary', { name: /community information sidebar/i })).not.toBeInTheDocument();
    });

    it('renders with only right sidebar', () => {
      render(
        <CommunityLayout rightSidebar={mockRightSidebar}>
          {mockMainContent}
        </CommunityLayout>
      );

      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByRole('complementary', { name: /community information sidebar/i })).toBeInTheDocument();
      expect(screen.queryByRole('complementary', { name: /navigation sidebar/i })).not.toBeInTheDocument();
    });
  });
});