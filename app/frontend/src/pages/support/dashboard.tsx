import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Search, 
  MessageCircle, 
  Book, 
  Video, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle, 
  Award, 
  Shield, 
  Users, 
  Zap, 
  ChevronRight,
  HelpCircle,
  TrendingUp,
  FileText,
  Lightbulb,
  AlertCircle,
  Ticket,
  BarChart,
  User,
  Settings,
  Bell
} from 'lucide-react';
import SupportDocuments from '@/components/Support/SupportDocuments';
import { SupportTicketDashboard } from '@/components/Support/SupportTicketDashboard';
import LDAOSupportCenter from '@/components/Support/LDAOSupportCenter';
import PersonalizedSupportDashboard from '@/components/Support/PersonalizedSupportDashboard';
import SupportAnalyticsDashboard from '@/components/Support/SupportAnalyticsDashboard';

const SupportDashboard: NextPage = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tickets' | 'analytics'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for support metrics
  const supportMetrics = [
    { title: 'Open Tickets', value: '12', change: '+2', icon: Ticket },
    { title: 'Avg. Response Time', value: '2.4h', change: '-0.3h', icon: Clock },
    { title: 'Resolution Rate', value: '92%', change: '+3%', icon: CheckCircle },
    { title: 'Satisfaction Score', value: '4.8/5', change: '+0.1', icon: Award },
  ];

  const quickActions = [
    { title: 'Create Ticket', href: '/support/tickets/new', icon: Ticket, color: 'blue' },
    { title: 'Browse Docs', href: '/support/documents', icon: Book, color: 'green' },
    { title: 'Live Chat', href: '/support/live-chat', icon: MessageCircle, color: 'purple' },
    { title: 'Contact Us', href: '/support/contact', icon: Mail, color: 'orange' },
  ];

  return (
    <>
      <Head>
        <title>Support Dashboard - LinkDAO</title>
        <meta name="description" content="Comprehensive support dashboard for LinkDAO users" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/support" className="flex items-center">
                  <HelpCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">LinkDAO Support</h1>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search support..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart },
                { id: 'documents', label: 'Documents', icon: Book },
                { id: 'tickets', label: 'Tickets', icon: Ticket },
                { id: 'analytics', label: 'Analytics', icon: BarChart },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Personalized Dashboard */}
              <PersonalizedSupportDashboard />
                            
              {/* Support Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {supportMetrics.map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.title}</p>
                          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">{metric.value}</p>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
                          <ChevronRight className="w-4 h-4 mr-1 rotate-90" />
                          {metric.change}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={index}
                        href={action.href}
                        className={`flex items-center p-4 bg-${action.color}-50 dark:bg-${action.color}-900/20 rounded-lg hover:bg-${action.color}-100 dark:hover:bg-${action.color}-900/30 transition-colors group`}
                      >
                        <div className={`p-2 bg-${action.color}-100 dark:bg-${action.color}-900/30 rounded-lg mr-4`}>
                          <Icon className={`w-5 h-5 text-${action.color}-600 dark:text-${action.color}-400`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {action.title}
                          </h3>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Recent Tickets */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Tickets</h2>
                  <Link href="/support/tickets" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
                    View all
                  </Link>
                </div>
                <SupportTicketDashboard />
              </div>

              {/* Popular Documents */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Popular Documents</h2>
                  <Link href="/support/documents" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
                    Browse all
                  </Link>
                </div>
                <SupportDocuments />
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Support Documents</h2>
              <SupportDocuments />
            </div>
          )}

          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Support Tickets</h2>
                <Link 
                  href="/support/tickets/new" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  Create Ticket
                </Link>
              </div>
              <SupportTicketDashboard />
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
              <SupportAnalyticsDashboard />
            </div>
          )}
                  <div className="space-y-4">
                    {[
                      { category: 'Technical Issues', count: 42, percentage: 35 },
                      { category: 'Account Access', count: 38, percentage: 32 },
                      { category: 'Token Questions', count: 25, percentage: 21 },
                      { category: 'Other', count: 15, percentage: 12 },
                    ].map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-300">{item.category}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{item.count} ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Response Time Trends</h3>
                  <div className="space-y-4">
                    {[
                      { day: 'Monday', time: '2.1h' },
                      { day: 'Tuesday', time: '1.8h' },
                      { day: 'Wednesday', time: '2.3h' },
                      { day: 'Thursday', time: '1.9h' },
                      { day: 'Friday', time: '2.5h' },
                      { day: 'Saturday', time: '3.2h' },
                      { day: 'Sunday', time: '2.8h' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">{item.day}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SupportDashboard;