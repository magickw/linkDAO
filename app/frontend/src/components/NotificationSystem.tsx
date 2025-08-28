import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWeb3 } from '@/context/Web3Context';

interface Notification {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'mention';
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function NotificationSystem() {
  const { isConnected } = useWebSocket();
  const { address } = useWeb3();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visible, setVisible] = useState(false);

  // Mock notifications for demo purposes
  useEffect(() => {
    if (address && isConnected) {
      // In a real implementation, we would receive notifications via WebSocket
      // For now, we'll simulate receiving notifications
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'follow',
          message: 'Alex Johnson followed you',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          read: false,
        },
        {
          id: '2',
          type: 'like',
          message: 'Sam Chen liked your post',
          timestamp: new Date(Date.now() - 1000 * 60 * 10),
          read: false,
        },
        {
          id: '3',
          type: 'comment',
          message: 'Taylor Reed commented on your post',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          read: true,
        },
      ];
      
      setNotifications(mockNotifications);
    }
  }, [address, isConnected]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!address) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setVisible(!visible)}
        className="relative bg-primary-600 text-white rounded-full p-3 shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {visible && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li 
                    key={notification.id} 
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        {notification.type === 'follow' && (
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                          </div>
                        )}
                        {notification.type === 'like' && (
                          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </div>
                        )}
                        {notification.type === 'comment' && (
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}