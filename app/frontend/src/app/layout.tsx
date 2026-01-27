import type { Metadata } from 'next';
import { ReactNode } from 'react';
import '../styles/globals.css';
import '../styles/enhanced-glassmorphism.css';
import '../styles/mobile-optimizations.css';
import '../styles/design-polish.css';
import '../styles/tiptap.css';
import '@rainbow-me/rainbowkit/styles.css';

export const metadata: Metadata = {
  title: 'LinkDAO',
  description: 'Decentralized marketplace for digital and physical goods',
};

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
        {children}
      </body>
    </html>
  );
}
