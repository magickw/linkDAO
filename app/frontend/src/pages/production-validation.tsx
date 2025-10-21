/**
 * Production Validation Page
 * 
 * Provides access to the production validation dashboard for monitoring
 * the seller integration system deployment and validation status.
 */

import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import ProductionValidationDashboard from '../components/ProductionValidation/ProductionValidationDashboard';

const ProductionValidationPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Production Validation Dashboard - LinkDAO</title>
        <meta 
          name="description" 
          content="Monitor seller integration system validation and deployment status" 
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-background">
        <ProductionValidationDashboard />
      </div>
    </>
  );
};

export default ProductionValidationPage;