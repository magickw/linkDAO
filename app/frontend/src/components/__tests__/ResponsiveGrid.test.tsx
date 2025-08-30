import React from 'react';
import { render, screen } from '@testing-library/react';
import ResponsiveGrid, { ProductGrid, CategoryGrid, MasonryGrid, GridItem, useResponsiveGrid } from '../ResponsiveGrid';
import { useResponsive, useResponsiveColumns, useResponsiveSpacing } from '@/design-system/hooks/useResponsive';

// Mock dependencies
jest.mock('@/design-system/hooks/useResponsive');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockResponsive = {
  breakpoint: 'md' as const,
  width: 768,
  height: 1024,
  isMobile: false,
  isTablet: true,
  isDesktop: false,
  isTouch: true,
  orientation: 'portrait' as const,
};

describe('ResponsiveGrid', () => {
  beforeEach(() => {
    (useResponsive as jest.Mock).mockReturnValue(mockResponsive);
    (useResponsiveColumns as jest.Mock).mockReturnValue(3);
    (useResponsiveSpacing as jest.Mock).mockReturnValue('1.5rem');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders children in grid layout', () => {
      render(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('applies correct grid styles', () => {
      const { container } = render(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );
      
      const gridContainer = container.firstChild as HTMLElement;
      expect(gridContainer).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.5rem',
      });
    });

    it('applies custom className', () => {
      const { container } = render(
        <ResponsiveGrid className="custom-grid">
          <div>Item 1</div>
        </ResponsiveGrid>
      );
      
      expect(container.firstChild).toHaveClass('custom-grid');
    });

    it('applies itemClassName to grid items', () => {
      render(
        <ResponsiveGrid itemClassName="grid-item">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );
      
      const items = screen.getAllByText(/Item/);
      items.forEach(item => {
        expect(item.parentElement).toHaveClass('grid-item');
      });
    });
  });

  describe('Responsive Columns', () => {
    it('uses responsive column configuration', () => {
      const columns = {
        xs: 1,
        sm: 2,
        md: 3,
        lg: 4,
      };
      
      render(
        <ResponsiveGrid columns={columns}>
          <div>Item 1</div>
        </ResponsiveGrid>
      );
      
      expect(useResponsiveColumns).toHaveBeenCalledWith(columns);
    });

    it('adapts to different breakpoints', () => {
      (useResponsiveColumns as jest.Mock).mockReturnValue(2);
      
      const { container } = render(
        <ResponsiveGrid>
          <div>Item 1</div>
        </ResponsiveGrid>
      );
      
      const gridContainer = container.firstChild as HTMLElement;
      expect(gridContainer).toHaveStyle({
        gridTemplateColumns: 'repeat(2, 1fr)',
      });
    });
  });

  describe('Auto-fit Layout', () => {
    it('uses auto-fit when enabled', () => {
      const { container } = render(
        <ResponsiveGrid autoFit={true} minItemWidth="200px">
          <div>Item 1</div>
        </ResponsiveGrid>
      );
      
      const gridContainer = container.firstChild as HTMLElement;
      expect(gridContainer).toHaveStyle({
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      });
    });

    it('uses maxItemWidth when provided', () => {
      const { container } = render(
        <ResponsiveGrid autoFit={true} minItemWidth="200px" maxItemWidth="400px">
          <div>Item 1</div>
        </ResponsiveGrid>
      );
      
      const gridContainer = container.firstChild as HTMLElement;
      expect(gridContainer).toHaveStyle({
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 400px))',
      });
    });
  });

  describe('Aspect Ratio', () => {
    it('applies aspect ratio to grid items', () => {
      render(
        <ResponsiveGrid aspectRatio="16/9">
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );
      
      const items = screen.getAllByText(/Item/);
      items.forEach(item => {
        expect(item.parentElement).toHaveStyle({
          aspectRatio: '16/9',
        });
      });
    });
  });

  describe('Gap Configuration', () => {
    it('uses responsive gap configuration', () => {
      const gap = {
        xs: '0.5rem',
        md: '1rem',
        lg: '2rem',
      };
      
      render(
        <ResponsiveGrid gap={gap}>
          <div>Item 1</div>
        </ResponsiveGrid>
      );
      
      expect(useResponsiveSpacing).toHaveBeenCalledWith(gap);
    });
  });

  describe('Animation', () => {
    it('enables animation by default', () => {
      render(
        <ResponsiveGrid>
          <div>Item 1</div>
        </ResponsiveGrid>
      );
      
      // Animation should be enabled (motion.div used)
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('disables animation when specified', () => {
      render(
        <ResponsiveGrid animate={false}>
          <div>Item 1</div>
        </ResponsiveGrid>
      );
      
      // Should render without animation
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('uses custom stagger timing', () => {
      render(
        <ResponsiveGrid staggerChildren={0.2}>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });
});

describe('ProductGrid', () => {
  beforeEach(() => {
    (useResponsive as jest.Mock).mockReturnValue(mockResponsive);
    (useResponsiveColumns as jest.Mock).mockReturnValue(3);
    (useResponsiveSpacing as jest.Mock).mockReturnValue('1.5rem');
  });

  it('renders with standard variant by default', () => {
    render(
      <ProductGrid>
        <div>Product 1</div>
        <div>Product 2</div>
      </ProductGrid>
    );
    
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
  });

  it('uses compact variant configuration', () => {
    render(
      <ProductGrid variant="compact">
        <div>Product 1</div>
      </ProductGrid>
    );
    
    // Should use more columns for compact variant
    expect(useResponsiveColumns).toHaveBeenCalledWith({
      xs: 2,
      sm: 3,
      md: 4,
      lg: 5,
      xl: 6,
      '2xl': 7,
    });
  });

  it('uses detailed variant configuration', () => {
    render(
      <ProductGrid variant="detailed">
        <div>Product 1</div>
      </ProductGrid>
    );
    
    // Should use fewer columns for detailed variant
    expect(useResponsiveColumns).toHaveBeenCalledWith({
      xs: 1,
      sm: 1,
      md: 2,
      lg: 3,
      xl: 3,
      '2xl': 4,
    });
  });
});

describe('CategoryGrid', () => {
  beforeEach(() => {
    (useResponsive as jest.Mock).mockReturnValue(mockResponsive);
    (useResponsiveColumns as jest.Mock).mockReturnValue(4);
    (useResponsiveSpacing as jest.Mock).mockReturnValue('1rem');
  });

  it('renders with medium size by default', () => {
    render(
      <CategoryGrid>
        <div>Category 1</div>
        <div>Category 2</div>
      </CategoryGrid>
    );
    
    expect(screen.getByText('Category 1')).toBeInTheDocument();
    expect(screen.getByText('Category 2')).toBeInTheDocument();
  });

  it('uses small size configuration', () => {
    render(
      <CategoryGrid size="small">
        <div>Category 1</div>
      </CategoryGrid>
    );
    
    expect(useResponsiveColumns).toHaveBeenCalledWith({
      xs: 3,
      sm: 4,
      md: 6,
      lg: 8,
      xl: 10,
      '2xl': 12,
    });
  });

  it('uses large size configuration', () => {
    render(
      <CategoryGrid size="large">
        <div>Category 1</div>
      </CategoryGrid>
    );
    
    expect(useResponsiveColumns).toHaveBeenCalledWith({
      xs: 2,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 5,
      '2xl': 6,
    });
  });
});

describe('MasonryGrid', () => {
  beforeEach(() => {
    (useResponsive as jest.Mock).mockReturnValue(mockResponsive);
    (useResponsiveSpacing as jest.Mock).mockReturnValue('1rem');
  });

  it('renders with auto-fit layout', () => {
    const { container } = render(
      <MasonryGrid>
        <div>Item 1</div>
        <div>Item 2</div>
      </MasonryGrid>
    );
    
    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    });
  });

  it('uses custom column width', () => {
    const { container } = render(
      <MasonryGrid columnWidth="250px">
        <div>Item 1</div>
      </MasonryGrid>
    );
    
    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    });
  });
});

describe('GridItem', () => {
  beforeEach(() => {
    (useResponsive as jest.Mock).mockReturnValue(mockResponsive);
  });

  it('renders with default span', () => {
    const { container } = render(
      <GridItem>
        <div>Content</div>
      </GridItem>
    );
    
    const gridItem = container.firstChild as HTMLElement;
    expect(gridItem).toHaveStyle({
      gridColumn: 'span 1',
    });
  });

  it('applies responsive span configuration', () => {
    const span = {
      xs: 1,
      md: 2,
      lg: 3,
    };
    
    const { container } = render(
      <GridItem span={span}>
        <div>Content</div>
      </GridItem>
    );
    
    // Should use md span (2) for current breakpoint
    const gridItem = container.firstChild as HTMLElement;
    expect(gridItem).toHaveStyle({
      gridColumn: 'span 2',
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <GridItem className="custom-item">
        <div>Content</div>
      </GridItem>
    );
    
    expect(container.firstChild).toHaveClass('custom-item');
  });
});

describe('useResponsiveGrid Hook', () => {
  beforeEach(() => {
    (useResponsive as jest.Mock).mockReturnValue(mockResponsive);
    (useResponsiveColumns as jest.Mock).mockReturnValue(3);
    (useResponsiveSpacing as jest.Mock).mockReturnValue('1.5rem');
  });

  it('returns grid configuration', () => {
    const TestComponent = () => {
      const gridConfig = useResponsiveGrid();
      return (
        <div data-testid="grid-config">
          {JSON.stringify(gridConfig)}
        </div>
      );
    };
    
    render(<TestComponent />);
    
    const configElement = screen.getByTestId('grid-config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config).toEqual({
      columnCount: 3,
      gridGap: '1.5rem',
      itemWidth: 'calc((100% - 32px) / 3)',
      breakpoint: 'md',
      containerWidth: 768,
    });
  });

  it('calculates item width correctly', () => {
    (useResponsiveColumns as jest.Mock).mockReturnValue(4);
    (useResponsiveSpacing as jest.Mock).mockReturnValue('2rem');
    
    const TestComponent = () => {
      const { itemWidth } = useResponsiveGrid();
      return <div data-testid="item-width">{itemWidth}</div>;
    };
    
    render(<TestComponent />);
    
    expect(screen.getByTestId('item-width')).toHaveTextContent('calc((100% - 48px) / 4)');
  });
});

describe('Performance and Edge Cases', () => {
  beforeEach(() => {
    (useResponsive as jest.Mock).mockReturnValue(mockResponsive);
    (useResponsiveColumns as jest.Mock).mockReturnValue(3);
    (useResponsiveSpacing as jest.Mock).mockReturnValue('1rem');
  });

  it('handles empty children gracefully', () => {
    render(<ResponsiveGrid />);
    
    // Should not crash with no children
    expect(document.body).toBeInTheDocument();
  });

  it('handles single child', () => {
    render(
      <ResponsiveGrid>
        <div>Single Item</div>
      </ResponsiveGrid>
    );
    
    expect(screen.getByText('Single Item')).toBeInTheDocument();
  });

  it('handles large number of children', () => {
    const manyChildren = Array.from({ length: 100 }, (_, i) => (
      <div key={i}>Item {i}</div>
    ));
    
    render(<ResponsiveGrid>{manyChildren}</ResponsiveGrid>);
    
    expect(screen.getByText('Item 0')).toBeInTheDocument();
    expect(screen.getByText('Item 99')).toBeInTheDocument();
  });

  it('handles dynamic children updates', () => {
    const { rerender } = render(
      <ResponsiveGrid>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );
    
    rerender(
      <ResponsiveGrid>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </ResponsiveGrid>
    );
    
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('maintains performance with frequent re-renders', () => {
    const renderSpy = jest.fn();
    
    const TestComponent = ({ count }: { count: number }) => {
      renderSpy();
      return (
        <ResponsiveGrid>
          {Array.from({ length: count }, (_, i) => (
            <div key={i}>Item {i}</div>
          ))}
        </ResponsiveGrid>
      );
    };
    
    const { rerender } = render(<TestComponent count={5} />);
    
    // Multiple re-renders
    rerender(<TestComponent count={5} />);
    rerender(<TestComponent count={5} />);
    
    // Should not cause excessive re-renders
    expect(renderSpy).toHaveBeenCalledTimes(3);
  });
});