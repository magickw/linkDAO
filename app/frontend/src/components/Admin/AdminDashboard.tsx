import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Users,
  FileText,
  AlertTriangle,
  ShoppingBag,
  BarChart3,
  Settings,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  History,
  Bell,
  Phone,
  HelpCircle,
  LineChart,
  Brain,
  RefreshCw,
  Wifi,
  WifiOff,
  LogOut,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  User,
  Home,
  X,
  Check
} from 'lucide-react';
import { usePermissions } from '@/hooks/useAuth';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { adminService } from '@/services/adminService';
import { enhancedAdminService } from '@/services/enhancedAdminService';
import { Button, GlassPanel, GlassModal } from '@/design-system';
import { AnimatePresence } from 'framer-motion';
import { ModerationQueue } from './ModerationQueue';
import { ModerationHistory } from './ModerationHistory';
import { SellerApplications } from './SellerApplications';
import { SellerPerformance } from './SellerPerformance';
import { CharityVerification } from './CharityVerification';
import { DisputeResolution } from './DisputeResolution';
import { UserManagement } from './UserManagement';
import { AdminAnalytics } from './AdminAnalytics';
import { AuditDashboard } from './AuditSystem';
import { NotificationCenter } from './Notifications/NotificationCenter';
import { MobilePushSetup } from './Notifications/MobilePushSetup';
import { WorkflowAutomationDashboard } from './WorkflowAutomation/WorkflowAutomationDashboard';
import { AdminOnboarding } from './Onboarding/AdminOnboarding';
import { EnhancedAnalytics } from './EnhancedAnalytics';
import { EnhancedAIModeration } from './EnhancedAIModeration';
import { initializeAdminWebSocketManager, getAdminWebSocketManager } from '@/services/adminWebSocketService';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { AdvancedSearchPanel } from './Search/AdvancedSearchPanel';
import { BulkActionsToolbar } from './BulkOperations/BulkActionsToolbar';
import { ExportButton } from './Export/ExportButton';

interface AdminStats {
  pendingModerations: number;
  pendingSellerApplications: number;
  openDisputes: number;
  suspendedUsers: number;
  totalUsers: number;
  totalSellers: number;
  recentActions: any[];
  pendingCharityProposals?: number;
}

export function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, hasPermission, user } = usePermissions();
  const { logout, refreshToken } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const webSocketManagerRef = useRef<any>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await enhancedAdminService.getAdminStats();
      if (isMounted.current) {
        if (result.success) {
          setStats(result.data);
          setLastUpdated(new Date());
        } else {
          console.error('Failed to load admin stats:', result.error);
          addToast('Failed to load dashboard statistics', 'error');
        }
      }
    } catch (error) {
      if (isMounted.current) {
        console.error('Failed to load admin stats:', error);
        addToast('Network error loading statistics', 'error');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const initializeWebSocket = async () => {
    if (!user) return;

    try {
      setConnectionStatus('connecting');

      // Create admin user object for WebSocket service
      // Map user role to valid admin roles for WebSocket service
      const roleMap: Record<string, 'super_admin' | 'admin' | 'moderator' | 'analyst'> = {
        'super_admin': 'super_admin',
        'admin': 'admin',
        'moderator': 'moderator',
        'analyst': 'analyst',
        'user': 'admin' // Default to admin for regular users with admin access
      };

      const adminUser: {
        adminId: string;
        email: string;
        role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
        permissions: string[];
      } = {
        adminId: user.id,
        email: user.email || '',
        role: roleMap[user.role] || 'admin',
        permissions: user.permissions || []
      };

      // Initialize WebSocket manager with error handling
      try {
        const manager = await initializeAdminWebSocketManager(adminUser);
        webSocketManagerRef.current = manager;

        // Set up event listeners for real-time updates
        manager.on('dashboard_update', (data) => {
          if (data.data && activeTab === 'overview') {
            // Update stats with real-time data
            setStats(prevStats => {
              if (!prevStats) return prevStats;

              return {
                ...prevStats,
                pendingModerations: data.data.systemMetrics?.pendingModerations || prevStats.pendingModerations,
                pendingSellerApplications: data.data.systemMetrics?.pendingSellerApplications || prevStats.pendingSellerApplications,
                openDisputes: data.data.systemMetrics?.openDisputes || prevStats.openDisputes,
                suspendedUsers: data.data.userMetrics?.suspendedUsers || prevStats.suspendedUsers,
                totalUsers: data.data.userMetrics?.totalUsers || prevStats.totalUsers,
                totalSellers: data.data.businessMetrics?.totalSellers || prevStats.totalSellers
              };
            });

            setLastUpdated(new Date());
          }
        });

        manager.on('admin_alert', (alert) => {
          // Handle real-time alerts
          console.log('New admin alert:', alert);
          // Could show a notification or update UI based on alert type
        });

        manager.onConnection((connected, health) => {
          setConnectionStatus(connected ? 'connected' : 'disconnected');
          if (connected) {
            setLastUpdated(new Date());
          }
        });

        console.log('Admin WebSocket connected successfully');
        setConnectionStatus('connected');
        addToast('Real-time updates connected', 'success', 2000);
      } catch (managerError) {
        console.error('Failed to initialize admin WebSocket manager:', managerError);
        setConnectionStatus('disconnected');
        addToast('Real-time updates unavailable', 'warning', 3000);
      }
    } catch (error) {
      console.error('Failed to initialize admin WebSocket:', error);
      setConnectionStatus('disconnected');
      addToast('Connection error - using fallback mode', 'warning', 3000);
    }
  };

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/');
      return;
    }

    loadStats();

    // Initialize WebSocket connection
    initializeWebSocket();

    // Set up periodic refresh as fallback
    const interval = setInterval(() => {
      if (connectionStatus !== 'connected') {
        loadStats();
      }
    }, 30000); // Refresh every 30 seconds if WebSocket is not available

    return () => {
      clearInterval(interval);
      // Clean up WebSocket connection
      if (webSocketManagerRef.current) {
        webSocketManagerRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, router]);

  const handleRefresh = () => {
    loadStats();
    addToast('Dashboard refreshed', 'success', 2000);
  };

  // Keyboard shortcuts for admin dashboard
  useKeyboardShortcuts({
    enabled: true,
    onRefresh: handleRefresh,
    onSearch: () => {
      // Focus search input
      const searchInput = document.querySelector('input[placeholder="Search actions..."]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
    onGoToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    onGoToBottom: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
    onShowHelp: () => {
      // Show keyboard shortcuts help modal
      addToast('Keyboard shortcuts: R - Refresh, / - Search, G - Go to top, Shift+G - Go to bottom, ? - Show help', 'info', 5000);
    }
  });

  // Session timeout monitoring
  useEffect(() => {
    const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
    const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
    const CHECK_INTERVAL = 60 * 1000; // Check every minute

    const checkSessionTimeout = () => {
      const signatureTimestamp = localStorage.getItem('linkdao_signature_timestamp');
      if (!signatureTimestamp) return;

      const sessionAge = Date.now() - parseInt(signatureTimestamp);
      const timeRemaining = SESSION_DURATION - sessionAge;

      setSessionTimeRemaining(Math.max(0, Math.floor(timeRemaining / 1000)));

      // Show warning if less than 5 minutes remaining
      if (timeRemaining > 0 && timeRemaining <= WARNING_THRESHOLD) {
        setShowSessionWarning(true);
      } else {
        setShowSessionWarning(false);
      }

      // Auto logout if session expired
      if (timeRemaining <= 0) {
        addToast('Session expired. Please sign in again.', 'warning');
        handleLogout();
      }
    };

    // Check immediately and then periodically
    checkSessionTimeout();
    const interval = setInterval(checkSessionTimeout, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [addToast]);

  const handleDisconnect = () => {
    setShowDisconnectDialog(true);
  };

  const handleConfirmDisconnect = async () => {
    try {
      setShowDisconnectDialog(false);
      await logout();
      addToast('Successfully disconnected', 'success');
      router.push('/admin-login');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      addToast('Failed to disconnect wallet', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/admin-login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleExtendSession = async () => {
    try {
      await refreshToken();
      addToast('Session extended successfully', 'success');
      setShowSessionWarning(false);
      // Update the signature timestamp
      localStorage.setItem('linkdao_signature_timestamp', Date.now().toString());
    } catch (error) {
      console.error('Failed to extend session:', error);
      addToast('Failed to extend session', 'error');
    }
  };

  // Filter and search recent actions
  const getFilteredActions = () => {
    if (!stats?.recentActions) return [];

    let filtered = stats.recentActions;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(action =>
        action.adminHandle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.reason?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply admin filter
    if (filterAdmin) {
      filtered = filtered.filter(action => action.adminHandle === filterAdmin);
    }

    // Apply action type filter
    if (filterActionType) {
      filtered = filtered.filter(action => action.action?.includes(filterActionType));
    }

    return filtered;
  };

  // Get paginated actions
  const getPaginatedActions = () => {
    const filtered = getFilteredActions();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages
  const getTotalPages = () => {
    const filtered = getFilteredActions();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  // Export to CSV
  const handleExportCSV = () => {
    // Use selected items if any, otherwise use all filtered items
    const dataToExport = selectedItems.size > 0
      ? getFilteredActions().filter(action => selectedItems.has(action.id || action.timestamp || ''))
      : getFilteredActions();

    if (dataToExport.length === 0) {
      addToast('No actions to export', 'warning');
      return;
    }

    // Create CSV content
    const headers = ['Timestamp', 'Admin', 'Action', 'Reason'];
    const rows = dataToExport.map(action => [
      new Date(action.timestamp).toLocaleString(),
      action.adminHandle,
      action.action,
      action.reason || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-actions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    addToast(`Exported ${dataToExport.length} actions to CSV`, 'success');
  };

  // Get unique admins for filter dropdown
  const getUniqueAdmins = () => {
    if (!stats?.recentActions) return [];
    const admins = stats.recentActions.map(action => action.adminHandle);
    return Array.from(new Set(admins)).filter(Boolean);
  };

  // Get unique action types for filter dropdown
  const getUniqueActionTypes = () => {
    if (!stats?.recentActions) return [];
    const types = stats.recentActions.map(action => {
      // Extract action type from action string (e.g., "banned user" -> "banned")
      const words = action.action?.split(' ') || [];
      return words[0];
    });
    return Array.from(new Set(types)).filter(Boolean);
  };

  // Bulk operations
  const handleSelectItem = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = getFilteredActions().map(action => action.id || action.timestamp);
      setSelectedItems(new Set(allIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    setBulkAction(action);
    try {
      // Perform bulk action based on type
      switch (action) {
        case 'approve':
          // Example: approve selected items
          addToast(`Approved ${selectedItems.size} items`, 'success');
          break;
        case 'reject':
          // Example: reject selected items
          addToast(`Rejected ${selectedItems.size} items`, 'warning');
          break;
        case 'delete':
          // Example: delete selected items
          addToast(`Deleted ${selectedItems.size} items`, 'error');
          break;
        case 'flag':
          // Example: flag selected items
          addToast(`Flagged ${selectedItems.size} items`, 'info');
          break;
        default:
          addToast(`Performed ${action} on ${selectedItems.size} items`, 'info');
      }
      // Clear selection after action
      setSelectedItems(new Set());
    } catch (error) {
      addToast(`Failed to perform bulk action: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setBulkAction(null);
    }
  };

  const handleClearSelection = () => {
    setSelectedItems(new Set());
  };

  // Export functionality
  const handleExport = async (exportOptions: { format: 'csv' | 'json' | 'pdf'; filename?: string }) => {
    setExportFormat(exportOptions.format);
    // Get the filtered actions data to export
    const filtered = getFilteredActions();
    if (filtered.length === 0) {
      addToast('No items to export', 'warning');
      return;
    }

    // Create export data based on format
    if (exportOptions.format === 'csv') {
      // CSV export implementation (already exists in the component)
      handleExportCSV();
    } else if (exportOptions.format === 'json') {
      const jsonData = JSON.stringify(filtered, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportOptions.filename || 'admin-actions'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast(`Exported ${filtered.length} items to JSON`, 'success');
    }
  };

  // Breadcrumb navigation
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: 'Dashboard', tab: 'overview' }];

    const tabMap: Record<string, string> = {
      'moderation': 'Moderation',
      'ai-moderation': 'AI Moderation',
      'history': 'Mod History',
      'audit': 'Audit System',
      'notifications': 'Notifications',
      'push-setup': 'Push Setup',
      'workflows': 'Workflows',
      'onboarding': 'Onboarding',
      'sellers': 'Seller Applications',
      'performance': 'Seller Performance',
      'disputes': 'Disputes',
      'users': 'User Management',
      'analytics': 'Analytics',
      'enhanced-analytics': 'Enhanced Analytics'
    };

    if (activeTab !== 'overview' && tabMap[activeTab]) {
      breadcrumbs.push({ label: tabMap[activeTab], tab: activeTab });
    }

    return breadcrumbs;
  };

  if (!isAdmin()) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, permission: null },
    { id: 'moderation', label: 'Moderation', icon: Shield, permission: 'content.moderate' },
    { id: 'ai-moderation', label: 'AI Moderation', icon: Brain, permission: 'content.moderate' },
    { id: 'history', label: 'Mod History', icon: History, permission: 'system.audit' },
    { id: 'audit', label: 'Audit System', icon: FileText, permission: 'system.audit' },
    { id: 'notifications', label: 'Notifications', icon: Bell, permission: null },
    { id: 'push-setup', label: 'Push Setup', icon: Phone, permission: null },
    { id: 'workflows', label: 'Workflows', icon: Settings, permission: null },
    { id: 'onboarding', label: 'Onboarding', icon: HelpCircle, permission: null },
    { id: 'sellers', label: 'Seller Applications', icon: ShoppingBag, permission: 'marketplace.seller_review' },
    { id: 'performance', label: 'Seller Performance', icon: TrendingUp, permission: 'marketplace.seller_view' },
    { id: 'charity-verification', label: 'Charity Verification', icon: Heart, permission: 'governance.verify' },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle, permission: 'disputes.view' },
    { id: 'users', label: 'User Management', icon: Users, permission: 'users.view' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, permission: 'system.analytics' },
    { id: 'enhanced-analytics', label: 'Enhanced Analytics', icon: LineChart, permission: 'system.analytics' },
  ].filter(tab => !tab.permission || hasPermission(tab.permission));

  const StatCard = ({ title, value, icon: Icon, color, trend, onClick }: any) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full text-left ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'} transition-all duration-200`}
      role="button"
      aria-label={onClick ? `View ${title}` : title}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <GlassPanel className={`p-4 sm:p-6 ${onClick ? 'hover:bg-white/20 hover:shadow-lg hover:shadow-purple-500/20' : 'hover:bg-white/15'} transition-all duration-200`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-gray-400 text-xs sm:text-sm truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1">{value}</p>
            {trend && (
              <p className={`text-xs sm:text-sm mt-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trend > 0 ? '+' : ''}{trend}% from last week
              </p>
            )}
          </div>
          <div className={`p-2 sm:p-3 rounded-lg ${color} flex-shrink-0 ml-2`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        </div>
      </GlassPanel>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm">
            {getBreadcrumbs().map((crumb, index) => (
              <React.Fragment key={crumb.tab}>
                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                <button
                  onClick={() => setActiveTab(crumb.tab)}
                  className={`flex items-center gap-1 ${crumb.tab === activeTab
                    ? 'text-purple-400 font-medium'
                    : 'text-gray-400 hover:text-white'
                    } transition-colors`}
                >
                  {index === 0 && <Home className="w-4 h-4" />}
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* User Profile Display */}
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg border border-white/20">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">
                      {user?.handle || user?.address?.slice(0, 6) + '...' + user?.address?.slice(-4) || 'Admin'}
                    </p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${user?.role === 'super_admin' ? 'bg-red-500/20 text-red-300 border border-red-500/50' :
                      user?.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                      }`}>
                      {user?.role?.replace('_', ' ').toUpperCase() || 'ADMIN'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    {user?.email || 'Administrator'}
                  </p>
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Manage platform operations and user activities</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">Refresh</span>
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:border-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xs:inline">Disconnect</span>
              </Button>
              <div className="flex items-center gap-2 text-sm">{connectionStatus === 'connected' ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Real-time</span>
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-yellow-400">Connecting</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Offline</span>
                </>
              )}</div>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-gray-400 text-xs mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
              >
                <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-8">
            {/* Stats Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <GlassPanel key={i} className="p-4 sm:p-6 animate-pulse">
                    <div className="h-16 bg-white/10 rounded"></div>
                  </GlassPanel>
                ))}
              </div>
            ) : stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                <StatCard
                  title="Pending Moderations"
                  value={stats.pendingModerations}
                  icon={Shield}
                  color="bg-orange-500"
                  onClick={() => setActiveTab('moderation')}
                />
                <StatCard
                  title="Seller Applications"
                  value={stats.pendingSellerApplications}
                  icon={ShoppingBag}
                  color="bg-blue-500"
                  onClick={() => setActiveTab('sellers')}
                />
                <StatCard
                  title="Open Disputes"
                  value={stats.openDisputes}
                  icon={AlertTriangle}
                  color="bg-red-500"
                  onClick={() => setActiveTab('disputes')}
                />
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers.toLocaleString()}
                  icon={Users}
                  color="bg-green-500"
                  onClick={() => setActiveTab('users')}
                />
                <StatCard
                  title="Total Sellers"
                  value={stats.totalSellers.toLocaleString()}
                  icon={ShoppingBag}
                  color="bg-purple-500"
                  onClick={() => setActiveTab('performance')}
                />
                <StatCard
                  title="Suspended Users"
                  value={stats.suspendedUsers}
                  icon={XCircle}
                  color="bg-gray-500"
                  onClick={() => setActiveTab('users')}
                />
                {stats.pendingCharityProposals !== undefined && (
                  <StatCard
                    title="Pending Charities"
                    value={stats.pendingCharityProposals}
                    icon={Heart}
                    color="bg-pink-500"
                    onClick={() => setActiveTab('charity-verification')}
                  />
                )}
              </div>
            )}

            {/* Advanced Search Panel */}
            {showAdvancedSearch && (
              <AdvancedSearchPanel
                onSearch={(filters) => {
                  setSearchQuery(filters.query || '');
                  setFilterAdmin(filters.admin || '');
                  setFilterActionType(filters.type || '');
                  setCurrentPage(1);
                }}
                onClear={() => {
                  setSearchQuery('');
                  setFilterAdmin('');
                  setFilterActionType('');
                  setCurrentPage(1);
                }}
                filterOptions={{
                  types: getUniqueActionTypes().map(type => ({ value: type, label: type })),
                  statuses: [
                    { value: 'completed', label: 'Completed' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'failed', label: 'Failed' }
                  ],
                  categories: [
                    { value: 'moderation', label: 'Moderation' },
                    { value: 'user', label: 'User Management' },
                    { value: 'seller', label: 'Seller' },
                    { value: 'dispute', label: 'Dispute' }
                  ]
                }}
              />
            )}

            {/* Bulk Operations Toolbar */}
            <BulkActionsToolbar
              selectedCount={selectedItems.size}
              onAction={(action) => handleBulkAction(action)}
              onClear={handleClearSelection}
              availableActions={['approve', 'reject', 'flag', 'delete']}
            />

            {/* Recent Actions */}
            <GlassPanel className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-white">Recent Admin Actions</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">{showAdvancedSearch ? 'Hide Filters' : 'Advanced Filters'}</span>
                  </Button>
                  <ExportButton
                    data={getFilteredActions()}
                    filename="admin-actions"
                    availableFormats={['csv', 'json']}
                    onExport={handleExport}
                    columns={[
                      { key: 'timestamp', label: 'Timestamp' },
                      { key: 'adminHandle', label: 'Admin' },
                      { key: 'action', label: 'Action' },
                      { key: 'reason', label: 'Reason' }
                    ]}
                  />
                </div>
              </div>

              {/* Select All and Actions List */}
              {stats?.recentActions && stats.recentActions.length > 0 ? (
                <>
                  {/* Select All and Action Count */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={getFilteredActions().length > 0 && selectedItems.size === getFilteredActions().length}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = selectedItems.size > 0 && selectedItems.size < getFilteredActions().length;
                          }
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                      />
                      <span className="text-gray-400 text-sm">
                        {selectedItems.size} of {getFilteredActions().length} selected
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {getPaginatedActions().map((action, index) => {
                      const actionId = action.id || action.timestamp || index.toString();
                      const isSelected = selectedItems.has(actionId);

                      return (
                        <div
                          key={index}
                          className={`flex items-center p-2 sm:p-3 rounded-lg gap-2 transition-colors ${isSelected ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-white/5 hover:bg-white/10'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectItem(actionId, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 mr-2"
                          />

                          <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                              <div className="min-w-0">
                                <p className="text-white text-xs sm:text-sm truncate">
                                  <span className="font-medium">{action.adminHandle}</span> {action.action}
                                </p>
                                <p className="text-gray-400 text-[10px] sm:text-xs truncate">{action.reason}</p>
                              </div>
                            </div>
                            <span className="text-gray-400 text-[10px] sm:text-xs flex-shrink-0">
                              {new Date(action.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, getFilteredActions().length)} of {getFilteredActions().length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Items per page selector */}
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value={10} className="bg-gray-800">10 per page</option>
                        <option value={25} className="bg-gray-800">25 per page</option>
                        <option value={50} className="bg-gray-800">50 per page</option>
                      </select>

                      {/* Page navigation */}
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        className="px-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      <span className="text-white text-sm px-2">
                        Page {currentPage} of {getTotalPages()}
                      </span>

                      <Button
                        onClick={() => setCurrentPage(prev => Math.min(getTotalPages(), prev + 1))}
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= getTotalPages()}
                        className="px-2"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-sm">No recent actions</p>
              )}
            </GlassPanel>

            {/* Quick Actions */}
            <GlassPanel className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                {hasPermission('content.moderate') && (
                  <Button
                    onClick={() => setActiveTab('moderation')}
                    variant="outline"
                    className="flex items-center gap-2 justify-center text-sm"
                  >
                    <Shield className="w-33 h-3 sm:w-4 sm:h-4" />
                    Review Content
                  </Button>
                )}
                {hasPermission('marketplace.seller_review') && (
                  <Button
                    onClick={() => setActiveTab('sellers')}
                    variant="outline"
                    className="flex items-center gap-2 justify-center text-sm"
                  >
                    <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                    Review Sellers
                  </Button>
                )}
                {hasPermission('disputes.resolve') && (
                  <Button
                    onClick={() => setActiveTab('disputes')}
                    variant="outline"
                    className="flex items-center gap-2 justify-center text-sm"
                  >
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                    Resolve Disputes
                  </Button>
                )}
              </div>
            </GlassPanel>
          </div>
        )}

        {activeTab === 'moderation' && hasPermission('content.moderate') && (
          <ModerationQueue />
        )}

        {activeTab === 'ai-moderation' && hasPermission('content.moderate') && (
          <EnhancedAIModeration />
        )}

        {activeTab === 'history' && hasPermission('system.audit') && (
          <ModerationHistory />
        )}

        {activeTab === 'audit' && hasPermission('system.audit') && (
          <AuditDashboard />
        )}

        {activeTab === 'notifications' && (
          <NotificationCenter />
        )}

        {activeTab === 'push-setup' && (
          <MobilePushSetup />
        )}

        {activeTab === 'sellers' && hasPermission('marketplace.seller_review') && (
          <SellerApplications />
        )}

        {activeTab === 'performance' && hasPermission('marketplace.seller_view') && (
          <SellerPerformance />
        )}

        {activeTab === 'charity-verification' && hasPermission('governance.verify') && (
          <CharityVerification />
        )}

        {activeTab === 'disputes' && hasPermission('disputes.view') && (
          <DisputeResolution />
        )}

        {activeTab === 'users' && hasPermission('users.view') && (
          <UserManagement />
        )}

        {activeTab === 'analytics' && hasPermission('system.analytics') && (
          <AdminAnalytics />
        )}

        {activeTab === 'enhanced-analytics' && hasPermission('system.analytics') && (
          <EnhancedAnalytics />
        )}

        {activeTab === 'workflows' && (
          <WorkflowAutomationDashboard />
        )}

        {activeTab === 'onboarding' && (
          <AdminOnboarding />
        )}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <AnimatePresence>
        {showDisconnectDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <GlassModal className="max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Disconnect Wallet?</h3>
                  <p className="text-gray-400 text-sm">You will be signed out of the admin dashboard</p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-200 text-sm">
                  <strong>Active Sessions:</strong> You will lose access to all active admin features and need to reconnect your wallet to sign back in.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDisconnectDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDisconnect}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </GlassModal>
          </div>
        )}
      </AnimatePresence>

      {/* Session Timeout Warning */}
      <AnimatePresence>
        {showSessionWarning && (
          <div className="fixed bottom-4 right-4 z-40">
            <GlassModal className="max-w-sm p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-yellow-500/20 rounded-full">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-white mb-1">Session Expiring Soon</h4>
                  <p className="text-gray-400 text-sm mb-2">
                    Your session will expire in {Math.floor(sessionTimeRemaining / 60)} minutes
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(sessionTimeRemaining / 300) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleExtendSession}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  Extend Session
                </Button>
                <Button
                  onClick={() => setShowSessionWarning(false)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  Dismiss
                </Button>
              </div>
            </GlassModal>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
