import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { usePermissions } from '@/hooks/useAuth';
import { adminService } from '@/services/adminService';
import { EnhancedMobileAdminLayout } from './EnhancedMobileAdminLayout';
import { 
  Users, 
  Shield, 
  AlertTriangle, 
  ShoppingBag, 
  BarChart3, 
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  RefreshCw,
  Download,
  Zap
} from 'lucide-react';

interface AdminStats {
  pendingModerations: number;
  pendingSellerApplications: number;
  openDisputes: number;
  suspendedUsers: number;
  totalUsers: number;
  totalSellers: number;
  recentActions: any[];
}

export const EnhancedMobileDashboard: React.FC = () => {
  const router = useRouter();
  const { isAdmin, hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pullToRefreshRef = useRef<HTMLDivElement>(null);
  const [pullToRefreshPosition, setPullToRefreshPosition] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/');
      return;
    }
    
    loadStats();
  }, [isAdmin, router]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  // Pull to refresh implementation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || window.scrollY > 0) return;
    
    const touch = e.touches[0];
    const pullDistance = Math.max(0, Math.min(touch.clientY, 100));
    setPullToRefreshPosition(pullDistance);
  };

  const handleTouchEnd = () => {
    if (pullToRefreshPosition > 60) {
      handleRefresh();
    }
    setIsPulling(false);
    setPullToRefreshPosition(0);
  };

  if (!isAdmin()) {
    return null;
  }

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'overview': return 'Admin Dashboard';
      case 'moderation': return 'Content Moderation';
      case 'analytics': return 'Analytics';
      case 'users': return 'User Management';
      case 'sellers': return 'Seller Applications';
      case 'disputes': return 'Dispute Resolution';
      case 'history': return 'Moderation History';
      default: return 'Admin Dashboard';
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    onClick 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType; 
    color: string; 
    onClick?: () => void; 
  }) => (
    <div
      className={`bg-white/10 backdrop-blur-md rounded-lg p-4 ${onClick ? 'cursor-pointer hover:bg-white/15' : ''} transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-300 text-xs truncate">{title}</p>
          <p className="text-white text-lg font-bold mt-1">{value}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`}></div>
        <div className={`p-2 rounded-lg ${color} flex-shrink-0 ml-2`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <EnhancedMobileAdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={getTabTitle(activeTab)}
      onRefresh={handleRefresh}
    >
      {/* Pull to Refresh Indicator */}
      {isPulling && (
        <div 
          className="flex justify-center py-2 -mt-8"
          style={{ transform: `translateY(${pullToRefreshPosition}px)` }}
        >
          <RefreshCw className={`w-6 h-6 text-white ${pullToRefreshPosition > 60 ? 'animate-spin' : ''}`} />
        </div>
      )}
      
      <div 
        className="space-y-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Quick Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-lg p-4 animate-pulse">
                <div className="h-16 bg-white/10 rounded"></div>
              </div>
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Pending Reviews"
              value={stats.pendingModerations}
              icon={Shield}
              color="bg-orange-500"
              onClick={() => setActiveTab('moderation')}
            />
            <StatCard
              title="Seller Apps"
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
            />
            <StatCard
              title="Suspended"
              value={stats.suspendedUsers}
              icon={XCircle}
              color="bg-gray-500"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-4 text-white flex flex-col items-center justify-center">
            <Zap className="w-8 h-8 mb-2" />
            <span className="font-medium">Quick Actions</span>
          </button>
          <button className="bg-gradient-to-r from-green-500 to-teal-500 rounded-lg p-4 text-white flex flex-col items-center justify-center">
            <Download className="w-8 h-8 mb-2" />
            <span className="font-medium">Export Data</span>
          </button>
        </div>

        {/* Recent Actions */}
        {stats?.recentActions && stats.recentActions.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Recent Actions</h3>
            <div className="space-y-3">
              {stats.recentActions.slice(0, 5).map((action, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">
                      <span className="font-medium">{action.adminHandle}</span> {action.action}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">{action.reason}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats Summary */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Today's Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                <span className="text-white text-sm">Completed</span>
              </div>
              <p className="text-xl font-bold text-white mt-1">24</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-400 mr-2" />
                <span className="text-white text-sm">Pending</span>
              </div>
              <p className="text-xl font-bold text-white mt-1">8</p>
            </div>
          </div>
        </div>
      </div>
    </EnhancedMobileAdminLayout>
  );
};