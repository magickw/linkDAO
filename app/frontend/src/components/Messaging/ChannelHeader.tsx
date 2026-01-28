import React from 'react';
import { ArrowLeft, ArrowLeftRight, Hash, Users, Phone, Video, Shield, User } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface ChannelHeaderProps {
  isViewingDM: boolean;
  selectedChannel: string | null;
  selectedDM: string | null;
  channels: any[];
  dmConversations: any[];
  participantAvatar: string | null;
  participantName: string | null;
  participantAddress: string | null;
  onClose: () => void;
  showCrossChainBridge: boolean;
  setShowCrossChainBridge: (show: boolean) => void;
  getParticipantDisplayName: (address: string) => string;
}

export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  isViewingDM,
  selectedChannel,
  selectedDM,
  channels,
  dmConversations,
  participantAvatar,
  participantName,
  participantAddress,
  onClose,
  showCrossChainBridge,
  setShowCrossChainBridge,
  getParticipantDisplayName
}) => {
  const { touchTargetClasses } = useMobileOptimization();

  // Render Channel Header
  if (!isViewingDM && selectedChannel) {
    const channel = channels.find(c => c.id === selectedChannel);
    return (
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onClose}
            className={`md:hidden mr-2 ${touchTargetClasses} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white`}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              {channel?.icon && <span className="mr-2">{channel.icon}</span>}
              <Hash size={24} className="mr-2 text-gray-500 dark:text-gray-400" />
              {channel?.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              {channel?.topic}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 hidden sm:flex">
            <Users size={16} className="mr-1" />
            {channel?.memberCount}
          </div>

          <button
            onClick={() => setShowCrossChainBridge(!showCrossChainBridge)}
            className={`flex items-center px-3 py-1 rounded text-sm hidden sm:flex ${showCrossChainBridge
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <ArrowLeftRight size={14} className="mr-1" />
            Bridge
          </button>
        </div>
      </div>
    );
  }

  // Render DM Header
  if (isViewingDM && selectedDM) {
    const dm = dmConversations.find(d => d.id === selectedDM);
    const displayName = getParticipantDisplayName(dm?.participant || participantAddress || '');
    
    return (
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onClose}
            className={`md:hidden mr-2 ${touchTargetClasses} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white`}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden">
              {participantAvatar ? (
                <img
                  src={participantAvatar}
                  alt={participantName || "User"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.remove('overflow-hidden');
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                    const icon = document.createElement('div');
                    icon.innerHTML = DOMPurify.sanitize('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'); 
                    e.currentTarget.parentElement?.appendChild(icon.firstChild!);
                  }}
                />
              ) : (
                <User size={20} className="text-white" />
              )}
            </div>
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-100 dark:border-gray-800 ${dm?.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
          </div>
          <div className="ml-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-xs">
              {displayName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              {dm?.isOnline
                ? 'Online'
                : dm?.lastSeen
                  ? `Last seen ${dm.lastSeen.toLocaleTimeString()}`
                  : 'Direct Message'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-full p-2 hidden sm:block">
            <Phone size={16} />
          </button>
          <button className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-full p-2 hidden sm:block">
            <Video size={16} />
          </button>

          <div className="flex items-center space-x-1 text-xs text-green-500 dark:text-green-400">
            <Shield size={14} />
            <span className="hidden sm:inline">Encrypted</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
