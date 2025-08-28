import React from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';

export default function Home() {
  return (
    <Layout title="LinkDAO - Web3 Social Platform">
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to LinkDAO
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A privacy-respecting social network where identity, money, and governance are native and portable across apps.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Social</h2>
              <p className="text-gray-600 mb-4">
                Connect with others, share posts, and build your community.
              </p>
              <Link href="/social" className="text-primary-600 hover:text-primary-800 font-medium">
                Explore Social Features →
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Wallet</h2>
              <p className="text-gray-600 mb-4">
                Send and receive payments with built-in crypto wallet.
              </p>
              <Link href="/wallet" className="text-primary-600 hover:text-primary-800 font-medium">
                Access Wallet →
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Governance</h2>
              <p className="text-gray-600 mb-4">
                Participate in DAO governance and community decisions.
              </p>
              <Link href="/governance" className="text-primary-600 hover:text-primary-800 font-medium">
                Join Governance →
              </Link>
            </div>
          </div>
          
          <div className="mt-12">
            <Link 
              href="/register" 
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Create Your Profile
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}