/**
 * Contracts Page
 * Showcases the Smart Contract Dashboard
 */

import React from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { SmartContractDashboard } from '@/components/Dashboard/SmartContractDashboard';

const ContractsPage: React.FC = () => {
  return (
    <Layout title="Smart Contracts - LinkDAO" fullWidth={false}>
      <Head>
        <title>Smart Contracts - LinkDAO</title>
        <meta name="description" content="Monitor and interact with LinkDAO smart contracts in real-time" />
        <meta property="og:title" content="Smart Contracts - LinkDAO" />
        <meta property="og:description" content="Monitor and interact with LinkDAO smart contracts in real-time" />
        <link rel="canonical" href="https://linkdao.io/contracts" />
      </Head>

      <SmartContractDashboard />
    </Layout>
  );
};

export default ContractsPage;