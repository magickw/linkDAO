import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EyeIcon,
  UserIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  FlagIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { riskManagementService, RiskReturn, RiskFactor, Evidence, ReviewAction } from '../../../services/riskManagementService';

interface RiskReviewInterfaceProps {
  returnId?: string;
  onReviewComplete?: (returnId: string, action: any) => void;
  onClose?: () => void;
}

interface ReviewState {
  selectedAction: 'approve' | 'reject' | 'escalate' | 'request_info' | null;
  reviewNotes: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  evidenceFilter: string;
  expandedFactors: string[];
}

const RISK_LEVEL_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626'
};

const RISK_LEVEL_BADGES = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300',
  critical: 'bg-red-200 text-red-900 border-red-400'
};

const EVIDENCE_TYPE_ICONS = {
  transaction: CurrencyDollarIcon,
  communication: ChatBubbleLeftRightIcon,
  behavior: UserIcon,
  network: UserGroupIcon,
  document: DocumentTextIcon
};

const REVIEWERS = [
  { id: 'reviewer1', name: 'John Smith', email: 'john.smith@company.com', specialization: 'Fraud Detection' },
  { id: 'reviewer2', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', specialization: 'Risk Analysis' },
  { id: 'reviewer3', name: 'Michael Chen', email: 'michael.chen@company.com', specialization: 'Compliance' },
  { id: 'reviewer4', name: 'Emily Davis', email: 'emily.davis@company.com', specialization: 'Investigations' },
];

export const RiskReviewInterface: React.FC<RiskReviewInterfaceProps> = ({
  returnId,
  onReviewComplete,
  onClose
}) => {
  // State management
  const [riskReturn, setRiskReturn] = useState<RiskReturn | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'factors' | 'evidence' | 'history'>('overview');

  // Review state
  const [reviewState, setReviewState] = useState<ReviewState>({
    selectedAction: null,
    reviewNotes: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
    evidenceFilter: '',
    expandedFactors: []
  });

  // Load return data
  useEffect(() => {
    if (returnId) {
      loadReturnData(returnId);
    }
  }, [returnId]);

  const loadReturnData = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const [returnData, history] = await Promise.all([
        riskManagementService.getRiskReturn(id),
        riskManagementService.getReviewHistory(id)
      ]);

      setRiskReturn(returnData);
      setReviewHistory(history);

      // Set default due date (3 days from now)
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 3);
      setReviewState(prev => ({
        ...prev,
        dueDate: defaultDueDate.toISOString().split('T')[0]
      }));
    } catch (err) {
      console.error('Error loading return data:', err);
      setError('Failed to load return data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!riskReturn || !reviewState.selectedAction) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await riskManagementService.submitReviewAction(riskReturn.id, {
        actionType: reviewState.selectedAction,
        notes: reviewState.reviewNotes,
        metadata: {
          assignedTo: reviewState.assignedTo,
          priority: reviewState.priority,
          dueDate: reviewState.dueDate
        }
      });

      onReviewComplete?.(riskReturn.id, {
        action: reviewState.selectedAction,
        notes: reviewState.reviewNotes
      });

      // Reload data
      await loadReturnData(riskReturn.id);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignReview = async () => {
    if (!riskReturn || !reviewState.assignedTo) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await riskManagementService.assignForReview(
        riskReturn.id,
        reviewState.assignedTo,
        reviewState.priority,
        reviewState.dueDate
      );

      // Reload data
      await loadReturnData(riskReturn.id);
    } catch (err) {
      console.error('Error assigning review:', err);
      setError('Failed to assign review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFactorExpansion = (factorId: string) => {
    setReviewState(prev => ({
      ...prev,
      expandedFactors: prev.expandedFactors.includes(factorId)
        ? prev.expandedFactors.filter(id => id !== factorId)
        : [...prev.expandedFactors, factorId]
    }));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      case 'critical': return 'text-red-700 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEvidenceIcon = (type: string) => {
    const IconComponent = EVIDENCE_TYPE_ICONS[type as keyof typeof EVIDENCE_TYPE_ICONS] || DocumentTextIcon;
    return <IconComponent className="w-5 h-5" />;
  };

  const getRiskScoreDistribution = () => {
    if (!riskReturn) return [];

    const totalImpact = riskReturn.riskFactors.reduce((sum, factor) => sum + factor.impact, 0);
    
    return riskReturn.riskFactors.map(factor => ({
      name: factor.factor.replace(/_/g, ' '),
      value: factor.impact,
      percentage: totalImpact > 0 ? (factor.impact / totalImpact) * 100 : 0,
      severity: factor.severity
    }));
  };

  const getRiskTrendData = () => {
    // Mock trend data - in real implementation, this would come from the API
    return [
      { date: '2024-01-01', score: 0.3 },
      { date: '2024-01-02', score: 0.4 },
      { date: '2024-01-03', score: 0.5 },
      { date: '2024-01-04', score: 0.6 },
      { date: '2024-01-05', score: 0.7 },
      { date: '2024-01-06', score: 0.8 },
      { date: '2024-01-07', score: riskReturn?.riskScore || 0.5 },
    ];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading risk review...</p>
        </div>
      </div>
    );
  }

  if (error || !riskReturn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error || 'Return not found'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              )}
              <EyeIcon className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Risk Review</h1>
                <p className="text-sm text-gray-500">Return ID: {riskReturn.id}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Risk Level Badge */}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${RISK_LEVEL_BADGES[riskReturn.riskLevel]}`}>
                {riskReturn.riskLevel.toUpperCase()} RISK
              </span>
              
              {/* Risk Score */}
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{riskReturn.riskScore.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Risk Score</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4"
          >
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { key: 'overview', label: 'Overview', icon: ChartBarIcon },
                    { key: 'factors', label: 'Risk Factors', icon: ExclamationTriangleIcon },
                    { key: 'evidence', label: 'Evidence', icon: DocumentTextIcon },
                    { key: 'history', label: 'History', icon: ClockIcon }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === tab.key
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Return Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Return Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <UserIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">Customer</span>
                          </div>
                          <p className="text-sm text-gray-900">{riskReturn.customerEmail}</p>
                          <p className="text-xs text-gray-500">{riskReturn.customerWalletAddress}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">Amount</span>
                          </div>
                          <p className="text-sm text-gray-900">{formatCurrency(riskReturn.amount)}</p>
                          <p className="text-xs text-gray-500">Order ID: {riskReturn.orderId}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">Return Reason</span>
                          </div>
                          <p className="text-sm text-gray-900">{riskReturn.returnReason}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <ClockIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">Timeline</span>
                          </div>
                          <p className="text-sm text-gray-900">Flagged: {formatDate(riskReturn.flaggedAt)}</p>
                          <p className="text-xs text-gray-500">Status: {riskReturn.status.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Risk Score Trend */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Score Trend</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={getRiskTrendData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 1]} />
                            <Tooltip />
                            <Line 
                              type="monotone" 
                              dataKey="score" 
                              stroke="#EF4444" 
                              strokeWidth={2}
                              dot={{ fill: '#EF4444' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Risk Distribution */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Factor Distribution</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getRiskScoreDistribution()}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                            >
                              {getRiskScoreDistribution().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={RISK_LEVEL_COLORS[entry.severity as keyof typeof RISK_LEVEL_COLORS]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Risk Factors Tab */}
                {activeTab === 'factors' && (
                  <div className="space-y-4">
                    {riskReturn.riskFactors.map((factor, index) => {
                      const isExpanded = reviewState.expandedFactors.includes(factor.factor);
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg">
                          <div
                            className="p-4 cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleFactorExpansion(factor.factor)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <ChevronRightIcon 
                                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                />
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 capitalize">
                                    {factor.factor.replace(/_/g, ' ')}
                                  </h4>
                                  <p className="text-xs text-gray-500">{factor.category}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(factor.severity)}`}>
                                  {factor.severity}
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {factor.impact}%
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-gray-200 bg-gray-50"
                              >
                                <div className="p-4">
                                  <p className="text-sm text-gray-600 mb-2">{factor.description}</p>
                                  <div className="text-xs text-gray-500">
                                    Detected: {formatDate(factor.detectedAt)}
                                  </div>
                                  
                                  {/* Impact visualization */}
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-gray-600">Impact Level</span>
                                      <span className="text-xs font-medium text-gray-900">{factor.impact}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full ${
                                          factor.impact >= 80 ? 'bg-red-500' :
                                          factor.impact >= 60 ? 'bg-orange-500' :
                                          factor.impact >= 40 ? 'bg-yellow-500' :
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${factor.impact}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Evidence Tab */}
                {activeTab === 'evidence' && (
                  <div className="space-y-4">
                    {/* Evidence Filter */}
                    <div className="flex items-center space-x-4">
                      <div className="relative flex-1">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={reviewState.evidenceFilter}
                          onChange={(e) => setReviewState(prev => ({ ...prev, evidenceFilter: e.target.value }))}
                          placeholder="Search evidence..."
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Evidence List */}
                    <div className="space-y-3">
                      {riskReturn.evidence
                        .filter(evidence => 
                          !reviewState.evidenceFilter || 
                          evidence.description.toLowerCase().includes(reviewState.evidenceFilter.toLowerCase())
                        )
                        .map((evidence, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                {getEvidenceIcon(evidence.type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-900 capitalize">
                                    {evidence.type}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">
                                      {formatDate(evidence.timestamp)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {(evidence.confidence * 100).toFixed(0)}% confidence
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600">{evidence.description}</p>
                                
                                {/* Evidence Data */}
                                {Object.keys(evidence.data).length > 0 && (
                                  <div className="mt-3 bg-gray-50 rounded-lg p-3">
                                    <h5 className="text-xs font-medium text-gray-700 mb-2">Evidence Data</h5>
                                    <div className="space-y-1">
                                      {Object.entries(evidence.data).map(([key, value]) => (
                                        <div key={key} className="flex justify-between text-xs">
                                          <span className="text-gray-600 capitalize">{key}:</span>
                                          <span className="text-gray-900">{JSON.stringify(value)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div className="space-y-4">
                    {reviewHistory.length > 0 ? (
                      reviewHistory.map((action, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {action.actionType.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-500">
                                  by {action.actionedBy}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatDate(action.actionedAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{action.notes}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No review history available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Review Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Review Actions</h3>
              
              {/* Action Selection */}
              <div className="space-y-3 mb-4">
                {[
                  { value: 'approve', label: 'Approve', color: 'green', icon: CheckCircleIcon },
                  { value: 'reject', label: 'Reject', color: 'red', icon: XMarkIcon },
                  { value: 'escalate', label: 'Escalate', color: 'yellow', icon: ExclamationTriangleIcon },
                  { value: 'request_info', label: 'Request Info', color: 'blue', icon: InformationCircleIcon }
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.value}
                      onClick={() => setReviewState(prev => ({ ...prev, selectedAction: action.value as any }))}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border transition-colors ${
                        reviewState.selectedAction === action.value
                          ? `border-${action.color}-500 bg-${action.color}-50 text-${action.color}-700`
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{action.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Review Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes
                </label>
                <textarea
                  value={reviewState.reviewNotes}
                  onChange={(e) => setReviewState(prev => ({ ...prev, reviewNotes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter review notes..."
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitReview}
                disabled={!reviewState.selectedAction || !reviewState.reviewNotes.trim() || isSubmitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>

            {/* Assignment */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Review</h3>
              
              {/* Assignee Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To
                </label>
                <select
                  value={reviewState.assignedTo}
                  onChange={(e) => setReviewState(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select reviewer...</option>
                  {REVIEWERS.map((reviewer) => (
                    <option key={reviewer.id} value={reviewer.id}>
                      {reviewer.name} - {reviewer.specialization}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={reviewState.priority}
                  onChange={(e) => setReviewState(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={reviewState.dueDate}
                  onChange={(e) => setReviewState(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Assign Button */}
              <button
                onClick={handleAssignReview}
                disabled={!reviewState.assignedTo || isSubmitting}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Assigning...' : 'Assign Review'}
              </button>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Risk Factors</span>
                  <span className="text-sm font-medium text-gray-900">{riskReturn.riskFactors.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Evidence Items</span>
                  <span className="text-sm font-medium text-gray-900">{riskReturn.evidence.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Review Actions</span>
                  <span className="text-sm font-medium text-gray-900">{reviewHistory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Days Flagged</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.floor((Date.now() - new Date(riskReturn.flaggedAt).getTime()) / (1000 * 60 * 60 * 24))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};