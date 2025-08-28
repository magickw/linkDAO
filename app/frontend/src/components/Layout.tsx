import React, { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title = 'LinkDAO' }: LayoutProps) {
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