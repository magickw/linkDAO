import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Plus,
  Search,
  Filter,
  Heart,
  Shield,
  DollarSign,
  Image,
  Tag,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Users,
  HelpCircle,
  MessageCircle
} from 'lucide-react';

const MarketplaceGuide: NextPage = () => {
  const [currentSection, setCurrentSection] = useState('buying');

  const sections = [
    { id: 'buying', title: 'Buying Items', icon: ShoppingCart },
    { id: 'selling', title: 'Selling Items', icon: Plus },
    { id: 'search', title: 'Searching & Filtering', icon: Search },
    { id: 'payments', title: 'Payments & Security', icon: DollarSign },
    { id: 'safety', title: 'Safety Tips', icon: Shield }
  ];

  const BuyingGuide = () => (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <ShoppingCart className="w-6 h-6 text-green-600 mr-3" />
          Step-by-Step Buying Process
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
              <span className="text-blue-800 dark:text-blue-200 font-medium">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Browse the Marketplace</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Navigate to the Marketplace section and explore categories or use the search bar to find specific items.
              </p>
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center text-xs text-gray-500 mb-2">
                  <Search className="w-3 h-3 mr-1" />
                  Search Bar Example
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm">
                  Search for items...
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
              <span className="text-blue-800 dark:text-blue-200 font-medium">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">View Item Details</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Click on any item to see detailed information including description, price, seller ratings, and photos.
              </p>
              <div className="mt-3 flex items-center space-x-4 text-sm">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Verified Seller
                </div>
                <div className="flex items-center text-blue-600">
                  <Heart className="w-4 h-4 mr-1" />
                  24 Favorites
                </div>
                <div className="flex items-center text-gray-500">
                  <Users className="w-4 h-4 mr-1" />
                  12 Reviews
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
              <span className="text-blue-800 dark:text-blue-200 font-medium">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Select Quantity & Options</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Choose how many items you want and select any available options (size, color, etc.).
              </p>
              <div className="mt-3 flex items-center space-x-4">
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
                  <button className="px-3 py-1 text-gray-600">-</button>
                  <span className="px-3 py-1 border-x border-gray-300 dark:border-gray-600">1</span>
                  <button className="px-3 py-1 text-gray-600">+</button>
                </div>
                <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm">
                  <option>Size: Medium</option>
                  <option>Size: Large</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-4 mt-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Complete Purchase</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Review your order, select payment method, and confirm the transaction through your wallet.
              </p>
              <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center text-green-700 dark:text-green-300">
                  <Shield className="w-5 h-5 mr-2" />
                  <span className="font-medium">Escrow Protection Enabled</span>
                </div>
                <p className="text-sm mt-1">Your payment is held securely until you confirm receipt</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Payment Methods
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              ETH (Ethereum)
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              USDC (Stablecoin)
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              USDT (Stablecoin)
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Other supported tokens
            </li>
          </ul>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-5 border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Buyer Protection
          </h4>
          <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Escrow system holds payments
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Dispute resolution process
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Seller rating system
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              30-day return policy
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  const SellingGuide = () => (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Plus className="w-6 h-6 text-blue-600 mr-3" />
          Creating Your First Listing
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
              <span className="text-blue-800 dark:text-blue-200 font-medium">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Click "Create Listing"</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Find the "Sell Item" or "Create Listing" button in the marketplace navigation.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
              <span className="text-blue-800 dark:text-blue-200 font-medium">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Add Item Details</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                Provide comprehensive information about your item:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Required</div>
                  <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Title</li>
                    <li>• Description</li>
                    <li>• Price</li>
                    <li>• Photos</li>
                  </ul>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Optional</div>
                  <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Category</li>
                    <li>• Tags</li>
                    <li>• Condition</li>
                    <li>• Specifications</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
              <span className="text-blue-800 dark:text-blue-200 font-medium">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Upload High-Quality Photos</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                Add clear, well-lit photos from multiple angles:
              </p>
              <div className="flex space-x-2 mb-3">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Image className="w-6 h-6 text-gray-400" />
                </div>
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Image className="w-6 h-6 text-gray-400" />
                </div>
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Image className="w-6 h-6 text-gray-400" />
                </div>
              </div>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Minimum 3 photos recommended</li>
                <li>• Show item from different angles</li>
                <li>• Include close-ups of important details</li>
                <li>• Use good lighting and clear backgrounds</li>
              </ul>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-4 mt-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Publish Your Listing</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Review all details, set your pricing, and click publish. Your listing will appear in search results immediately.
              </p>
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center text-green-700 dark:text-green-300">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="font-medium">Listing Published Successfully!</span>
                </div>
                <p className="text-xs mt-1">Your item is now visible to thousands of potential buyers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-lg mb-4 text-center">Seller Success Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Competitive Pricing', desc: 'Research similar items to set attractive prices' },
            { title: 'Detailed Descriptions', desc: 'Include measurements, materials, and condition' },
            { title: 'Fast Responses', desc: 'Reply to buyer questions within 24 hours' },
            { title: 'High-Quality Photos', desc: 'Clear, well-lit images increase sales by 40%' },
            { title: 'Accurate Categories', desc: 'Proper categorization improves search visibility' },
            { title: 'Excellent Service', desc: 'Good reviews lead to more sales and higher prices' }
          ].map((tip, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">{tip.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const SearchGuide = () => (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Search className="w-6 h-6 text-purple-600 mr-3" />
          Mastering Search & Filters
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Search Techniques</h4>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Basic Search</div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-3 py-2 mb-2">
                  vintage leather jacket
                </div>
                <p className="text-xs text-gray-500">Searches titles, descriptions, and tags</p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Advanced Search</div>
                <div className="space-y-2">
                  <div className="flex items-center text-xs">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded mr-2">"exact phrase"</span>
                    <span className="text-gray-500">Exact matches only</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded mr-2">-exclude</span>
                    <span className="text-gray-500">Exclude terms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Filter Options</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="text-sm">Price Range</span>
                </div>
                <span className="text-xs text-gray-500">$50 - $200</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center">
                  <Tag className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm">Category</span>
                </div>
                <span className="text-xs text-gray-500">Electronics</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center">
                  <Heart className="w-4 h-4 text-purple-600 mr-2" />
                  <span className="text-sm">Condition</span>
                </div>
                <span className="text-xs text-gray-500">New</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center">
                  <Users className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-sm">Seller Rating</span>
                </div>
                <span className="text-xs text-gray-500">4.5+ stars</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
        <h3 className="font-semibold text-lg mb-4 text-center">Search Pro Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Save Searches</h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Create saved searches to get notifications when new items match your criteria.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Sort Options</h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Sort by price, date listed, popularity, or seller rating to find exactly what you want.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Wishlist Items</h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Add items to your wishlist to track price drops and availability changes.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Compare Items</h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Use the comparison feature to evaluate multiple items side-by-side before purchasing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const PaymentsGuide = () => (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <DollarSign className="w-6 h-6 text-green-600 mr-3" />
          Payments & Transaction Security
        </h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Supported Payment Methods</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs font-bold">Ξ</span>
                  </div>
                  <div>
                    <div className="font-medium">Ethereum (ETH)</div>
                    <div className="text-xs text-gray-500">Native cryptocurrency</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-blue-600">USDC</span>
                  </div>
                  <div>
                    <div className="font-medium">USD Coin (USDC)</div>
                    <div className="text-xs text-gray-500">Stablecoin pegged to USD</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-green-600">USDT</span>
                  </div>
                  <div>
                    <div className="font-medium">Tether (USDT)</div>
                    <div className="text-xs text-gray-500">Popular stablecoin</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Transaction Process</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs text-blue-600">1</span>
                  </div>
                  <span className="text-sm">Confirm purchase details</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs text-blue-600">2</span>
                  </div>
                  <span className="text-sm">Wallet prompts for signature</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm">Transaction confirmed on blockchain</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-5 border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Security Features
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium">Smart Contract Escrow</span>
                </div>
                <p className="text-green-700 dark:text-green-300 text-xs ml-6">
                  Payments held securely until delivery confirmation
                </p>
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium">Dispute Resolution</span>
                </div>
                <p className="text-green-700 dark:text-green-300 text-xs ml-6">
                  Mediated process for unresolved issues
                </p>
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium">Seller Verification</span>
                </div>
                <p className="text-green-700 dark:text-green-300 text-xs ml-6">
                  Identity checks and reputation scoring
                </p>
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="font-medium">Transparent Fees</span>
                </div>
                <p className="text-green-700 dark:text-green-300 text-xs ml-6">
                  All fees displayed before transaction
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const SafetyGuide = () => (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Shield className="w-6 h-6 text-red-600 mr-3" />
          Marketplace Safety Guide
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Buyer Safety Tips</h4>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-800 dark:text-red-200">Red Flags</span>
                </div>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• Prices significantly below market value</li>
                  <li>• Sellers refusing escrow protection</li>
                  <li>• Pressure to use external payment methods</li>
                  <li>• Poor communication or evasive answers</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800 dark:text-green-200">Best Practices</span>
                </div>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• Always use platform escrow system</li>
                  <li>• Verify seller ratings and reviews</li>
                  <li>• Ask detailed questions before purchasing</li>
                  <li>• Keep all communication on platform</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Seller Safety Tips</h4>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-800 dark:text-red-200">Avoid These</span>
                </div>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• Sharing personal contact information</li>
                  <li>• Accepting payments outside the platform</li>
                  <li>• Shipping before payment confirmation</li>
                  <li>• Ignoring buyer verification requests</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800 dark:text-green-200">Protect Yourself</span>
                </div>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• Document item condition with photos</li>
                  <li>• Use tracked shipping with insurance</li>
                  <li>• Communicate professionally and promptly</li>
                  <li>• Report suspicious activity immediately</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
        <h3 className="font-semibold text-lg mb-4 text-center">Emergency Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Suspicious Activity</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Report immediately to support team</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Dispute Process</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Initiate within 48 hours of issue</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Safe Transactions</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Always use escrow protection</p>
          </div>
        </div>
      </div>
    </div>
  );

  const getCurrentContent = () => {
    switch(currentSection) {
      case 'buying': return <BuyingGuide />;
      case 'selling': return <SellingGuide />;
      case 'search': return <SearchGuide />;
      case 'payments': return <PaymentsGuide />;
      case 'safety': return <SafetyGuide />;
      default: return <BuyingGuide />;
    }
  };

  return (
    <>
      <Head>
        <title>Marketplace Guide - LinkDAO</title>
        <meta name="description" content="Complete illustrated guide to buying, selling, and navigating the LinkDAO marketplace safely" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/docs/getting-started" className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-6 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Getting Started
          </Link>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <ShoppingCart className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Marketplace Guide
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Learn how to buy, sell, and navigate the LinkDAO marketplace with confidence
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-12">
            <div className="flex flex-wrap justify-center gap-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSection(section.id)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentSection === section.id
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {section.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-8">
              {getCurrentContent()}
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/marketplace" className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
              <ShoppingCart className="w-8 h-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Visit Marketplace</h3>
              <p className="text-sm opacity-90">Start browsing items now</p>
            </Link>
            
            <Link href="/support/faq" className="bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
              <HelpCircle className="w-8 h-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">FAQ</h3>
              <p className="text-sm opacity-90">Get answers to common questions</p>
            </Link>
            
            <Link href="/support/live-chat" className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
              <MessageCircle className="w-8 h-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Live Support</h3>
              <p className="text-sm opacity-90">Chat with our support team</p>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default MarketplaceGuide;