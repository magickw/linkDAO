import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, Check, X, AlertTriangle } from 'lucide-react';
import { mobilePushNotificationService, NotificationPermissionState } from './MobilePushNotificationService';
import { TouchOptimizedButton } from '../TouchInteractions';

interface NotificationPermissionManagerProps {
  onPermissionChange?: (granted: boolean) => void;
  showSettings?: boolean;
}

export const NotificationPermissionManager: React.FC<NotificationPermissionManagerProps> = ({
  onPermissionChange,
  showSettings = true
}) => {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    granted: false,
    denied: false,
    default: true
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    const currentState = mobilePushNotificationService.getPermissionState();
    setPermissionState(currentState);
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    
    try {
      const newState = await mobilePushNotificationService.requestPermission();
      setPermissionState(newState);
      onPermissionChange?.(newState.granted);
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const getPermissionStatus = () => {
    if (permissionState.granted) {
      return {
        icon: Bell,
        text: 'Notifications Enabled',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20'
      };
    } else if (permissionState.denied) {
      return {
        icon: BellOff,
        text: 'Notifications Blocked',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20'
      };
    } else {
      return {
        icon: AlertTriangle,
        text: 'Notifications Not Set',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20'
      };
    }
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  return (
    <>
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${status.bgColor}`}>
              <StatusIcon className={`w-5 h-5 ${status.color}`} />
            </div>
            <div>
              <h3 className="text-white font-medium">Push Notifications</h3>
              <p className={`text-sm ${status.color}`}>{status.text}</p>
            </div>
          </div>
          
          {showSettings && (
            <TouchOptimizedButton
              onClick={() => setShowSettingsModal(true)}
              variant="ghost"
              size="small"
            >
              <Settings className="w-4 h-4" />
            </TouchOptimizedButton>
          )}
        </div>

        {/* Permission Actions */}
        <div className="space-y-3">
          {permissionState.default && (
            <div className="space-y-2">
              <p className="text-white/70 text-sm">
                Enable notifications to receive important admin alerts on your mobile device.
              </p>
              <TouchOptimizedButton
                onClick={handleRequestPermission}
                disabled={isRequesting}
                variant="primary"
                className="w-full"
              >
                {isRequesting ? 'Requesting...' : 'Enable Notifications'}
              </TouchOptimizedButton>
            </div>
          )}

          {permissionState.denied && (
            <div className="space-y-2">
              <p className="text-white/70 text-sm">
                Notifications are blocked. To enable them, please allow notifications in your browser settings.
              </p>
              <TouchOptimizedButton
                onClick={() => {
                  // Open browser settings (this varies by browser)
                  alert('Please enable notifications in your browser settings for this site.');
                }}
                variant="secondary"
                className="w-full"
              >
                Open Browser Settings
              </TouchOptimizedButton>
            </div>
          )}

          {permissionState.granted && (
            <div className="space-y-2">
              <p className="text-white/70 text-sm">
                You'll receive notifications for important admin events. You can customize which notifications you receive in settings.
              </p>
              <div className="flex space-x-2">
                <TouchOptimizedButton
                  onClick={() => mobilePushNotificationService.showModerationAlert(5, 2)}
                  variant="secondary"
                  size="small"
                  className="flex-1"
                >
                  Test Notification
                </TouchOptimizedButton>
                {showSettings && (
                  <TouchOptimizedButton
                    onClick={() => setShowSettingsModal(true)}
                    variant="secondary"
                    size="small"
                    className="flex-1"
                  >
                    Customize
                  </TouchOptimizedButton>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <NotificationSettingsModal
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </>
  );
};

interface NotificationSettingsModalProps {
  onClose: () => void;
}

const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  onClose
}) => {
  const [categories, setCategories] = useState(mobilePushNotificationService.getCategories());

  const handleCategoryToggle = (categoryId: string, enabled: boolean) => {
    mobilePushNotificationService.updateCategorySettings(categoryId, { enabled });
    setCategories(mobilePushNotificationService.getCategories());
  };

  const handleSoundToggle = (categoryId: string, sound: boolean) => {
    mobilePushNotificationService.updateCategorySettings(categoryId, { sound });
    setCategories(mobilePushNotificationService.getCategories());
  };

  const handleVibrationToggle = (categoryId: string, vibration: boolean) => {
    mobilePushNotificationService.updateCategorySettings(categoryId, { vibration });
    setCategories(mobilePushNotificationService.getCategories());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${getPriorityColor(category.priority)}`}>
                      {category.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={category.enabled}
                    onChange={(e) => handleCategoryToggle(category.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {category.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={category.sound}
                      onChange={(e) => handleSoundToggle(category.id, e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Sound</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={category.vibration}
                      onChange={(e) => handleVibrationToggle(category.id, e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Vibration</span>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <TouchOptimizedButton
            onClick={onClose}
            variant="primary"
            className="w-full"
          >
            Save Settings
          </TouchOptimizedButton>
        </div>
      </div>
    </div>
  );
};