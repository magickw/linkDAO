import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, AlertTriangle } from 'lucide-react';

const WalletSecurityPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Wallet Security - LinkDAO</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Link href="/support" className="inline-flex items-center text-blue-600 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          <h1 className="text-4xl font-bold mb-6">Wallet Security Best Practices</h1>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
              <Shield className="w-8 h-8 text-green-600 mb-4" />
              <h2 className="text-xl font-bold mb-2">Secure Your Seed Phrase</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Never share your seed phrase with anyone</li>
                <li>Store it offline in a secure location</li>
                <li>Never enter it on websites</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
              <Lock className="w-8 h-8 text-blue-600 mb-4" />
              <h2 className="text-xl font-bold mb-2">Use Strong Passwords</h2>
              <p>Enable 2FA and use unique passwords for your wallet.</p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200">
              <AlertTriangle className="w-8 h-8 text-red-600 mb-4" />
              <h2 className="text-xl font-bold mb-2">Watch Out for Scams</h2>
              <p>Always verify URLs and never approve suspicious transactions.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WalletSecurityPage;
