// Import Web3 polyfills first to ensure compatibility
import '@/utils/web3Polyfills';
import '@/lib/devConfig';

import type { Metadata } from 'next';
import { ReactNode } from 'react';
import '../styles/globals.css';
import '../styles/enhanced-glassmorphism.css';
import '../styles/mobile-optimizations.css';
import '../styles/design-polish.css';
import '../styles/tiptap.css';
import '@rainbow-me/rainbowkit/styles.css';

import RootLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: 'LinkDAO',
  description: 'Decentralized marketplace for digital and physical goods',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}
