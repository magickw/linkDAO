import React from 'react';
import Header from './Layout/Header';

interface MarketplaceLayoutProps {
  children: React.ReactNode;
}

const MarketplaceLayout: React.FC<MarketplaceLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <img src="/logo.png" alt="LinkDAO Logo" className="h-12 w-12" />
            <span className="text-2xl font-bold text-blue-600">LinkDAO Marketplace</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <p className="text-gray-600 text-sm">
                The decentralized marketplace built on Web3 principles with familiar e-commerce experience.
              </p>
            </div>
            <div>
              <h4 className="text-md font-semibold text-gray-800 mb-4">Buy</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">Registry</a></li>
                <li><a href="#" className="hover:text-blue-600">Browse Products</a></li>
                <li><a href="#" className="hover:text-blue-600">DAO-Approved Items</a></li>
                <li><a href="#" className="hover:text-blue-600">NFT Collections</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-md font-semibold text-gray-800 mb-4">Sell</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">Start Selling</a></li>
                <li><a href="#" className="hover:text-blue-600">Seller Dashboard</a></li>
                <li><a href="#" className="hover:text-blue-600">Seller Resources</a></li>
                <li><a href="#" className="hover:text-blue-600">Seller Fees</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-md font-semibold text-gray-800 mb-4">Web3 Features</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Escrow Protection
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  DAO Governance
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  On-Chain Verification
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  Instant Settlement
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
            <p>© 2023 LinkDAO Marketplace. All rights reserved. Built on Web3 principles with familiar e-commerce experience.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketplaceLayout;