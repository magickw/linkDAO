/**
 * Cross-Chain Channel Bridge Component
 * Enables message synchronization across different blockchain networks
 */

import React, { useState, useEffect } from 'react';
import { 
  Link, Network, ArrowLeftRight, CheckCircle, AlertCircle, 
  ExternalLink, Settings, Zap, Globe, Shield, X, Hash
} from 'lucide-react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';

interface ChainConfig {
  id: number;
  name: string;
  symbol: string;
  icon: string;
  color: string;
  rpcUrl: string;
  explorerUrl: string;
  bridgeContract?: string;
}

interface BridgeChannel {
  id: string;
  name: string;
  chains: number[];
  isActive: boolean;
  messageCount: number;
  lastSync: Date;
  bridgeStatus: 'synced' | 'syncing' | 'error' | 'paused';
}

interface CrossChainMessage {
  id: string;
  originalChain: number;
  targetChains: number[];
  content: string;
  fromAddress: string;
  timestamp: Date;
  bridgeTxHash?: string;
  status: 'pending' | 'bridged' | 'failed';
}

const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '⟠',
    color: '#627EEA',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    explorerUrl: 'https://etherscan.io',
    bridgeContract: '0x1234567890123456789012345678901234567890'
  },
  {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    icon: '⬟',
    color: '#8247E5',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    bridgeContract: '0x2345678901234567890123456789012345678901'
  },
  {
    id: 56,
    name: 'BSC',
    symbol: 'BNB',
    icon: '🟡',
    color: '#F3BA2F',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    bridgeContract: '0x3456789012345678901234567890123456789012'
  },
  {
    id: 42161,
    name: 'Arbitrum',
    symbol: 'ETH',
    icon: '🔵',
    color: '#28A0F0',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    bridgeContract: '0x4567890123456789012345678901234567890123'
  }
];

const CrossChainBridge: React.FC<{ 
  className?: string; 
  onBridgeMessage?: (message: CrossChainMessage) => void;
  onChannelSync?: (channelId: string, chains: number[]) => void;
}> = ({ className = '', onBridgeMessage, onChannelSync }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const [bridgeChannels, setBridgeChannels] = useState<BridgeChannel[]>([
    {
      id: 'ethereum-general',
      name: 'ethereum-general',
      chains: [1, 137],
      isActive: true,
      messageCount: 1247,
      lastSync: new Date(Date.now() - 300000),
      bridgeStatus: 'synced'
    },
    {
      id: 'polygon-general',
      name: 'polygon-general',
      chains: [1, 137],
      isActive: true,
      messageCount: 1247,
      lastSync: new Date(Date.now() - 300000),
      bridgeStatus: 'synced'
    },
    {
      id: 'defi-discussion',
      name: 'defi-discussion',
      chains: [1, 137, 56],
      isActive: true,
      messageCount: 892,
      lastSync: new Date(Date.now() - 600000),
      bridgeStatus: 'syncing'
    }
  ]);

  const [selectedChannel, setSelectedChannel] = useState<string>('ethereum-general');
  const [bridgeMessages, setBridgeMessages] = useState<CrossChainMessage[]>([]);
  const [isBridgeActive, setIsBridgeActive] = useState(true);
  const [bridgeSettings, setBridgeSettings] = useState({
    autoSync: true,
    syncInterval: 30000, // 30 seconds
    maxRetries: 3,
    gasOptimization: true
  });

  const getChainConfig = (chainId: number) => {
    return SUPPORTED_CHAINS.find(chain => chain.id === chainId);
  };

  const getBridgeStatusIcon = (status: string) => {
    switch (status) {
      case 'synced': return <CheckCircle size={16} className="text-green-500" />;
      case 'syncing': return <Zap size={16} className="text-blue-500 animate-pulse" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'paused': return <AlertCircle size={16} className="text-yellow-500" />;
      default: return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const bridgeMessageToChains = async (messageId: string, targetChains: number[]) => {
    if (!address || !isConnected) return;

    const message: CrossChainMessage = {
      id: `bridge_${Date.now()}`,
      originalChain: chainId || 1,
      targetChains,
      content: `Bridged message from ${getChainConfig(chainId || 1)?.name}`,
      fromAddress: address,
      timestamp: new Date(),
      status: 'pending'
    };

    setBridgeMessages(prev => [...prev, message]);
    onBridgeMessage?.(message);

    // Simulate bridge transaction
    setTimeout(() => {
      setBridgeMessages(prev => prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, status: 'bridged', bridgeTxHash: `0x${Math.random().toString(16).substr(2, 64)}` }
          : msg
      ));
    }, 2000);
  };

  const syncChannelAcrossChains = async (channelId: string, chains: number[]) => {
    const channel = bridgeChannels.find(c => c.id === channelId);
    if (!channel) return;

    // Update channel status to syncing
    setBridgeChannels(prev => prev.map(c => 
      c.id === channelId 
        ? { ...c, bridgeStatus: 'syncing' as const }
        : c
    ));

    onChannelSync?.(channelId, chains);

    // Simulate sync process
    setTimeout(() => {
      setBridgeChannels(prev => prev.map(c => 
        c.id === channelId 
          ? { 
              ...c, 
              bridgeStatus: 'synced' as const,
              lastSync: new Date(),
              messageCount: c.messageCount + Math.floor(Math.random() * 10)
            }
          : c
      ));
    }, 3000);
  };

  const toggleBridgeChannel = (channelId: string) => {
    setBridgeChannels(prev => prev.map(c => 
      c.id === channelId 
        ? { ...c, isActive: !c.isActive }
        : c
    ));
  };

  const addChainToChannel = (channelId: string, chainId: number) => {
    setBridgeChannels(prev => prev.map(c => 
      c.id === channelId 
        ? { ...c, chains: [...c.chains, chainId] }
        : c
    ));
  };

  const removeChainFromChannel = (channelId: string, chainId: number) => {
    setBridgeChannels(prev => prev.map(c => 
      c.id === channelId 
        ? { ...c, chains: c.chains.filter(id => id !== chainId) }
        : c
    ));
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ArrowLeftRight size={24} className="text-blue-500 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-white">Cross-Chain Bridge</h2>
            <p className="text-sm text-gray-400">Sync messages across blockchain networks</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
            isBridgeActive ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isBridgeActive ? 'bg-green-500' : 'bg-gray-500'
            }`} />
            {isBridgeActive ? 'Active' : 'Paused'}
          </div>
          
          <button className="text-gray-400 hover:text-white">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Bridge Channels */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Bridge Channels</h3>
        
        <div className="space-y-3">
          {bridgeChannels.map(channel => (
            <div 
              key={channel.id}
              className={`bg-gray-800 rounded-lg p-4 border ${
                selectedChannel === channel.id ? 'border-blue-500' : 'border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <button
                    onClick={() => setSelectedChannel(channel.id)}
                    className="flex items-center"
                  >
                    <Hash size={16} className="text-gray-400 mr-2" />
                    <span className="font-medium text-white">#{channel.name}</span>
                  </button>
                  
                  <div className="flex items-center ml-4">
                    {getBridgeStatusIcon(channel.bridgeStatus)}
                    <span className="ml-2 text-sm text-gray-400 capitalize">
                      {channel.bridgeStatus}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleBridgeChannel(channel.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      channel.isActive 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {channel.isActive ? 'Active' : 'Paused'}
                  </button>
                  
                  <button
                    onClick={() => syncChannelAcrossChains(channel.id, channel.chains)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    Sync Now
                  </button>
                </div>
              </div>
              
              {/* Connected Chains */}
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-sm text-gray-400">Connected to:</span>
                {channel.chains.map(chainId => {
                  const chainConfig = getChainConfig(chainId);
                  return (
                    <div
                      key={chainId}
                      className="flex items-center px-2 py-1 bg-gray-700 rounded text-sm"
                    >
                      <span className="mr-1">{chainConfig?.icon}</span>
                      <span className="text-white">{chainConfig?.name}</span>
                      <button
                        onClick={() => removeChainFromChannel(channel.id, chainId)}
                        className="ml-2 text-gray-400 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                
                {/* Add Chain Dropdown */}
                <select
                  onChange={(e) => {
                    const chainId = parseInt(e.target.value);
                    if (chainId && !channel.chains.includes(chainId)) {
                      addChainToChannel(channel.id, chainId);
                    }
                  }}
                  className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  defaultValue=""
                >
                  <option value="">Add Chain</option>
                  {SUPPORTED_CHAINS.filter(chain => !channel.chains.includes(chain.id)).map(chain => (
                    <option key={chain.id} value={chain.id}>
                      {chain.icon} {chain.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Channel Stats */}
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>{channel.messageCount.toLocaleString()} messages</span>
                <span>Last sync: {channel.lastSync.toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bridge Messages */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Bridge Activity</h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {bridgeMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ArrowLeftRight size={48} className="mx-auto mb-3 opacity-50" />
              <p>No bridge activity yet</p>
              <p className="text-sm">Messages will appear here when bridged across chains</p>
            </div>
          ) : (
            bridgeMessages.map(message => (
              <div key={message.id} className="bg-gray-800 rounded p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    message.status === 'bridged' ? 'bg-green-500' :
                    message.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  
                  <div>
                    <div className="text-sm text-white">
                      Bridged to {message.targetChains.length} chain(s)
                    </div>
                    <div className="text-xs text-gray-400">
                      From {getChainConfig(message.originalChain)?.name} • {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {message.bridgeTxHash && (
                    <a
                      href={`${getChainConfig(message.originalChain)?.explorerUrl}/tx/${message.bridgeTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  
                  <span className={`text-xs px-2 py-1 rounded ${
                    message.status === 'bridged' ? 'bg-green-900 text-green-300' :
                    message.status === 'pending' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'
                  }`}>
                    {message.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bridge Settings */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-white mb-4">Bridge Settings</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bridgeSettings.autoSync}
                onChange={(e) => setBridgeSettings(prev => ({ ...prev, autoSync: e.target.checked }))}
                className="rounded bg-gray-700 border-gray-600 mr-2"
              />
              <span className="text-sm text-gray-300">Auto-sync messages</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bridgeSettings.gasOptimization}
                onChange={(e) => setBridgeSettings(prev => ({ ...prev, gasOptimization: e.target.checked }))}
                className="rounded bg-gray-700 border-gray-600 mr-2"
              />
              <span className="text-sm text-gray-300">Gas optimization</span>
            </label>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Sync Interval</label>
              <select
                value={bridgeSettings.syncInterval}
                onChange={(e) => setBridgeSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
                className="w-full bg-gray-700 text-white rounded px-3 py-1 text-sm"
              >
                <option value={15000}>15 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 block mb-1">Max Retries</label>
              <input
                type="number"
                min="1"
                max="10"
                value={bridgeSettings.maxRetries}
                onChange={(e) => setBridgeSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                className="w-full bg-gray-700 text-white rounded px-3 py-1 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrossChainBridge;