import React, { useState } from 'react';

interface Web3SocialNavProps {
  activeTab: 'hot' | 'new' | 'top' | 'rising';
  onTabChange: (tab: 'hot' | 'new' | 'top' | 'rising') => void;
  timeFilter: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  onTimeFilterChange: (filter: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all') => void;
}

export default function Web3SocialNav({ activeTab, onTabChange, timeFilter, onTimeFilterChange }: Web3SocialNavProps) {
  const [showTimeFilter, setShowTimeFilter] = useState(false);

  const tabs = [
    { id: 'hot', label: 'Hot', icon: '🔥' },
    { id: 'new', label: 'New', icon: '🆕' },
    { id: 'top', label: 'Top', icon: '🏆' },
    { id: 'rising', label: 'Rising', icon: '📈' },
  ];

  const timeFilters = [
    { id: 'hour', label: 'Past Hour' },
    { id: 'day', label: 'Past 24 Hours' },
    { id: 'week', label: 'Past Week' },
    { id: 'month', label: 'Past Month' },
    { id: 'year', label: 'Past Year' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-full ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowTimeFilter(!showTimeFilter)}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <span>{timeFilters.find(f => f.id === timeFilter)?.label || 'Time Filter'}</span>
            <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showTimeFilter && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
              {timeFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => {
                    onTimeFilterChange(filter.id as any);
                    setShowTimeFilter(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    timeFilter === filter.id
                      ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}