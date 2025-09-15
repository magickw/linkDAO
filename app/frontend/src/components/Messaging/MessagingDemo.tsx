/**
 * Messaging Demo & Setup Guide
 * Comprehensive example of wallet-to-wallet messaging integration
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Shield, 
  Zap, 
  Globe, 
  Bell, 
  Coins,
  CheckCircle,
  ExternalLink,
  Play,
  Settings
} from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';
import { GlassPanel } from '../design-system/components/GlassPanel';
import { Button } from '../design-system/components/Button';
import { 
  MessagingWidget, 
  messagingService, 
  nftNegotiationBot,
  notificationService 
} from './index';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'active' | 'setup' | 'demo';
  onAction?: () => void;
  actionLabel?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  status,
  onAction,
  actionLabel
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800/50 border border-gray-700 rounded-lg p-6"
  >
    <div className="flex items-start space-x-4">
      <div className={`
        w-12 h-12 rounded-lg flex items-center justify-center
        ${status === 'active' ? 'bg-green-500/20 text-green-400' : 
          status === 'demo' ? 'bg-blue-500/20 text-blue-400' : 
          'bg-yellow-500/20 text-yellow-400'}
      `}>
        {icon}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {status === 'active' && (
            <CheckCircle size={16} className="text-green-400" />
          )}
        </div>
        
        <p className="text-gray-300 text-sm mb-4">{description}</p>
        
        {onAction && (
          <Button
            variant={status === 'active' ? 'primary' : 'outline'}
            size="small"
            onClick={onAction}
            className="w-full sm:w-auto"
          >
            {actionLabel || 'Try Now'}
          </Button>
        )}
      </div>
    </div>
  </motion.div>
);

const MessagingDemo: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [features, setFeatures] = useState({
    messaging: false,
    encryption: false,
    multichain: false,
    notifications: false,
    nftBot: false,
    blockExplorer: false
  });

  useEffect(() => {
    checkFeatureStatus();
  }, [isConnected, address]);

  const checkFeatureStatus = async () => {
    if (!isConnected) {
      setFeatures({
        messaging: false,
        encryption: false,
        multichain: false,
        notifications: false,
        nftBot: false,
        blockExplorer: false
      });
      return;
    }

    // Check which features are available/configured
    const status = {
      messaging: true, // Always available when connected
      encryption: true, // Always enabled
      multichain: true, // Always supported
      notifications: 'Notification' in window && Notification.permission === 'granted',
      nftBot: true, // Always available
      blockExplorer: false // Requires additional setup
    };

    setFeatures(status);
  };

  const setupNotifications = async () => {
    try {
      const granted = await notificationService.requestNotificationPermission();
      if (granted) {
        setFeatures(prev => ({ ...prev, notifications: true }));
        
        // Test notification
        await notificationService.testNotification();
      } else {
        alert('Notification permission denied. You can enable it in your browser settings.');
      }
    } catch (error) {
      console.error('Failed to setup notifications:', error);
    }
  };

  const startNFTNegotiation = async () => {
    if (!address) return;
    
    try {
      // Start negotiation with bot
      await nftNegotiationBot.startNegotiation(address.toLowerCase(), '0x1');
      alert('NFT negotiation started with game.etherscan.eth! Check your messages.');
    } catch (error) {
      console.error('Failed to start NFT negotiation:', error);
    }
  };

  const testMultichain = () => {
    alert(`
Multichain Support Includes:

🔹 EVM Chains:
• Ethereum (0x...)
• Polygon, BSC, Arbitrum, Optimism

🔹 SVM Chains:
• Solana (Base58 addresses)

🔹 ENS Support:
• .eth domains
• Reverse resolution

Try searching for:
• vitalik.eth
• game.etherscan.eth
• 0x742d35Cc6634C0532925a3b8D91B062fd8AfD34a
    `);
  };

  const demoEncryption = () => {
    alert(`
🔐 End-to-End Encryption Features:

✅ AES-GCM 256-bit encryption
✅ Message signing with wallet
✅ Forward secrecy
✅ Automatic encryption/decryption
✅ Secure key derivation

All messages are encrypted by default!
    `);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center p-8">
          <MessageCircle size={64} className="mx-auto mb-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white mb-4">
            Wallet-to-Wallet Messaging
          </h1>
          <p className="text-gray-300 mb-6">
            Connect your wallet to experience secure, encrypted messaging with any EVM or SVM address.
          </p>
          
          <div className="space-y-3">
            {connectors.map((connector) => (
              <Button
                key={connector.id}
                variant="primary"
                className="w-full"
                onClick={() => connect({ connector })}
              >
                Connect {connector.name}
              </Button>
            ))}
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Wallet-to-Wallet Messaging
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Secure, encrypted messaging between any EVM and SVM addresses with NFT negotiation, 
            multichain support, and testnet ETH rewards.
          </p>
          
          <div className="flex items-center justify-center space-x-4 mt-6 text-sm text-gray-400">
            <span>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Shield size={14} />
              <span>End-to-End Encrypted</span>
            </span>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            icon={<Zap size={24} />}
            title="Instant Chat"
            description="Wallet-to-wallet chat delivered immediately with real-time typing indicators and message status."
            status="active"
            onAction={() => {}}
            actionLabel="Active"
          />

          <FeatureCard
            icon={<Shield size={24} />}
            title="End-to-End Encryption"
            description="Chat messages between signed-in addresses are encrypted by default using AES-GCM."
            status={features.encryption ? 'active' : 'demo'}
            onAction={demoEncryption}
            actionLabel="View Details"
          />

          <FeatureCard
            icon={<Globe size={24} />}
            title="Multichain Conversation"
            description="Search and start a chat with any EVM and SVM addresses, including ENS support."
            status={features.multichain ? 'active' : 'demo'}
            onAction={testMultichain}
            actionLabel="View Supported Chains"
          />

          <FeatureCard
            icon={<Bell size={24} />}
            title="Notifications"
            description="Get notified when your address receives a message with browser and block explorer integration."
            status={features.notifications ? 'active' : 'setup'}
            onAction={setupNotifications}
            actionLabel={features.notifications ? 'Test Notification' : 'Enable Notifications'}
          />

          <FeatureCard
            icon={<Coins size={24} />}
            title="NFT Negotiation Bot"
            description="Negotiate with game.etherscan.eth for the best deal on NFTs and get rewarded with testnet ETH."
            status={features.nftBot ? 'active' : 'demo'}
            onAction={startNFTNegotiation}
            actionLabel="Start Negotiation"
          />

          <FeatureCard
            icon={<ExternalLink size={24} />}
            title="Block Explorer Integration"
            description="Get notified on the block explorer when your address receives a message (requires additional setup)."
            status={features.blockExplorer ? 'active' : 'setup'}
            onAction={() => {
              window.open('https://docs.push.org/', '_blank');
            }}
            actionLabel="Setup Guide"
          />
        </div>

        {/* Demo Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Try It Now</h2>
          <p className="text-gray-300 mb-6">
            The messaging widget is now active in the bottom-right corner. 
            Try these demo actions to explore all features:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-address-search'));
              }}
            >
              <Globe size={16} className="mr-2" />
              Search Addresses
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={startNFTNegotiation}
            >
              <Coins size={16} className="mr-2" />
              NFT Bot Demo
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={setupNotifications}
            >
              <Bell size={16} className="mr-2" />
              Test Notifications
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.open('https://github.com/your-repo/messaging-docs', '_blank');
              }}
            >
              <ExternalLink size={16} className="mr-2" />
              Documentation
            </Button>
          </div>
        </motion.div>

        {/* Integration Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-gray-800/30 border border-gray-700 rounded-lg p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Settings size={20} className="mr-2" />
            Integration Guide
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-white mb-2">Quick Setup</h4>
              <pre className="bg-gray-900 p-3 rounded text-green-400 overflow-x-auto">
{`import { MessagingWidget } from './components/Messaging';

function App() {
  return (
    <div>
      {/* Your app content */}
      <MessagingWidget />
    </div>
  );
}`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-2">Available Components</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• <code className="text-blue-400">MessagingWidget</code> - Floating chat widget</li>
                <li>• <code className="text-blue-400">MessagingInterface</code> - Full chat interface</li>
                <li>• <code className="text-blue-400">AddressSearch</code> - Multichain address search</li>
                <li>• <code className="text-blue-400">messagingService</code> - Core messaging logic</li>
                <li>• <code className="text-blue-400">nftNegotiationBot</code> - AI negotiation bot</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Messaging Widget */}
      <MessagingWidget />
    </div>
  );
};

export default MessagingDemo;