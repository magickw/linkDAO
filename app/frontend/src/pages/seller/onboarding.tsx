import React from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { SellerOnboarding } from '@/components/Marketplace/Seller';
import Layout from '@/components/Layout';

export default function SellerOnboardingPage() {
  const router = useRouter();
  const { isConnected } = useAccount();

  const handleOnboardingComplete = () => {
    router.push('/seller/dashboard');
  };

  return (
    <Layout title="Seller Onboarding - LinkDAO Marketplace">
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/marketplace')}
              className="flex items-center text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Marketplace
            </button>
            
            {isConnected ? (
              <div className="text-sm text-white/60">
                Wallet Connected
              </div>
            ) : (
              <div className="text-sm text-yellow-400">
                Please connect your wallet to continue
              </div>
            )}
          </div>
          
          <SellerOnboarding onComplete={handleOnboardingComplete} />
        </div>
      </div>
    </Layout>
  );
}