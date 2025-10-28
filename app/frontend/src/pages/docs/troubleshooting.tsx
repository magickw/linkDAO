import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const TroubleshootingPage: NextPage = () => {
  const issues = [
    {
      q: "Wallet won't connect",
      a: "Refresh page, check wallet is unlocked, try different browser."
    },
    {
      q: "Transaction failed",
      a: "Increase gas fees, check wallet balance, wait for network congestion to clear."
    },
    {
      q: "Page loading slowly",
      a: "Clear cache, disable browser extensions, check internet connection."
    },
  ];

  return (
    <>
      <Head>
        <title>Troubleshooting - LinkDAO</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Link href="/support" className="inline-flex items-center text-blue-600 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          <h1 className="text-4xl font-bold mb-6">Troubleshooting Guide</h1>

          <div className="space-y-4">
            {issues.map((issue, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
                <h3 className="font-bold mb-2">{issue.q}</h3>
                <p className="text-gray-600 dark:text-gray-400">{issue.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default TroubleshootingPage;
