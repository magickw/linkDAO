import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  MessageCircle, 
  TrendingUp, 
  Clock, 
  Star, 
  Bookmark, 
  AlertCircle,
  CheckCircle,
  HelpCircle,
  User,
  Settings,
  Bell
} from 'lucide-react';

interface SupportItem {
  id: string;
  title: string;
  type: 'document' | 'ticket' | 'faq';
  category: string;
  lastAccessed?: Date;
  createdAt?: Date;
  status?: string;
  priority?: string;
}

const PersonalizedSupportDashboard: React.FC = () => {
  const [recentlyViewed, setRecentlyViewed] = useState<SupportItem[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<SupportItem[]>([]);
  const [openTickets, setOpenTickets] = useState<SupportItem[]>([]);
  const [suggestedArticles, setSuggestedArticles] = useState<SupportItem[]>([]);

  // Mock data - in a real implementation, this would come from an API
  useEffect(() => {
    // Simulate fetching user data
    const mockRecentlyViewed: SupportItem[] = [
      {
        id: '1',
        title: 'Complete Beginner\'s Guide',
        type: 'document',
        category: 'Getting Started',
        lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        id: '2',
        title: 'Wallet Setup Tutorial',
        type: 'document',
        category: 'Wallet',
        lastAccessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        id: '3',
        title: 'Security Best Practices',
        type: 'document',
        category: 'Security',
        lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      }
    ];

    const mockSavedDocuments: SupportItem[] = [
      {
        id: '4',
        title: 'DEX Trading Guide',
        type: 'document',
        category: 'Advanced',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      },
      {
        id: '5',
        title: 'Cross-Chain Bridge',
        type: 'document',
        category: 'Advanced',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      }
    ];

    const mockOpenTickets: SupportItem[] = [
      {
        id: '6',
        title: 'Issue with token transfer',
        type: 'ticket',
        category: 'Technical',
        status: 'In Progress',
        priority: 'High',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    ];

    const mockSuggestedArticles: SupportItem[] = [
      {
        id: '7',
        title: 'Staking Guide',
        type: 'document',
        category: 'LDAO Tokens'
      },
      {
        id: '8',
        title: 'Troubleshooting Guide',
        type: 'document',
        category: 'Troubleshooting'
      },
      {
        id: '9',
        title: 'Earn LDAO Tokens',
        type: 'document',
        category: 'LDAO Tokens'
      }
    ];

    setRecentlyViewed(mockRecentlyViewed);
    setSavedDocuments(mockSavedDocuments);
    setOpenTickets(mockOpenTickets);
    setSuggestedArticles(mockSuggestedArticles);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <BookOpen className="w-5 h-5" />;
      case 'ticket': return <MessageCircle className="w-5 h-5" />;
      case 'faq': return <HelpCircle className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'in progress': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'urgent': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Your Support Dashboard</h2>
        <button 
          onClick={() => console.log('View All clicked - would navigate to full dashboard')}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          aria-label="View all support dashboard items"
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recently Viewed */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Recently Viewed</h3>
          </div>
          {recentlyViewed.length > 0 ? (
            <div className="space-y-3">
              {recentlyViewed.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  role="button"
                  tabIndex={0}
                  onClick={() => console.log(`Opening ${item.title} - would navigate to document`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      console.log(`Opening ${item.title} - would navigate to document`);
                    }
                  }}
                  aria-label={`Open ${item.title} - ${item.category}`}
                >
                  <div className="p-2 bg-blue-50 rounded-lg mr-3" aria-hidden="true">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.category}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.lastAccessed && formatDate(item.lastAccessed)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No recently viewed documents</p>
            </div>
          )}
        </div>

        {/* Saved Documents */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <Bookmark className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Saved Documents</h3>
          </div>
          {savedDocuments.length > 0 ? (
            <div className="space-y-3">
              {savedDocuments.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="p-2 bg-green-50 rounded-lg mr-3">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.category}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.createdAt && formatDate(item.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Bookmark className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No saved documents</p>
            </div>
          )}
        </div>

        {/* Open Tickets */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <MessageCircle className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Open Tickets</h3>
          </div>
          {openTickets.length > 0 ? (
            <div className="space-y-3">
              {openTickets.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="p-2 bg-purple-50 rounded-lg mr-3">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      {item.status && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      )}
                      {item.priority && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.createdAt && formatDate(item.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No open tickets</p>
            </div>
          )}
        </div>

        {/* Suggested Articles */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <Star className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Suggested For You</h3>
          </div>
          {suggestedArticles.length > 0 ? (
            <div className="space-y-3">
              {suggestedArticles.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="p-2 bg-yellow-50 rounded-lg mr-3">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.category}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    <Star className="w-4 h-4 text-yellow-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Star className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No suggestions available</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button 
            onClick={() => console.log('Creating new support ticket')}
            className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Create new support ticket"
          >
            <HelpCircle className="w-6 h-6 text-blue-600 mb-2" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-900">New Ticket</span>
          </button>
          <button 
            onClick={() => console.log('Opening documentation browser')}
            className="flex flex-col items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Browse documentation"
          >
            <BookOpen className="w-6 h-6 text-green-600 mb-2" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-900">Browse Docs</span>
          </button>
          <button 
            onClick={() => console.log('Opening live chat')}
            className="flex flex-col items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label="Open live chat"
          >
            <MessageCircle className="w-6 h-6 text-purple-600 mb-2" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-900">Live Chat</span>
          </button>
          <button 
            onClick={() => console.log('Opening FAQ')}
            className="flex flex-col items-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            aria-label="View FAQ"
          >
            <Settings className="w-6 h-6 text-orange-600 mb-2" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-900">FAQ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalizedSupportDashboard;