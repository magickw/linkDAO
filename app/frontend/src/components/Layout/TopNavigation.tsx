import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NetworkSwitcher } from '@/components/Web3/NetworkSwitcher';
import { useAuth } from '@/context/AuthContext';

interface TopNavigationProps {
    variant?: 'dashboard' | 'marketplace' | 'community' | 'governance';
    className?: string;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
    variant = 'dashboard',
    className = ''
}) => {
    const router = useRouter();
    const { isConnected } = useAccount();
    const { isAuthenticated } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Mock reputation data - in real app, this would come from a hook or service
    const userReputation = {
        score: 850,
        level: 'Trusted Seller',
        daoApproved: true
    };

    const getNavItems = () => {
        switch (variant) {
            case 'marketplace':
                return [
                    { name: 'Home', href: '/', icon: '🏠' },
                    { name: 'Marketplace', href: '/marketplace', icon: '🛒' },
                    { name: 'NFTs', href: '/nfts', icon: '🎨' },
                    { name: 'Services', href: '/services', icon: '⚡' },
                    { name: 'Governance', href: '/governance', icon: '🗳️' },
                ];
            case 'community':
                return [
                    { name: 'Home', href: '/', icon: '🏠' },
                    { name: 'Communities', href: '/communities', icon: '👥' },
                    { name: 'Governance', href: '/governance', icon: '🗳️' },
                ];
            case 'governance':
                return [
                    { name: 'Home', href: '/', icon: '🏠' },
                    { name: 'Proposals', href: '/governance', icon: '📋' },
                    { name: 'Voting', href: '/governance/voting', icon: '🗳️' },
                ];
            default: // dashboard
                return [
                    { name: 'Home', href: '/', icon: '🏠' },
                    { name: 'Communities', href: '/communities', icon: '👥' },
                    { name: 'Marketplace', href: '/marketplace', icon: '🛒' },
                    { name: 'Governance', href: '/governance', icon: '🗳️' },
                ];
        }
    };

    const navItems = getNavItems();
    const isActiveRoute = (href: string) => router.pathname === href;

    const getBackgroundStyle = () => {
        switch (variant) {
            case 'marketplace':
                return 'bg-black/20 backdrop-blur-lg border-b border-white/10';
            case 'community':
                return 'bg-purple-900/20 backdrop-blur-lg border-b border-purple-400/20';
            case 'governance':
                return 'bg-blue-900/20 backdrop-blur-lg border-b border-blue-400/20';
            default:
                return 'bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/50';
        }
    };

    return (
        <nav className={`sticky top-0 z-50 ${getBackgroundStyle()} ${className}`}>
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
                                <span className="text-white font-bold text-sm">LD</span>
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                LinkDAO
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
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActiveRoute(item.href)
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

                        {/* Web3 Controls */}
                        <div className="flex items-center space-x-3">
                            {/* User Reputation (when connected and authenticated) */}
                            {isConnected && isAuthenticated && (
                                <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-400/30">
                                    <div className="flex items-center space-x-1">
                                        <span className="text-yellow-400">⭐</span>
                                        <span className="text-sm font-semibold text-white">{userReputation.score}</span>
                                    </div>
                                    {userReputation.daoApproved && (
                                        <div className="flex items-center space-x-1">
                                            <span className="text-green-400">✓</span>
                                            <span className="text-xs text-green-300">DAO</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Network Switcher */}
                            {isConnected && <NetworkSwitcher variant="compact" showDisconnect={true} />}

                            {/* Wallet Connect Button */}
                            <ConnectButton
                                accountStatus="address"
                                showBalance={false}
                                chainStatus="none"
                                label="Connect Wallet"
                            />
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center space-x-2">
                        {/* Mobile Web3 Controls */}
                        <div className="flex items-center space-x-2">
                            {isConnected && <NetworkSwitcher variant="compact" showDisconnect={true} />}
                            <ConnectButton
                                accountStatus="address"
                                showBalance={false}
                                chainStatus="none"
                                label="Connect"
                            />
                        </div>

                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="md:hidden py-4 border-t border-white/10"
                    >
                        <div className="space-y-2">
                            {/* Mobile User Reputation */}
                            {isConnected && isAuthenticated && (
                                <div className="px-4 py-2 mb-4">
                                    <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-400/30">
                                        <div className="flex items-center space-x-1">
                                            <span className="text-yellow-400">⭐</span>
                                            <span className="text-sm font-semibold text-white">{userReputation.score}</span>
                                        </div>
                                        {userReputation.daoApproved && (
                                            <div className="flex items-center space-x-1">
                                                <span className="text-green-400">✓</span>
                                                <span className="text-xs text-green-300">DAO Verified</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Mobile Navigation Links */}
                            {navItems.map((item) => (
                                <Link key={item.name} href={item.href}>
                                    <motion.div
                                        whileTap={{ scale: 0.98 }}
                                        className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all ${isActiveRoute(item.href)
                                            ? 'bg-white/20 text-white'
                                            : 'text-white/80 hover:text-white hover:bg-white/10'
                                            }`}
                                        onClick={() => setIsMobileMenuOpen(false)}
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
        </nav>
    );
};

export default TopNavigation;