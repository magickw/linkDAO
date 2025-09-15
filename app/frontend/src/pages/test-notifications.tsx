import React, { useState } from 'react';
import Layout from '@/components/Layout';
import NotificationSystem from '@/components/NotificationSystem';
import NotificationPreferences from '@/components/NotificationPreferences';
import RealTimeNotifications from '@/components/RealTimeNotifications';
import { notificationService } from '@/services/notificationService';
import { useNotifications } from '@/hooks/useNotifications';

export default function TestNotifications() {
  const [showPreferences, setShowPreferences] = useState(false);
  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  const simulateNotifications = () => {
    // Test the messaging notification service
    notificationService.testNotification();
  };

  const clearAllNotifications = () => {
    markAllAsRead();
  };

  return (
    <RealTimeNotifications>
      <Layout title="Test Notifications - LinkDAO">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Notification System Test
            </h1>

            <div className="space-y-6">
              {/* Current Status */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Current Status
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Notifications:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {notifications.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Unread Count:</span>
                    <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                      {unreadCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Test Actions */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Test Actions
                </h2>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={simulateNotifications}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                  >
                    Simulate Notifications
                  </button>
                  
                  <button
                    onClick={() => notificationService.testNotification()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                  >
                    Test Notification
                  </button>
                  
                  <button
                    onClick={clearAllNotifications}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Mark All Read
                  </button>
                  
                  <button
                    onClick={() => setShowPreferences(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                  >
                    Preferences
                  </button>
                </div>
              </div>

              {/* Notification Types Demo */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notification Types
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="font-medium text-blue-900 dark:text-blue-100">Messaging Notifications</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Wallet-to-wallet messaging system</div>
                  </div>
                  
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="font-medium text-purple-900 dark:text-purple-100">NFT Offers</div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">NFT negotiation notifications</div>
                  </div>
                  
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="font-medium text-green-900 dark:text-green-100">System Messages</div>
                    <div className="text-sm text-green-700 dark:text-green-300">System and reward notifications</div>
                  </div>
                  
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="font-medium text-orange-900 dark:text-orange-100">File Sharing</div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">File sharing notifications</div>
                  </div>
                </div>
              </div>

              {/* Recent Notifications List */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Notifications
                </h2>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No notifications yet. Try creating some using the buttons above!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border ${
                            notification.read
                              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {notification.message}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {notification.type} • {notification.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-2"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preferences Modal */}
        {showPreferences && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPreferences(false)}></div>
              
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              
              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                <NotificationPreferences onClose={() => setShowPreferences(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Notification System (floating) */}
        <NotificationSystem />
      </Layout>
    </RealTimeNotifications>
  );
}