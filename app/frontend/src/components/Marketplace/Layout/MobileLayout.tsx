import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Home, 
  Search, 
  ShoppingCart, 
  User, 
  Menu, 
  X,
  Package,
  Code,
  Image,
  Calendar,
  Gavel
} from 'lucide-react';
import { useWeb3 } from '@/context/Web3Context';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const MobileLayout = ({ children }: { children: React.ReactNode }) => {
  const { isConnected } = useWeb3();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const categories = [
    { id: 'physical', name: 'Physical Goods', icon: Package },
    { id: 'digital', name: 'Digital Services', icon: Code },
    { id: 'nft', name: 'NFTs & Collectibles', icon: Image },
    { id: 'subscription', name: 'Subscriptions', icon: Calendar },
    { id: 'auction', name: 'Auctions', icon: Gavel }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          
          <Link href="/marketplace" className="flex items-center gap-2 text-xl font-bold text-blue-600">
            <img src="/logo.png" alt="LinkDAO Logo" className="h-8 w-8" />
            <span>LinkDAO</span>
          </Link>
          
          <Link href="/marketplace/search" className="p-2 rounded-lg hover:bg-gray-100">
            <Search size={24} className="text-gray-700" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pb-16">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full">
        <div className="grid grid-cols-5">
          <Link href="/marketplace" className="flex flex-col items-center justify-center p-3 text-gray-700 hover:text-blue-600">
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link href="/marketplace/search" className="flex flex-col items-center justify-center p-3 text-gray-700 hover:text-blue-600">
            <Search size={20} />
            <span className="text-xs mt-1">Search</span>
          </Link>
          <Link href="/marketplace/cart" className="flex flex-col items-center justify-center p-3 text-gray-700 hover:text-blue-600">
            <div className="relative">
              <ShoppingCart size={20} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                0
              </span>
            </div>
            <span className="text-xs mt-1">Cart</span>
          </Link>
          <Link href="/marketplace/profile" className="flex flex-col items-center justify-center p-3 text-gray-700 hover:text-blue-600">
            <User size={20} />
            <span className="text-xs mt-1">Profile</span>
          </Link>
          <div className="flex flex-col items-center justify-center p-3">
            <ConnectButton 
              showBalance={false}
              chainStatus="none"
              accountStatus="avatar"
            />
          </div>
        </div>
      </nav>

      {/* Slide Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMenuOpen(false)}
          ></div>
          <div className="absolute left-0 top-0 bottom-0 w-4/5 bg-white shadow-lg">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Menu</h2>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={24} className="text-gray-700" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <Link 
                        key={category.id}
                        href={`/marketplace/category/${category.id}`}
                        className="flex items-center p-3 rounded-lg hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <IconComponent size={20} className="text-gray-600 mr-3" />
                        <span>{category.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Account</h3>
                <div className="space-y-2">
                  {isConnected ? (
                    <>
                      <Link 
                        href="/marketplace/profile"
                        className="block p-3 rounded-lg hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My Profile
                      </Link>
                      <Link 
                        href="/marketplace/orders"
                        className="block p-3 rounded-lg hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My Orders
                      </Link>
                      <Link 
                        href="/marketplace/listings"
                        className="block p-3 rounded-lg hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My Listings
                      </Link>
                      <Link 
                        href="/marketplace/settings"
                        className="block p-3 rounded-lg hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Settings
                      </Link>
                    </>
                  ) : (
                    <div className="p-3">
                      <ConnectButton
                                      showBalance={false}
                                      chainStatus="none"
                                      showChain={false}
                                    />                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Web3 Features</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    <span>Escrow Protection</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    <span>DAO Governance</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    <span>On-Chain Verification</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                    <span>Instant Settlement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileLayout;