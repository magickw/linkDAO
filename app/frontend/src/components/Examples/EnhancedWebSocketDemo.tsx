/**
 * Enhanced WebSocket Demo Component
 * 
 * Demonstrates the new WebSocket features including:
 * - Resource-aware connections
 * - Automatic fallback to polling
 * - Exponential backoff reconnection
 * - Connection state monitoring
 */

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { webSocketConnectionManager } from '../../services/webSocketConnectionManager';

interface WebSocketDemoProps {
  walletAddress: string;
}

export const EnhancedWebSocketDemo: React.FC<WebSocketDemoProps> = ({ walletAddress }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [connectionStats, setConnectionStats] = useState<any>(null);
  
  const webSocket = useWebSocket({
    walletAddress,
    autoConnect: true,
    autoReconnect: true,
    reconnectAttempts: 10,
    reconnectDelay: 1000
  });

  // Update connection stats periodically
  useEffect(() => {
    const updateStats = () => {
      const stats = webSocketConnectionManager.getState();
      setConnectionStats(stats);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen for various WebSocket events
  useEffect(() => {
    const handleFeedUpdate = (data: any) => {
      setMessages(prev => [{
        type: 'feed_update',
        data,
        timestamp: new Date(),
        source: webSocket.isRealTimeAvailable ? 'websocket' : 'polling'
      }, ...prev.slice(0, 19)]);
    };

    const handleNotification = (data: any) => {
      setMessages(prev => [{
        type: 'notification',
        data,
        timestamp: new Date(),
        source: webSocket.isRealTimeAvailable ? 'websocket' : 'polling'
      }, ...prev.slice(0, 19)]);
    };

    const handleConnectionModeChange = (data: any) => {
      setMessages(prev => [{
        type: 'connection_mode_changed',
        data,
        timestamp: new Date(),
        source: 'system'
      }, ...prev.slice(0, 19)]);
    };

    webSocket.on('feed_update', handleFeedUpdate);
    webSocket.on('notification', handleNotification);
    webSocket.on('connection_mode_changed', handleConnectionModeChange);

    return () => {
      webSocket.off('feed_update', handleFeedUpdate);
      webSocket.off('notification', handleNotification);
      webSocket.off('connection_mode_changed', handleConnectionModeChange);
    };
  }, [webSocket]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'polling': return 'text-yellow-600';
      case 'reconnecting': return 'text-orange-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'websocket': return '🔌';
      case 'polling': return '🔄';
      case 'hybrid': return '⚡';
      case 'disabled': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Enhanced WebSocket Demo</h2>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-600">Status:</span>
            <div className={`font-semibold ${getStatusColor(webSocket.connectionState.status)}`}>
              {webSocket.connectionState.status}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Mode:</span>
            <div className="font-semibold">
              {getModeIcon(webSocket.connectionState.mode || 'unknown')} {webSocket.connectionState.mode}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Real-time:</span>
            <div className={`font-semibold ${webSocket.isRealTimeAvailable ? 'text-green-600' : 'text-yellow-600'}`}>
              {webSocket.isRealTimeAvailable ? 'Available' : 'Fallback'}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Reconnect Attempts:</span>
            <div className="font-semibold">
              {webSocket.connectionState.reconnectAttempts}
            </div>
          </div>
        </div>
        
        {webSocket.connectionState.resourceConstrained && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
            ⚠️ Resource constraints detected - using optimized connection mode
          </div>
        )}
      </div>

      {/* Connection Controls */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => webSocket.connect()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={webSocket.isConnected}
        >
          Connect
        </button>
        <button
          onClick={() => webSocket.disconnect()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          disabled={!webSocket.isConnected}
        >
          Disconnect
        </button>
        <button
          onClick={() => webSocket.forceReconnect()}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Force Reconnect
        </button>
      </div>

      {/* Connection Statistics */}
      {connectionStats && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Connection Statistics</h3>
          <div className="text-sm space-y-1">
            <div>Update Interval: {webSocket.getRecommendedUpdateInterval()}ms</div>
            <div>Queued Messages: {webSocket.getQueuedMessageCount()}</div>
            <div>Last Update: {connectionStats.lastUpdate ? new Date(connectionStats.lastUpdate).toLocaleTimeString() : 'Never'}</div>
            {connectionStats.stats?.pollingActive && (
              <div className="text-yellow-600">📡 Polling mode active</div>
            )}
          </div>
        </div>
      )}

      {/* Message Log */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Message Log</h3>
        <div className="h-64 overflow-y-auto border border-gray-300 rounded p-2 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No messages received yet. Connect to start receiving updates.
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="mb-2 p-2 bg-white rounded border text-sm">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-blue-600">{message.type}</span>
                  <div className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString()} 
                    <span className={`ml-2 px-1 rounded ${
                      message.source === 'websocket' ? 'bg-green-100 text-green-800' :
                      message.source === 'polling' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {message.source}
                    </span>
                  </div>
                </div>
                <pre className="mt-1 text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(message.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Test Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            webSocket.send('test_message', { 
              message: 'Hello from demo!', 
              timestamp: new Date().toISOString() 
            });
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={!webSocket.isConnected}
        >
          Send Test Message
        </button>
        <button
          onClick={() => {
            const subscriptionId = webSocket.subscribe('feed', 'global');
            console.log('Subscribed to global feed:', subscriptionId);
          }}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          disabled={!webSocket.isConnected}
        >
          Subscribe to Feed
        </button>
      </div>
    </div>
  );
};

export default EnhancedWebSocketDemo;