import React, { useEffect, useState } from 'react';
import notificationService from '@/services/notificationService';
import { useWeb3 } from '@/context/Web3Context';

interface RealTimeNotificationsProps {
  children: React.ReactNode;
}

export default function RealTimeNotifications({ children }: RealTimeNotificationsProps) {
  const { address } = useWeb3();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!address) return;

    // Simulate WebSocket connection
    setIsConnected(true);
    
    // Simulate receiving real-time notifications
    const interval = setInterval(() => {
      // Randomly generate notifications (10% chance every 5 seconds)
      if (Math.random() < 0.1) {
        notificationService.testNotification();
      }
    }, 5000);

    // Simulate connection status changes
    const connectionInterval = setInterval(() => {
      setIsConnected(prev => {
        // 95% chance to stay connected
        if (Math.random() < 0.95) return prev;
        return !prev;
      });
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(connectionInterval);
      setIsConnected(false);
    };
  }, [address]);

  // Show connection status indicator
  const showConnectionStatus = process.env.NODE_ENV === 'development';

  return (
    <>
      {children}
      {showConnectionStatus && address && (
        <div className="fixed bottom-4 left-4 z-40">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
            isConnected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            } ${isConnected ? 'animate-pulse' : ''}`}></div>
            <span>
              {isConnected ? 'Real-time connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}