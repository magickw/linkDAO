import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalTransactions: 0,
    totalProposals: 0,
    tvl: 0
  });

  const [systemStatus, setSystemStatus] = useState({
    backend: 'online',
    blockchain: 'synced',
    aiServices: 'operational'
  });

  useEffect(() => {
    // In a real implementation, we would fetch these metrics from the backend
    // For now, we'll use mock data
    setMetrics({
      totalUsers: 1243,
      totalPosts: 5678,
      totalTransactions: 2341,
      totalProposals: 42,
      tvl: 125000
    });
  }, []);

  return (
    <Layout title="Admin Dashboard - LinkDAO">
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
          
          {/* System Status */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">Backend API</h3>
                <p className={`mt-1 text-sm ${systemStatus.backend === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                  {systemStatus.backend}
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">Blockchain</h3>
                <p className={`mt-1 text-sm ${systemStatus.blockchain === 'synced' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {systemStatus.blockchain}
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">AI Services</h3>
                <p className={`mt-1 text-sm ${systemStatus.aiServices === 'operational' ? 'text-green-600' : 'text-red-600'}`}>
                  {systemStatus.aiServices}
                </p>
              </div>
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Key Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary-600">{metrics.totalUsers}</p>
                <p className="mt-1 text-sm text-gray-600">Total Users</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary-600">{metrics.totalPosts}</p>
                <p className="mt-1 text-sm text-gray-600">Total Posts</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary-600">{metrics.totalTransactions}</p>
                <p className="mt-1 text-sm text-gray-600">Transactions</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary-600">{metrics.totalProposals}</p>
                <p className="mt-1 text-sm text-gray-600">Proposals</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary-600">${metrics.tvl.toLocaleString()}</p>
                <p className="mt-1 text-sm text-gray-600">TVL (USD)</p>
              </div>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      New user registration
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      0x1234...5678
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      2 minutes ago
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      New post created
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      0x8765...4321
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      15 minutes ago
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Token transfer
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      0x5678...1234
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      1 hour ago
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}