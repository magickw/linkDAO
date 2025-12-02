import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { motion } from 'framer-motion';
import { RiskManagementConsole } from '../RiskManagementConsole';
import { riskManagementService } from '../../../../services/riskManagementService';

// Mock the service
jest.mock('../../../../services/riskManagementService');
const mockRiskManagementService = riskManagementService as jest.Mocked<typeof riskManagementService>;

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
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
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
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

describe('RiskManagementConsole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock service responses
    mockRiskManagementService.getRiskMetrics.mockResolvedValue({
      totalReturns: 1000,
      highRiskReturns: 150,
      mediumRiskReturns: 300,
      lowRiskReturns: 550,
      flaggedForReview: 75,
      fraudDetected: 10,
      averageRiskScore: 0.45,
      riskTrend: {
        daily: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          highRisk: Math.floor(Math.random() * 20) + 10,
          mediumRisk: Math.floor(Math.random() * 40) + 20,
          lowRisk: Math.floor(Math.random() * 40) + 20,
          averageScore: Math.random() * 0.3 + 0.3
        })),
        weekly: Array.from({ length: 4 }, (_, i) => ({
          week: `2024-W${String(41 + i).padStart(2, '0')}`,
          highRisk: Math.floor(Math.random() * 25) + 15,
          mediumRisk: Math.floor(Math.random() * 35) + 25,
          lowRisk: Math.floor(Math.random() * 40) + 20,
          averageScore: Math.random() * 0.3 + 0.3
        }))
      }
    });

    mockRiskManagementService.getRiskStatistics.mockResolvedValue({
      totalReturns: 1000,
      riskDistribution: {
        low: 550,
        medium: 300,
        high: 150,
        critical: 0
      },
      riskTrends: {
        daily: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          averageScore: Math.random() * 0.3 + 0.3
        })),
        weekly: Array.from({ length: 4 }, (_, i) => ({
          week: `2024-W${String(41 + i).padStart(2, '0')}`,
          averageScore: Math.random() * 0.3 + 0.3
        }))
      },
      topRiskFactors: [
        { factor: 'high_frequency_returns', count: 25, averageImpact: 15 },
        { factor: 'unusual_patterns', count: 18, averageImpact: 12 },
        { factor: 'suspicious_behavior', count: 12, averageImpact: 20 }
      ],
      alertSummary: {
        total: 50,
        active: 15,
        acknowledged: 25,
        resolved: 10
      },
      reviewQueue: {
        pending: 30,
        overdue: 5,
        completed: 65
      }
    });

    mockRiskManagementService.getHighRiskReturns.mockResolvedValue({
      returns: [
        {
          id: 'R001',
          customerEmail: 'customer1@example.com',
          customerWalletAddress: '0x123456789012345678901234567890',
          sellerWalletAddress: '0x987654321098765432109876543210',
          orderId: 'ORD001',
          returnReason: 'Defective Product',
          amount: 250.00,
          riskScore: 0.85,
          riskLevel: 'high',
          riskFactors: [
            {
              category: 'behavioral',
              factor: 'high_frequency_returns',
              severity: 'high',
              impact: 25,
              description: 'Customer has filed multiple returns in short period',
              detectedAt: new Date().toISOString(),
            }
          ],
          status: 'pending',
          flaggedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          evidence: [],
          reviewedBy: undefined,
          reviewedAt: undefined,
          reviewNotes: undefined
        },
        {
          id: 'R002',
          customerEmail: 'customer2@example.com',
          customerWalletAddress: '0x23456789012345678901234567890',
          sellerWalletAddress: '0x87654321098765432109876543210',
          orderId: 'ORD002',
          returnReason: 'Wrong Item',
          amount: 150.00,
          riskScore: 0.65,
          riskLevel: 'medium',
          riskFactors: [],
          status: 'under_review',
          flaggedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          evidence: [],
          reviewedBy: 'reviewer1',
          reviewedAt: new Date().toISOString(),
          reviewNotes: 'Under investigation'
        }
      ],
      total: 2
    });

    mockRiskManagementService.getRiskAlerts.mockResolvedValue({
      alerts: [
        {
          id: 'ALERT001',
          type: 'threshold_breach',
          severity: 'high',
          title: 'High Risk Score Alert',
          description: 'Risk score exceeded 0.8 threshold',
          affectedEntities: [
            { type: 'user', id: 'U001', name: 'Customer 1' },
            { type: 'return', id: 'R001', name: 'Return R001' }
          ],
          triggeredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          acknowledgedAt: undefined,
          acknowledgedBy: undefined,
          status: 'active',
          metadata: {}
        },
        {
          id: 'ALERT002',
          type: 'pattern_detected',
          severity: 'medium',
          title: 'Suspicious Pattern Detected',
          description: 'Multiple returns detected from same user',
          affectedEntities: [
            { type: 'user', id: 'U001', name: 'Customer 1' }
          ],
          triggeredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          acknowledgedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          acknowledgedBy: 'admin1',
          status: 'acknowledged',
          metadata: {}
        }
      ],
      total: 2
    });

    mockRiskManagementService.getReviewAssignments.mockResolvedValue({
      assignments: [
        {
          id: 'ASSIGN001',
          riskReturnId: 'R001',
          assignedTo: 'reviewer1',
          assignedBy: 'admin1',
          assignedAt: new Date().toISOString(),
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high',
          status: 'pending'
        }
      ],
      total: 1
    });
  });

  describe('Dashboard Rendering', () => {
    it('should render the risk management console with all sections', async () => {
      render(<RiskManagementConsole />);
      
      expect(screen.getByText('Risk Management Console')).toBeInTheDocument();
      expect(screen.getByText('Monitor and manage return risks and fraud detection')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Risk Returns')).toBeInTheDocument();
        expect(screen.getByText('Alerts')).toBeInTheDocument();
        expect(screen.getByText('Reviews')).toBeInTheDocument();
        expect(screenByText('Reports')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('should display risk metrics cards', async () => {
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Returns')).toBeInTheDocument();
        expect(screen.getByText('1000')).toBeInTheDocument();
        expect(screen.getByText('High Risk')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Active Alerts')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screenByText('Pending Reviews')).toBeInTheDocument();
        expect(screenByText('30')).toBeInTheDocument();
      });
    });

    it('should display risk distribution chart', async () => {
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should switch between different views', async () => {
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Click on Returns tab
      fireEvent.click(screen.getByText('Risk Returns'));
      await waitFor(() => {
        expect(screen.getByText('Risk Returns')).toBeInTheDocument();
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      });

      // Click on Alerts tab
      fireEvent.click(screen.getByText('Alerts'));
      await waitFor(() => {
        expect(screen.getByText('Alerts')).toBeInTheDocument();
        expect(screen.queryByText('Risk Returns')).not.toBeInTheDocument();
      });

      // Click on Reviews tab
      fireEvent.click(screen.getByText('Reviews'));
      await waitFor(() => {
        expect(screen.getByText('Reviews')).toBeInTheDocument();
        expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
      });
    });

    it('should navigate back to dashboard from other views', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Returns tab
      fireEvent.click(screen.getByText('Risk Returns'));
      await waitFor(() => {
        expect(screen.getByText('Risk Returns')).toBeInTheDocument();
      });

      // Navigate back to Dashboard
      fireEvent.click(screen.getByText('Dashboard'));
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.queryByText('Risk Returns')).not.toBeInTheDocument();
      });
    });
  });

  describe('Risk Returns View', () => {
    it('should display high-risk returns list', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Returns tab
      fireEvent.click(screen.getByText('Risk Returns'));
      
      await waitFor(() => {
        expect(screen.getByText('R001')).toBeInTheDocument();
        expect(screen.getByText('customer1@example.com')).toBeInTheDocument();
        expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
        expect(screen.getByText('0.85')).toBeInTheDocument();
      });
    });

    it('should handle return details modal', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Returns tab
      fireEvent.click(screen.getByText('Risk Returns'));
      
      await waitFor(() => {
        expect(screen.getByText('R001')).toBeInTheDocument();
      });

      // Click on Review button for first return
      fireEvent.click(screen.getByText('Review'));
      
      await waitFor(() => {
        expect(screen.getByText('Return Risk Details')).toBeInTheDocument();
        expect(screen.getByText('Return ID: R001')).toBeInTheDocument();
        expect(screen.getByText('Customer: customer1@example.com')).toBeInTheDocument();
        expect(screen.getByText('Amount: $250.00')).toBeInTheDocument();
      });
    });

    it('should close modal when close button is clicked', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Returns tab
      fireEvent.click(screen.getByText('Risk Returns'));
      
      await waitFor(() => {
        expect(screen.getByText('R001')).toBeInTheDocument();
      });

      // Open modal
      fireEvent.click(screen.getByText('Review'));
      await waitFor(() => {
        expect(screen.getByText('Return Risk Details')).toBeInTheDocument();
      });

      // Close modal
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      
      await waitFor(() => {
        expect(screen.queryByText('Return Risk Details')).not.toBeInTheDocument();
      });
    });
  });

  describe('Alerts View', () => {
    it('should display active alerts', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Alerts tab
      fireEvent.click(screenByText('Alerts'));
      
      await waitFor(() => {
        expect(screen.getByText('High Risk Score Alert')).toBeInTheDocument();
        expect(screen.getByText('Suspicious Pattern Detected')).toBeInTheDocument();
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
      });
    });

    it('should handle alert acknowledgment', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Alerts tab
      fireEvent.click(screen.getByText('Alerts'));
      
      await waitFor(() => {
        expect(screen.getByText('Suspicious Pattern Detected')).toBeInTheDocument();
        expect(screen.getByText('acknowledged')).toBeInTheDocument();
      });

      // Click acknowledge button
      fireEvent.click(screen.getByText('Acknowledge'));
      
      await waitFor(() => {
        expect(screen.queryByText('acknowledged')).not.toBeInTheDocument();
      });
    });

    it('should handle alert resolution', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Alerts tab
      fireEvent.click(screenByText('Alerts'));
      
      await waitFor(() => {
        expect(screen.getByText('High Risk Score Alert')).toBeInTheDocument();
      });

      // Open alert details
      fireEvent.click(screen.getByText('View'));
      await waitFor(() => {
        expect(screen.getByText('Alert Details')).toBeInTheDocument();
      });

      // Click resolve button
      fireEvent.click(screen.getByText('Resolve'));
      
      await waitFor(() => {
        expect(screen.queryByText('Alert Details')).not.toBeInTheDocument();
      });
    });
  });

  describe('Reviews View', () => {
    it('should display review assignments', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Reviews tab
      fireEvent.click(screen.getByText('Reviews'));
      
      await waitFor(() => {
        expect(screen.getByText('R001')).toBeInTheDocument();
        expect(screen.getByText('reviewer1')).toBeInTheDocument();
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
      });
    });

    it('should display review workflow stages', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Reviews tab
      fireEvent.click(screenByText('Reviews'));
      
      await waitFor(() => {
        expect(screen.getByText('Review Queue')).toBeInTheDocument();
        expect(screen.getByText('Workflow Status')).toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    it('should toggle filter visibility', async () => {
      render(<RiskManagementConsole />);
      
      // Initially filters should be visible
      expect(screen.getByText('Filters')).toBeInTheDocument();
      
      // Hide filters
      fireEvent.click(screen.getByRole('button', { name: /funnel/i }));
      
      await waitFor(() => {
        expect(screen.queryByText('Filters')).not.toBeInTheDocument();
      });

      // Show filters again
      fireEvent.click(screen.getByRole('button', { name: /funnel/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });
    });

    it('should filter returns by risk level', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Returns tab
      fireEvent.click(screen.getByText('Risk Returns'));
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Filter by risk level
      const riskLevelSelect = screen.getByLabelText('Risk Level:');
      fireEvent.change(riskLevelSelect, { target: { value: 'high' } });
      
      await waitFor(() => {
        expect(mockRiskManagementService.getHighRiskReturns).toHaveBeenCalledWith(
          expect.objectContaining({
            riskLevel: 'high'
          })
        );
      });
    });

    it('should filter returns by status', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Returns tab
      fireEvent.click(screenByText('Risk Returns'));
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Filter by status
      const statusSelect = screen.getByLabelText('Status:');
      fireEvent.change(statusSelect, { target: { value: 'pending' } });
      
      await waitFor(() => {
        expect(mockRiskManagementService.getHighRiskReturns).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'pending'
          })
        );
      });
    });

    it('should search returns by query', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Returns tab
      fireEvent.click(screen.getByText('Risk Returns'));
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Search by query
      const searchInput = screen.getByPlaceholderText('Search returns...');
      fireEvent.change(searchInput, { target: { value: 'R001' } });
      
      await waitFor(() => {
        expect(mockRiskManagementService.getHighRiskReturns).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'R001'
          })
        );
      });
    });

    it('should clear all filters', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Returns tab
      fireEvent.click(screenByText('Risk Returns'));
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Apply filters
      const riskLevelSelect = screen.getByLabelText('Risk Level:');
      fireEvent.change(riskLevelSelect, { target: { value: 'high' } });
      
      // Clear filters
      const clearButton = screen.getByText('Clear All');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(mockRiskManagementService.getHighRiskMetrics).toHaveBeenCalledWith();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should export reports in different formats', async () => {
      render(<RiskManagementConsole />);
      
      // Navigate to Reports tab
      fireEvent.click(screen.getByText('Reports'));
      
      await waitFor(() => {
        expect(screen.getByText('Reports')).toBeInTheDocument();
      });

      // Mock a report
      const mockReport = {
        id: 'REPORT001',
        title: 'Test Report',
        type: 'weekly',
        period: {
          start: '2024-01-01',
          end: '2024-01-07'
        },
        generatedAt: new Date().toISOString()
      };

      // Mock getRiskReports to return our mock report
      mockRiskManagementService.getRiskReports.mockResolvedValue({
        reports: [mockReport],
        total: 1
      });

      // Re-render to get the updated reports list
      render(<RiskManagementConsole />);
      
      // Navigate to Reports tab
      fireEvent.click(screenByText('Reports'));
      
      await waitFor(() => {
        expect(screen.getByText('Test Report')).toBeInTheDocument();
      });

      // Open export menu
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument();
        expect(screen.getByText('Excel')).toBeInTheDocument();
        expect(screen.getByText('PDF Report')).toBeInTheDocument();
      });

      // Click CSV export
      fireEvent.click(screen.getByText('CSV'));
      
      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.download).toMatch(/risk-report-.*\.csv$/);
        expect(mockLink.click).toHaveBeenCalled();
      });
    });

    it('should handle export errors gracefully', async () => {
      render(<RiskManagementConsole />);
      
      // Mock export failure
      global.URL.createObjectURL = jest.fn(() => {
        throw new Error('Export failed');
      });

      // Navigate to Reports tab
      fireEvent.click(screenByText('Reports'));
      
      await waitFor(() => {
        expect(screen.getByText('Reports')).toBeInTheDocument();
      });

      // Open export menu and attempt export
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);
      fireEvent.click(screen.getByText('CSV'));
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to export report')).toBeInTheDocument();
      });
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data when refresh button is clicked', async () => {
      render(<RiskManagementConsole />);
      
      const refreshButton = screen.getByText('Refresh');
      
      await waitFor(() => {
        expect(refreshButton).toBeInTheDocument();
      });

      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockRiskManagementService.getRiskMetrics).toHaveBeenCalledTimes(2);
        expect(mockRiskManagementService.getRiskStatistics).toHaveBeenCalledTimes(2);
        expect(mockRiskManagementService.getHighRiskReturns).toHaveBeenCalledTimes(2);
        expect(mockRiskManagementService.getRiskAlerts).toHaveBeenCalledTimes(2);
        expect(mockRiskManagementService.getReviewAssignments).toHaveBeenCalledTimes(2);
      });
    });

    it('should show loading state during refresh', async () => {
      render(<RiskManagementConsole />);
      
      const refreshButton = screen.getByText('Refresh');
      
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error messages when API calls fail', async () => {
      mockRiskManagementService.getRiskMetrics.mockRejectedValue(new Error('API Error'));
      
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load risk management data')).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      mockRiskManagementService.getRiskMetrics.mockRejectedValue(new Error('API Error'));
      
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });

      // Retry by clicking refresh
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      // Mock success on retry
      mockRiskManagementService.getRiskMetrics.mockResolvedValue({
        totalReturns: 1000,
        highRiskReturns: 150,
        mediumRiskReturns: 300,
        lowRiskReturns: 550,
        flaggedForReview: 75,
        fraudDetected: 10,
        averageRiskScore: 0.45,
        riskTrend: {
          daily: [],
          weekly: []
        }
      });

      await waitFor(() => {
        expect(screen.queryByText('Error')).not.toBeInTheDocument();
        expect(screen.getByText('Total Returns')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on different screen sizes', async () => {
      // Test with mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });
      
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Risk Management Console')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      
      // Test with tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024
      });
      
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Risk Management Console')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should adapt layout for small screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640
      });
      
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Risk Management Console')).toBeInTheDocument();
        // Check if navigation adapts to smaller screen
        const nav = screen.getByRole('navigation');
        expect(nav).toHaveClass('flex');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.getByRole('main', { name: /main/i })).toBeInTheDocument();
      });
    });

    it('should have proper button labels', async () => {
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
        expect(screen.getByText('Export')).toBeInTheDocument();
        expect(screen.getByText('Generate Report')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<RiskManagementConsole />);
      
      // Test tab navigation with keyboard
      fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText('Risk Returns')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText('Alerts')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText('Reviews')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render quickly without performance issues', async () => {
      const startTime = performance.now();
      
      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Risk Management Console')).toBeInTheDocument();
      });
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // Should render in under 1 second
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeReturns = Array.from({ length: 100 }, (_, i) => ({
        id: `R${String(i).padStart(3, '0')}`,
        customerEmail: `customer${i}@example.com`,
        customerWalletAddress: `0x${String(i).padStart(40, '0')}`,
        sellerWalletAddress: `0x${String(i + 1000).padStart(40, '0')}`,
        orderId: `ORD${String(i).padStart(3, '0')}`,
        returnReason: 'Test Reason',
        amount: Math.random() * 1000,
        riskScore: Math.random(),
        riskLevel: 'low' as 'low' | 'medium' | 'high' | 'critical',
        riskFactors: [],
        status: 'pending' as 'pending' | 'under_review' | 'approved' | 'rejected' | 'escalated',
        flaggedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        evidence: [],
        reviewedBy: undefined,
        reviewedAt: undefined,
        reviewNotes: undefined
      }));

      mockRiskManagementService.getHighRiskReturns.mockResolvedValue({
        returns: largeReturns,
        total: largeReturns.length
      });

      render(<RiskManagementConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Risk Management Console')).toBeInTheDocument();
      });
    });
  });
});