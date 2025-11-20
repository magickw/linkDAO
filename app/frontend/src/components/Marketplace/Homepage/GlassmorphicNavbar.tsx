/**
 * GlassmorphicNavbar Component - Sticky navigation with glassmorphism design
 * Implements Web3 marketplace navigation with wallet connect and currency toggle
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { GlassNavbar } from '@/design-system/components/GlassPanel';
import { Button, GhostButton } from '@/design-system/components/Button';
import { designTokens } from '@/design-system/tokens';
import { SearchBar } from './SearchBar';
import { NetworkSwitcher } from '@/components/Web3/NetworkSwitcher';
import { WalletConnectButton } from '@/components/Auth/WalletConnectButton';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

export const GlassmorphicNavbar: React.FC = () => {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Marketplace', href: '/marketplace', icon: '🛒' },
    { name: 'NFTs', href: '/nfts', icon: '🎨' },
    { name: 'Services', href: '/services', icon: '⚡' },
    { name: 'Governance', href: '/governance', icon: '🗳️' },
  ];

  const isActiveRoute = (href: string) => router.pathname === href;

  return (
    <GlassNavbar
      className="sticky top-0 z-50 border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W3</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Web3 Marketplace
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Navigation Links */}
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link key={item.name} href={item.href}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActiveRoute(item.href)
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </motion.div>
                </Link>
              ))}
            </nav>

            {/* Search Bar */}
            <SearchBar />

            {/* Web3 Controls */}
            <div className="flex items-center space-x-3">
              {/* Network Switcher */}
              {isConnected && <NetworkSwitcher variant="compact" showDisconnect={true} />}

              {/* Wallet Connect Button */}
              <div className="marketplace-wallet-connect">
                <WalletConnectButton 
                  className="marketplace-styled compact"
                  onSuccess={() => {
                    console.log('Wallet connected successfully');
                  }}
                  onError={(error) => {
                    console.error('Wallet connection error:', error);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Web3 Controls */}
            <div className="flex items-center space-x-2">
              {isConnected && <NetworkSwitcher variant="compact" showDisconnect={true} />}
              <div className="marketplace-wallet-connect">
                <WalletConnectButton 
                  className="marketplace-styled compact"
                  onSuccess={() => {
                    console.log('Wallet connected successfully');
                  }}
                  onError={(error) => {
                    console.error('Wallet connection error:', error);
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden py-4 border-t border-white/10"
            data-testid="mobile-menu"
          >
            <div className="space-y-2">
              {/* Mobile Search */}
              <div className="px-2 pb-4">
                <SearchBar />
              </div>

              {/* Mobile Navigation Links */}
              {navItems.map((item) => (
                <Link key={item.name} href={item.href}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all ${
                      isActiveRoute(item.href)
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </motion.div>
                </Link>
              ))}


            </div>
          </motion.div>
        )}
      </div>
    </GlassNavbar>
  );
};

// Add marketplace-specific styling for the Auth WalletConnectButton
const marketplaceWalletStyles = `
  .marketplace-wallet-connect {
    /* Container for marketplace wallet connect button */
  }
  
  .marketplace-wallet-connect .marketplace-styled h3 {
    color: white;
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  
  .marketplace-wallet-connect .marketplace-styled button {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 0 4px 16px 0 rgba(31, 38, 135, 0.2);
    color: white;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .marketplace-wallet-connect .marketplace-styled button:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.4);
  }
  
  .marketplace-wallet-connect .marketplace-styled button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .marketplace-wallet-connect .marketplace-styled .flex.items-center.space-x-4 {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    color: white;
  }
  
  .marketplace-wallet-connect .marketplace-styled .space-y-3 {
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 20px;
    box-shadow: 0 12px 48px 0 rgba(31, 38, 135, 0.5);
    padding: 1.5rem;
    color: white;
  }
  
  .marketplace-wallet-connect .marketplace-styled .bg-blue-50 {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    color: rgba(59, 130, 246, 0.9);
  }
  
  .marketplace-wallet-connect .marketplace-styled .bg-blue-50 a {
    color: rgba(59, 130, 246, 1);
  }
  
  .marketplace-wallet-connect .marketplace-styled .text-gray-600 {
    color: rgba(255, 255, 255, 0.8);
  }
  
  .marketplace-wallet-connect .marketplace-styled .text-gray-900 {
    color: white;
  }
  
  .marketplace-wallet-connect .marketplace-styled .border-gray-200 {
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .marketplace-wallet-connect .marketplace-styled .hover\\:border-blue-500:hover {
    border-color: rgba(59, 130, 246, 0.5);
  }
  
  .marketplace-wallet-connect .marketplace-styled .hover\\:bg-blue-50:hover {
    background: rgba(59, 130, 246, 0.1);
  }
  
  .marketplace-wallet-connect .marketplace-styled .bg-gray-100 {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .marketplace-wallet-connect .marketplace-styled .text-gray-400 {
    color: rgba(255, 255, 255, 0.6);
  }
  
  /* Connected state styling */
  .marketplace-wallet-connect .marketplace-styled .bg-green-500 {
    background: rgba(16, 185, 129, 0.8);
  }
  
  .marketplace-wallet-connect .marketplace-styled .bg-red-500 {
    background: rgba(239, 68, 68, 0.8);
  }
  
  .marketplace-wallet-connect .marketplace-styled .bg-blue-500 {
    background: rgba(59, 130, 246, 0.8);
  }
  
  .marketplace-wallet-connect .marketplace-styled .bg-gray-500 {
    background: rgba(107, 114, 128, 0.8);
  }
  
  .marketplace-wallet-connect .marketplace-styled .bg-yellow-500 {
    background: rgba(245, 158, 11, 0.8);
  }
  
  .marketplace-wallet-connect .marketplace-styled .hover\\:bg-green-600:hover {
    background: rgba(5, 150, 105, 0.9);
  }
  
  .marketplace-wallet-connect .marketplace-styled .hover\\:bg-red-600:hover {
    background: rgba(220, 38, 38, 0.9);
  }
  
  .marketplace-wallet-connect .marketplace-styled .hover\\:bg-blue-600:hover {
    background: rgba(37, 99, 235, 0.9);
  }
  
  .marketplace-wallet-connect .marketplace-styled .hover\\:bg-gray-600:hover {
    background: rgba(75, 85, 99, 0.9);
  }
`;

// Add the styles to the document head
if (typeof document !== 'undefined') {
  const styleId = 'marketplace-wallet-connect-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = marketplaceWalletStyles;
    document.head.appendChild(style);
  }
}