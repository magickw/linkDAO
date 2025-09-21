import React from 'react';
import { render, screen } from '@testing-library/react';
import ResponsiveGrid, { AutoFitGrid, AutoFillGrid } from '../ResponsiveGrid';

// Mock the useBreakpoints hook
jest.mock('@/hooks/useMediaQuery', () => ({
  useBreakpoints: jest.fn(),
}));

const mockUseBreakpoints = require('@/hooks/useMediaQuery').useBreakpoints;

describe('ResponsiveGrid', () => {
  const mockChildren = (
    <>
      <div data-testid="item-1">Item 1</div>
      <div data-testid="item-2">Item 2</div>
      <div data-testid="item-3">Item 3</div>
      <div data-testid="item-4">Item 4</div>
    </>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      });
    });

    it('renders single column on mobile by default', () => {
      const { container } = render(
        <ResponsiveGrid>{mockChildren}</ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: 'repeat(1, minmax(250px, 1fr))',
      });
    });

    it('uses custom mobile columns when specified', () => {
      const { container } = render(
        <ResponsiveGrid columns={{ mobile: 2 }}>
          {mockChildren}
        </ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveStyle({
        gridTemplateColumns: 'repeat(2, minmax(250px, 1fr))',
      });
    });
  });

  describe('Tablet Layout', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isLargeDesktop: false,
      });
    });

    it('renders two columns on tablet by default', () => {
      const { container } = render(
        <ResponsiveGrid>{mockChildren}</ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveStyle({
        gridTemplateColumns: 'repeat(2, minmax(250px, 1fr))',
      });
    });

    it('uses custom tablet columns when specified', () => {
      const { container } = render(
        <ResponsiveGrid columns={{ tablet: 3 }}>
          {mockChildren}
        </ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveStyle({
        gridTemplateColumns: 'repeat(3, minmax(250px, 1fr))',
      });
    });
  });

  describe('Desktop Layout', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
      });
    });

    it('renders three columns on desktop by default', () => {
      const { container } = render(
        <ResponsiveGrid>{mockChildren}</ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveStyle({
        gridTemplateColumns: 'repeat(3, minmax(250px, 1fr))',
      });
    });

    it('uses custom desktop columns when specified', () => {
      const { container } = render(
        <ResponsiveGrid columns={{ desktop: 4 }}>
          {mockChildren}
        </ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveStyle({
        gridTemplateColumns: 'repeat(4, minmax(250px, 1fr))',
      });
    });
  });

  describe('Large Desktop Layout', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: true,
      });
    });

    it('renders four columns on large desktop by default', () => {
      const { container } = render(
        <ResponsiveGrid>{mockChildren}</ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveStyle({
        gridTemplateColumns: 'repeat(4, minmax(250px, 1fr))',
      });
    });

    it('uses custom large desktop columns when specified', () => {
      const { container } = render(
        <ResponsiveGrid columns={{ largeDesktop: 5 }}>
          {mockChildren}
        </ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveStyle({
        gridTemplateColumns: 'repeat(5, minmax(250px, 1fr))',
      });
    });
  });

  describe('Custom Props', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
      });
    });

    it('applies custom className', () => {
      const { container } = render(
        <ResponsiveGrid className="custom-grid">
          {mockChildren}
        </ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveClass('custom-grid');
    });

    it('uses custom gap', () => {
      const { container } = render(
        <ResponsiveGrid gap="2rem">
          {mockChildren}
        </ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveStyle({
        gap: '2rem',
      });
    });

    it('uses custom minItemWidth', () => {
      const { container } = render(
        <ResponsiveGrid minItemWidth="300px">
          {mockChildren}
        </ResponsiveGrid>
      );

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toHaveStyle({
        gridTemplateColumns: 'repeat(3, minmax(300px, 1fr))',
      });
    });
  });

  describe('Content Rendering', () => {
    beforeEach(() => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
      });
    });

    it('renders all children', () => {
      render(<ResponsiveGrid>{mockChildren}</ResponsiveGrid>);

      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.getByTestId('item-3')).toBeInTheDocument();
      expect(screen.getByTestId('item-4')).toBeInTheDocument();
    });

    it('handles empty children gracefully', () => {
      const { container } = render(<ResponsiveGrid>{null}</ResponsiveGrid>);

      const gridElement = container.querySelector('.responsive-grid');
      expect(gridElement).toBeInTheDocument();
      expect(gridElement).toBeEmptyDOMElement();
    });
  });
});

describe('AutoFitGrid', () => {
  const mockChildren = (
    <>
      <div data-testid="item-1">Item 1</div>
      <div data-testid="item-2">Item 2</div>
      <div data-testid="item-3">Item 3</div>
    </>
  );

  it('renders with auto-fit grid template', () => {
    const { container } = render(
      <AutoFitGrid>{mockChildren}</AutoFitGrid>
    );

    const gridElement = container.querySelector('.auto-fit-grid');
    expect(gridElement).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1rem',
    });
  });

  it('uses custom minItemWidth', () => {
    const { container } = render(
      <AutoFitGrid minItemWidth="200px">{mockChildren}</AutoFitGrid>
    );

    const gridElement = container.querySelector('.auto-fit-grid');
    expect(gridElement).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    });
  });

  it('uses custom gap', () => {
    const { container } = render(
      <AutoFitGrid gap="1.5rem">{mockChildren}</AutoFitGrid>
    );

    const gridElement = container.querySelector('.auto-fit-grid');
    expect(gridElement).toHaveStyle({
      gap: '1.5rem',
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <AutoFitGrid className="custom-auto-fit">
        {mockChildren}
      </AutoFitGrid>
    );

    const gridElement = container.querySelector('.auto-fit-grid');
    expect(gridElement).toHaveClass('custom-auto-fit');
  });

  it('renders all children', () => {
    render(<AutoFitGrid>{mockChildren}</AutoFitGrid>);

    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-2')).toBeInTheDocument();
    expect(screen.getByTestId('item-3')).toBeInTheDocument();
  });
});

describe('AutoFillGrid', () => {
  const mockChildren = (
    <>
      <div data-testid="item-1">Item 1</div>
      <div data-testid="item-2">Item 2</div>
      <div data-testid="item-3">Item 3</div>
    </>
  );

  it('renders with auto-fill grid template', () => {
    const { container } = render(
      <AutoFillGrid>{mockChildren}</AutoFillGrid>
    );

    const gridElement = container.querySelector('.auto-fill-grid');
    expect(gridElement).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '1rem',
    });
  });

  it('uses custom minItemWidth', () => {
    const { container } = render(
      <AutoFillGrid minItemWidth="300px">{mockChildren}</AutoFillGrid>
    );

    const gridElement = container.querySelector('.auto-fill-grid');
    expect(gridElement).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    });
  });

  it('uses custom gap', () => {
    const { container } = render(
      <AutoFillGrid gap="0.5rem">{mockChildren}</AutoFillGrid>
    );

    const gridElement = container.querySelector('.auto-fill-grid');
    expect(gridElement).toHaveStyle({
      gap: '0.5rem',
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <AutoFillGrid className="custom-auto-fill">
        {mockChildren}
      </AutoFillGrid>
    );

    const gridElement = container.querySelector('.auto-fill-grid');
    expect(gridElement).toHaveClass('custom-auto-fill');
  });

  it('renders all children', () => {
    render(<AutoFillGrid>{mockChildren}</AutoFillGrid>);

    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-2')).toBeInTheDocument();
    expect(screen.getByTestId('item-3')).toBeInTheDocument();
  });
});