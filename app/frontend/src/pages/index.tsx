
import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { useRouter } from 'next/router';
import { ArrowRight, CheckCircle, ChevronRight, Compass, DollarSign, Lock, Users } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useWeb3();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isConnected) {
      router.push('/dashboard');
    }
  }, [mounted, isConnected, router]);

  if (!mounted || isConnected) {
    return null; // Don't render anything during SSR or while redirecting
  }

  return (
    <Layout title="LinkDAO - The Web3 Social Network">
      {/* Hero Section */}
      <div className="text-center py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
          LinkDAO — The Web3 Social Network where Identity, Money, and Governance are Yours.
        </h1>
        <div className="mt-8 flex justify-center gap-4">
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, authenticationStatus, mounted: rainbowMounted }) => {
              const ready = rainbowMounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <button
                  onClick={openConnectModal}
                  disabled={!ready}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  Get Started
                </button>
              );
            }}
          </ConnectButton.Custom>
          <Link href="#features" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-700 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              Learn More
          </Link>
        </div>
      </div>

      {/* Key Features Grid */}
      <div id="features" className="py-16 bg-white dark:bg-gray-900 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Social</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Post, follow, and build your own Web3-native community without ads or censorship.
              </p>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Wallet</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Send and receive payments in ETH and stablecoins directly inside the platform.
              </p>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Governance</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Create and vote on proposals that shape the community and treasury.
              </p>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Marketplace</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Buy & sell digital + physical goods with crypto and NFT-based trust certificates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why LinkDAO Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-800 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Why LinkDAO</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Own Your Identity</h3>
              <p className="text-gray-600 dark:text-gray-300">No email logins, just your wallet.</p>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Global Payments</h3>
              <p className="text-gray-600 dark:text-gray-300">Crypto-native, borderless, and instant.</p>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Community-Driven</h3>
              <p className="text-gray-600 dark:text-gray-300">You decide how the platform evolves.</p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-white dark:bg-gray-900 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">How It Works</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6 flex flex-col items-center">
              <Compass className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">1. Connect Wallet</h3>
            </div>
            <div className="p-6 flex flex-col items-center">
              <Users className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">2. Create Profile</h3>
            </div>
            <div className="p-6 flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">3. Join Communities / List Products</h3>
            </div>
            <div className="p-6 flex flex-col items-center">
              <DollarSign className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">4. Participate in DAO</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Transparency Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-800 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Trust & Transparency</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <Lock className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">On-chain escrow</h3>
              <p className="text-gray-600 dark:text-gray-300">Safe payments for your peace of mind.</p>
            </div>
            <div className="p-6">
              <CheckCircle className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">NFT receipts</h3>
              <p className="text-gray-600 dark:text-gray-300">Digital ownership for your purchases.</p>
            </div>
            <div className="p-6">
              <Users className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Transparent DAO governance</h3>
              <p className="text-gray-600 dark:text-gray-300">A community-driven platform.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Screenshots / Demo Preview Section */}
      <div className="py-16 bg-white dark:bg-gray-900 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">App Preview</h2>
          <div className="mt-12 h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">App screenshot carousel placeholder</p>
          </div>
        </div>
      </div>

      {/* Community & Growth Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-800 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Join our Community</h2>
          <div className="mt-8 flex justify-center gap-8">
            <div>
              <p className="text-4xl font-bold text-primary-600">1,200+</p>
              <p className="text-gray-600 dark:text-gray-300">Test Users</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary-600">300+</p>
              <p className="text-gray-600 dark:text-gray-300">Marketplace Listings</p>
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <a href="#" className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
              Join our Discord
            </a>
            <a href="#" className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
              Follow us on X
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
