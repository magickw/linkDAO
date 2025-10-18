import React, { useState } from 'react';
import { X, Search, Plus, BarChart3, Users, Shield, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

interface WidgetType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  preview?: string;
}

interface MobileWidgetSelectorProps {
  onClose: () => void;
  onAddWidget: (widgetType: string) => void;
}

export const MobileWidgetSelector: React.FC<MobileWidgetSelectorProps> = ({
  onClose,
  onAddWidget
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Available widget types
  const widgetTypes: WidgetType[] = [
    {
      id: 'user-stats',
      name: 'User Statistics',
      description: 'Display active users, registrations, and user metrics',
      icon: Users,
      category: 'metrics',
      preview: '1,234 Active Users'
    },
    {
      id: 'moderation-queue',
      name: 'Moderation Queue',
      description: 'Show pending content reviews and moderation tasks',
      icon: Shield,
      category: 'alerts',
      preview: '12 Pending Reviews'
    },
    {
      id: 'system-alerts',
      name: 'System Alerts',
      description: 'Critical system notifications and warnings',
      icon: AlertTriangle,
      category: 'alerts',
      preview: '2 Critical Alerts'
    },
    {
      id: 'performance-chart',
      name: 'Performance Chart',
      description: 'Real-time system performance metrics',
      icon: BarChart3,
      category: 'charts',
      preview: 'CPU: 45%, Memory: 62%'
    },
    {
      id: 'recent-activity',
      name: 'Recent Activity',
      description: 'Latest admin actions and system events',
      icon: Clock,
      category: 'tables',
      preview: '15 Recent Actions'
    },
    {
      id: 'growth-metrics',
      name: 'Growth Metrics',
      description: 'User growth and engagement trends',
      icon: TrendingUp,
      category: 'charts',
      preview: '+12% This Week'
    }
  ];

  // Categories
  const categories = [
    { id: 'all', label: 'All Widgets' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'charts', label: 'Charts' },
    { id: 'tables', label: 'Tables' },
    { id: 'alerts', label: 'Alerts' }
  ];

  // Filter widgets
  const filteredWidgets = widgetTypes.filter(widget => {
    const matchesSearch = widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         widget.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || widget.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Widget</h2>
            <p className="text-sm text-gray-500">Choose a widget to add to your dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search widgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 border-b">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Widget List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredWidgets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredWidgets.map((widget) => {
                const Icon = widget.icon;
                return (
                  <button
                    key={widget.id}
                    onClick={() => onAddWidget(widget.id)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left group"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-gray-100 group-hover:bg-purple-100 rounded-lg transition-colors">
                        <Icon className="w-5 h-5 text-gray-600 group-hover:text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 group-hover:text-purple-900 transition-colors">
                          {widget.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {widget.description}
                        </p>
                        {widget.preview && (
                          <p className="text-xs text-purple-600 mt-2 font-medium">
                            Preview: {widget.preview}
                          </p>
                        )}
                      </div>
                      <Plus className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets found</h3>
              <p className="text-gray-500">
                {searchTerm
                  ? `No widgets match "${searchTerm}"`
                  : 'No widgets available in this category'
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {filteredWidgets.length} widget{filteredWidgets.length !== 1 ? 's' : ''} available
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Mobile-specific styles */
        @media (max-width: 640px) {
          .bg-white {
            border-radius: 16px 16px 0 0;
            margin-bottom: 0;
          }
        }

        /* Animation */
        .bg-white {
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (min-width: 640px) {
          .bg-white {
            animation: fadeIn 0.3s ease-out;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        }
      `}</style>
    </div>
  );
};