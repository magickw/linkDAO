import React from 'react';
import Head from 'next/head';
import CommunitiesIntegrationDemo from '@/components/CommunitiesIntegrationDemo';

const CommunitiesIntegrationDemoPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Communities Integration Demo - LinkDAO</title>
        <meta name="description" content="Demonstration of enhanced communities page with integrated features from tasks 1-8" />
      </Head>
      <CommunitiesIntegrationDemo />
    </>
  );
};

export default CommunitiesIntegrationDemoPage;