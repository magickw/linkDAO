/**
 * Notification Preferences Component
 * Allows users to customize notification settings per conversation and globally
 */

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Mail, 
  Smartphone, 
  Clock, 
  Settings,
  Users,
  MessageCircle,
  AlertTriangle
} from 'lucide-react';
import { useNotifications } from '@/services/unifiedNotificationManager';

interface NotificationPreferencesDialogProps {
  children: React.ReactNode;
  conversationId?: string;
  conversationName?: string;
}

export function NotificationPreferencesDialog({
  children,
  conversationId,
  conversationName
}: NotificationPreferencesDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    preferences,
    updatePreferences,
    updateConversationSettings
  } = useNotifications();

  // Local state for form values
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [conversationSettings, setConversationSettings] = useState(
    conversationId 
      ? preferences.perConversationSettings.get(conversationId) || {
          showNotifications: true,
          sound: true,
          muted: false,
          doNotDisturbUntil: undefined
        }
      : null
  );

  // Update local state when preferences change
  useEffect(() => {
    setLocalPreferences(preferences);
    if (conversationId) {
      setConversationSettings(
        preferences.perConversationSettings.get(conversationId) || {
          showNotifications: true,
          sound: true,
          muted: false,
          doNotDisturbUntil: undefined
        }
      );
    }
  }, [preferences, conversationId]);

  // Handle global preference changes
  const handleGlobalPreferenceChange = (key: keyof typeof preferences, value: any) => {
    const newPreferences = { ...localPreferences, [key]: value };
    setLocalPreferences(newPreferences);
    updatePreferences({ [key]: value });
  };

  // Handle conversation-specific changes
  const handleConversationSettingChange = (key: string, value: any) => {
    if (!conversationId) return;
    
    const newSettings = { ...conversationSettings, [key]: value };
    setConversationSettings(newSettings);
    updateConversationSettings(conversationId, { [key]: value });
  };

  // Toggle DND mode
  const toggleDoNotDisturb = (until?: Date) => {
    if (conversationId && conversationSettings) {
      const newValue = until ? until : conversationSettings.doNotDisturbUntil ? undefined : new Date(Date.now() + 60 * 60 * 1000); // 1 hour default
      handleConversationSettingChange('doNotDisturbUntil', newValue);
    } else {
      const newValue = until ? until : localPreferences.doNotDisturbUntil ? undefined : new Date(Date.now() + 60 * 60 * 1000);
      handleGlobalPreferenceChange('doNotDisturbUntil', newValue);
    }
  };

  // Mute conversation
  const toggleMute = () => {
    if (conversationId && conversationSettings) {
      handleConversationSettingChange('muted', !conversationSettings.muted);
    }
  };

  const isDndActive = conversationId 
    ? conversationSettings?.doNotDisturbUntil && new Date() < conversationSettings.doNotDisturbUntil
    : localPreferences.doNotDisturbUntil && new Date() < localPreferences.doNotDisturbUntil;

  const isMuted = conversationId 
    ? conversationSettings?.muted
    : false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Conversation-specific settings */}
          {conversationId && conversationName && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span className="font-medium">{conversationName}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className={isMuted ? "text-destructive" : "text-muted-foreground"}
                >
                  {isMuted ? (
                    <>
                      <BellOff className="w-4 h-4 mr-1" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-1" />
                      Mute
                    </>
                  )}
                </Button>
              </div>

              {conversationSettings && (
                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="conv-notifications" className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Show Notifications
                    </Label>
                    <Switch
                      id="conv-notifications"
                      checked={conversationSettings.showNotifications}
                      onCheckedChange={(checked) => 
                        handleConversationSettingChange('showNotifications', checked)
                      }
                      disabled={isMuted}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="conv-sound" className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Sound
                    </Label>
                    <Switch
                      id="conv-sound"
                      checked={conversationSettings.sound}
                      onCheckedChange={(checked) => 
                        handleConversationSettingChange('sound', checked)
                      }
                      disabled={isMuted}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Do Not Disturb
                    </Label>
                    <div className="flex items-center gap-2">
                      {isDndActive && (
                        <span className="text-xs text-muted-foreground">
                          Until {conversationSettings?.doNotDisturbUntil?.toLocaleTimeString()}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleDoNotDisturb()}
                      >
                        {isDndActive ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>

                  {isDndActive && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleDoNotDisturb(new Date(Date.now() + 30 * 60 * 1000))}
                      >
                        30 min
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleDoNotDisturb(new Date(Date.now() + 60 * 60 * 1000))}
                      >
                        1 hour
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleDoNotDisturb(new Date(Date.now() + 2 * 60 * 60 * 1000))}
                      >
                        2 hours
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleDoNotDisturb(new Date(Date.now() + 24 * 60 * 60 * 1000))}
                      >
                        24 hours
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Global notification settings */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Global Settings
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="desktop" className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Desktop Notifications
                </Label>
                <Switch
                  id="desktop"
                  checked={localPreferences.desktop}
                  onCheckedChange={(checked) => handleGlobalPreferenceChange('desktop', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sound" className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Notification Sounds
                </Label>
                <Switch
                  id="sound"
                  checked={localPreferences.sound}
                  onCheckedChange={(checked) => handleGlobalPreferenceChange('sound', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="vibration" className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Vibration
                </Label>
                <Switch
                  id="vibration"
                  checked={localPreferences.vibration}
                  onCheckedChange={(checked) => handleGlobalPreferenceChange('vibration', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Notifications
                </Label>
                <Switch
                  id="email"
                  checked={localPreferences.email}
                  onCheckedChange={(checked) => handleGlobalPreferenceChange('email', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="push" className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Push Notifications
                </Label>
                <Switch
                  id="push"
                  checked={localPreferences.push}
                  onCheckedChange={(checked) => handleGlobalPreferenceChange('push', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Do Not Disturb
                </Label>
                <div className="flex items-center gap-2">
                  {isDndActive && !conversationId && (
                    <span className="text-xs text-muted-foreground">
                      Until {localPreferences.doNotDisturbUntil?.toLocaleTimeString()}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDoNotDisturb()}
                  >
                    {isDndActive && !conversationId ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick DND presets (global only) */}
          {!conversationId && isDndActive && (
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleDoNotDisturb(new Date(Date.now() + 30 * 60 * 1000))}
                >
                  30 min
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleDoNotDisturb(new Date(Date.now() + 60 * 60 * 1000))}
                >
                  1 hour
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleDoNotDisturb(new Date(Date.now() + 2 * 60 * 60 * 1000))}
                >
                  2 hours
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleDoNotDisturb(new Date(Date.now() + 24 * 60 * 60 * 1000))}
                >
                  Until tomorrow
                </Button>
              </div>
            </div>
          )}

          {/* Muted categories */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Muted Notification Types
            </Label>
            <div className="space-y-2">
              {(['chat_message', 'chat_mention', 'system_alert', 'order_update'] as const).map(type => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {type.replace('_', ' ')}
                  </span>
                  <Switch
                    checked={localPreferences.mutedCategories.has(type)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(localPreferences.mutedCategories);
                      if (checked) {
                        newSet.add(type);
                      } else {
                        newSet.delete(type);
                      }
                      handleGlobalPreferenceChange('mutedCategories', newSet);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationPreferencesDialog;