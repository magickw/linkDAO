import React, { useEffect, useState } from 'react';
import notificationService from '@/services/notificationService';
import { useWeb3 } from '@/context/Web3Context';

interface RealTimeNotificationsProps {
  children: React.ReactNode;
}

export default function RealTimeNotifications({ children }: RealTimeNotificationsProps) {
  const { address: walletAddress } = useWeb3();
  const [isConnected, setIsConnected] = useState(false);

  if (!walletAddress) return;

    // Simulate real-time notifications
    const interval = setInterval(() => {
      // Only in development mode for testing
      if (process.env.NODE_ENV === 'development') {
        // Randomly generate notifications (10% chance every 5 seconds)
        if (Math.random() < 0.1) {
          // Add a notification
          console.log('Generated real-time notification for', walletAddress);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [walletAddress]);

  // Show connection status indicator
  const showConnectionStatus = process.env.NODE_ENV === 'development';

  return (
    <>
      {children}
                {showConnectionStatus && walletAddress && (
            <div className="mb-2 p-3 bg-green-600/20 border border-green-500/30 rounded-lg">
              <span className="text-green-400 text-sm flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Connected as {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </span>
            </div>
          )}
    </>
  );
}
