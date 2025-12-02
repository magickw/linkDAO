/**
 * Seller Compliance Dashboard Component Tests
 * 
 * Comprehensive test suite for the Seller Compliance Dashboard components
 * including dashboard, detail view, actions, and reports functionality.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import SellerComplianceDashboard from '../SellerComplianceDashboard';
import SellerComplianceDetail from '../SellerComplianceDetail';
import ComplianceReportsDashboard from '../ComplianceReportsDashboard';

// Mock WebSocket service
jest.mock('../../../services/complianceWebSocketClient', () => ({
  useComplianceWebSocket: () => ({
    isConnected: true,
    lastUpdate: new Date(),
    error: null,
    subscribeToCompliance: jest.fn(() => jest.fn()),
    subscribeToAlerts: jest.fn(() => jest.fn()),
    subscribeToSeller: jest.fn(() => jest.fn()),
    authenticate: jest.fn(),
    requestSnapshot: jest.fn()
  })
}));

describe('SellerComplianceDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard with loading state', () => {
    render(<SellerComplianceDashboard />);
    
    expect(screen.getByText('Loading compliance dashboard...')).toBeInTheDocument();
  });

  it('should render dashboard with seller data', async () => {
    render(<SellerComplianceDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Seller Compliance Dashboard')).toBeInTheDocument();
      expect(screen.getByText('TechStore Pro')).toBeInTheDocument();
      expect(screen.getByText('Fashion Hub')).toBeInTheDocument();
    });
  });

  it('should display metrics overview', async () => {
    render(<SellerComplianceDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Sellers')).toBeInTheDocument();
      expect(screen.getByText('Compliant')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Avg Score')).toBeInTheDocument();
    });
  });

  it('should filter sellers by search query', async () => {
    render(<SellerComplianceDashboard />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search sellers...')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search sellers...');
    fireEvent.change(searchInput, { target: { value: 'TechStore' } });
    
    await waitFor(() => {
      expect(screen.getByText('TechStore Pro')).toBeInTheDocument();
      expect(screen.queryByText('Fashion Hub')).not.toBeInTheDocument();
    });
  });

  it('should filter sellers by status', async () => {
    render(<SellerComplianceDashboard />);
    
    await waitFor(() => {
      const statusFilter = screen.getByDisplayValue('All Status');
      fireEvent.change(statusFilter, { target: { value: 'compliant' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('TechStore Pro')).toBeInTheDocument();
      expect(screen.queryByText('Fashion Hub')).not.toBeInTheDocument();
    });
  });

  it('should open seller detail modal', async () => {
    render(<SellerComplianceDashboard />);
    
    await waitFor(() => {
      const viewDetailsButton = screen.getAllByText('View Details')[0];
      fireEvent.click(viewDetailsButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Seller Details: TechStore Pro')).toBeInTheDocument();
      expect(screen.getByText('Compliance Overview')).toBeInTheDocument();
    });
  });

  it('should open action modal', async () => {
    render(<SellerComplianceDashboard />);
    
    await waitFor(() => {
      const actionsButton = screen.getAllByText('Actions')[0];
      fireEvent.click(actionsButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Send Warning')).toBeInTheDocument();
      expect(screen.getByText('Suspend Seller')).toBeInTheDocument();
      expect(screen.getByText('Investigate')).toBeInTheDocument();
    });
  });

  it('should execute compliance action', async () => {
    render(<SellerComplianceDashboard />);
    
    await waitFor(() => {
      const actionsButton = screen.getAllByText('Actions')[0];
      fireEvent.click(actionsButton);
    });
    
    await waitFor(() => {
      const reasonInput = screen.getByPlaceholderText('Enter reason for this action...');
      fireEvent.change(reasonInput, { target: { value: 'Test warning reason' } });
      
      const executeButton = screen.getByText('Execute Action');
      fireEvent.click(executeButton);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Send Warning')).not.toBeInTheDocument();
    });
  });

  it('should close detail modal', async () => {
    render(<SellerComplianceDashboard />);
    
    await waitFor(() => {
      const viewDetailsButton = screen.getAllByText('View Details')[0];
      fireEvent.click(viewDetailsButton);
    });
    
    await waitFor(() => {
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Seller Details: TechStore Pro')).not.toBeInTheDocument();
    });
  });
});

describe('SellerComplianceDetail', () => {
  const mockProps = {
    sellerId: 'S001',
    onClose: jest.fn(),
    onAction: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render seller detail view', async () => {
    render(<SellerComplianceDetail {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('TechStore Pro')).toBeInTheDocument();
      expect(screen.getByText('Compliance Overview')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });
  });

  it('should display compliance score history', async () => {
    render(<SellerComplianceDetail {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Compliance Score History')).toBeInTheDocument();
      expect(screen.getByText('Monthly assessment')).toBeInTheDocument();
      expect(screen.getByText('Processing delay detected')).toBeInTheDocument();
    });
  });

  it('should display violations list', async () => {
    render(<SellerComplianceDetail {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Violations')).toBeInTheDocument();
      expect(screen.getByText('approval_rate')).toBeInTheDocument();
      expect(screen.getByText('processing_delay')).toBeInTheDocument();
    });
  });

  it('should open violation detail modal', async () => {
    render(<SellerComplianceDetail {...mockProps} />);
    
    await waitFor(() => {
      const viewDetailsButton = screen.getAllByText('View Details')[0];
      fireEvent.click(viewDetailsButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Violation Details')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Impact')).toBeInTheDocument();
    });
  });

  it('should handle violation actions', async () => {
    render(<SellerComplianceDetail {...mockProps} />);
    
    await waitFor(() => {
      const acknowledgeButton = screen.getAllByText('Acknowledge')[0];
      fireEvent.click(acknowledgeButton);
    });
    
    await waitFor(() => {
      const notesInput = screen.getByPlaceholderText('Enter notes...');
      fireEvent.change(notesInput, { target: { value: 'Test acknowledgment' } });
      
      const acknowledgeActionButton = screen.getByText('Acknowledge');
      fireEvent.click(acknowledgeActionButton);
    });
    
    await waitFor(() => {
      expect(mockProps.onAction).toHaveBeenCalledWith({
        type: 'acknowledge',
        violationId: expect.any(String),
        notes: 'Test acknowledgment'
      });
    });
  });

  it('should call onClose when close button is clicked', async () => {
    render(<SellerComplianceDetail {...mockProps} />);
    
    await waitFor(() => {
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
    });
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });
});

describe('ComplianceReportsDashboard', () => {
  const mockProps = {
    userId: 'admin-user'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render reports dashboard', () => {
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    expect(screen.getByText('Compliance Reports')).toBeInTheDocument();
    expect(screen.getByText('Generate Report')).toBeInTheDocument();
  });

  it('should display reports list', async () => {
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Compliance Summary Report')).toBeInTheDocument();
      expect(screen.getByText('Violation Analysis Report')).toBeInTheDocument();
      expect(screen.getByText('Trend Analysis Report')).toBeInTheDocument();
    });
  });

  it('should open generate report modal', async () => {
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Generate Compliance Report')).toBeInTheDocument();
      expect(screen.getByText('Report Type')).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });
  });

  it('should filter reports by search query', async () => {
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search reports...');
      fireEvent.change(searchInput, { target: { value: 'Summary' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Compliance Summary Report')).toBeInTheDocument();
      expect(screen.queryByText('Violation Analysis Report')).not.toBeInTheDocument();
    });
  });

  it('should filter reports by type', async () => {
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    await waitFor(() => {
      const typeFilter = screen.getByDisplayValue('All Types');
      fireEvent.change(typeFilter, { target: { value: 'summary' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Compliance Summary Report')).toBeInTheDocument();
      expect(screen.queryByText('Violation Analysis Report')).not.toBeInTheDocument();
    });
  });

  it('should generate report with valid inputs', async () => {
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    // Open generate modal
    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      // Fill form
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
      
      // Generate report
      const generateReportButton = screen.getByText('Generate Report');
      fireEvent.click(generateReportButton);
    });
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/Report generation started/)).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    // Open generate modal
    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      // Try to generate without required fields
      const generateReportButton = screen.getByText('Generate Report');
      fireEvent.click(generateReportButton);
    });
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Please select start and end dates/)).toBeInTheDocument();
    });
  });

  it('should download report', async () => {
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    await waitFor(() => {
      const downloadButton = screen.getAllByText('Download')[0];
      fireEvent.click(downloadButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Report downloaded successfully/)).toBeInTheDocument();
    });
  });

  it('should delete report with confirmation', async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    await waitFor(() => {
      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Report deleted successfully/)).toBeInTheDocument();
    });
  });

  it('should close generate modal', async () => {
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    // Open generate modal
    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Generate Compliance Report')).not.toBeInTheDocument();
    });
  });

  it('should reset form when modal closes', async () => {
    render(<ComplianceReportsDashboard {...mockProps} />);
    
    // Open generate modal
    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      // Change form values
      const reportTypeSelect = screen.getByDisplayValue('Compliance Summary');
      fireEvent.change(reportTypeSelect, { target: { value: 'violation' } });
      
      // Close modal
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
    });
    
    // Reopen modal
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      // Form should be reset to default values
      expect(screen.getByDisplayValue('Compliance Summary')).toBeInTheDocument();
    });
  });
});

describe('Integration Tests', () => {
  it('should handle real-time updates in dashboard', async () => {
    render(<SellerComplianceDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Real-time Updates Active')).toBeInTheDocument();
    });
  });

  it('should handle error states gracefully', async () => {
    // Mock error state
    jest.mock('../../../services/complianceWebSocketClient', () => ({
      useComplianceWebSocket: () => ({
        isConnected: false,
        lastUpdate: null,
        error: 'Connection failed',
        subscribeToCompliance: jest.fn(() => jest.fn()),
        subscribeToAlerts: jest.fn(() => jest.fn()),
        subscribeToSeller: jest.fn(() => jest.fn()),
        authenticate: jest.fn(),
        requestSnapshot: jest.fn()
      })
    }));

    render(<SellerComplianceDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Real-time Updates Inactive')).toBeInTheDocument();
    });
  });

  it('should handle empty states', async () => {
    // Mock empty reports
    jest.mock('../../../services/complianceWebSocketClient', () => ({
      useComplianceWebSocket: () => ({
        isConnected: true,
        lastUpdate: new Date(),
        error: null,
        subscribeToCompliance: jest.fn(() => jest.fn()),
        subscribeToAlerts: jest.fn(() => jest.fn()),
        subscribeToSeller: jest.fn(() => jest.fn()),
        authenticate: jest.fn(),
        requestSnapshot: jest.fn()
      })
    }));

    render(<ComplianceReportsDashboard />);
    
    // Apply search that returns no results
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search reports...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('No reports found')).toBeInTheDocument();
    });
  });
});