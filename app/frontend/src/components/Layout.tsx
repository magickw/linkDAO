import React, { ReactNode, useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

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
          <div className="flex items-center space-x-4">
            <nav>
              <ul className="flex space-x-4">
                <li>
                  <Link href="/" className="text-gray-600 hover:text-primary-600">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/social" className="text-gray-600 hover:text-primary-600">
                    Feed
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="text-gray-600 hover:text-primary-600">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link href="/wallet" className="text-gray-600 hover:text-primary-600">
                    Wallet
                  </Link>
                </li>
                <li>
                  <Link href="/governance" className="text-gray-600 hover:text-primary-600">
                    Governance
                  </Link>
                </li>
                {isAdmin && (
                  <li>
                    <Link href="/admin" className="text-gray-600 hover:text-primary-600">
                      Admin
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
    </div>
  );
}