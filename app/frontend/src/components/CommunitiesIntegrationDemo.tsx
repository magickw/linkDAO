import React from 'react';
import Link from 'next/link';
import { 
  Search, 
  Bell, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Filter,
  Sparkles,
  ArrowRight,
  CheckCircle,
  XCircle
} from 'lucide-react';

const CommunitiesIntegrationDemo: React.FC = () => {
  const features = [
    {
      category: 'Task 1-2: Enhanced Search & Notifications',
      items: [
        { name: 'Enhanced Search Interface', status: 'implemented', icon: <Search className="w-4 h-4" /> },
        { name: 'Real-time Notification System', status: 'implemented', icon: <Bell className="w-4 h-4" /> },
        { name: 'Trending Sidebar', status: 'implemented', icon: <TrendingUp className="w-4 h-4" /> }
      ]
    },
    {
      category: 'Task 3-4: Advanced Feed System',
      items: [
        { name: 'Advanced Feed System', status: 'implemented', icon: <MessageSquare className="w-4 h-4" /> },
        { name: 'Enhanced Feed Sorting', status: 'implemented', icon: <Filter className="w-4 h-4" /> },
        { name: 'Advanced Feed Filters', status: 'implemented', icon: <Filter className="w-4 h-4" /> },
        { name: 'Infinite Scroll Feed', status: 'implemented', icon: <ArrowRight className="w-4 h-4" /> }
      ]
    },
    {
      category: 'Task 5: Advanced Navigation',
      items: [
        { name: 'Advanced Navigation Sidebar', status: 'implemented', icon: <Users className="w-4 h-4" /> },
        { name: 'Smart Right Sidebar', status: 'implemented', icon: <Users className="w-4 h-4" /> },
        { name: 'Quick Filter Panel', status: 'implemented', icon: <Filter className="w-4 h-4" /> },
        { name: 'Activity Indicators', status: 'implemented', icon: <Bell className="w-4 h-4" /> }
      ]
    },
    {
      category: 'Task 8: Error Handling & UX',
      items: [
        { name: 'Error Boundary System', status: 'implemented', icon: <CheckCircle className="w-4 h-4" /> },
        { name: 'User Feedback Components', status: 'partial', icon: <CheckCircle className="w-4 h-4" /> },
        { name: 'Tooltip Guide System', status: 'partial', icon: <CheckCircle className="w-4 h-4" /> },
        { name: 'Success Confirmations', status: 'partial', icon: <CheckCircle className="w-4 h-4" /> }
      ]
    },
    {
      category: 'Task 9: Visual Polish',
      items: [
        { name: 'Visual Polish Integration', status: 'implemented', icon: <Sparkles className="w-4 h-4" /> },
        { name: 'Glassmorphism Effects', status: 'implemented', icon: <Sparkles className="w-4 h-4" /> },
        { name: 'Loading Skeletons', status: 'implemented', icon: <Sparkles className="w-4 h-4" /> }
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <CheckCircle className="w-5 h-5 text-yellow-500" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'implemented':
        return 'Fully Integrated';
      case 'partial':
        return 'Partially Integrated';
      case 'missing':
        return 'Not Integrated';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Enhanced Communities Page
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Integration of Tasks 1-8 Features into Communities Experience
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/communities">
              <button className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors">
                View Original Communities
              </button>
            </Link>
            <Link href="/communities-enhanced">
              <button className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg">
                View Enhanced Communities
              </button>
            </Link>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Before */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <XCircle className="w-6 h-6 text-red-500 mr-2" />
              Before Enhancement
            </h2>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Basic mobile Web3 components only
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Simple sidebar with community list
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Basic post feed with limited functionality
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                No advanced search or filtering
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Limited error handling
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Basic visual design
              </li>
            </ul>
          </div>

          {/* After */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
              After Enhancement
            </h2>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Advanced search with filters and suggestions
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Real-time notifications and activity indicators
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Intelligent feed with Web3 metrics sorting
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Smart right sidebar with trending content
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Comprehensive error handling and recovery
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Modern glassmorphism design with animations
              </li>
            </ul>
          </div>
        </div>

        {/* Feature Status */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
            Integration Status
          </h2>
          
          {features.map((category, categoryIndex) => (
            <div 
              key={categoryIndex}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {category.category}
                </h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item, itemIndex) => (
                    <div 
                      key={itemIndex}
                      className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-700/80 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white dark:bg-gray-600 rounded-lg">
                          {item.icon}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(item.status)}
                        <span className={`text-sm font-medium ${
                          item.status === 'implemented' ? 'text-green-600 dark:text-green-400' :
                          item.status === 'partial' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {getStatusText(item.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key Improvements */}
        <div className="mt-12 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Key Improvements
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Enhanced Discovery
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Advanced search with filters, suggestions, and trending content discovery
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Real-time Updates
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Live notifications, activity indicators, and real-time feed updates
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Modern Design
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Glassmorphism effects, smooth animations, and responsive design
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <Link href="/communities-enhanced">
            <button className="px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-bold text-lg rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto">
              <span>Experience Enhanced Communities</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CommunitiesIntegrationDemo;