import React, { ReactNode, useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import dynamic from 'next/dynamic';
import { useChatHistory } from '@/hooks/useChatHistory';
import { governanceService } from '@/services/governanceService';
import { CommunityMembershipService } from '@/services/communityMembershipService';

const Analytics = dynamic(() => import('@vercel/analytics/react').then(mod => ({ default: mod.Analytics })), {
  ssr: false
});
import NotificationSystem from '@/components/NotificationSystem';
import MobileNavigation from './MobileNavigation';
import { MessagingWidget } from '@/components/Messaging';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  hideFooter?: boolean;
  fullWidth?: boolean;
}

type NavItem = {
  name: string;
  href: string;
  icon: string;
  badge?: number;
};

export default function Layout({ children, title = 'LinkDAO', hideFooter = false, fullWidth = false }: LayoutProps & { fullWidth?: boolean }) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live badge counts
  const { conversations } = useChatHistory();
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [governancePending, setGovernancePending] = useState(0);

  // For demo purposes, we'll consider a specific address as admin
  // In a real implementation, this would be checked against a backend service
  useEffect(() => {
    if (isConnected && address) {
      // This is a placeholder - in a real app, you would check admin status via backend
      // For demo, we'll use a specific address as admin
      const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
      setIsAdmin(address.toLowerCase() === adminAddress);
    }
  }, [address, isConnected]);

  // Initialize dark mode based on system preference or saved preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedDarkMode !== null) {
        setDarkMode(savedDarkMode === 'true');
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(systemPrefersDark);
      }
    }
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('darkMode', darkMode.toString());
    }
  }, [darkMode]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Navigation items with icons - Home now serves as the main Feed/Dashboard
  const navItems: NavItem[] = useMemo(() => ([
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Communities', href: '/communities', icon: '👥' },
    { name: 'Messages', href: '/messaging', icon: '💬' },
    { name: 'Governance', href: '/governance', icon: '🗳️' },
    { name: 'Marketplace', href: '/marketplace', icon: '🛒' },
  ]), []);

  // User-specific navigation items (only for authenticated users)
  const userNavItems: NavItem[] = isConnected ? [
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ] : [];

  // Combine all navigation items
  const allNavItems = [...navItems, ...userNavItems];

  // Compute real unread counts for messages and governance
  useEffect(() => {
    try {
      if (!address) { setMessagesUnread(0); return; }
      const total = (conversations || []).reduce((sum, conv: any) => sum + (conv.unreadCounts?.[address] || 0), 0);
      setMessagesUnread(total);
    } catch { setMessagesUnread(0); }
  }, [conversations, address]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!address) { if (active) setGovernancePending(0); return; }
        // Get user's joined communities
        const memberships = await CommunityMembershipService.getUserMemberships(address, { isActive: true, limit: 100 });
        const communityIds = new Set((memberships || []).map((m: any) => m.communityId));
        // Fetch active proposals across all and filter to joined communities only
        const proposals = await governanceService.getAllActiveProposals();
        const count = Array.isArray(proposals)
          ? proposals.filter((p: any) => (p.status === 'ACTIVE' || p.status === 'active') && communityIds.has(p.communityId) && (p.canVote ?? true)).length
          : 0;
        if (active) setGovernancePending(count);
      } catch { if (active) setGovernancePending(0); }
    })();
    return () => { active = false; };
  }, [address]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Head>
        <title>{title}</title>
        <meta name="description" content="LinkDAO - Web3 Social Platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <Link href="/" className="text-2xl font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">
            LinkDAO
          </Link>

          {/* Global Search (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                placeholder="Search"
                className="w-full rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Global search"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <nav>
              <ul className="flex space-x-2">
                {allNavItems.map((item) => {
                  const isActive = router.pathname === item.href;
                  const dynamicBadge = item.badge ?? (item.href === '/messaging' ? messagesUnread : item.href === '/governance' ? governancePending : 0);
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`group relative flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors transition-transform ${isActive
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                            : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-700/50'
                          } hover:scale-[1.03]`}
                      >
                        <span className="flex flex-col items-center leading-4">
                          <span className="text-base">{item.icon}</span>
                          <span className="text-[11px] mt-0.5">{item.name}</span>
                        </span>
                        {dynamicBadge > 0 && (
                          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-primary-600 text-white text-[10px] px-1.5 py-0.5 leading-none shadow">
                            {dynamicBadge > 99 ? '99+' : dynamicBadge}
                          </span>
                        )}
                        {isActive && (
                          <span className="pointer-events-none absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-primary-600" />
                        )}
                      </Link>
                    </li>
                  );
                })}
                {isAdmin && (
                  <li>
                    <Link
                      href="/admin"
                      className={`group relative flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors transition-transform ${router.pathname === '/admin'
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                          : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-700/50'
                        } hover:scale-[1.03]`}
                    >
                      <span className="mr-1">🔒</span>
                      Admin
                      {router.pathname === '/admin' && (
                        <span className="pointer-events-none absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-primary-600" />
                      )}
                    </Link>
                  </li>
                )}
              </ul>
            </nav>


            <div className="flex items-center space-x-2">
              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              <ConnectButton />
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <ConnectButton />

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <nav className="px-2 pt-2 pb-4 space-y-1">
              <ul className="space-y-1">
                {allNavItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${router.pathname === item.href
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                        }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="mr-2">{item.icon}</span>
                      <span className="flex-1">{item.name}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary-600 text-white text-xs px-2 py-0.5">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
                {isAdmin && (
                  <li>
                    <Link
                      href="/admin"
                      className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${router.pathname === '/admin'
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                        }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="mr-2">🔒</span>
                      Admin
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        )}
      </header>

      <main className={fullWidth ? "w-full" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"}>
        {children}
      </main>

      {!hideFooter && (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="/" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Home</Link></li>
                <li><Link href="/dao/ethereum-builders" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Communities</Link></li>
                <li><Link href="/marketplace" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Marketplace</Link></li>
                <li><Link href="/governance" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Governance</Link></li>
              </ul>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Connect</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Twitter</a></li>
                <li><a href="#" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Discord</a></li>
                <li><a href="#" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Telegram</a></li>
                <li><a href="#" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">GitHub</a></li>
              </ul>
            </div>

            {/* Legal Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-base text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">Privacy Policy</Link></li>
              </ul>
            </div>

            {/* Newsletter Subscription */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stay Updated</h3>
              <p className="text-base text-gray-600 dark:text-gray-300">Join our newsletter to get the latest updates.</p>
              <form className="flex flex-col sm:flex-row">
                <input type="email" placeholder="Enter your email" className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500" />
                <button type="submit" className="mt-2 sm:mt-0 sm:ml-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Subscribe</button>
              </form>
            </div>
          </div>

          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <p className="text-base text-gray-500 dark:text-gray-400 text-center">
              © {new Date().getFullYear()} LinkDAO. All rights reserved.
            </p>
            <p className="text-base text-gray-500 dark:text-gray-400 text-center">
              Designed and powered by{" "}
              <a
                href="https://bytestitch.us/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                ByteStitch
              </a>
            </p>
          </div>
        </div>
        <Analytics />
      </footer>
      )}

      {/* {isConnected && <NotificationSystem />} */}

      {/* Wallet-to-Wallet Messaging Widget - Available when connected */}
      {isConnected && <MessagingWidget />}

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
}