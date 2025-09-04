import React, { useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Search, ShoppingCart, User } from 'lucide-react';

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
            <Link href="/marketplace" className="text-2xl font-bold text-blue-600">
              LinkDAO Marketplace
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
          <div className="flex items-center space-x-4">
            {/* Wallet Connect */}
            <div className="flex items-center">
              <ConnectButton
                showBalance={false}
                chainStatus="none"
              />
            </div>

            {/* Cart */}
            <Link href="/marketplace/cart" className="relative p-2">
              <ShoppingCart size={24} className="text-gray-700" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                0
              </span>
            </Link>

            {/* Profile Menu */}
            {isConnected && (
              <div className="relative group">
                <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                  <User size={24} className="text-gray-700" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link href="/marketplace/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    My Profile
                  </Link>
                  <Link href="/marketplace/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    My Orders
                  </Link>
                  <Link href="/marketplace/listings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    My Listings
                  </Link>
                  <Link href="/marketplace/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Settings
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;