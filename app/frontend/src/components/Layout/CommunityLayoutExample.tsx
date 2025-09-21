import React from 'react';
import CommunityLayout from './CommunityLayout';

/**
 * Example usage of CommunityLayout component
 * This demonstrates the three-column responsive layout in action
 */
export default function CommunityLayoutExample() {
  const leftSidebar = (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white">Navigation</h3>
      <nav className="space-y-2">
        <a href="#" className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          Home
        </a>
        <a href="#" className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          Popular
        </a>
        <a href="#" className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          Communities
        </a>
        <a href="#" className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          Governance
        </a>
      </nav>
      
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Filters</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Discussion</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Question</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Announcement</span>
          </label>
        </div>
      </div>
    </div>
  );

  const rightSidebar = (
    <div className="space-y-4">
      {/* About Community Widget */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">About Community</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          A community for discussing Web3 development, DeFi protocols, and blockchain technology.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Members</span>
            <span className="font-medium text-gray-900 dark:text-white">12.5k</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Online</span>
            <span className="font-medium text-gray-900 dark:text-white">234</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Created</span>
            <span className="font-medium text-gray-900 dark:text-white">Jan 2023</span>
          </div>
        </div>
      </div>

      {/* Community Stats Widget */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Community Stats</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Posts this week</span>
              <span className="font-medium text-gray-900 dark:text-white">47</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Active discussions</span>
              <span className="font-medium text-gray-900 dark:text-white">23</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Moderators Widget */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Moderators</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-white">A</span>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">alice.eth</span>
            <span className="text-xs text-green-600 dark:text-green-400">online</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-secondary-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-white">B</span>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">bob.eth</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">2h ago</span>
          </div>
        </div>
      </div>
    </div>
  );

  const mainContent = (
    <div className="space-y-6">
      {/* Sorting Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button className="border-b-2 border-primary-500 py-4 px-1 text-sm font-medium text-primary-600 dark:text-primary-400">
              Best
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              Hot
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              New
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              Top
            </button>
          </nav>
        </div>
      </div>

      {/* Sample Posts */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex space-x-4">
            {/* Vote Section */}
            <div className="flex flex-col items-center space-y-1">
              <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{42 + i}</span>
              <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Post Content */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span>Posted by u/developer{i}</span>
                <span>•</span>
                <span>{i + 2} hours ago</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Discussion
                </span>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Sample Post Title {i}: Understanding DeFi Protocols
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This is a sample post content that demonstrates how the Reddit-style layout works. 
                The post includes voting arrows, metadata, and content preview...
              </p>

              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <button className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{12 + i} comments</span>
                </button>
                <button className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>Share</span>
                </button>
                <button className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reddit-Style Community Layout Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Responsive three-column layout with collapsible sidebars
          </p>
        </div>
      </div>
      
      <CommunityLayout
        leftSidebar={leftSidebar}
        rightSidebar={rightSidebar}
        className="px-4"
      >
        {mainContent}
      </CommunityLayout>
    </div>
  );
}