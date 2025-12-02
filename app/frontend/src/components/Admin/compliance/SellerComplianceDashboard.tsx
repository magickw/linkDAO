/**
 * Seller Compliance Dashboard Component
 * 
 * Comprehensive dashboard for monitoring seller compliance,
 * including overview, seller list, violation tracking, and actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useComplianceWebSocket } from '../../../services/complianceWebSocketClient';

interface SellerComplianceData {
  sellerId: string;
  sellerName: string;
  complianceScore: number;
  previousScore: number;
  violations: ViolationData[];
  status: 'compliant' | 'warning' | 'suspended' | 'under_review';
  lastUpdated: Date;
  metrics: {
    processingTimeCompliance: number;
    approvalRateCompliance: number;
    returnRate: number;
    totalReturns: number;
  };
}

interface ViolationData {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  resolved: boolean;
  acknowledged: boolean;
}

interface ComplianceMetrics {
  totalSellers: number;
  compliantSellers: number;
  warningSellers: number;
  suspendedSellers: number;
  averageComplianceScore: number;
  totalViolations: number;
  criticalViolations: number;
  resolvedToday: number;
}

interface ComplianceAction {
  type: 'warning' | 'suspend' | 'reinstate' | 'investigate';
  sellerId: string;
  reason: string;
  notes?: string;
  effectiveDate?: Date;
}

export const SellerComplianceDashboard: React.FC = () => {
  const [sellers, setSellers] = useState<SellerComplianceData[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<SellerComplianceData | null>(null);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<ComplianceAction['type']>('warning');
  const [actionReason, setActionReason] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const { subscribeToCompliance, subscribeToAlerts, authenticate, requestSnapshot } = useComplianceWebSocket();

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);
        
        // Authenticate user
        authenticate('admin-user', ['read_compliance', 'manage_compliance']);
        
        // Load initial data
        await loadSellerData();
        await loadMetrics();
        
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeCompliance = subscribeToCompliance((update) => {
      if (update.type === 'dashboard_updated') {
        setMetrics(update.data.metrics);
        // Update seller data if included
        if (update.data.sellers) {
          setSellers(update.data.sellers);
        }
      }
    });

    const unsubscribeAlerts = subscribeToAlerts((alert) => {
      // Update seller data when new violation is detected
      if (alert.sellerId) {
        updateSellerViolation(alert.sellerId, alert);
      }
    });

    return () => {
      unsubscribeCompliance();
      unsubscribeAlerts();
    };
  }, [subscribeToCompliance, subscribeToAlerts]);

  // Load seller data
  const loadSellerData = async () => {
    try {
      // Mock data - would be actual API call
      const mockSellers: SellerComplianceData[] = [
        {
          sellerId: 'S001',
          sellerName: 'TechStore Pro',
          complianceScore: 95,
          previousScore: 93,
          violations: [
            {
              id: 'V001',
              type: 'processing_delay',
              severity: 'low',
              description: 'Minor processing delay detected',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              resolved: false,
              acknowledged: true
            }
          ],
          status: 'compliant',
          lastUpdated: new Date(),
          metrics: {
            processingTimeCompliance: 98,
            approvalRateCompliance: 95,
            returnRate: 8.5,
            totalReturns: 45
          }
        },
        {
          sellerId: 'S002',
          sellerName: 'Fashion Hub',
          complianceScore: 78,
          previousScore: 82,
          violations: [
            {
              id: 'V002',
              type: 'approval_rate',
              severity: 'high',
              description: 'Approval rate significantly below platform average',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              resolved: false,
              acknowledged: false
            },
            {
              id: 'V003',
              type: 'processing_delay',
              severity: 'medium',
              description: 'Multiple processing delays detected',
              timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              resolved: false,
              acknowledged: true
            }
          ],
          status: 'warning',
          lastUpdated: new Date(),
          metrics: {
            processingTimeCompliance: 85,
            approvalRateCompliance: 72,
            returnRate: 12.3,
            totalReturns: 38
          }
        },
        {
          sellerId: 'S003',
          sellerName: 'Home Essentials',
          complianceScore: 92,
          previousScore: 94,
          violations: [],
          status: 'compliant',
          lastUpdated: new Date(),
          metrics: {
            processingTimeCompliance: 96,
            approvalRateCompliance: 93,
            returnRate: 6.2,
            totalReturns: 32
          }
        },
        {
          sellerId: 'S004',
          sellerName: 'Book World',
          complianceScore: 45,
          previousScore: 52,
          violations: [
            {
              id: 'V004',
              type: 'policy_mismatch',
              severity: 'critical',
              description: 'Repeated policy violations',
              timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
              resolved: false,
              acknowledged: false
            },
            {
              id: 'V005',
              type: 'processing_delay',
              severity: 'high',
              description: 'Critical processing delays',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              resolved: false,
              acknowledged: false
            }
          ],
          status: 'under_review',
          lastUpdated: new Date(),
          metrics: {
            processingTimeCompliance: 65,
            approvalRateCompliance: 58,
            returnRate: 18.7,
            totalReturns: 28
          }
        },
        {
          sellerId: 'S005',
          sellerName: 'Sports Gear',
          complianceScore: 88,
          previousScore: 90,
          violations: [
            {
              id: 'V006',
              type: 'approval_rate',
              severity: 'medium',
              description: 'Approval rate deviation detected',
              timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
              resolved: true,
              acknowledged: true
            }
          ],
          status: 'compliant',
          lastUpdated: new Date(),
          metrics: {
            processingTimeCompliance: 92,
            approvalRateCompliance: 88,
            returnRate: 9.1,
            totalReturns: 25
          }
        }
      ];

      setSellers(mockSellers);
    } catch (error) {
      console.error('Error loading seller data:', error);
    }
  };

  // Load metrics
  const loadMetrics = async () => {
    try {
      // Mock metrics - would be actual API call
      const mockMetrics: ComplianceMetrics = {
        totalSellers: 5,
        compliantSellers: 3,
        warningSellers: 1,
        suspendedSellers: 0,
        underReviewSellers: 1,
        averageComplianceScore: 79.6,
        totalViolations: 6,
        criticalViolations: 1,
        resolvedToday: 2
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  // Update seller violation data
  const updateSellerViolation = (sellerId: string, alert: any) => {
    setSellers(prev => prev.map(seller => {
      if (seller.sellerId === sellerId) {
        const newViolation: ViolationData = {
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          description: alert.message,
          timestamp: alert.timestamp,
          resolved: false,
          acknowledged: false
        };

        return {
          ...seller,
          violations: [newViolation, ...seller.violations],
          lastUpdated: new Date()
        };
      }
      return seller;
    }));
  };

  // Filter sellers
  const filteredSellers = sellers.filter(seller => {
    const matchesSearch = seller.sellerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || seller.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || 
      seller.violations.some(v => v.severity === severityFilter);

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'under_review': return 'text-orange-600 bg-orange-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get compliance score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  // Handle compliance action
  const handleComplianceAction = useCallback(() => {
    if (!selectedSeller || !actionReason) return;

    // Mock action execution - would be actual API call
    console.log(`Executing ${actionType} on seller ${selectedSeller.sellerId}:`, actionReason);

    // Update seller status based on action
    setSellers(prev => prev.map(seller => {
      if (seller.sellerId === selectedSeller.sellerId) {
        let newStatus = seller.status;
        if (actionType === 'suspend') newStatus = 'suspended';
        else if (actionType === 'reinstate') newStatus = 'compliant';
        else if (actionType === 'investigate') newStatus = 'under_review';

        return { ...seller, status: newStatus, lastUpdated: new Date() };
      }
      return seller;
    }));

    // Close modal and reset form
    setShowActionModal(false);
    setActionReason('');
    setSelectedSeller(null);
  }, [selectedSeller, actionType, actionReason]);

  // Open action modal
  const openActionModal = (seller: SellerComplianceData, action: ComplianceAction['type']) => {
    setSelectedSeller(seller);
    setActionType(action);
    setShowActionModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading compliance dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Seller Compliance Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Real-time Updates Active' : 'Real-time Updates Inactive'}
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{metrics.totalSellers}</div>
            <div className="text-sm text-gray-600">Total Sellers</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{metrics.compliantSellers}</div>
            <div className="text-sm text-gray-600">Compliant</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{metrics.warningSellers}</div>
            <div className="text-sm text-gray-600">Warning</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">
              {metrics.averageComplianceScore.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Avg Score</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sellers..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="compliant">Compliant</option>
              <option value="warning">Warning</option>
              <option value="under_review">Under Review</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Violation Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSeverityFilter('all');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Seller List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Seller Compliance Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compliance Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Violations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metrics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSellers.map((seller) => (
                <tr key={seller.sellerId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{seller.sellerName}</div>
                      <div className="text-sm text-gray-500">{seller.sellerId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-lg font-semibold ${getScoreColor(seller.complianceScore)}`}>
                        {seller.complianceScore}%
                      </span>
                      {seller.complianceScore !== seller.previousScore && (
                        <span className={`ml-2 text-xs ${
                          seller.complianceScore > seller.previousScore ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {seller.complianceScore > seller.previousScore ? '↑' : '↓'} 
                          {Math.abs(seller.complianceScore - seller.previousScore)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(seller.status)}`}>
                      {seller.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {seller.violations.length} total
                    </div>
                    <div className="text-xs text-gray-500">
                      {seller.violations.filter(v => v.severity === 'critical').length} critical
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Processing: {seller.metrics.processingTimeCompliance}%
                    </div>
                    <div className="text-xs text-gray-500">
                      Returns: {seller.metrics.returnRate}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedSeller(seller)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => openActionModal(seller, 'warning')}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Actions
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && selectedSeller && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {actionType === 'warning' ? 'Send Warning' : 
               actionType === 'suspend' ? 'Suspend Seller' :
               actionType === 'reinstate' ? 'Reinstate Seller' : 'Investigate'}
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Seller: <span className="font-medium">{selectedSeller.sellerName}</span>
              </p>
              <p className="text-sm text-gray-600">
                Current Score: <span className="font-medium">{selectedSeller.complianceScore}%</span>
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reason for this action..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionReason('');
                  setSelectedSeller(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComplianceAction}
                disabled={!actionReason}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Execute Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller Detail Modal */}
      {selectedSeller && !showActionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Seller Details: {selectedSeller.sellerName}
              </h3>
              <button
                onClick={() => setSelectedSeller(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Compliance Overview */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Compliance Overview</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Compliance Score:</span>
                    <span className={`font-semibold ${getScoreColor(selectedSeller.complianceScore)}`}>
                      {selectedSeller.complianceScore}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedSeller.status)}`}>
                      {selectedSeller.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="text-sm text-gray-900">
                      {selectedSeller.lastUpdated.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Performance Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Processing Time Compliance:</span>
                    <span className="text-sm font-medium">
                      {selectedSeller.metrics.processingTimeCompliance}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Approval Rate Compliance:</span>
                    <span className="text-sm font-medium">
                      {selectedSeller.metrics.approvalRateCompliance}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Return Rate:</span>
                    <span className="text-sm font-medium">
                      {selectedSeller.metrics.returnRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Returns:</span>
                    <span className="text-sm font-medium">
                      {selectedSeller.metrics.totalReturns}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Violations */}
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Violations</h4>
              {selectedSeller.violations.length === 0 ? (
                <p className="text-sm text-gray-500">No violations recorded</p>
              ) : (
                <div className="space-y-2">
                  {selectedSeller.violations.map((violation) => (
                    <div key={violation.id} className="border border-gray-200 rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(violation.severity)}`}>
                              {violation.severity}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {violation.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{violation.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {violation.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {!violation.acknowledged && (
                            <button className="text-xs text-blue-600 hover:text-blue-900">
                              Acknowledge
                            </button>
                          )}
                          {!violation.resolved && (
                            <button className="text-xs text-green-600 hover:text-green-900">
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => openActionModal(selectedSeller, 'investigate')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Investigate
              </button>
              <button
                onClick={() => openActionModal(selectedSeller, 'suspend')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Suspend
              </button>
              <button
                onClick={() => openActionModal(selectedSeller, 'reinstate')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Reinstate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerComplianceDashboard;