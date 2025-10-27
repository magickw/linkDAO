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
  Search,
  Filter,
  Grid,
  List,
  Bookmark,
  Star,
  Zap,
  Menu,
  X,
  Home,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { usePermissions } from '@/hooks/useAuth';
import { adminService } from '@/services/adminService';
import { Button, GlassPanel } from '@/design-system';
import { ModerationQueue } from './ModerationQueue';
import { ModerationHistory } from './ModerationHistory';
import { SellerApplications } from './SellerApplications';
import { SellerPerformance } from './SellerPerformance';
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
import { SecurityComplianceDashboard } from './SecurityComplianceDashboard';
import { initializeAdminWebSocketManager, getAdminWebSocketManager } from '@/services/adminWebSocketService';

interface AdminStats {
  pendingModerations: number;
  pendingSellerApplications: number;
  openDisputes: number;
  suspendedUsers: number;
  totalUsers: number;
  totalSellers: number;
  recentActions: any[];
}

interface FavoriteTab {
  id: string;
  label: string;
  icon: React.ElementType;
}

export function EnhancedAdminDashboard() {
  const router = useRouter();
  const { isAdmin, hasPermission, user } = usePermissions();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<FavoriteTab[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const webSocketManagerRef = useRef<any>(null);

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/');
      return;
    }
    
    loadStats();
    loadFavorites();
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Set up periodic refresh as fallback
    const interval = setInterval(() => {
      if (!webSocketManagerRef.current || !webSocketManagerRef.current.isConnected) {
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
  }, [isAdmin, router]);

  const initializeWebSocket = async () => {
    if (!user) return;
    
    try {
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
      
      // Initialize WebSocket manager
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
        }
      });
      
      manager.on('admin_alert', (alert) => {
        // Handle real-time alerts
        console.log('New admin alert:', alert);
        // Could show a notification or update UI based on alert type
        setNotificationCount(prev => prev + 1);
      });
      
      console.log('Admin WebSocket connected successfully');
    } catch (error) {
      console.error('Failed to initialize admin WebSocket:', error);
      // Fall back to polling
    }
  };

  const loadStats = async () => {
    try {
      const data = await adminService.getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    // Load favorites from localStorage or API
    const savedFavorites = localStorage.getItem('adminDashboardFavorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Failed to parse favorites', e);
      }
    }
  };

  const toggleFavorite = (tab: FavoriteTab) => {
    const isFavorite = favorites.some(fav => fav.id === tab.id);
    let newFavorites;
    
    if (isFavorite) {
      newFavorites = favorites.filter(fav => fav.id !== tab.id);
    } else {
      newFavorites = [...favorites, tab];
    }
    
    setFavorites(newFavorites);
    localStorage.setItem('adminDashboardFavorites', JSON.stringify(newFavorites));
  };

  if (!isAdmin()) {
    return null;
  }

  const allTabs = [
    { id: 'overview', label: 'Overview', icon: Home, permission: null, category: 'dashboard' },
    { id: 'moderation', label: 'Moderation', icon: Shield, permission: 'content.moderate', category: 'content' },
    { id: 'ai-moderation', label: 'AI Moderation', icon: Brain, permission: 'content.moderate', category: 'content' },
    { id: 'history', label: 'Mod History', icon: History, permission: 'system.audit', category: 'audit' },
    { id: 'audit', label: 'Audit System', icon: FileText, permission: 'system.audit', category: 'audit' },
    { id: 'security', label: 'Security & Compliance', icon: Shield, permission: 'system.security', category: 'security' },
    { id: 'notifications', label: 'Notifications', icon: Bell, permission: null, category: 'communications' },
    { id: 'push-setup', label: 'Push Setup', icon: Phone, permission: null, category: 'communications' },
    { id: 'workflows', label: 'Workflows', icon: Settings, permission: null, category: 'automation' },
    { id: 'onboarding', label: 'Onboarding', icon: HelpCircle, permission: null, category: 'user' },
    { id: 'sellers', label: 'Seller Applications', icon: ShoppingBag, permission: 'marketplace.seller_review', category: 'business' },
    { id: 'performance', label: 'Seller Performance', icon: TrendingUp, permission: 'marketplace.seller_view', category: 'business' },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle, permission: 'disputes.view', category: 'business' },
    { id: 'users', label: 'User Management', icon: Users, permission: 'users.view', category: 'user' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, permission: 'system.analytics', category: 'analytics' },
    { id: 'enhanced-analytics', label: 'Enhanced Analytics', icon: LineChart, permission: 'system.analytics', category: 'analytics' },
  ].filter(tab => !tab.permission || hasPermission(tab.permission));

  const filteredTabs = showFavoritesOnly 
    ? allTabs.filter(tab => favorites.some(fav => fav.id === tab.id))
    : allTabs.filter(tab => 
        tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tab.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const categorizedTabs = filteredTabs.reduce((acc, tab) => {
    if (!acc[tab.category]) {
      acc[tab.category] = [];
    }
    acc[tab.category].push(tab);
    return acc;
  }, {} as Record<string, typeof allTabs>);

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <GlassPanel className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
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
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900/90 backdrop-blur-md border-r border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white font-bold text-lg">Admin Panel</h2>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm"
            />
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center text-sm ${
                showFavoritesOnly ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Star className="w-4 h-4 mr-1" />
              Favorites
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <nav className="space-y-1">
            {Object.entries(categorizedTabs).map(([category, tabs]) => (
              <div key={category} className="mb-4">
                <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2 px-2">
                  {category}
                </h3>
                <div className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isFavorite = favorites.some(fav => fav.id === tab.id);
                    return (
                      <div key={tab.id} className="flex items-center">
                        <button
                          onClick={() => {
                            setActiveTab(tab.id);
                            setSidebarOpen(false);
                          }}
                          className={`flex items-center flex-1 gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                            activeTab === tab.id
                              ? 'bg-purple-600 text-white'
                              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                        <button
                          onClick={() => toggleFavorite({
                            id: tab.id,
                            label: tab.label,
                            icon: tab.icon
                          })}
                          className="p-2 text-gray-400 hover:text-yellow-400"
                        >
                          {isFavorite ? (
                            <Star className="w-4 h-4 fill-current" />
                          ) : (
                            <Star className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden mr-3 text-gray-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-gray-400 hover:text-white"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
            
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user?.handle?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Notifications Panel */}
        {notificationsOpen && (
          <div className="absolute top-16 right-4 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Notifications</h3>
                <button 
                  onClick={() => setNotificationsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <p className="text-gray-400 text-center py-8">No new notifications</p>
            </div>
          </div>
        )}
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-7xl mx-auto">
            {/* WebSocket Status */}
            {webSocketManagerRef.current && (
              <div className="mb-4 flex items-center p-2 bg-gray-800/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mr-2 ${webSocketManagerRef.current.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-300">
                  {webSocketManagerRef.current.isConnected ? 'Real-time updates enabled' : 'Connecting to real-time updates...'}
                </span>
              </div>
            )}

            {/* Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <GlassPanel key={i} className="p-6 animate-pulse">
                        <div className="h-16 bg-white/10 rounded"></div>
                      </GlassPanel>
                    ))}
                  </div>
                ) : stats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <StatCard
                      title="Pending Moderations"
                      value={stats.pendingModerations}
                      icon={Shield}
                      color="bg-orange-500"
                    />
                    <StatCard
                      title="Seller Applications"
                      value={stats.pendingSellerApplications}
                      icon={ShoppingBag}
                      color="bg-blue-500"
                    />
                    <StatCard
                      title="Open Disputes"
                      value={stats.openDisputes}
                      icon={AlertTriangle}
                      color="bg-red-500"
                    />
                    <StatCard
                      title="Total Users"
                      value={stats.totalUsers.toLocaleString()}
                      icon={Users}
                      color="bg-green-500"
                    />
                    <StatCard
                      title="Total Sellers"
                      value={stats.totalSellers.toLocaleString()}
                      icon={ShoppingBag}
                      color="bg-purple-500"
                    />
                    <StatCard
                      title="Suspended Users"
                      value={stats.suspendedUsers}
                      icon={XCircle}
                      color="bg-gray-500"
                    />
                  </div>
                )}

                {/* Recent Actions */}
                <GlassPanel className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Recent Admin Actions</h2>
                    <Button variant="outline" size="small">
                      View All
                    </Button>
                  </div>
                  {stats?.recentActions && stats.recentActions.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recentActions.slice(0, 5).map((action, index) => (
                        <div key={index} className="flex items-center p-3 bg-white/5 rounded-lg">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm">
                              <span className="font-medium">{action.adminHandle}</span> {action.action}
                            </p>
                            <p className="text-gray-400 text-xs truncate">{action.reason}</p>
                          </div>
                          <span className="text-gray-400 text-xs ml-2 flex-shrink-0">
                            {new Date(action.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No recent actions</p>
                  )}
                </GlassPanel>

                {/* Quick Actions */}
                <GlassPanel className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {hasPermission('content.moderate') && (
                      <Button
                        onClick={() => setActiveTab('moderation')}
                        variant="outline"
                        className="flex items-center gap-2 justify-center"
                      >
                        <Shield className="w-4 h-4" />
                        Review Content
                      </Button>
                    )}
                    {hasPermission('marketplace.seller_review') && (
                      <Button
                        onClick={() => setActiveTab('sellers')}
                        variant="outline"
                        className="flex items-center gap-2 justify-center"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Review Sellers
                      </Button>
                    )}
                    {hasPermission('disputes.resolve') && (
                      <Button
                        onClick={() => setActiveTab('disputes')}
                        variant="outline"
                        className="flex items-center gap-2 justify-center"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Resolve Disputes
                      </Button>
                    )}
                    <Button
                      onClick={() => setActiveTab('analytics')}
                      variant="outline"
                      className="flex items-center gap-2 justify-center"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View Analytics
                    </Button>
                    <Button
                      onClick={() => setActiveTab('users')}
                      variant="outline"
                      className="flex items-center gap-2 justify-center"
                    >
                      <Users className="w-4 h-4" />
                      Manage Users
                    </Button>
                    <Button
                      onClick={() => setActiveTab('workflows')}
                      variant="outline"
                      className="flex items-center gap-2 justify-center"
                    >
                      <Settings className="w-4 h-4" />
                      Workflows
                    </Button>
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

            {activeTab === 'security' && hasPermission('system.security') && (
              <SecurityComplianceDashboard />
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
        </main>
      </div>
    </div>
  );
}