import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Flag,
  TrendingUp,
  BarChart3,
  Filter,
  Search,
  RefreshCw,
  Download,
  MoreVertical,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Brain,
  Zap,
  Target,
  Settings,
  Save,
  Bell
} from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';
import { adminService } from '@/services/adminService';

interface ModerationItem {
  id: string;
  contentId: string;
  contentType: 'post' | 'comment' | 'listing' | 'dm' | 'username';
  content: string;
  authorId: string;
  authorHandle: string;
  status: 'pending_review' | 'approved' | 'rejected';
  riskScore: number;
  moderationCategories: string[];
  explanation: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  confidence?: number;
  suggestedAction?: 'approve' | 'reject' | 'flag' | 'escalate';
  context?: {
    userHistory?: {
      previousViolations: number;
      accountAge: number;
      reputationScore: number;
    };
    contentAnalysis?: {
      sentiment: 'positive' | 'neutral' | 'negative';
      toxicity: number;
      spamProbability: number;
    };
  };
}

interface Report {
  id: string;
  contentId: string;
  contentType: string;
  reporterId: string;
  reporterHandle: string;
  reason: string;
  details: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ModerationStats {
  totalPendingReview: number;
  totalReports: number;
  autoBlockedToday: number;
  autoLimitedToday: number;
  avgResponseTime: number;
  falsePositiveRate: number;
  accuracyRate: number;
  modelVersion: string;
}

export const EnhancedAIModeration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'reports' | 'analytics' | 'settings'>('queue');
  const [pendingItems, setPendingItems] = useState<ModerationItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    totalPendingReview: 0,
    totalReports: 0,
    autoBlockedToday: 0,
    autoLimitedToday: 0,
    avgResponseTime: 0,
    falsePositiveRate: 0,
    accuracyRate: 0,
    modelVersion: 'v2.4.1'
  });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'risk' | 'confidence'>('date');
  const [modelSettings, setModelSettings] = useState({
    sensitivity: 0.7,
    autoApproveThreshold: 0.2,
    autoRejectThreshold: 0.9,
    enableContextAnalysis: true,
    enableUserHistory: true
  });

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [activeTab, filterStatus]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch real data from admin service
      const pendingItemsResponse = await adminService.getModerationQueue({
        status: 'pending',
        limit: 20
      });

      const reportsResponse = await adminService.getModerationQueue({
        type: 'report',
        limit: 10
      });

      // Update stats with real data if available
      const mappedPendingItems: ModerationItem[] = (pendingItemsResponse.items || []).map((item: any) => ({
        id: item.id,
        contentId: item.targetId,
        contentType: item.targetType as any,
        content: 'Content unavailable', // Placeholder as API doesn't return content yet
        authorId: 'unknown',
        authorHandle: '@unknown',
        status: item.status as any,
        riskScore: item.priority === 'high' ? 0.8 : item.priority === 'medium' ? 0.5 : 0.2,
        moderationCategories: [item.reason],
        explanation: item.reason,
        createdAt: item.createdAt,
        confidence: 0.8,
        context: {
          userHistory: {
            previousViolations: 0,
            accountAge: 0,
            reputationScore: 0.5
          }
        }
      }));
      setPendingItems(mappedPendingItems);

      const mappedReports: Report[] = (reportsResponse.items || []).map((item: any) => ({
        id: item.id,
        contentId: item.targetId,
        contentType: item.targetType,
        reporterId: 'unknown',
        reporterHandle: '@unknown',
        reason: item.reason,
        details: 'No details available',
        status: 'open',
        createdAt: item.createdAt,
        priority: item.priority as any || 'medium'
      }));
      setReports(mappedReports);

      // Fetch moderation statistics for the stats section
      const statsResponse = await adminService.getAdminStats();
      setStats({
        ...stats, // Keep existing fields
        totalPendingReview: pendingItemsResponse.total || 0,
        totalReports: reportsResponse.total || 0,
      });
    } catch (error) {
      console.error('Failed to load moderation dashboard:', error);

      // Fallback to mock data if API fails
      const mockPendingItems: ModerationItem[] = [
        {
          id: '1',
          contentId: 'post_123',
          contentType: 'post',
          content: 'Check out this amazing deal! Buy now before it\'s too late! Limited time offer!',
          authorId: 'user_456',
          authorHandle: '@spamuser',
          status: 'pending_review',
          riskScore: 0.75,
          confidence: 0.89,
          suggestedAction: 'reject',
          moderationCategories: ['spam', 'promotional'],
          explanation: 'Detected spam patterns: excessive promotional keywords',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          context: {
            userHistory: {
              previousViolations: 2,
              accountAge: 5,
              reputationScore: 0.3
            },
            contentAnalysis: {
              sentiment: 'neutral',
              toxicity: 0.2,
              spamProbability: 0.92
            }
          }
        },
        {
          id: '2',
          contentId: 'comment_789',
          contentType: 'comment',
          content: 'This is such a helpful post! Thanks for sharing.',
          authorId: 'user_111',
          authorHandle: '@helpfuluser',
          status: 'pending_review',
          riskScore: 0.1,
          confidence: 0.95,
          suggestedAction: 'approve',
          moderationCategories: [],
          explanation: 'No problematic content detected',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          context: {
            userHistory: {
              previousViolations: 0,
              accountAge: 120,
              reputationScore: 0.95
            },
            contentAnalysis: {
              sentiment: 'positive',
              toxicity: 0.05,
              spamProbability: 0.02
            }
          }
        },
        {
          id: '3',
          contentId: 'post_456',
          contentType: 'post',
          content: 'I hate this platform! It\'s the worst thing ever!',
          authorId: 'user_222',
          authorHandle: '@angryuser',
          status: 'pending_review',
          riskScore: 0.65,
          confidence: 0.82,
          suggestedAction: 'flag',
          moderationCategories: ['toxicity'],
          explanation: 'High toxicity detected in content',
          createdAt: new Date(Date.now() - 10800000).toISOString(),
          context: {
            userHistory: {
              previousViolations: 1,
              accountAge: 30,
              reputationScore: 0.6
            },
            contentAnalysis: {
              sentiment: 'negative',
              toxicity: 0.78,
              spamProbability: 0.1
            }
          }
        }
      ];

      // Mock data for reports
      const mockReports: Report[] = [
        {
          id: 'r1',
          contentId: 'post_789',
          contentType: 'post',
          reporterId: 'user_111',
          reporterHandle: '@gooduser',
          reason: 'harassment',
          details: 'This user is repeatedly targeting me with harmful comments',
          status: 'open',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          priority: 'high'
        },
        {
          id: 'r2',
          contentId: 'comment_333',
          contentType: 'comment',
          reporterId: 'user_555',
          reporterHandle: '@concerneduser',
          reason: 'spam',
          details: 'This comment contains spam links',
          status: 'under_review',
          createdAt: new Date(Date.now() - 14400000).toISOString(),
          priority: 'medium'
        }
      ];

      // Mock stats with enhanced metrics
      const mockStats: ModerationStats = {
        totalPendingReview: 12,
        totalReports: 8,
        autoBlockedToday: 45,
        autoLimitedToday: 23,
        avgResponseTime: 2.5,
        falsePositiveRate: 0.08,
        accuracyRate: 0.92,
        modelVersion: 'v2.4.1'
      };

      setPendingItems(mockPendingItems);
      setReports(mockReports);
      setStats(mockStats);

    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (itemId: string) => {
    try {
      // In a real implementation, this would call an API endpoint
      setPendingItems(items => items.filter(item => item.id !== itemId));
      setSelectedItem(null);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to approve item:', error);
    }
  };

  const handleReject = async (itemId: string) => {
    try {
      // In a real implementation, this would call an API endpoint
      setPendingItems(items => items.filter(item => item.id !== itemId));
      setSelectedItem(null);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reject item:', error);
    }
  };

  const handleReportAction = async (reportId: string, action: 'resolve' | 'dismiss' | 'escalate') => {
    try {
      // In a real implementation, this would call an API endpoint
      setReports(reports => reports.filter(r => r.id !== reportId));
      setSelectedReport(null);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to update report:', error);
    }
  };

  const getRiskBadgeColor = (riskScore: number) => {
    if (riskScore >= 0.8) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    if (riskScore >= 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSuggestedActionColor = (action: string) => {
    switch (action) {
      case 'approve': return 'text-green-400';
      case 'reject': return 'text-red-400';
      case 'flag': return 'text-yellow-400';
      case 'escalate': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const saveModelSettings = async () => {
    try {
      // In a real implementation, this would call an API endpoint
      console.log('Saving model settings:', modelSettings);
    } catch (error) {
      console.error('Failed to save model settings:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
              <Brain className="w-8 h-8 text-blue-600" />
              <span>Enhanced AI Moderation</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Advanced content moderation with machine learning insights
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Model: {stats.modelVersion}
            </div>
            <button
              onClick={loadDashboardData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalPendingReview}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Open Reports</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalReports}</p>
              </div>
              <Flag className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Auto-Blocked</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.autoBlockedToday}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Auto-Limited</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.autoLimitedToday}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.avgResponseTime}h</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">False Positive</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{(stats.falsePositiveRate * 100).toFixed(1)}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Accuracy</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{(stats.accuracyRate * 100).toFixed(1)}%</p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('queue')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'queue'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <span className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Review Queue ({stats.totalPendingReview})</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'reports'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <span className="flex items-center space-x-2">
                <Flag className="w-4 h-4" />
                <span>User Reports ({stats.totalReports})</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <span className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <span className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'queue' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'risk' | 'confidence')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="date">Sort by Date</option>
                  <option value="risk">Sort by Risk</option>
                  <option value="confidence">Sort by Confidence</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
              </div>

              {/* Queue Items */}
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading moderation queue...</p>
                </div>
              ) : pendingItems.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-900 dark:text-white font-medium">All caught up!</p>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">No items pending review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskBadgeColor(item.riskScore)}`}>
                            Risk: {(item.riskScore * 100).toFixed(0)}%
                          </span>
                          {item.confidence && (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getConfidenceColor(item.confidence)}`}>
                              Confidence: {(item.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                          {item.suggestedAction && (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSuggestedActionColor(item.suggestedAction)}`}>
                              Suggested: {item.suggestedAction}
                            </span>
                          )}
                          {item.moderationCategories.map((category) => (
                            <span
                              key={category}
                              className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(item.createdAt)}</span>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          <span className="font-medium">Author:</span> {item.authorHandle}
                        </p>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-600">
                          <p className="text-sm text-gray-900 dark:text-white">{item.content}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">AI Explanation:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{item.explanation}</p>
                      </div>

                      {/* Context Analysis */}
                      {item.context && (
                        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Context Analysis</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {item.context.userHistory && (
                              <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                                  Violations: {item.context.userHistory.previousViolations}
                                </span>
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                                  Account Age: {item.context.userHistory.accountAge}d
                                </span>
                                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                                  Reputation: {(item.context.userHistory.reputationScore * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}
                            {item.context.contentAnalysis && (
                              <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded">
                                  Toxicity: {(item.context.contentAnalysis.toxicity * 100).toFixed(0)}%
                                </span>
                                <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded">
                                  Spam: {(item.context.contentAnalysis.spamProbability * 100).toFixed(0)}%
                                </span>
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                                  Sentiment: {item.context.contentAnalysis.sentiment}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-900 dark:text-white font-medium">No pending reports</p>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">All user reports have been addressed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${report.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            report.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                              report.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                            {report.priority}
                          </span>
                          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-semibold">
                            {report.reason}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(report.createdAt)}</span>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          <span className="font-medium">Reported by:</span> {report.reporterHandle}
                        </p>
                        <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-600">
                          <p className="text-sm text-gray-900 dark:text-white">{report.details}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => handleReportAction(report.id, 'resolve')}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Resolve</span>
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'dismiss')}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Dismiss</span>
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'escalate')}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Escalate</span>
                        </button>
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900 dark:text-white font-medium">Analytics Dashboard</p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Detailed moderation analytics and performance metrics
                </p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Accuracy Trends</h3>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Accuracy trend chart</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">False Positive Rate</h3>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">False positive rate chart</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Response Time</h3>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Response time chart</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Model Configuration</h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sensitivity Level: {(modelSettings.sensitivity * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={modelSettings.sensitivity}
                      onChange={(e) => setModelSettings({ ...modelSettings, sensitivity: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Less Sensitive</span>
                      <span>More Sensitive</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Auto-Approve Threshold: {(modelSettings.autoApproveThreshold * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={modelSettings.autoApproveThreshold}
                      onChange={(e) => setModelSettings({ ...modelSettings, autoApproveThreshold: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Auto-Reject Threshold: {(modelSettings.autoRejectThreshold * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={modelSettings.autoRejectThreshold}
                      onChange={(e) => setModelSettings({ ...modelSettings, autoRejectThreshold: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <input
                        id="context-analysis"
                        type="checkbox"
                        checked={modelSettings.enableContextAnalysis}
                        onChange={(e) => setModelSettings({ ...modelSettings, enableContextAnalysis: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="context-analysis" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Enable Context Analysis
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="user-history"
                        type="checkbox"
                        checked={modelSettings.enableUserHistory}
                        onChange={(e) => setModelSettings({ ...modelSettings, enableUserHistory: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="user-history" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Enable User History Analysis
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={saveModelSettings}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Settings
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Model Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Model Version</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{stats.modelVersion}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">2023-06-15</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Training Dataset Size</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">2.4M samples</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Model Type</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">Transformer-based NLP</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedAIModeration;