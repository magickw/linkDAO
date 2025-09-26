/**
 * Messaging Page - Dedicated wallet-to-wallet messaging interface
 * Full-page experience for Web3 messaging
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import Layout from '@/components/Layout';
import { GlassPanel } from '@/design-system';
import { DiscordStyleMessagingInterface } from '@/components/Messaging';

export default function MessagingPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <Layout 
        title="Messages - LinkDAO"
      >
        <div className="flex items-center justify-center h-full">
          <GlassPanel className="text-center p-8 max-w-md">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-300 mb-6">
              Connect your wallet to access wallet-to-wallet messaging and start conversations with other Web3 users.
            </p>
          </GlassPanel>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Messages - LinkDAO</title>
        <meta name="description" content="Secure wallet-to-wallet messaging on LinkDAO" />
      </Head>
      
      <Layout 
        title="Messages - LinkDAO"
      >
        <div className="h-full">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Wallet-to-Wallet Messages
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Secure, encrypted messaging between Web3 addresses across multiple chains
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <DiscordStyleMessagingInterface className="h-full" />
          </div>
          
          {/* Feature Highlights */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassPanel className="p-4 text-center">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-sm">End-to-End Encrypted</h3>
              <p className="text-gray-400 text-xs mt-1">Your messages are secured with AES-GCM encryption</p>
            </GlassPanel>
            
            <GlassPanel className="p-4 text-center">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-sm">Multichain Support</h3>
              <p className="text-gray-400 text-xs mt-1">Message EVM and SVM addresses, ENS names</p>
            </GlassPanel>
            
            <GlassPanel className="p-4 text-center">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-sm">NFT Negotiations</h3>
              <p className="text-gray-400 text-xs mt-1">Built-in bot for NFT trading conversations</p>
            </GlassPanel>
          </div>
        </div>
      </Layout>
    </>
  );
}