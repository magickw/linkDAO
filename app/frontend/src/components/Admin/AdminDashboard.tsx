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
  Phone
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

export function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, hasPermission, user } = usePermissions();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const webSocketManagerRef = useRef<any>(null);

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

  if (!isAdmin()) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, permission: null },
    { id: 'moderation', label: 'Moderation', icon: Shield, permission: 'content.moderate' },
    { id: 'history', label: 'Mod History', icon: History, permission: 'system.audit' },
    { id: 'audit', label: 'Audit System', icon: FileText, permission: 'system.audit' },
    { id: 'notifications', label: 'Notifications', icon: Bell, permission: null },
    { id: 'push-setup', label: 'Push Setup', icon: Phone, permission: null },
    { id: 'sellers', label: 'Seller Applications', icon: ShoppingBag, permission: 'marketplace.seller_review' },
    { id: 'performance', label: 'Seller Performance', icon: TrendingUp, permission: 'marketplace.seller_view' },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle, permission: 'disputes.view' },
    { id: 'users', label: 'User Management', icon: Users, permission: 'users.view' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, permission: 'system.analytics' },
  ].filter(tab => !tab.permission || hasPermission(tab.permission));

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <GlassPanel className="p-4 sm:p-6">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Manage platform operations and user activities</p>
          {webSocketManagerRef.current && (
            <div className="flex items-center mt-2">
              <div className={`w-3 h-3 rounded-full mr-2 ${webSocketManagerRef.current.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-300">
                {webSocketManagerRef.current.isConnected ? 'Real-time updates enabled' : 'Connecting to real-time updates...'}
              </span>
            </div>
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
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
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
            <GlassPanel className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Recent Admin Actions</h2>
              {stats?.recentActions && stats.recentActions.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {stats.recentActions.slice(0, 10).map((action, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-white/5 rounded-lg gap-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                        <div className="min-w-0">
                          <p className="text-white text-xs sm:text-sm">
                            <span className="font-medium">{action.adminHandle}</span> {action.action}
                          </p>
                          <p className="text-gray-400 text-[10px] sm:text-xs truncate">{action.reason}</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-[10px] sm:text-xs ml-4 sm:ml-0 flex-shrink-0">
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
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

        {activeTab === 'disputes' && hasPermission('disputes.view') && (
          <DisputeResolution />
        )}

        {activeTab === 'users' && hasPermission('users.view') && (
          <UserManagement />
        )}

        {activeTab === 'analytics' && hasPermission('system.analytics') && (
          <AdminAnalytics />
        )}
      </div>
    </div>
  );
}