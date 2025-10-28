import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Wallet, MessageCircle, ShoppingCart } from 'lucide-react';

const GettingStartedPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Getting Started - LinkDAO</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Link href="/support" className="inline-flex items-center text-blue-600 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Support
          </Link>

          <h1 className="text-4xl font-bold mb-6">Getting Started with LinkDAO</h1>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Step 1: Connect Your Wallet</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
              <Wallet className="w-8 h-8 text-blue-600 mb-4" />
              <p className="mb-4">Install MetaMask or another Web3 wallet, then click "Connect Wallet".</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Step 2: Set Up Profile</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
              <p>Add profile picture, bio, and display name.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
            <div className="flex gap-4">
              <Link href="/support/live-chat" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                Live Chat
              </Link>
              <Link href="/support/faq" className="px-4 py-2 border rounded-lg">
                FAQ
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default GettingStartedPage;
