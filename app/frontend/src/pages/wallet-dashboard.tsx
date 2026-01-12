/**
 * Enhanced Wallet Dashboard Page
 * New wallet page using the LinkDAO Wallet Dashboard component
 */

import React from 'react';
import Head from 'next/head';
import { LinkDAOWalletDashboard } from '@/components/Wallet';

export default function WalletDashboardPage() {
  return (
    <>
      <Head>
        <title>Wallet Dashboard - LinkDAO</title>
        <meta name="description" content="LinkDAO Wallet Dashboard - Manage your crypto assets, stake tokens, and participate in governance" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen">
        <LinkDAOWalletDashboard />
      </div>
    </>
  );
}