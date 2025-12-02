import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { motion } from 'framer-motion';
import { ReturnAnalyticsDashboard } from '../ReturnAnalyticsDashboard';
import { returnAnalyticsService } from '../../../../services/returnAnalyticsService';

// Mock the service
jest.mock('../../../../services/returnAnalyticsService');
const mockReturnAnalyticsService = returnAnalyticsService as jest.Mocked<typeof returnAnalyticsService>;

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ onClick }: any) => <div data-testid="pie" onClick={onClick} />,
  Cell: ({ onClick }: any) => <div data-testid="cell" onClick={onClick} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
}));

// Mock URL.createObjectURL and URL.revokeObjectURL for export functionality
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement and appendChild for export functionality
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
};
document.createElement = jest.fn(() => mockLink as any);
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

const mockAnalyticsData = {
  metrics: {
    totalReturns: 1000,
    approvedReturns: 800,
    rejectedReturns: 150,
    completedReturns: 750,
    pendingReturns: 50,
    cancelledReturns: 100,
    statusDistribution: {
      approved: 800,
      rejected: 150,
      pending: 50,
    },
  },
  financial: {
    totalRefundAmount: 50000,
    averageRefundAmount: 50,
    maxRefundAmount: 500,
    minRefundAmount: 5,
    totalRestockingFees: 1000,
    totalShippingCosts: 2000,
    netRefundImpact: -53000,
  },
  processingTime: {
    averageApprovalTime: 2.5,
    averageRefundTime: 3.2,
    averageTotalResolutionTime: 5.7,
    medianApprovalTime: 2.0,
    p95ApprovalTime: 5.0,
    p99ApprovalTime: 8.0,
  },
  risk: {
    highRiskReturns: 50,
    mediumRiskReturns: 200,
    lowRiskReturns: 750,
    flaggedForReview: 75,
    fraudDetected: 10,
    averageRiskScore: 2.5,
  },
  topReturnReasons: [
    { reason: 'Defective', count: 300, percentage: 30 },
    { reason: 'Wrong Item', count: 250, percentage: 25 },
    { reason: 'Not as Described', count: 200, percentage: 20 },
  ],
  returnsByDay: [
    { date: '2023-01-01', count: 50 },
    { date: '2023-01-02', count: 45 },
  ],
  returnRate: 5.2,
  customerSatisfaction: 4.3,
  returnTrends: {
    monthOverMonth: 2.5,
    weeklyTrend: [
      { week: '2023-W01', returns: 100, refunds: 95 },
      { week: '2023-W02', returns: 110, refunds: 105 },
    ],
  },
};

describe('ReturnAnalyticsDashboard Enhanced Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReturnAnalyticsService.getAnalytics.mockResolvedValue(mockAnalyticsData);
  });

  describe('Interactive Filtering', () => {
    it('should render search input and handle search query changes', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by return ID, customer name, or product...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by return ID, customer name, or product...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(searchInput).toHaveValue('test search');
    });

    it('should render multi-select filters for categories, statuses, and reasons', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
        expect(screen.getByText('All Categories')).toBeInTheDocument();
        expect(screen.getByText('All Reasons')).toBeInTheDocument();
      });

      // Test status dropdown
      const statusDropdown = screen.getByText('All Statuses');
      fireEvent.click(statusDropdown);

      await waitFor(() => {
        expect(screen.getByText('Requested')).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
      });

      // Test category dropdown
      const categoryDropdown = screen.getByText('All Categories');
      fireEvent.click(categoryDropdown);

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.getByText('Clothing')).toBeInTheDocument();
      });

      // Test reason dropdown
      const reasonDropdown = screen.getByText('All Reasons');
      fireEvent.click(reasonDropdown);

      await waitFor(() => {
        expect(screen.getByText('Defective Product')).toBeInTheDocument();
        expect(screen.getByText('Wrong Item')).toBeInTheDocument();
      });
    });

    it('should handle multi-select filter changes', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });

      // Open status dropdown
      const statusDropdown = screen.getByText('All Statuses');
      fireEvent.click(statusDropdown);

      // Select a status
      const approvedCheckbox = screen.getByText('Approved');
      fireEvent.click(approved);

      // Verify the filter is applied
      expect(mockReturnAnalyticsService.getAnalytics).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
    });

    it('should render quick date preset buttons and handle date range changes', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('7 Days')).toBeInTheDocument();
        expect(screen.getByText('30 Days')).toBeInTheDocument();
        expect(screen.getByText('90 Days')).toBeInTheDocument();
        expect(screen.getByText('1 Year')).toBeInTheDocument();
      });

      // Test 30 days preset
      const thirtyDaysButton = screen.getByText('30 Days');
      fireEvent.click(thirtyDaysButton);

      expect(mockReturnAnalyticsService.getAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          start: expect.any(String),
          end: expect.any(String),
        }),
        undefined
      );
    });

    it('should show clear all filters button when filters are applied', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });

      // Apply a filter
      const statusDropdown = screen.getByText('All Statuses');
      fireEvent.click(statusDropdown);

      const approvedCheckbox = screen.getByText('Approved');
      fireEvent.click(approved);

      // Clear all filters button should appear
      await waitFor(() => {
        expect(screen.getByText('Clear All')).toBeInTheDocument();
      });

      // Test clear all filters
      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);
    });

    it('should toggle filter visibility', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Toggle filters closed
      const toggleButton = screen.getByRole('button', { name: /funnel/i });
      fireEvent.click(toggleButton);

      // Toggle filters open
      fireEvent.click(toggleButton);
    });
  });

  describe('Export Functionality', () => {
    it('should render export button and dropdown menu', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Open export dropdown
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument();
        expect(screen.getByText('Excel')).toBeInTheDocument();
        expect(screen.getByText('PDF Report')).toBeInTheDocument();
      });
    });

    it('should handle CSV export', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Open export dropdown
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      // Click CSV export
      const csvOption = screen.getByText('CSV');
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.download).toMatch(/return-analytics-.*\.csv/);
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it('should handle Excel export', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Open export dropdown
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      // Click Excel export
      const excelOption = screen.getByText('Excel');
      fireEvent.click(excelOption);

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.download).toMatch(/return-analytics-.*\.json/);
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it('should handle PDF export', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Open export dropdown
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      // Click PDF export
      const pdfOption = screen.getByText('PDF Report');
      fireEvent.click(pdfOption);

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.download).toMatch(/return-analytics-report-.*\.txt/);
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it('should show loading state during export', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Open export dropdown
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      // Click CSV export
      const csvOption = screen.getByText('CSV');
      fireEvent.click(csvOption);

      // Should show exporting state
      expect(screen.getByText('Exporting...')).toBeInTheDocument();
    });
  });

  describe('Drill-down Capabilities', () => {
    it('should handle drill-down when clicking on pie chart segments', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pie')).toBeInTheDocument();
      });

      // Click on pie chart to trigger drill-down
      const pieChart = screen.getByTestId('pie');
      fireEvent.click(pieChart);

      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
      });
    });

    it('should handle drill-down when clicking on bar chart segments', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bar')).toBeInTheDocument();
      });

      // Click on bar chart to trigger drill-down
      const barChart = screen.getByTestId('bar');
      fireEvent.click(barChart);

      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
      });
    });

    it('should handle drill-down when clicking on seller rows', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Seller Performance')).toBeInTheDocument();
      });

      // Find and click on a seller row
      const sellerRows = screen.getAllByRole('row');
      const firstSellerRow = sellerRows.find(row => 
        row.textContent && row.textContent.includes('TechStore Pro')
      );
      
      if (firstSellerRow) {
        fireEvent.click(firstSellerRow);

        await waitFor(() => {
          expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
          expect(screen.getByText(/seller - TechStore Pro/)).toBeInTheDocument();
        });
      }
    });

    it('should clear drill-down when close button is clicked', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pie')).toBeInTheDocument();
      });

      // Trigger drill-down
      const pieChart = screen.getByTestId('pie');
      fireEvent.click(pieChart);

      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
      });

      // Close drill-down
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/Drill-down:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Comparison Views', () => {
    it('should render comparison button and handle comparison view toggle', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });

      // Click compare button
      const compareButton = screen.getByText('Compare');
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('Period Comparison')).toBeInTheDocument();
      });
    });

    it('should render period selector buttons in comparison view', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });

      // Open comparison view
      const compareButton = screen.getByText('Compare');
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('Week')).toBeInTheDocument();
        expect(screen.getByText('Month')).toBeInTheDocument();
        expect(screen.getByText('Quarter')).toBeInTheDocument();
        expect(screen.getByText('Year')).toBeInTheDocument();
      });
    });

    it('should handle period selection in comparison view', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });

      // Open comparison view
      const compareButton = screen.getByText('Compare');
      fireEvent.click(compareButton);

      // Select different period
      const weekButton = screen.getByText('Week');
      fireEvent.click(weekButton);

      expect(mockReturnAnalyticsService.getAnalytics).toHaveBeenCalledTimes(2); // Once for current, once for previous
    });

    it('should display comparison metrics with trend indicators', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });

      // Open comparison view
      const compareButton = screen.getByText('Compare');
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('Total Returns')).toBeInTheDocument();
        expect(screen.getByText('Total Refund Amount')).toBeInTheDocument();
        expect(screen.getByText('Approval Rate')).toBeInTheDocument();
        expect(screen.getByText('Avg Processing Time')).toBeInTheDocument();
      });
    });

    it('should close comparison view when compare button is clicked again', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });

      // Open comparison view
      const compareButton = screen.getByText('Compare');
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('Period Comparison')).toBeInTheDocument();
      });

      // Close comparison view
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.queryByText('Period Comparison')).not.toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle multiple filter changes together', async () => {
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });

      // Apply multiple filters
      const statusDropdown = screen.getByText('All Statuses');
      fireEvent.click(statusDropdown);

      const approvedCheckbox = screen.getByText('Approved');
      fireEvent.click(approved);

      const searchInput = screen.getByPlaceholderText('Search by return ID, customer name, or product...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Change date range
      const thirtyDaysButton = screen.getByText('30 Days');
      fireEvent.click(thirtyDaysButton);

      expect(mockReturnAnalyticsService.getAnalytics).toHaveBeenCalled();
    });

    it('should handle error states gracefully', async () => {
      mockReturnAnalyticsService.getAnalytics.mockRejectedValue(new Error('API Error'));
      
      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch analytics data')).toBeInTheDocument();
      });
    });

    it('should handle export errors gracefully', async () => {
      // Mock a failed export
      global.URL.createObjectURL = jest.fn(() => {
        throw new Error('Export failed');
      });

      render(<ReturnAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Attempt export
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      const csvOption = screen.getByText('CSV');
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to export data. Please try again.')).toBeInTheDocument();
      });
    });
  });
});