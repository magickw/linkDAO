import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  FlagIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  InformationCircleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { riskManagementService, ReviewAssignment, RiskReturn, ReviewAction } from '../../../services/riskManagementService';

interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignee?: string;
  dueDate?: string;
  completedAt?: string;
}

interface WorkflowMetrics {
  totalAssignments: number;
  pendingReviews: number;
  inProgressReviews: number;
  completedReviews: number;
  overdueAssignments: number;
  averageReviewTime: number;
  teamProductivity: Record<string, {
    completed: number;
    averageTime: number;
    quality: number;
  }>;
}

interface ManualReviewWorkflowProps {
  returnId?: string;
  onWorkflowComplete?: (workflowId: string, result: any) => void;
}

const TEAM_MEMBERS = [
  { id: 'reviewer1', name: 'John Smith', email: 'john.smith@company.com', role: 'Senior Risk Analyst', specialization: 'Fraud Detection' },
  { id: 'reviewer2', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', role: 'Risk Analyst', specialization: 'Risk Analysis' },
  { id: 'reviewer3', name: 'Michael Chen', email: 'michael.chen@company.com', role: 'Compliance Officer', specialization: 'Compliance' },
  { id: 'reviewer4', name: 'Emily Davis', email: 'emily.davis@company.com', role: 'Investigations Lead', specialization: 'Investigations' },
  { id: 'reviewer5', name: 'Robert Wilson', email: 'robert.wilson@company.com', role: 'Risk Analyst', specialization: 'Behavioral Analysis' },
];

const WORKFLOW_STAGES = [
  { id: 'initial_review', name: 'Initial Review', description: 'First-level risk assessment', estimatedTime: 30 },
  { id: 'detailed_analysis', name: 'Detailed Analysis', description: 'In-depth investigation', estimatedTime: 120 },
  { id: 'supervisor_review', name: 'Supervisor Review', description: 'Senior analyst validation', estimatedTime: 60 },
  { id: 'final_decision', name: 'Final Decision', description: 'Final approval/rejection', estimatedTime: 30 },
];

const PRIORITY_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#DC2626'
};

const STATUS_COLORS = {
  pending: '#6B7280',
  in_progress: '#3B82F6',
  completed: '#10B981',
  blocked: '#EF4444'
};

export const ManualReviewWorkflow: React.FC<ManualReviewWorkflowProps> = ({
  returnId,
  onWorkflowComplete
}) => {
  // State management
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [workflowMetrics, setWorkflowMetrics] = useState<WorkflowMetrics | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<ReviewAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'workflow' | 'team' | 'analytics'>('queue');

  // Filter state
  const [filters, setFilters] = useState({
    assignee: '',
    status: '',
    priority: '',
    searchQuery: ''
  });

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [showAssignmentDetails, setShowAssignmentDetails] = useState(false);
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);

  // Load data
  useEffect(() => {
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [assignmentsData] = await Promise.all([
        riskManagementService.getReviewAssignments({
          limit: 50,
        })
      ]);

      setAssignments(assignmentsData.assignments);

      // Mock workflow metrics - in real implementation, this would come from the API
      setWorkflowMetrics({
        totalAssignments: assignmentsData.assignments.length,
        pendingReviews: assignmentsData.assignments.filter(a => a.status === 'pending').length,
        inProgressReviews: assignmentsData.assignments.filter(a => a.status === 'in_progress').length,
        completedReviews: assignmentsData.assignments.filter(a => a.status === 'completed').length,
        overdueAssignments: assignmentsData.assignments.filter(a => 
          new Date(a.dueDate) < new Date() && a.status !== 'completed'
        ).length,
        averageReviewTime: 45, // minutes
        teamProductivity: TEAM_MEMBERS.reduce((acc, member) => {
          acc[member.id] = {
            completed: Math.floor(Math.random() * 20) + 5,
            averageTime: Math.floor(Math.random() * 60) + 30,
            quality: Math.floor(Math.random() * 20) + 80
          };
          return acc;
        }, {} as Record<string, any>)
      });
    } catch (err) {
      console.error('Error loading workflow data:', err);
      setError('Failed to load workflow data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignmentAction = async (assignmentId: string, action: 'claim' | 'release' | 'complete') => {
    try {
      setIsLoading(true);
      // Mock action - in real implementation, this would call the API
      console.log(`Performing ${action} on assignment ${assignmentId}`);
      await loadWorkflowData();
    } catch (err) {
      console.error('Error performing assignment action:', err);
      setError('Failed to perform action');
    } finally {
      setIsLoading(false);
    }
  };

  const getTeamMemberById = (id: string) => {
    return TEAM_MEMBERS.find(member => member.id === id);
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-red-100 text-red-800 border-red-300',
      urgent: 'bg-red-200 text-red-900 border-red-400'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[priority as keyof typeof colors] || colors.medium}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800 border-gray-300',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      blocked: 'bg-red-100 text-red-800 border-red-300'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.pending}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
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

  const getWorkflowStages = (assignment: ReviewAssignment): WorkflowStage[] => {
    return WORKFLOW_STAGES.map((stage, index) => ({
      ...stage,
      status: index === 0 ? 'in_progress' : index === 1 ? 'pending' : 'pending',
      assignee: getTeamMemberById(assignment.assignedTo)?.name,
      dueDate: assignment.dueDate
    }));
  };

  const getTeamProductivityData = () => {
    if (!workflowMetrics) return [];

    return Object.entries(workflowMetrics.teamProductivity).map(([memberId, data]) => {
      const member = getTeamMemberById(memberId);
      return {
        name: member?.name || 'Unknown',
        completed: data.completed,
        averageTime: data.averageTime,
        quality: data.quality
      };
    });
  };

  const getWorkflowAnalytics = () => {
    if (!workflowMetrics) return [];

    return [
      { name: 'Pending', value: workflowMetrics.pendingReviews, color: STATUS_COLORS.pending },
      { name: 'In Progress', value: workflowMetrics.inProgressReviews, color: STATUS_COLORS.in_progress },
      { name: 'Completed', value: workflowMetrics.completedReviews, color: STATUS_COLORS.completed },
      { name: 'Overdue', value: workflowMetrics.overdueAssignments, color: STATUS_COLORS.blocked },
    ];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading workflow...</p>
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
              <ClipboardDocumentCheckIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Manual Review Workflow</h1>
                <p className="text-sm text-gray-500">Manage risk review assignments and team productivity</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowWorkflowBuilder(!showWorkflowBuilder)}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span className="text-sm">Configure</span>
              </button>
              <button
                onClick={loadWorkflowData}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span className="text-sm">Refresh</span>
              </button>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Metrics Cards */}
        {workflowMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ClipboardDocumentCheckIcon className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Total</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{workflowMetrics.totalAssignments}</div>
              <div className="text-sm text-gray-600">Assignments</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="text-sm text-gray-500">Pending</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{workflowMetrics.pendingReviews}</div>
              <div className="text-sm text-gray-600">Reviews</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-sm text-gray-500">Overdue</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{workflowMetrics.overdueAssignments}</div>
              <div className="text-sm text-gray-600">Assignments</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">Avg Time</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{formatDuration(workflowMetrics.averageReviewTime)}</div>
              <div className="text-sm text-gray-600">Per Review</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'queue', label: 'Review Queue', icon: ClipboardDocumentCheckIcon },
                { key: 'workflow', label: 'Workflow Status', icon: ArrowRightIcon },
                { key: 'team', label: 'Team Performance', icon: UserGroupIcon },
                { key: 'analytics', label: 'Analytics', icon: ChartBarIcon }
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
            {/* Review Queue Tab */}
            {activeTab === 'queue' && (
              <div className="space-y-4">
                {/* Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <FunnelIcon className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">Filters</span>
                        </div>
                        <button
                          onClick={() => setShowFilters(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                          <select
                            value={filters.assignee}
                            onChange={(e) => setFilters(prev => ({ ...prev, assignee: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">All Assignees</option>
                            {TEAM_MEMBERS.map(member => (
                              <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="escalated">Escalated</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                          <select
                            value={filters.priority}
                            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">All Priorities</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                          <div className="relative">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={filters.searchQuery}
                              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                              placeholder="Search assignments..."
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Assignments List */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Return ID</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Assignee</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Priority</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Due Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => {
                        const assignee = getTeamMemberById(assignment.assignedTo);
                        const isOverdue = new Date(assignment.dueDate) < new Date() && assignment.status !== 'completed';
                        
                        return (
                          <tr key={assignment.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                            <td className="py-3 px-4 text-sm text-gray-900">{assignment.riskReturnId}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {assignee ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                                    <span className="text-xs text-gray-600">{assignee.name.charAt(0)}</span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{assignee.name}</div>
                                    <div className="text-xs text-gray-500">{assignee.role}</div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {getPriorityBadge(assignment.priority)}
                            </td>
                            <td className="py-3 px-4">
                              {getStatusBadge(assignment.status)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                {formatDate(assignment.dueDate)}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedAssignment(assignment);
                                    setShowAssignmentDetails(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  View
                                </button>
                                {assignment.status === 'pending' && (
                                  <button
                                    onClick={() => handleAssignmentAction(assignment.id, 'claim')}
                                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                                  >
                                    Claim
                                  </button>
                                )}
                                {assignment.status === 'in_progress' && (
                                  <button
                                    onClick={() => handleAssignmentAction(assignment.id, 'complete')}
                                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Workflow Status Tab */}
            {activeTab === 'workflow' && (
              <div className="space-y-6">
                {assignments.slice(0, 3).map((assignment) => {
                  const assignee = getTeamMemberById(assignment.assignedTo);
                  const stages = getWorkflowStages(assignment);
                  
                  return (
                    <div key={assignment.id} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {assignment.riskReturnId}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Assigned to: {assignee?.name || 'Unassigned'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getPriorityBadge(assignment.priority)}
                          {getStatusBadge(assignment.status)}
                        </div>
                      </div>

                      {/* Workflow Stages */}
                      <div className="relative">
                        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-300"></div>
                        {stages.map((stage, index) => (
                          <div key={stage.id} className="relative flex items-center space-x-4 mb-8 last:mb-0">
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${
                              stage.status === 'completed' ? 'bg-green-500 border-green-500' :
                              stage.status === 'in_progress' ? 'bg-blue-500 border-blue-500' :
                              stage.status === 'blocked' ? 'bg-red-500 border-red-500' :
                              'bg-white border-gray-300'
                            }`}>
                              {stage.status === 'completed' && (
                                <CheckCircleIcon className="w-4 h-4 text-white" />
                              )}
                              {stage.status === 'in_progress' && (
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">{stage.name}</h4>
                              <p className="text-xs text-gray-600">{stage.description}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                {stage.assignee && (
                                  <span className="text-xs text-gray-500">{stage.assignee}</span>
                                )}
                                {stage.dueDate && (
                                  <span className="text-xs text-gray-500">Due: {formatDate(stage.dueDate)}</span>
                                )}
                                {stage.completedAt && (
                                  <span className="text-xs text-green-600">Completed: {formatDate(stage.completedAt)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Team Performance Tab */}
            {activeTab === 'team' && workflowMetrics && (
              <div className="space-y-6">
                {/* Team Productivity Chart */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Team Productivity</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getTeamProductivityData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="completed" fill="#3B82F6" name="Completed Reviews" />
                        <Bar dataKey="quality" fill="#10B981" name="Quality Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Team Members List */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Team Members</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TEAM_MEMBERS.map((member) => {
                      const productivity = workflowMetrics.teamProductivity[member.id];
                      
                      return (
                        <div key={member.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm text-gray-600">{member.name.charAt(0)}</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                              <p className="text-xs text-gray-500">{member.role}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-gray-900">{productivity?.completed || 0}</div>
                              <div className="text-xs text-gray-500">Completed</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-gray-900">{formatDuration(productivity?.averageTime || 0)}</div>
                              <div className="text-xs text-gray-500">Avg Time</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-gray-900">{productivity?.quality || 0}%</div>
                              <div className="text-xs text-gray-500">Quality</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && workflowMetrics && (
              <div className="space-y-6">
                {/* Workflow Status Distribution */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Workflow Status Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getWorkflowAnalytics()}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {getWorkflowAnalytics().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Review Completion Rate</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {workflowMetrics.totalAssignments > 0 
                        ? ((workflowMetrics.completedReviews / workflowMetrics.totalAssignments) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <div className="text-xs text-gray-500">Last 30 days</div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Overdue Rate</h4>
                    <div className="text-2xl font-bold text-red-600">
                      {workflowMetrics.totalAssignments > 0 
                        ? ((workflowMetrics.overdueAssignments / workflowMetrics.totalAssignments) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <div className="text-xs text-gray-500">Requires attention</div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Team Efficiency</h4>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatDuration(workflowMetrics.averageReviewTime)}
                    </div>
                    <div className="text-xs text-gray-500">Average per review</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Details Modal */}
      <AnimatePresence>
        {showAssignmentDetails && selectedAssignment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAssignmentDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Assignment Details</h3>
                  <button
                    onClick={() => setShowAssignmentDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Return ID</dt>
                      <dd className="text-sm text-gray-900">{selectedAssignment.riskReturnId}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Priority</dt>
                      <dd>{getPriorityBadge(selectedAssignment.priority)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Status</dt>
                      <dd>{getStatusBadge(selectedAssignment.status)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Due Date</dt>
                      <dd className="text-sm text-gray-900">{formatDate(selectedAssignment.dueDate)}</dd>
                    </div>
                  </div>
                  
                  {/* Workflow stages would be displayed here */}
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowAssignmentDetails(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Open Review
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};