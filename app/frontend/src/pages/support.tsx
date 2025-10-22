import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import LDAOSupportCenter from '../components/Support/LDAOSupportCenter';

const SupportPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Support Center - Web3 Marketplace</title>
        <meta name="description" content="Get help with LDAO tokens, marketplace features, and platform support" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <LDAOSupportCenter />
      </div>
    </>
  );
};

export default SupportPage;