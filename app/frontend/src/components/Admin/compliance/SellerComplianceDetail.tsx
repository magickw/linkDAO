/**
 * Seller Compliance Detail View Component
 * 
 * Detailed view of individual seller compliance including history,
 * violation details, and performance metrics with charts.
 */

import React, { useState, useEffect } from 'react';
import { useComplianceWebSocket } from '../../../services/complianceWebSocketClient';

interface SellerComplianceDetail {
  sellerId: string;
  sellerName: string;
  status: 'compliant' | 'warning' | 'suspended' | 'under_review';
  complianceScore: number;
  previousScore: number;
  scoreHistory: ScoreHistoryPoint[];
  violations: ViolationDetail[];
  metrics: PerformanceMetrics;
  recommendations: string[];
  lastUpdated: Date;
}

interface ScoreHistoryPoint {
  date: Date;
  score: number;
  events: string[];
}

interface ViolationDetail {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  resolved: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  impact: string;
  recommendedActions: string[];
}

interface PerformanceMetrics {
  processingTimeCompliance: number;
  approvalRateCompliance: number;
  returnRate: number;
  totalReturns: number;
  averageProcessingTime: number;
  customerSatisfactionScore: number;
  refundAmount: number;
  policyAdherence: number;
}

interface ComplianceAction {
  type: 'acknowledge' | 'resolve' | 'escalate' | 'note';
  violationId: string;
  notes?: string;
  assignedTo?: string;
}

interface SellerComplianceDetailProps {
  sellerId: string;
  onClose: () => void;
  onAction?: (action: ComplianceAction) => void;
}

export const SellerComplianceDetail: React.FC<SellerComplianceDetailProps> = ({
  sellerId,
  onClose,
  onAction
}) => {
  const [sellerData, setSellerData] = useState<SellerComplianceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<ViolationDetail | null>(null);
  const [actionModal, setActionModal] = useState<{ type: ComplianceAction['type']; violationId: string } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const { subscribeToSeller, requestSnapshot } = useComplianceWebSocket();

  // Load seller detail data
  useEffect(() => {
    const loadSellerDetail = async () => {
      try {
        setLoading(true);
        
        // Request real-time snapshot
        requestSnapshot(sellerId);
        
        // Mock detailed data - would be actual API call
        const mockDetail: SellerComplianceDetail = {
          sellerId,
          sellerName: sellerId === 'S001' ? 'TechStore Pro' : 
                     sellerId === 'S002' ? 'Fashion Hub' :
                     sellerId === 'S003' ? 'Home Essentials' : 'Book World',
          status: 'warning',
          complianceScore: 78,
          previousScore: 82,
          scoreHistory: [
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), score: 85, events: ['Monthly assessment'] },
            { date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000), score: 83, events: ['Processing delay detected'] },
            { date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), score: 82, events: ['Warning issued'] },
            { date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), score: 80, events: ['Multiple violations'] },
            { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), score: 78, events: ['Score review'] }
          ],
          violations: [
            {
              id: 'V002',
              type: 'approval_rate',
              severity: 'high',
              description: 'Approval rate significantly below platform average',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              resolved: false,
              acknowledged: false,
              impact: 'Affects customer satisfaction and platform trust',
              recommendedActions: [
                'Review return approval criteria',
                'Provide additional staff training',
                'Implement quality control measures'
              ]
            },
            {
              id: 'V003',
              type: 'processing_delay',
              severity: 'medium',
              description: 'Multiple processing delays detected',
              timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              resolved: false,
              acknowledged: true,
              acknowledgedBy: 'admin-1',
              acknowledgedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              impact: 'Delays affect customer experience',
              recommendedActions: [
                'Optimize processing workflow',
                'Consider temporary staff increase',
                'Review resource allocation'
              ]
            },
            {
              id: 'V006',
              type: 'approval_rate',
              severity: 'medium',
              description: 'Approval rate deviation detected',
              timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
              resolved: true,
              acknowledged: true,
              acknowledgedBy: 'admin-2',
              acknowledgedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              resolvedBy: 'admin-1',
              resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
              resolution: 'Additional training provided and workflow optimized',
              impact: 'Previously affecting customer satisfaction',
              recommendedActions: []
            }
          ],
          metrics: {
            processingTimeCompliance: 85,
            approvalRateCompliance: 72,
            returnRate: 12.3,
            totalReturns: 38,
            averageProcessingTime: 56.5,
            customerSatisfactionScore: 3.8,
            refundAmount: 15420.50,
            policyAdherence: 78
          },
          recommendations: [
            'Improve return processing speed to meet 48-hour SLA',
            'Review return approval criteria to align with platform standards',
            'Address customer satisfaction issues in return process',
            'Implement additional quality control measures'
          ],
          lastUpdated: new Date()
        };

        setSellerData(mockDetail);
      } catch (error) {
        console.error('Error loading seller detail:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSellerDetail();
  }, [sellerId, requestSnapshot]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToSeller(sellerId, (data) => {
      if (data.complianceScore !== undefined) {
        setSellerData(prev => prev ? { ...prev, ...data } : null);
      }
    });

    return unsubscribe;
  }, [sellerId, subscribeToSeller]);

  // Handle compliance action
  const handleAction = () => {
    if (!actionModal || !actionNotes) return;

    const action: ComplianceAction = {
      type: actionModal.type,
      violationId: actionModal.violationId,
      notes: actionNotes
    };

    if (onAction) {
      onAction(action);
    }

    // Update local state
    setSellerData(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        violations: prev.violations.map(v => {
          if (v.id === actionModal.violationId) {
            switch (actionModal.type) {
              case 'acknowledge':
                return { ...v, acknowledged: true, acknowledgedAt: new Date() };
              case 'resolve':
                return { ...v, resolved: true, resolvedAt: new Date(), resolution: actionNotes };
              default:
                return v;
            }
          }
          return v;
        })
      };
    });

    // Close modal
    setActionModal(null);
    setActionNotes('');
    setSelectedViolation(null);
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

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

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading seller details...</div>
      </div>
    );
  }

  if (!sellerData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Seller not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{sellerData.sellerName}</h1>
          <p className="text-sm text-gray-600">Seller ID: {sellerData.sellerId}</p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{sellerData.complianceScore}%</div>
          <div className="text-sm text-gray-600">Compliance Score</div>
          {sellerData.complianceScore !== sellerData.previousScore && (
            <div className={`text-xs mt-1 ${
              sellerData.complianceScore > sellerData.previousScore ? 'text-green-600' : 'text-red-600'
            }`}>
              {sellerData.complianceScore > sellerData.previousScore ? '↑' : '↓'} 
              {Math.abs(sellerData.complianceScore - sellerData.previousScore)} from previous
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className={`text-lg font-semibold ${getStatusColor(sellerData.status)}`}>
            {sellerData.status.replace('_', ' ')}
          </div>
          <div className="text-sm text-gray-600">Status</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{sellerData.violations.length}</div>
          <div className="text-sm text-gray-600">Total Violations</div>
          <div className="text-xs text-gray-500">
            {sellerData.violations.filter(v => v.severity === 'critical').length} critical
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{sellerData.metrics.totalReturns}</div>
          <div className="text-sm text-gray-600">Total Returns</div>
          <div className="text-xs text-gray-500">
            {sellerData.metrics.returnRate}% return rate
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Score History */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Score History</h3>
          <div className="space-y-3">
            {sellerData.scoreHistory.map((point, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${getScoreColor(point.score)}`}>
                      {point.score}%
                    </span>
                    <span className="text-sm text-gray-600">
                      {point.date.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {point.events.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Processing Time Compliance</span>
                <span className="text-sm font-medium">{sellerData.metrics.processingTimeCompliance}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${sellerData.metrics.processingTimeCompliance}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Approval Rate Compliance</span>
                <span className="text-sm font-medium">{sellerData.metrics.approvalRateCompliance}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${sellerData.metrics.approvalRateCompliance}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Policy Adherence</span>
                <span className="text-sm font-medium">{sellerData.metrics.policyAdherence}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full" 
                  style={{ width: `${sellerData.metrics.policyAdherence}%` }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-sm text-gray-600">Avg Processing Time</span>
                <div className="text-lg font-semibold">{sellerData.metrics.averageProcessingTime}h</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Customer Satisfaction</span>
                <div className="text-lg font-semibold">{sellerData.metrics.customerSatisfactionScore}/5</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Violations Section */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Violations</h3>
        </div>
        <div className="p-6">
          {sellerData.violations.length === 0 ? (
            <p className="text-sm text-gray-500">No violations recorded</p>
          ) : (
            <div className="space-y-4">
              {sellerData.violations.map((violation) => (
                <div key={violation.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(violation.severity)}`}>
                        {violation.severity.toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-900">{violation.type}</span>
                      {violation.acknowledged && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          Acknowledged
                        </span>
                      )}
                      {violation.resolved && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Resolved
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedViolation(violation)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Details
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{violation.description}</p>
                  
                  <div className="text-xs text-gray-500 mb-3">
                    Reported: {violation.timestamp.toLocaleString()}
                    {violation.acknowledgedAt && ` • Acknowledged: ${violation.acknowledgedAt.toLocaleString()}`}
                    {violation.resolvedAt && ` • Resolved: ${violation.resolvedAt.toLocaleString()}`}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <strong>Impact:</strong> {violation.impact}
                    </div>
                    <div className="flex space-x-2">
                      {!violation.acknowledged && (
                        <button
                          onClick={() => setActionModal({ type: 'acknowledge', violationId: violation.id })}
                          className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                        >
                          Acknowledge
                        </button>
                      )}
                      {!violation.resolved && (
                        <button
                          onClick={() => setActionModal({ type: 'resolve', violationId: violation.id })}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => setActionModal({ type: 'note', violationId: violation.id })}
                        className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
        </div>
        <div className="p-6">
          <ul className="space-y-2">
            {sellerData.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span className="text-sm text-gray-700">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Violation Detail Modal */}
      {selectedViolation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Violation Details</h3>
              <button
                onClick={() => setSelectedViolation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(selectedViolation.severity)}`}>
                  {selectedViolation.severity.toUpperCase()}
                </span>
                <span className="ml-2 font-medium">{selectedViolation.type}</span>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Description</h4>
                <p className="text-sm text-gray-600">{selectedViolation.description}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Impact</h4>
                <p className="text-sm text-gray-600">{selectedViolation.impact}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Recommended Actions</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {selectedViolation.recommendedActions.map((action, index) => (
                    <li key={index}>• {action}</li>
                  ))}
                </ul>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Reported:</span>
                  <span className="text-gray-600 ml-1">{selectedViolation.timestamp.toLocaleString()}</span>
                </div>
                {selectedViolation.acknowledgedAt && (
                  <div>
                    <span className="font-medium text-gray-900">Acknowledged:</span>
                    <span className="text-gray-600 ml-1">{selectedViolation.acknowledgedAt.toLocaleString()}</span>
                  </div>
                )}
                {selectedViolation.resolvedAt && (
                  <div>
                    <span className="font-medium text-gray-900">Resolved:</span>
                    <span className="text-gray-600 ml-1">{selectedViolation.resolvedAt.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              {selectedViolation.resolution && (
                <div>
                  <h4 className="font-medium text-gray-900">Resolution</h4>
                  <p className="text-sm text-gray-600">{selectedViolation.resolution}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {actionModal.type === 'acknowledge' ? 'Acknowledge Violation' :
               actionModal.type === 'resolve' ? 'Resolve Violation' : 'Add Note'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter notes..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setActionModal(null);
                  setActionNotes('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={!actionNotes}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {actionModal.type === 'acknowledge' ? 'Acknowledge' :
                 actionModal.type === 'resolve' ? 'Resolve' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerComplianceDetail;