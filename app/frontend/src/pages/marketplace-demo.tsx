/**
 * Marketplace Demo Page - Showcases enhanced marketplace features
 * Demonstrates the improved grid layout, escrow system, and performance optimizations
 */

import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import ProductGridDemo from '../components/Marketplace/ProductDisplay/ProductGridDemo';

const MarketplaceDemoPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Enhanced Marketplace Demo - LinkDAO</title>
        <meta name="description" content="Experience the enhanced LinkDAO marketplace with improved grid layout, multi-seller escrow, and performance optimizations." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <header className="border-b border-white/10 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg"></div>
                  <h1 className="text-xl font-bold text-white">LinkDAO Marketplace</h1>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                    DEMO
                  </span>
                </div>
                
                <nav className="hidden md:flex items-center space-x-6">
                  <a href="#features" className="text-gray-300 hover:text-white transition-colors">
                    Features
                  </a>
                  <a href="#products" className="text-gray-300 hover:text-white transition-colors">
                    Products
                  </a>
                  <a href="#escrow" className="text-gray-300 hover:text-white transition-colors">
                    Escrow
                  </a>
                  <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all">
                    Connect Wallet
                  </button>
                </nav>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ProductGridDemo />
          </main>

          {/* Footer */}
          <footer className="border-t border-white/10 backdrop-blur-md mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid md:grid-cols-4 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-white">Enhanced Features</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✅ Responsive Grid Layout</li>
                    <li>✅ Conditional CTA Buttons</li>
                    <li>✅ Trust Indicators</li>
                    <li>✅ Multi-Seller Escrow</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-white">Performance</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>⚡ Redis Caching</li>
                    <li>⚡ Image Optimization</li>
                    <li>⚡ Lazy Loading</li>
                    <li>⚡ CDN Integration</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-white">Web3 Features</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>🔒 Escrow Protection</li>
                    <li>🗳 DAO Governance</li>
                    <li>💰 Crypto Payments</li>
                    <li>🎨 NFT Support</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-white">Demo Stats</h3>
                  <div className="space-y-2 text-gray-300 text-sm">
                    <div>8 Mock Products</div>
                    <div>4 Categories</div>
                    <div>2 Listing Types</div>
                    <div>100% Escrow Protected</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400 text-sm">
                <p>© 2024 LinkDAO. Enhanced Marketplace Demo - Showcasing E-commerce + Web3 Integration</p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  );
};

export default MarketplaceDemoPage;