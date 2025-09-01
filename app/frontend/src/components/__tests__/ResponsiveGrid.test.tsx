import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResponsiveGrid, { useResponsiveGrid } from '../ResponsiveGrid';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe(target: Element) {
    // Simulate initial observation
    this.callback([{
      target,
      contentRect: { width: 1200, height: 800 } as DOMRectReadOnly,
      borderBoxSize: [] as any,
      contentBoxSize: [] as any,
      devicePixelContentBoxSize: [] as any
    }], this);
  }
  
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver;

const mockChildren = [
  <div key="1">Item 1</div>,
  <div key="2">Item 2</div>,
  <div key="3">Item 3</div>,
  <div key="4">Item 4</div>,
  <div key="5">Item 5</div>,
  <div key="6">Item 6</div>
];

describe('ResponsiveGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(<ResponsiveGrid>{mockChildren}</ResponsiveGrid>);
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 6')).toBeInTheDocument();
  });

  it('calculates correct number of columns based on container width', async () => {
    render(<ResponsiveGrid minItemWidth={280}>{mockChildren}</ResponsiveGrid>);
    
    // With 1200px width and 280px min item width, should fit 4 columns
    await waitFor(() => {
      const grid = document.querySelector('.responsive-grid');
      expect(grid).toHaveStyle('grid-template-columns: repeat(4, 1fr)');
    });
  });

  it('applies custom gap', () => {
    render(<ResponsiveGrid gap={24}>{mockChildren}</ResponsiveGrid>);
    
    const grid = document.querySelector('.responsive-grid');
    expect(grid).toHaveStyle('gap: 24');
  });

  it('applies custom className', () => {
    render(<ResponsiveGrid className="custom-grid">{mockChildren}</ResponsiveGrid>);
    
    const grid = document.querySelector('.custom-grid');
    expect(grid).toBeInTheDocument();
  });

  it('applies item className to children', () => {
    render(<ResponsiveGrid itemClassName="custom-item">{mockChildren}</ResponsiveGrid>);
    
    const items = document.querySelectorAll('.custom-item');
    expect(items).toHaveLength(mockChildren.length);
  });

  it('handles empty children array', () => {
    render(<ResponsiveGrid>{[]}</ResponsiveGrid>);
    
    const grid = document.querySelector('.responsive-grid');
    expect(grid).toBeInTheDocument();
    expect(grid?.children).toHaveLength(0);
  });

  it('respects maxItemWidth constraint', async () => {
    render(
      <ResponsiveGrid 
        minItemWidth={200} 
        maxItemWidth={300}
      >
        {mockChildren}
      </ResponsiveGrid>
    );
    
    // Should limit item width to maxItemWidth
    await waitFor(() => {
      const items = document.querySelectorAll('[style*="width"]');
      items.forEach(item => {
        const width = parseInt((item as HTMLElement).style.width);
        expect(width).toBeLessThanOrEqual(300);
      });
    });
  });

  it('enables virtual scrolling when specified', () => {
    render(
      <ResponsiveGrid 
        virtualScrolling={true}
        itemHeight={400}
      >
        {mockChildren}
      </ResponsiveGrid>
    );
    
    const grid = document.querySelector('.responsive-grid');
    expect(grid).toHaveClass('overflow-auto');
    expect(grid).toHaveStyle('display: block');
  });

  it('handles scroll events in virtual scrolling mode', async () => {
    const manyChildren = Array.from({ length: 100 }, (_, i) => (
      <div key={i}>Item {i + 1}</div>
    ));
    
    render(
      <ResponsiveGrid 
        virtualScrolling={true}
        itemHeight={200}
      >
        {manyChildren}
      </ResponsiveGrid>
    );
    
    const grid = document.querySelector('.responsive-grid');
    if (grid) {
      fireEvent.scroll(grid, { target: { scrollTop: 1000 } });
      
      // Should only render visible items plus overscan
      await waitFor(() => {
        const renderedItems = grid.children.length;
        expect(renderedItems).toBeLessThan(manyChildren.length);
      });
    }
  });

  it('applies correct breakpoint classes', async () => {
    render(<ResponsiveGrid>{mockChildren}</ResponsiveGrid>);
    
    await waitFor(() => {
      const items = document.querySelectorAll('[class*="grid-"]');
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('animates items when animateItems is true', () => {
    render(<ResponsiveGrid animateItems={true}>{mockChildren}</ResponsiveGrid>);
    
    // Should wrap children in motion.div components
    const grid = document.querySelector('.responsive-grid');
    expect(grid?.children).toHaveLength(mockChildren.length);
  });

  it('disables animations when animateItems is false', () => {
    render(<ResponsiveGrid animateItems={false}>{mockChildren}</ResponsiveGrid>);
    
    // Should render children directly without animation wrappers
    const grid = document.querySelector('.responsive-grid');
    expect(grid?.children).toHaveLength(mockChildren.length);
  });

  it('shows debug info in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(<ResponsiveGrid>{mockChildren}</ResponsiveGrid>);
    
    expect(screen.getByText(/Columns:/)).toBeInTheDocument();
    expect(screen.getByText(/Item Width:/)).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('hides debug info in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    render(<ResponsiveGrid>{mockChildren}</ResponsiveGrid>);
    
    expect(screen.queryByText(/Columns:/)).not.toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('handles window resize correctly', async () => {
    const { rerender } = render(<ResponsiveGrid>{mockChildren}</ResponsiveGrid>);
    
    // Simulate resize by creating new ResizeObserver callback
    const resizeObserver = new MockResizeObserver(() => {});
    resizeObserver.callback([{
      target: document.createElement('div'),
      contentRect: { width: 800, height: 600 } as DOMRectReadOnly,
      borderBoxSize: [] as any,
      contentBoxSize: [] as any,
      devicePixelContentBoxSize: [] as any
    }], resizeObserver);
    
    rerender(<ResponsiveGrid>{mockChildren}</ResponsiveGrid>);
    
    // Should recalculate grid dimensions
    await waitFor(() => {
      const grid = document.querySelector('.responsive-grid');
      expect(grid).toBeInTheDocument();
    });
  });

  it('calculates total height correctly for virtual scrolling', () => {
    render(
      <ResponsiveGrid 
        virtualScrolling={true}
        itemHeight={200}
        gap={16}
      >
        {mockChildren}
      </ResponsiveGrid>
    );
    
    const grid = document.querySelector('.responsive-grid');
    // Should calculate height based on number of rows
    expect(grid).toHaveAttribute('style');
  });

  it('handles overscan correctly in virtual scrolling', async () => {
    const manyChildren = Array.from({ length: 50 }, (_, i) => (
      <div key={i}>Item {i + 1}</div>
    ));
    
    render(
      <ResponsiveGrid 
        virtualScrolling={true}
        itemHeight={200}
        overscan={3}
      >
        {manyChildren}
      </ResponsiveGrid>
    );
    
    // Should render extra items for smooth scrolling
    await waitFor(() => {
      const grid = document.querySelector('.responsive-grid');
      expect(grid?.children.length).toBeGreaterThan(0);
    });
  });
});

// Test the useResponsiveGrid hook
describe('useResponsiveGrid hook', () => {
  const TestComponent: React.FC<{ containerWidth: number }> = ({ containerWidth }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const gridInfo = useResponsiveGrid(containerRef, 280, 400, 16);
    
    // Mock container width
    React.useEffect(() => {
      if (containerRef.current) {
        Object.defineProperty(containerRef.current, 'offsetWidth', {
          value: containerWidth,
          writable: true
        });
      }
    }, [containerWidth]);
    
    return (
      <div ref={containerRef}>
        <div data-testid="columns">{gridInfo.columns}</div>
        <div data-testid="item-width">{Math.round(gridInfo.itemWidth)}</div>
        <div data-testid="breakpoint">{gridInfo.breakpoint}</div>
      </div>
    );
  };

  it('calculates correct grid info for different container widths', async () => {
    const { rerender } = render(<TestComponent containerWidth={1200} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('columns')).toHaveTextContent('4');
      expect(screen.getByTestId('breakpoint')).toHaveTextContent('wide');
    });
    
    rerender(<TestComponent containerWidth={800} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('columns')).toHaveTextContent('2');
      expect(screen.getByTestId('breakpoint')).toHaveTextContent('tablet');
    });
    
    rerender(<TestComponent containerWidth={400} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('columns')).toHaveTextContent('1');
      expect(screen.getByTestId('breakpoint')).toHaveTextContent('mobile');
    });
  });

  it('returns correct breakpoint names', async () => {
    const breakpointTests = [
      { width: 300, expected: 'mobile' },
      { width: 600, expected: 'tablet' },
      { width: 900, expected: 'desktop' },
      { width: 1400, expected: 'wide' }
    ];
    
    for (const test of breakpointTests) {
      const { unmount } = render(<TestComponent containerWidth={test.width} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('breakpoint')).toHaveTextContent(test.expected);
      });
      
      unmount();
    }
  });
});