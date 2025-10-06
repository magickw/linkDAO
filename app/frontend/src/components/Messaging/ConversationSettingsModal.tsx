import React, { useState, useEffect } from 'react';
import { Conversation, ConversationSettings, GroupConversation } from '../../types/messaging';
import { ConversationManagementService } from '../../services/conversationManagementService';

interface ConversationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUserAddress: string;
  onSettingsUpdate: (settings: ConversationSettings) => void;
}

export const ConversationSettingsModal: React.FC<ConversationSettingsModalProps> = ({
  isOpen,
  onClose,
  conversation,
  currentUserAddress,
  onSettingsUpdate,
}) => {
  const [settings, setSettings] = useState<ConversationSettings>({
    notifications: true,
    archived: false,
    pinned: false,
  });
  const [customTitle, setCustomTitle] = useState('');
  const [muteUntil, setMuteUntil] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'members'>('general');

  const conversationService = ConversationManagementService.getInstance();

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, conversation.id]);

  const loadSettings = async () => {
    try {
      const currentSettings = await conversationService.getConversationSettings(
        conversation.id,
        currentUserAddress
      );
      
      if (currentSettings) {
        setSettings(currentSettings);
        setCustomTitle(currentSettings.customTitle || '');
        if (currentSettings.muteUntil) {
          setMuteUntil(new Date(currentSettings.muteUntil).toISOString().slice(0, 16));
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const updatedSettings: ConversationSettings = {
        ...settings,
        customTitle: customTitle.trim() || undefined,
        muteUntil: muteUntil ? new Date(muteUntil) : undefined,
      };

      const success = await conversationService.updateConversationSettings(
        conversation.id,
        updatedSettings,
        currentUserAddress
      );

      if (success) {
        onSettingsUpdate(updatedSettings);
        onClose();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    const newArchivedState = !settings.archived;
    
    try {
      const success = newArchivedState
        ? await conversationService.archiveConversation(conversation.id, currentUserAddress)
        : await conversationService.unarchiveConversation(conversation.id, currentUserAddress);

      if (success) {
        setSettings(prev => ({ ...prev, archived: newArchivedState }));
      }
    } catch (error) {
      console.error('Failed to toggle archive:', error);
    }
  };

  const handlePinToggle = async () => {
    const newPinnedState = !settings.pinned;
    
    try {
      const success = await conversationService.toggleConversationPin(
        conversation.id,
        currentUserAddress,
        newPinnedState
      );

      if (success) {
        setSettings(prev => ({ ...prev, pinned: newPinnedState }));
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleMuteToggle = async () => {
    const newMutedState = !settings.muteUntil;
    
    try {
      const success = await conversationService.toggleConversationMute(
        conversation.id,
        currentUserAddress,
        newMutedState,
        newMutedState && muteUntil ? new Date(muteUntil) : undefined
      );

      if (success) {
        setSettings(prev => ({ 
          ...prev, 
          muteUntil: newMutedState && muteUntil ? new Date(muteUntil) : undefined 
        }));
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  };

  const handleDeleteConversation = async () => {
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        const success = await conversationService.deleteConversation(
          conversation.id,
          currentUserAddress,
          false
        );

        if (success) {
          onClose();
          // Navigate away or refresh conversation list
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear the conversation history? This action cannot be undone.')) {
      try {
        const success = await conversationService.clearConversationHistory(
          conversation.id,
          currentUserAddress,
          false
        );

        if (success) {
          // Refresh conversation or show success message
        }
      } catch (error) {
        console.error('Failed to clear history:', error);
      }
    }
  };

  const handleExportConversation = async () => {
    try {
      const blob = await conversationService.exportConversation(
        conversation.id,
        'json',
        currentUserAddress,
        { includeMedia: true }
      );

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${conversation.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export conversation:', error);
    }
  };

  const getOtherParticipant = () => {
    return conversation.participants.find(p => p !== currentUserAddress) || 'Unknown';
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Conversation Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Conversation Info */}
          <div className="mt-4 flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
              {getOtherParticipant().slice(2, 4).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {customTitle || truncateAddress(getOtherParticipant())}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {conversation.metadata.type === 'group' ? 'Group Conversation' : 'Direct Message'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {['general', 'privacy', 'members'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Custom Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Enter a custom name for this conversation"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Notifications</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive notifications for new messages
                  </p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, notifications: !prev.notifications }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Mute */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Mute Conversation</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Temporarily disable notifications
                    </p>
                  </div>
                  <button
                    onClick={handleMuteToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.muteUntil ? 'bg-yellow-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.muteUntil ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {settings.muteUntil && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mute Until
                    </label>
                    <input
                      type="datetime-local"
                      value={muteUntil}
                      onChange={(e) => setMuteUntil(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Pin Conversation */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Pin Conversation</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Keep this conversation at the top of your list
                  </p>
                </div>
                <button
                  onClick={handlePinToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.pinned ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.pinned ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Archive */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Archive Conversation</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Hide this conversation from your main list
                  </p>
                </div>
                <button
                  onClick={handleArchiveToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.archived ? 'bg-orange-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.archived ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              {/* Encryption Status */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  {conversation.isEncrypted ? (
                    <>
                      <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-green-700 dark:text-green-300">
                          End-to-End Encrypted
                        </h4>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Messages are secured with RSA-2048 + AES-256 encryption
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                          Not Encrypted
                        </h4>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                          Messages are not end-to-end encrypted
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Export Data */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Export Data</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Download a copy of your conversation history
                </p>
                <button
                  onClick={handleExportConversation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Export Conversation
                </button>
              </div>

              {/* Clear History */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Clear History</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Delete all messages in this conversation (cannot be undone)
                </p>
                <button
                  onClick={handleClearHistory}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                >
                  Clear History
                </button>
              </div>

              {/* Delete Conversation */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Delete Conversation</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Permanently delete this conversation (cannot be undone)
                </p>
                <button
                  onClick={handleDeleteConversation}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Delete Conversation
                </button>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              {conversation.metadata.type === 'group' ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Group Members</h4>
                  <div className="space-y-3">
                    {conversation.participants.map((participant) => (
                      <div key={participant} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                            {participant.slice(2, 4).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {truncateAddress(participant)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {participant === currentUserAddress ? 'You' : 'Member'}
                            </p>
                          </div>
                        </div>
                        {participant !== currentUserAddress && (
                          <button className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Participants</h4>
                  <div className="space-y-3">
                    {conversation.participants.map((participant) => (
                      <div key={participant} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                          {participant.slice(2, 4).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {truncateAddress(participant)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {participant === currentUserAddress ? 'You' : 'Participant'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 
                       rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};