/**
 * Social Connections Tab Component
 * Displays and manages social media OAuth connections
 */

import React, { useState, useEffect } from 'react';
import { 
  getConnections, 
  initiateOAuth, 
  disconnectPlatform, 
  refreshToken,
  connectBlueskyDirect,
  SocialMediaConnection,
  SocialPlatform,
  PLATFORM_CONFIG,
  isPlatformConnected,
  getPlatformDisplayName
} from '../../services/socialMediaConnectionService';

interface SocialConnectionsTabProps {
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const SocialConnectionsTab: React.FC<SocialConnectionsTabProps> = ({ onToast }) => {
  const [connections, setConnections] = useState<SocialMediaConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<SocialPlatform | null>(null);
  const [refreshingPlatform, setRefreshingPlatform] = useState<SocialPlatform | null>(null);

  // Bluesky Direct Login State
  const [showBlueskyModal, setShowBlueskyModal] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState('');
  const [blueskyPassword, setBlueskyPassword] = useState('');
  const [isBlueskyConnecting, setIsBlueskyConnecting] = useState(false);

  // Load connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const response = await getConnections();
      if (response.success) {
        setConnections(response.data);
      } else {
        onToast?.(response.message, 'error');
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      onToast?.('Failed to load connections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: SocialPlatform) => {
    // Intercept Bluesky to use direct login modal
    if (platform === 'bluesky') {
      setShowBlueskyModal(true);
      return;
    }

    setConnectingPlatform(platform);
    try {
      const response = await initiateOAuth(platform);

      if (response.success && response.data?.authUrl) {
        // Open OAuth URL in new window
        const oauthWindow = window.open(
          response.data.authUrl,
          `oauth_${platform}`,
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Poll for connection status
        const checkInterval = setInterval(async () => {
          if (oauthWindow?.closed) {
            clearInterval(checkInterval);
            // Reload connections after window closes
            await loadConnections();
            onToast?.(`${getPlatformDisplayName(platform)} connected successfully!`, 'success');
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          setConnectingPlatform(null);
        }, 300000);
      } else {
        onToast?.(response.message || 'Failed to initiate OAuth', 'error');
      }
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error);
      onToast?.('Failed to connect to platform', 'error');
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleBlueskyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blueskyHandle || !blueskyPassword) {
      onToast?.('Please enter both handle and app password', 'error');
      return;
    }

    setIsBlueskyConnecting(true);
    try {
      const response = await connectBlueskyDirect(blueskyHandle, blueskyPassword);
      
      if (response.success) {
        setShowBlueskyModal(false);
        setBlueskyHandle('');
        setBlueskyPassword('');
        await loadConnections();
        onToast?.('Bluesky connected successfully!', 'success');
      } else {
        onToast?.(response.message || 'Failed to connect to Bluesky', 'error');
      }
    } catch (error) {
      console.error('Error connecting to Bluesky:', error);
      onToast?.('Failed to connect to Bluesky', 'error');
    } finally {
      setIsBlueskyConnecting(false);
    }
  };

  const handleDisconnect = async (platform: SocialPlatform) => {
    if (!confirm(`Are you sure you want to disconnect ${getPlatformDisplayName(platform)}?`)) {
      return;
    }

    setDisconnectingPlatform(platform);
    try {
      const response = await disconnectPlatform(platform);
      
      if (response.success) {
        setConnections(prev => prev.filter(conn => conn.platform !== platform));
        onToast?.(`${getPlatformDisplayName(platform)} disconnected`, 'success');
      } else {
        onToast?.(response.message || 'Failed to disconnect', 'error');
      }
    } catch (error) {
      console.error(`Error disconnecting from ${platform}:`, error);
      onToast?.('Failed to disconnect', 'error');
    } finally {
      setDisconnectingPlatform(null);
    }
  };

  const handleRefresh = async (platform: SocialPlatform) => {
    setRefreshingPlatform(platform);
    try {
      const response = await refreshToken(platform);
      
      if (response.success) {
        // Update the connection in the list
        setConnections(prev =>
          prev.map(conn =>
            conn.platform === platform && response.data
              ? response.data
              : conn
          )
        );
        onToast?.(`${getPlatformDisplayName(platform)} connection refreshed`, 'success');
      } else {
        onToast?.(response.message || 'Failed to refresh connection', 'error');
      }
    } catch (error) {
      console.error(`Error refreshing ${platform}:`, error);
      onToast?.('Failed to refresh connection', 'error');
    } finally {
      setRefreshingPlatform(null);
    }
  };

  const platforms: SocialPlatform[] = ['twitter', 'facebook', 'linkedin', 'threads', 'bluesky'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Social Media Connections</h3>
        <p className="mt-1 text-sm text-gray-500">
          Connect your social media accounts to share your statuses automatically
        </p>
      </div>

      {/* Platform Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {platforms.map((platform) => {
          const connection = isPlatformConnected(connections, platform);
          const config = PLATFORM_CONFIG[platform];
          const isConnecting = connectingPlatform === platform;
          const isDisconnecting = disconnectingPlatform === platform;
          const isRefreshing = refreshingPlatform === platform;

          return (
            <div
              key={platform}
              className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
            >
              {/* Platform Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: config.color }}
                  >
                    {config.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{config.displayName}</h4>
                    {connection && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        connection.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {connection.status === 'active' ? 'Connected' : connection.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Connection Info */}
              {connection && (
                <div className="mb-4 space-y-2">
                  {connection.platformUsername && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Username:</span>
                      <span className="ml-2">@{connection.platformUsername}</span>
                    </div>
                  )}
                  {connection.platformDisplayName && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Name:</span>
                      <span className="ml-2">{connection.platformDisplayName}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">Connected:</span>
                    <span className="ml-2">
                      {new Date(connection.connectedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {connection.status === 'expired' && (
                    <div className="flex items-center text-sm text-yellow-600">
                      <span className="font-medium">⚠️ Token expired</span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <p className="text-sm text-gray-500 mb-4">{config.description}</p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                {config.features.map((feature) => (
                  <span
                    key={feature}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {connection ? (
                  <>
                    {connection.status !== 'active' && (
                      <button
                        onClick={() => handleRefresh(platform)}
                        disabled={isRefreshing}
                        className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(platform)}
                      disabled={isDisconnecting}
                      className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(platform)}
                    disabled={isConnecting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ backgroundColor: config.color }}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How it works</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Connect your social media accounts using OAuth</li>
                <li>When creating a status, select which platforms to share to</li>
                <li>Your content will be automatically posted to connected platforms</li>
                <li>You can disconnect accounts at any time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {/* Bluesky Connection Modal */}
      {showBlueskyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Connect Bluesky</h3>
              <button 
                onClick={() => setShowBlueskyModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleBlueskyLogin} className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-md mb-4 text-sm text-blue-700">
                <p>Bluesky requires an App Password instead of your main login password.</p>
                <p className="mt-1">
                  Go to <strong>Settings &gt; Privacy & Security &gt; App Passwords</strong> in your Bluesky app to create one.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bluesky Handle
                </label>
                <input
                  type="text"
                  value={blueskyHandle}
                  onChange={(e) => setBlueskyHandle(e.target.value)}
                  placeholder="username.bsky.social"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Password
                </label>
                <input
                  type="password"
                  value={blueskyPassword}
                  onChange={(e) => setBlueskyPassword(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBlueskyModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBlueskyConnecting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 flex items-center"
                >
                  {isBlueskyConnecting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialConnectionsTab;