import React, { useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Search } from 'lucide-react';

const Header = () => {
  const { isConnected, address } = useWeb3();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/marketplace"
              onClick={() => {
                // Force navigation to ensure page refresh on first visit
                if (typeof window !== 'undefined') {
                  window.location.href = '/marketplace';
                }
              }}
              className="flex items-center gap-2 text-2xl font-bold text-blue-600"
            >
              <img src="/logo.png" alt="LinkDAO Logo" className="h-10 w-10" />
              <span>LinkDAO Marketplace</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 mx-8">
            <form onSubmit={handleSearch} className="flex">
              <div className="relative flex-1">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="absolute left-0 top-0 h-full bg-gray-100 border-r border-gray-300 rounded-l-lg px-3 text-sm focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="physical">Physical Goods</option>
                  <option value="digital">Digital Services</option>
                  <option value="nft">NFTs & Collectibles</option>
                  <option value="subscription">Subscriptions</option>
                  <option value="auction">Auctions</option>
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-32 pr-10 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="absolute right-0 top-0 h-full bg-blue-600 text-white px-4 rounded-r-lg hover:bg-blue-700 transition-colors"
                >
                  <Search size={20} />
                </button>
              </div>
            </form>
          </div>

          {/* Right Side Navigation */}
          <div className="flex items-center space-x-3">
            {/* Wallet Connect */}
            <div className="flex items-center">
              <ConnectButton
                showBalance={false}
                chainStatus="none"
              />
            </div>
            {/* Cart and account icons removed - now accessible via Marketplace actions button */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;