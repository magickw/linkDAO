import React, { ReactNode, useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import NotificationSystem from '@/components/NotificationSystem';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title = 'LinkDAO' }: LayoutProps) {
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);

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

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{title}</title>
        <meta name="description" content="LinkDAO - Web3 Social Platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            LinkDAO
          </Link>
          <div className="hidden md:flex items-center space-x-4">
            <nav>
              <ul className="flex space-x-4">
                <li><Link href="/" className="text-gray-600 hover:text-primary-600">Home</Link></li>
                <li><Link href="/social" className="text-gray-600 hover:text-primary-600">Feed</Link></li>
                <li><Link href="/profile" className="text-gray-600 hover:text-primary-600">Profile</Link></li>
                <li><Link href="/wallet" className="text-gray-600 hover:text-primary-600">Wallet</Link></li>
                <li><Link href="/governance" className="text-gray-600 hover:text-primary-600">Governance</Link></li>
                <li><Link href="/marketplace" className="text-gray-600 hover:text-primary-600">Marketplace</Link></li>
                {isAdmin && (
                  <li><Link href="/admin" className="text-gray-600 hover:text-primary-600">Admin</Link></li>
                )}
              </ul>
            </nav>
            <ConnectButton />
          </div>
          <div className="md:hidden flex items-center space-x-4">
            <ConnectButton />
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600 hover:text-primary-600 focus:outline-none">
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
        {isMenuOpen && (
          <div className="md:hidden">
            <nav className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
              <ul className="space-y-1">
                <li><Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Home</Link></li>
                <li><Link href="/social" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Feed</Link></li>
                <li><Link href="/profile" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Profile</Link></li>
                <li><Link href="/wallet" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Wallet</Link></li>
                <li><Link href="/governance" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Governance</Link></li>
                <li><Link href="/marketplace" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Marketplace</Link></li>
                {isAdmin && (
                  <li><Link href="/admin" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Admin</Link></li>
                )}
              </ul>
              <div className="mt-4 px-3">
                <ConnectButton />
              </div>
            </nav>
          </div>
        )}
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <footer className="bg-white mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} LinkDAO. All rights reserved.
          </p>
        </div>
      </footer>

      {isConnected && <NotificationSystem />}
    </div>
  );
}