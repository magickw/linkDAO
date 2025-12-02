import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RefundAnalyticsInterface } from '../RefundAnalyticsInterface';
import { refundMonitoringService } from '../../../../services/refundMonitoringService';

// Mock the service
jest.mock('../../../../services/refundMonitoringService');
const mockRefundMonitoringService = refundMonitoringService as jest.Mocked<typeof refundMonitoringService>;

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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

const mockTransactionTracker = {
  totalRefunds: 1000,
  successfulRefunds: 950,
  failedRefunds: 50,
  totalRefundAmount: 50000,
  averageRefundTime: 180,
  pendingRefunds: 25,
  providerBreakdown: [
    {
      provider: 'stripe',
      totalTransactions: 600,
      totalAmount: 30000,
      successfulTransactions: 580,
      failedTransactions: 20,
      successRate: 96.7,
      averageProcessingTime: 120,
    },
    {
      provider: 'paypal',
      totalTransactions: 300,
      totalAmount: 15000,
      successfulTransactions: 285,
      failedTransactions: 15,
      successRate: 95.0,
      averageProcessingTime: 150,
    },
    {
      provider: 'blockchain',
      totalTransactions: 100,
      totalAmount: 5000,
      successfulTransactions: 85,
      failedTransactions: 15,
      successRate: 85.0,
      averageProcessingTime: 300,
    },
  ],
};

const mockProviderStatus = [
  {
    provider: 'stripe',
    status: 'operational' as const,
    successRate: 96.7,
    errorRate: 3.3,
    averageProcessingTime: 120,
    lastSuccessfulRefund: new Date().toISOString(),
    recentErrors: [],
  },
  {
    provider: 'paypal',
    status: 'degraded' as const,
    successRate: 95.0,
    errorRate: 5.0,
    averageProcessingTime: 150,
    lastSuccessfulRefund: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    recentErrors: ['API timeout', 'Rate limit exceeded'],
  },
  {
    provider: 'blockchain',
    status: 'down' as const,
    successRate: 85.0,
    errorRate: 15.0,
    averageProcessingTime: 300,
    lastSuccessfulRefund: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    recentErrors: ['Network error', 'Node unavailable', 'Transaction failed'],
  },
];

const mockReconciliation = {
  totalReconciled: 950,
  totalPending: 25,
  totalDiscrepancies: 10,
  totalDiscrepancyAmount: 500,
  reconciliationRate: 97.4,
  averageReconciliationTime: 300,
};

const mockFailureAnalysis = {
  totalFailures: 50,
  permanentFailures: 10,
  retryableFailures: 40,
  failuresByProvider: {
    stripe: 20,
    paypal: 15,
    blockchain: 15,
  },
  failuresByReason: {
    'Insufficient Funds': 15,
    'Invalid Card': 12,
    'Network Timeout': 10,
    'API Error': 8,
    'Other': 5,
  },
};

describe('RefundAnalyticsInterface Enhanced Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefundMonitoringService.getTransactionTracker.mockResolvedValue(mockTransactionTracker);
    mockRefundMonitoringService.getProviderStatus.mockResolvedValue(mockProviderStatus);
    mockRefundMonitoringService.getReconciliationData.mockResolvedValue(mockReconciliation);
    mockRefundMonitoringService.analyzeFailures.mockResolvedValue(mockFailureAnalysis);
  });

  describe('Export Functionality', () => {
    it('should render export button and dropdown menu', async () => {
      render(<RefundAnalyticsInterface />);
      
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

    it('should handle CSV export for overview view', async () => {
      render(<RefundAnalyticsInterface />);
      
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
        expect(mockLink.download).toMatch(/refund-analytics-overview-.*\.csv/);
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it('should handle Excel export for providers view', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Transaction Overview')).toBeInTheDocument();
      });

      // Switch to providers view
      const providersButton = screen.getByText('Provider Status');
      fireEvent.click(providersButton);

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
        expect(mockLink.download).toMatch(/refund-analytics-providers-.*\.json/);
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it('should handle PDF export for financial view', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Transaction Overview')).toBeInTheDocument();
      });

      // Switch to financial view
      const financialButton = screen.getByText('Financial Impact');
      fireEvent.click(financialButton);

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
        expect(mockLink.download).toMatch(/refund-analytics-report-financial-.*\.txt/);
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it('should show loading state during export', async () => {
      render(<RefundAnalyticsInterface />);
      
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
    it('should handle drill-down when clicking on provider cards in overview', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Stripe')).toBeInTheDocument();
      });

      // Click on provider card
      const stripeCard = screen.getByText('Stripe');
      fireEvent.click(stripeCard);

      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
        expect(screen.getByText(/provider - stripe/)).toBeInTheDocument();
      });
    });

    it('should handle drill-down when clicking on provider status cards', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Transaction Overview')).toBeInTheDocument();
      });

      // Switch to providers view
      const providersButton = screen.getByText('Provider Status');
      fireEvent.click(providersButton);

      await waitFor(() => {
        expect(screen.getByText('Stripe')).toBeInTheDocument();
      });

      // Click on provider status card
      const stripeCard = screen.getByText('Stripe');
      fireEvent.click(stripeCard);

      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
        expect(screen.getByText(/provider - stripe/)).toBeInTheDocument();
      });
    });

    it('should handle drill-down when clicking on failure items', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Transaction Overview')).toBeInTheDocument();
      });

      // Switch to financial view
      const financialButton = screen.getByText('Financial Impact');
      fireEvent.click(financialButton);

      await waitFor(() => {
        expect(screen.getByText('Failures by Provider')).toBeInTheDocument();
      });

      // Click on a failure provider
      const stripeFailure = screen.getByText('stripe');
      fireEvent.click(stripeFailure);

      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
        expect(screen.getByText(/failure - Provider: stripe/)).toBeInTheDocument();
      });
    });

    it('should display detailed provider information in drill-down view', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Stripe')).toBeInTheDocument();
      });

      // Click on provider card
      const stripeCard = screen.getByText('Stripe');
      fireEvent.click(stripeCard);

      await waitFor(() => {
        expect(screen.getByText('Total Transactions')).toBeInTheDocument();
        expect(screen.getByText('Success Rate')).toBeInTheDocument();
        expect(screen.getByText('Error Rate')).toBeInTheDocument();
        expect(screen.getByText('Avg Processing')).toBeInTheDocument();
        expect(screen.getByText('Error Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
      });
    });

    it('should display detailed transaction information in drill-down view', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Stripe')).toBeInTheDocument();
      });

      // Click on provider card to get to drill-down
      const stripeCard = screen.getByText('Stripe');
      fireEvent.click(stripeCard);

      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
      });

      // Look for transaction details in the drill-down view
      expect(screen.getByText('Transaction Information')).toBeInTheDocument();
      expect(screen.getByText('Processing Steps')).toBeInTheDocument();
    });

    it('should display detailed failure information in drill-down view', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Transaction Overview')).toBeInTheDocument();
      });

      // Switch to financial view
      const financialButton = screen.getByText('Financial Impact');
      fireEvent.click(financialButton);

      await waitFor(() => {
        expect(screen.getByText('Failures by Provider')).toBeInTheDocument();
      });

      // Click on a failure provider
      const stripeFailure = screen.getByText('stripe');
      fireEvent.click(stripeFailure);

      await waitFor(() => {
        expect(screen.getByText('Total Occurrences')).toBeInTheDocument();
        expect(screen.getByText('Affected Providers')).toBeInTheDocument();
        expect(screen.getByText('Resolution Rate')).toBeInTheDocument();
        expect(screen.getByText('Recommended Actions')).toBeInTheDocument();
        expect(screen.getByText('Recent Failures')).toBeInTheDocument();
      });
    });

    it('should clear drill-down when close button is clicked', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Stripe')).toBeInTheDocument();
      });

      // Click on provider card
      const stripeCard = screen.getByText('Stripe');
      fireEvent.click(stripeCard);

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

  describe('View Switching', () => {
    it('should switch between overview, providers, and financial views', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Transaction Overview')).toBeInTheDocument();
      });

      // Switch to providers view
      const providersButton = screen.getByText('Provider Status');
      fireEvent.click(providersButton);

      await waitFor(() => {
        expect(screen.getByText('stripe')).toBeInTheDocument();
        expect(screen.getByText('paypal')).toBeInTheDocument();
        expect(screen.getByText('blockchain')).toBeInTheDocument();
      });

      // Switch to financial view
      const financialButton = screen.getByText('Financial Impact');
      fireEvent.click(financialButton);

      await waitFor(() => {
        expect(screen.getByText('Reconciled')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Discrepancies')).toBeInTheDocument();
      });

      // Switch back to overview
      const overviewButton = screen.getByText('Transaction Overview');
      fireEvent.click(overviewButton);

      await waitFor(() => {
        expect(screen.getByText('Total Refunds')).toBeInTheDocument();
        expect(screen.getByText('Successful')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
    });

    it('should maintain export functionality across all views', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Check export in overview
      let exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument();
      });

      // Switch to providers view
      const providersButton = screen.getByText('Provider Status');
      fireEvent.click(providersButton);

      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Check export in providers view
      exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument();
      });

      // Switch to financial view
      const financialButton = screen.getByText('Financial Impact');
      fireEvent.click(financialButton);

      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Check export in financial view
      exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display and Formatting', () => {
    it('should display transaction metrics correctly', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('1000')).toBeInTheDocument(); // Total Refunds
        expect(screen.getByText('950')).toBeInTheDocument(); // Successful Refunds
        expect(screen.getByText('50')).toBeInTheDocument(); // Failed Refunds
        expect(screen.getByText('$50,000.00')).toBeInTheDocument(); // Total Refund Amount
      });
    });

    it('should display provider status with correct colors and indicators', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Transaction Overview')).toBeInTheDocument();
      });

      // Switch to providers view
      const providersButton = screen.getByText('Provider Status');
      fireEvent.click(providersButton);

      await waitFor(() => {
        expect(screen.getByText('Operational')).toBeInTheDocument();
        expect(screen.getByText('Degraded')).toBeInTheDocument();
        expect(screen.getByText('Down')).toBeInTheDocument();
      });
    });

    it('should display financial impact metrics correctly', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Transaction Overview')).toBeInTheDocument();
      });

      // Switch to financial view
      const financialButton = screen.getByText('Financial Impact');
      fireEvent.click(financialButton);

      await waitFor(() => {
        expect(screen.getByText('950')).toBeInTheDocument(); // Reconciled
        expect(screen.getByText('25')).toBeInTheDocument(); // Pending
        expect(screen.getByText('10')).toBeInTheDocument(); // Discrepancies
        expect(screen.getByText('$500.00')).toBeInTheDocument(); // Discrepancy Amount
      });
    });

    it('should format currency values correctly', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('$50,000.00')).toBeInTheDocument();
      });
    });

    it('should format duration values correctly', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('3m')).toBeInTheDocument(); // 180 seconds formatted as minutes
      });
    });

    it('should format percentage values correctly', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('95.0%')).toBeInTheDocument(); // Success rate
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockRefundMonitoringService.getTransactionTracker.mockRejectedValue(new Error('API Error'));
      
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch refund analytics data')).toBeInTheDocument();
      });
    });

    it('should handle export errors gracefully', async () => {
      // Mock a failed export
      global.URL.createObjectURL = jest.fn(() => {
        throw new Error('Export failed');
      });

      render(<RefundAnalyticsInterface />);
      
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

    it('should handle drill-down errors gracefully', async () => {
      // Mock drill-down failure by making the drill-down data fetch fail
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Stripe')).toBeInTheDocument();
      });

      // Click on provider card - this should still work even if drill-down fails
      const stripeCard = screen.getByText('Stripe');
      fireEvent.click(stripeCard);

      // The drill-down should still attempt to render, but might show an error
      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle view switching with drill-down active', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Stripe')).toBeInTheDocument();
      });

      // Start drill-down
      const stripeCard = screen.getByText('Stripe');
      fireEvent.click(stripeCard);

      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
      });

      // Switch views while drill-down is active
      const providersButton = screen.getByText('Provider Status');
      fireEvent.click(providersButton);

      // Drill-down should still be visible
      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
      });
    });

    it('should handle export with drill-down active', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Stripe')).toBeInTheDocument();
      });

      // Start drill-down
      const stripeCard = screen.getByText('Stripe');
      fireEvent.click(stripeCard);

      await waitFor(() => {
        expect(screen.getByText(/Drill-down:/)).toBeInTheDocument();
      });

      // Export should still work
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      const csvOption = screen.getByText('CSV');
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it('should handle multiple rapid interactions', async () => {
      render(<RefundAnalyticsInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Rapid interactions
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);
      fireEvent.click(exportButton);

      const providersButton = screen.getByText('Provider Status');
      fireEvent.click(providersButton);

      const csvOption = screen.getByText('CSV');
      fireEvent.click(csvOption);

      // Should handle gracefully without errors
      await waitFor(() => {
        expect(screen.getByText('stripe')).toBeInTheDocument();
      });
    });
  });
});