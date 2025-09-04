import React from 'react';
import Head from 'next/head';
// import TopNavigation from '@/components/Layout/TopNavigation';
import { designTokens } from '@/design-system/tokens';

const CommunitiesPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Head>
        <title>Communities - LinkDAO</title>
        <meta name="description" content="Discover and join LinkDAO communities" />
      </Head>

      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Top Navigation */}
        {/* <TopNavigation variant="community" /> */}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Communities
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Connect with like-minded individuals in decentralized communities
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-lg">
                <div className="text-4xl mb-4">🔷</div>
                <h3 className="text-xl font-semibold text-white mb-2">Ethereum Builders</h3>
                <p className="text-white/70 mb-4">1,240 members</p>
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors">
                  Join Community
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-lg">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl font-semibold text-white mb-2">DeFi Traders</h3>
                <p className="text-white/70 mb-4">890 members</p>
                <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors">
                  Join Community
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-lg">
                <div className="text-4xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold text-white mb-2">NFT Collectors</h3>
                <p className="text-white/70 mb-4">2,100 members</p>
                <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors">
                  Join Community
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunitiesPage;