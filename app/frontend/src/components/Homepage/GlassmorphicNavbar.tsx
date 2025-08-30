/**
 * GlassmorphicNavbar Component - Sticky navigation with glassmorphism design
 * Implements Web3 marketplace navigation with wallet connect and currency toggle
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GlassNavbar } from '@/design-system/components/GlassPanel';
import { Button, GhostButton } from '@/design-system/components/Button';
import { designTokens } from '@/design-system/tokens';
import { SearchBar } from './SearchBar';
import { CurrencyToggle } from './CurrencyToggle';
import { WalletConnectButton } from './WalletConnectButton';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

export const GlassmorphicNavbar: React.FC = () => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { name: 'Marketplace', href: '/marketplace', icon: '🛒' },
    { name: 'NFTs', href: '/nfts', icon: '🎨' },
    { name: 'Services', href: '/services', icon: '⚡' },
    { name: 'Governance', href: '/governance', icon: '🗳️' },
  ];

  const isActiveRoute = (href: string) => router.pathname === href;

  return (
    <GlassNavbar
      className="sticky top-0 z-50 border-b border-white/10"
      style={{
        background: designTokens.glassmorphism.navbar.background,
        backdropFilter: designTokens.glassmorphism.navbar.backdropFilter,
        boxShadow: designTokens.glassmorphism.navbar.boxShadow,
      }}
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
          <div className="hidden md:flex items-center space-x-8">
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

            {/* Currency Toggle */}
            <CurrencyToggle />

            {/* Language Selector */}
            <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="en">🇺🇸 EN</option>
              <option value="es">🇪🇸 ES</option>
              <option value="fr">🇫🇷 FR</option>
              <option value="de">🇩🇪 DE</option>
            </select>

            {/* Wallet Connect Button */}
            <WalletConnectButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <WalletConnectButton />
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

              {/* Mobile Controls */}
              <div className="px-4 pt-4 space-y-3 border-t border-white/10">
                <CurrencyToggle />
                <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="en">🇺🇸 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="de">🇩🇪 Deutsch</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </GlassNavbar>
  );
};