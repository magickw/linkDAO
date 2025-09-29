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

type AdminSection = 'dashboard' | 'users' | 'moderation' | 'sellers' | 'disputes' | 'analytics' | 'visitor-analytics' | 'settings';

const AdminPage: NextPage = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  const navigationItems = [
    { id: 'dashboard' as AdminSection, label: 'Dashboard', icon: Shield, color: 'text-purple-400' },
    { id: 'users' as AdminSection, label: 'Users', icon: Users, color: 'text-blue-400' },
    { id: 'visitor-analytics' as AdminSection, label: 'Visitor Analytics', icon: Eye, color: 'text-green-400' },
    { id: 'analytics' as AdminSection, label: 'Platform Analytics', icon: BarChart3, color: 'text-indigo-400' },
    { id: 'moderation' as AdminSection, label: 'Moderation', icon: Shield, color: 'text-green-400' },
    { id: 'sellers' as AdminSection, label: 'Sellers', icon: ShoppingBag, color: 'text-purple-400' },
    { id: 'disputes' as AdminSection, label: 'Disputes', icon: AlertTriangle, color: 'text-yellow-400' },
    { id: 'settings' as AdminSection, label: 'Settings', icon: Settings, color: 'text-gray-400' }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'visitor-analytics':
        return <VisitorAnalytics />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'users':
        return <UserManagementSection />;
      case 'moderation':
        return <ModerationSection />;
      case 'sellers':
        return <SellersSection />;
      case 'disputes':
        return <DisputesSection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-black/20 backdrop-blur-md border-r border-white/10 min-h-screen">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                <p className="text-sm text-gray-400">LinkDAO Management</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeSection === item.id
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${activeSection === item.id ? item.color : ''}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Dashboard Overview Component
const DashboardOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">
          Administrative dashboard for LinkDAO platform management.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-blue-400" />
            <h3 className="text-xl font-bold text-white">Users</h3>
          </div>
          <div className="text-2xl font-bold text-white">1,234</div>
          <p className="text-sm text-gray-400">Total users</p>
          <div className="flex items-center gap-1 mt-2 text-green-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            +12.5% this week
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-8 h-8 text-green-400" />
            <h3 className="text-xl font-bold text-white">Visitors</h3>
          </div>
          <div className="text-2xl font-bold text-white">8,923</div>
          <p className="text-sm text-gray-400">This week</p>
          <div className="flex items-center gap-1 mt-2 text-green-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            +8.3% vs last week
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="w-8 h-8 text-purple-400" />
            <h3 className="text-xl font-bold text-white">Sales</h3>
          </div>
          <div className="text-2xl font-bold text-white">$45.2k</div>
          <p className="text-sm text-gray-400">This month</p>
          <div className="flex items-center gap-1 mt-2 text-green-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            +15.7% vs last month
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-8 h-8 text-indigo-400" />
            <h3 className="text-xl font-bold text-white">Uptime</h3>
          </div>
          <div className="text-2xl font-bold text-white">99.9%</div>
          <p className="text-sm text-gray-400">Last 30 days</p>
          <div className="flex items-center gap-1 mt-2 text-green-400 text-sm">
            <Globe className="w-4 h-4" />
            All systems operational
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-gray-300">New user registered: alice.eth</span>
            <span className="text-sm text-gray-400 ml-auto">2 minutes ago</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <ShoppingBag className="w-5 h-5 text-purple-400" />
            <span className="text-gray-300">Seller application approved: NFT Store</span>
            <span className="text-sm text-gray-400 ml-auto">15 minutes ago</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-300">Dispute resolved: Order #1234</span>
            <span className="text-sm text-gray-400 ml-auto">1 hour ago</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <Eye className="w-5 h-5 text-green-400" />
            <span className="text-gray-300">Visitor analytics updated: 142 active users</span>
            <span className="text-sm text-gray-400 ml-auto">5 minutes ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other sections
const UserManagementSection: React.FC = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-white">User Management</h1>
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <p className="text-gray-300">User management interface coming soon...</p>
    </div>
  </div>
);

const ModerationSection: React.FC = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-white">Content Moderation</h1>
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <p className="text-gray-300">Moderation queue and tools coming soon...</p>
    </div>
  </div>
);

const SellersSection: React.FC = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-white">Seller Management</h1>
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <p className="text-gray-300">Seller applications and management coming soon...</p>
    </div>
  </div>
);

const DisputesSection: React.FC = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-white">Dispute Resolution</h1>
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <p className="text-gray-300">Dispute management system coming soon...</p>
    </div>
  </div>
);

const SettingsSection: React.FC = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <p className="text-gray-300">Platform configuration settings coming soon...</p>
    </div>
  </div>
);

export default AdminPage;