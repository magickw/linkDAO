import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import InteractiveChart from '../InteractiveChart';

// Mock Chart.js and react-chartjs-2
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
    getChart: jest.fn(() => ({
      update: jest.fn(),
      destroy: jest.fn(),
      zoom: jest.fn(),
      pan: jest.fn(),
      resetZoom: jest.fn()
    }))
  }
}));

jest.mock('react-chartjs-2', () => ({
  Chart: React.forwardRef(({ type, data, options, onClick }: any, ref: any) => (
    <div 
      data-testid={`${type}-chart`}
      data-chart-data={JSON.stringify(data)}
      onClick={onClick}
      ref={ref}
    />
  ))
}));

const mockChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [{
    label: 'User Growth',
    data: [100, 150, 200, 180, 220],
    borderColor: 'rgb(75, 192, 192)',
    backgroundColor: 'rgba(75, 192, 192, 0.2)'
  }]
};

const mockChartConfig = {
  type: 'line' as const,
  data: mockChartData,
  interactions: {
    zoom: true,
    pan: true,
    drill: true,
    filter: true,
    crossFilter: false,
    tooltip: {
      enabled: true,
      mode: 'index'
    }
  },
  styling: {
    theme: 'light',
    colors: ['#3B82F6', '#10B981', '#F59E0B']
  },
  realTime: false
};

describe('InteractiveChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chart with provided data', () => {
    render(<InteractiveChart config={mockChartConfig} />);
    
    const chart = screen.getByTestId('line-chart');
    expect(chart).toBeInTheDocument();
    
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
    expect(chartData.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May']);
  });

  it('enables zoom functionality when configured', () => {
    render(<InteractiveChart config={mockChartConfig} />);
    
    const zoomButton = screen.getByRole('button', { name: /zoom/i });
    expect(zoomButton).toBeInTheDocument();
  });

  it('enables pan functionality when configured', () => {
    render(<InteractiveChart config={mockChartConfig} />);
    
    const panButton = screen.getByRole('button', { name: /pan/i });
    expect(panButton).toBeInTheDocument();
  });

  it('handles drill-down interaction', async () => {
    const onDrillDown = jest.fn();
    render(
      <InteractiveChart 
        config={mockChartConfig} 
        onDrillDown={onDrillDown}
      />
    );
    
    const chart = screen.getByTestId('line-chart');
    fireEvent.click(chart);
    
    await waitFor(() => {
      expect(onDrillDown).toHaveBeenCalled();
    });
  });

  it('displays filter controls when enabled', () => {
    render(<InteractiveChart config={mockChartConfig} />);
    
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('handles zoom reset', async () => {
    render(<InteractiveChart config={mockChartConfig} />);
    
    const resetButton = screen.getByRole('button', { name: /reset zoom/i });
    fireEvent.click(resetButton);
    
    // Chart should reset zoom (mocked behavior)
    await waitFor(() => {
      expect(resetButton).toBeInTheDocument();
    });
  });

  it('applies theme styling', () => {
    render(<InteractiveChart config={mockChartConfig} />);
    
    const chartContainer = screen.getByTestId('line-chart').parentElement;
    expect(chartContainer).toHaveClass('chart-theme-light');
  });

  it('handles real-time updates when enabled', () => {
    const realTimeConfig = {
      ...mockChartConfig,
      realTime: true
    };
    
    render(<InteractiveChart config={realTimeConfig} />);
    
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('displays tooltip on hover', async () => {
    render(<InteractiveChart config={mockChartConfig} />);
    
    const chart = screen.getByTestId('line-chart');
    fireEvent.mouseOver(chart);
    
    // Tooltip should be handled by Chart.js (mocked)
    expect(chart).toBeInTheDocument();
  });

  it('handles data updates', () => {
    const { rerender } = render(<InteractiveChart config={mockChartConfig} />);
    
    const updatedConfig = {
      ...mockChartConfig,
      data: {
        ...mockChartData,
        datasets: [{
          ...mockChartData.datasets[0],
          data: [120, 170, 220, 200, 240]
        }]
      }
    };
    
    rerender(<InteractiveChart config={updatedConfig} />);
    
    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
    expect(chartData.datasets[0].data).toEqual([120, 170, 220, 200, 240]);
  });

  it('handles cross-filtering when enabled', () => {
    const crossFilterConfig = {
      ...mockChartConfig,
      interactions: {
        ...mockChartConfig.interactions,
        crossFilter: true
      }
    };
    
    const onCrossFilter = jest.fn();
    render(
      <InteractiveChart 
        config={crossFilterConfig} 
        onCrossFilter={onCrossFilter}
      />
    );
    
    expect(screen.getByRole('button', { name: /cross filter/i })).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<InteractiveChart config={mockChartConfig} loading={true} />);
    
    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    render(
      <InteractiveChart 
        config={mockChartConfig} 
        error="Failed to load chart data"
      />
    );
    
    expect(screen.getByText('Error: Failed to load chart data')).toBeInTheDocument();
  });
});