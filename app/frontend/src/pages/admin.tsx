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
  MessageSquare
} from 'lucide-react';

const AdminPage: NextPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-gray-400">
            Administrative dashboard for LinkDAO platform management.
          </p>
        </div>

        {/* Simple Admin Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Users Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Users</h3>
            </div>
            <p className="text-gray-300 mb-4">Manage user accounts and permissions</p>
            <div className="text-2xl font-bold text-white">1,234</div>
            <p className="text-sm text-gray-400">Total users</p>
          </div>

          {/* Moderation Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-green-400" />
              <h3 className="text-xl font-bold text-white">Moderation</h3>
            </div>
            <p className="text-gray-300 mb-4">Review flagged content and reports</p>
            <div className="text-2xl font-bold text-white">23</div>
            <p className="text-sm text-gray-400">Pending reviews</p>
          </div>

          {/* Sellers Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingBag className="w-8 h-8 text-purple-400" />
              <h3 className="text-xl font-bold text-white">Sellers</h3>
            </div>
            <p className="text-gray-300 mb-4">Manage seller applications</p>
            <div className="text-2xl font-bold text-white">45</div>
            <p className="text-sm text-gray-400">Active sellers</p>
          </div>

          {/* Disputes Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
              <h3 className="text-xl font-bold text-white">Disputes</h3>
            </div>
            <p className="text-gray-300 mb-4">Handle transaction disputes</p>
            <div className="text-2xl font-bold text-white">7</div>
            <p className="text-sm text-gray-400">Open disputes</p>
          </div>

          {/* Analytics Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-8 h-8 text-indigo-400" />
              <h3 className="text-xl font-bold text-white">Analytics</h3>
            </div>
            <p className="text-gray-300 mb-4">Platform performance metrics</p>
            <div className="text-2xl font-bold text-white">98.5%</div>
            <p className="text-sm text-gray-400">Uptime</p>
          </div>

          {/* Settings Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-8 h-8 text-gray-400" />
              <h3 className="text-xl font-bold text-white">Settings</h3>
            </div>
            <p className="text-gray-300 mb-4">Platform configuration</p>
            <div className="text-2xl font-bold text-white">12</div>
            <p className="text-sm text-gray-400">Active configs</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;