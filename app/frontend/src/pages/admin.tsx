import React, { useState } from 'react';
import { NextPage } from 'next';
import {
  Shield,
  Users,
  AlertTriangle,
  ShoppingBag,
  BarChart3,
  Settings,
  FileText,
  MessageSquare,
  Eye,
  TrendingUp,
  Globe
} from 'lucide-react';
import { VisitorAnalytics } from '@/components/Admin/VisitorAnalytics';
import { AdminAnalytics } from '@/components/Admin/AdminAnalytics';
import { SellerApplications } from '@/components/Admin/SellerApplications';
import { SellerPerformance } from '@/components/Admin/SellerPerformance';
import { DisputeResolution } from '@/components/Admin/DisputeResolution';
import { UserManagement } from '@/components/Admin/UserManagement';

type AdminSection = 'dashboard' | 'users' | 'moderation' | 'sellers' | 'seller-performance' | 'disputes' | 'analytics' | 'visitor-analytics' | 'settings';

const AdminPage: NextPage = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  const navigationItems = [
    { id: 'dashboard' as AdminSection, label: 'Dashboard', icon: Shield, color: 'text-purple-400' },
    { id: 'users' as AdminSection, label: 'Users', icon: Users, color: 'text-blue-400' },
    { id: 'visitor-analytics' as AdminSection, label: 'Visitor Analytics', icon: Eye, color: 'text-green-400' },
    { id: 'analytics' as AdminSection, label: 'Platform Analytics', icon: BarChart3, color: 'text-indigo-400' },
    { id: 'moderation' as AdminSection, label: 'Moderation', icon: Shield, color: 'text-green-400' },
    { id: 'sellers' as AdminSection, label: 'Seller Applications', icon: ShoppingBag, color: 'text-purple-400' },
    { id: 'seller-performance' as AdminSection, label: 'Seller Performance', icon: TrendingUp, color: 'text-emerald-400' },
    { id: 'disputes' as AdminSection, label: 'Dispute Resolution', icon: AlertTriangle, color: 'text-yellow-400' },
    { id: 'settings' as AdminSection, label: 'Settings', icon: Settings, color: 'text-gray-400' }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'visitor-analytics':
        return <VisitorAnalytics />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'users':
        return <UserManagement />;
      case 'moderation':
        return <ModerationSection />;
      case 'sellers':
        return <SellerApplications />;
      case 'seller-performance':
        return <SellerPerformance />;
      case 'disputes':
        return <DisputeResolution />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-black/20 backdrop-blur-md border-b md:border-r border-white/10 md:min-h-screen">
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-8">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 flex-shrink-0" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">Admin Panel</h1>
                <p className="text-xs sm:text-sm text-gray-400">LinkDAO Management</p>
              </div>
            </div>

            <nav className="space-y-1 sm:space-y-2 overflow-x-auto md:overflow-x-visible">
              <div className="flex md:flex-col gap-1 sm:gap-2 pb-2 md:pb-0">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-left transition-colors whitespace-nowrap min-w-fit ${
                        activeSection === item.id
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${activeSection === item.id ? item.color : ''}`} />
                      <span className="text-sm sm:text-base">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Dashboard Overview Component
const DashboardOverview: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-400">
          Administrative dashboard for LinkDAO platform management.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-bold text-white">Users</h3>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">1,234</div>
          <p className="text-xs sm:text-sm text-gray-400">Total users</p>
          <div className="flex items-center gap-1 mt-2 text-green-400 text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            +12.5% this week
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-bold text-white">Visitors</h3>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">8,923</div>
          <p className="text-xs sm:text-sm text-gray-400">This week</p>
          <div className="flex items-center gap-1 mt-2 text-green-400 text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            +8.3% vs last week
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-bold text-white">Sales</h3>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">$45.2k</div>
          <p className="text-xs sm:text-sm text-gray-400">This month</p>
          <div className="flex items-center gap-1 mt-2 text-green-400 text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            +15.7% vs last month
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-bold text-white">Uptime</h3>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">99.9%</div>
          <p className="text-xs sm:text-sm text-gray-400">Last 30 days</p>
          <div className="flex items-center gap-1 mt-2 text-green-400 text-xs sm:text-sm">
            <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
            All systems operational
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/20">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Recent Activity</h3>
        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-300 truncate">New user registered: alice.eth</span>
            </div>
            <span className="text-[10px] sm:text-sm text-gray-400 ml-6 sm:ml-auto flex-shrink-0">2 minutes ago</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-300 truncate">Seller application approved: NFT Store</span>
            </div>
            <span className="text-[10px] sm:text-sm text-gray-400 ml-6 sm:ml-auto flex-shrink-0">15 minutes ago</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-300 truncate">Dispute resolved: Order #1234</span>
            </div>
            <span className="text-[10px] sm:text-sm text-gray-400 ml-6 sm:ml-auto flex-shrink-0">1 hour ago</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-300 truncate">Visitor analytics updated: 142 active users</span>
            </div>
            <span className="text-[10px] sm:text-sm text-gray-400 ml-6 sm:ml-auto flex-shrink-0">5 minutes ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other sections

const ModerationSection: React.FC = () => (
  <div className="space-y-4 sm:space-y-6">
    <h1 className="text-2xl sm:text-3xl font-bold text-white">Content Moderation</h1>
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/20">
      <p className="text-sm sm:text-base text-gray-300">Moderation queue and tools coming soon...</p>
    </div>
  </div>
);

const SettingsSection: React.FC = () => (
  <div className="space-y-4 sm:space-y-6">
    <h1 className="text-2xl sm:text-3xl font-bold text-white">Platform Settings</h1>
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/20">
      <p className="text-sm sm:text-base text-gray-300">Platform configuration settings coming soon...</p>
    </div>
  </div>
);

export default AdminPage;