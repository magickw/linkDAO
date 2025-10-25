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
  ChevronUp
} from 'lucide-react';

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
}

interface ModerationStats {
  totalPendingReview: number;
  totalReports: number;
  autoBlockedToday: number;
  autoLimitedToday: number;
  avgResponseTime: number;
  falsePositiveRate: number;
}

export const AIModerationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'reports' | 'analytics'>('queue');
  const [pendingItems, setPendingItems] = useState<ModerationItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    totalPendingReview: 0,
    totalReports: 0,
    autoBlockedToday: 0,
    autoLimitedToday: 0,
    avgResponseTime: 0,
    falsePositiveRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'risk'>('date');

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [activeTab, filterStatus]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load pending moderation items
      // TODO: Replace with actual API call
      // const pendingResponse = await fetch('/api/moderation/pending');
      // const reportsResponse = await fetch('/api/moderation/reports/pending');
      // const statsResponse = await fetch('/api/moderation/stats');

      // Mock data for now
      setPendingItems([
        {
          id: '1',
          contentId: 'post_123',
          contentType: 'post',
          content: 'Check out this amazing deal! Buy now before it\'s too late! Limited time offer!',
          authorId: 'user_456',
          authorHandle: '@spamuser',
          status: 'pending_review',
          riskScore: 0.75,
          moderationCategories: ['spam', 'promotional'],
          explanation: 'Detected spam patterns: excessive promotional keywords',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ]);

      setReports([
        {
          id: 'r1',
          contentId: 'post_789',
          contentType: 'post',
          reporterId: 'user_111',
          reporterHandle: '@gooduser',
          reason: 'harassment',
          details: 'This user is repeatedly targeting me with harmful comments',
          status: 'open',
          createdAt: new Date(Date.now() - 7200000).toISOString()
        }
      ]);

      setStats({
        totalPendingReview: 12,
        totalReports: 8,
        autoBlockedToday: 45,
        autoLimitedToday: 23,
        avgResponseTime: 2.5,
        falsePositiveRate: 0.08
      });

    } catch (error) {
      console.error('Failed to load moderation dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (itemId: string) => {
    try {
      // TODO: Implement API call
      // await fetch(`/api/moderation/items/${itemId}/approve`, { method: 'POST' });
      setPendingItems(items => items.filter(item => item.id !== itemId));
      setSelectedItem(null);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to approve item:', error);
    }
  };

  const handleReject = async (itemId: string) => {
    try {
      // TODO: Implement API call
      // await fetch(`/api/moderation/items/${itemId}/reject`, { method: 'POST' });
      setPendingItems(items => items.filter(item => item.id !== itemId));
      setSelectedItem(null);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reject item:', error);
    }
  };

  const handleReportAction = async (reportId: string, action: 'resolve' | 'dismiss') => {
    try {
      // TODO: Implement API call
      // await fetch(`/api/moderation/reports/${reportId}`, {
      //   method: 'PUT',
      //   body: JSON.stringify({ status: action === 'resolve' ? 'resolved' : 'dismissed' })
      // });
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <span>AI Moderation Dashboard</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Automated content moderation with human oversight
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('queue')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'queue'
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
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'reports'
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
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'queue' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-1 relative">
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
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'risk')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="date">Sort by Date</option>
                  <option value="risk">Sort by Risk</option>
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
                pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskBadgeColor(item.riskScore)}`}>
                          Risk: {(item.riskScore * 100).toFixed(0)}%
                        </span>
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

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
                ))
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
                reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
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

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleReportAction(report.id, 'resolve')}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Resolve</span>
                      </button>
                      <button
                        onClick={() => handleReportAction(report.id, 'dismiss')}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Dismiss</span>
                      </button>
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900 dark:text-white font-medium">Analytics Dashboard Coming Soon</p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  View trends, patterns, and performance metrics
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIModerationDashboard;
