import React, { useState } from 'react';
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  BadgeCheck, 
  Award, 
  Plus,
  Edit3,
  Eye,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

// Sample data
const stats = [
  { title: 'Total Sales', value: '124', icon: ShoppingCart, change: '+12%' },
  { title: 'Revenue', value: '2,450 USDC', icon: DollarSign, change: '+8%' },
  { title: 'Products', value: '24', icon: Package, change: '+3%' },
  { title: 'Rating', value: '4.8/5', icon: BadgeCheck, change: '+0.2' }
];

const recentSales = [
  { id: '1', customer: 'Alice Johnson', product: 'Wooden Watch', amount: '45.99 USDC', date: '2023-06-15', status: 'Completed' },
  { id: '2', customer: 'Bob Smith', product: 'Coffee Subscription', amount: '29.99 USDC', date: '2023-06-14', status: 'Shipped' },
  { id: '3', customer: 'Carol Williams', product: 'Leather Wallet', amount: '35.50 USDC', date: '2023-06-14', status: 'Processing' },
  { id: '4', customer: 'David Brown', product: 'Wooden Sunglasses', amount: '42.00 USDC', date: '2023-06-13', status: 'Completed' }
];

const products = [
  { id: '1', name: 'Handcrafted Wooden Watch', price: '45.99 USDC', stock: 12, status: 'Active' },
  { id: '2', name: 'Premium Coffee Subscription', price: '29.99 USDC', stock: 45, status: 'Active' },
  { id: '3', name: 'Leather Wallet', price: '35.50 USDC', stock: 3, status: 'Low Stock' },
  { id: '4', name: 'Wooden Sunglasses', price: '42.00 USDC', stock: 0, status: 'Out of Stock' }
];

const SellerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Seller Dashboard</h1>
          <p className="text-gray-600">Manage your products, sales, and performance</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link href="/marketplace/listings/new" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center transition-colors">
            <Plus size={20} className="mr-2" />
            Add New Product
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Icon size={24} className="text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-green-600 mt-3 flex items-center">
                <TrendingUp size={16} className="mr-1" />
                {stat.change} from last month
              </p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-medium ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-4 font-medium ${activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              My Products
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-6 py-4 font-medium ${activeTab === 'sales' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sales
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-4 font-medium ${activeTab === 'analytics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Analytics
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Sales */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Sales</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentSales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.customer}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.product}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              sale.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              sale.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {sale.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Seller Reputation */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Seller Reputation</h3>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-white rounded-full shadow mr-4">
                      <Award size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">Verified Seller</h4>
                      <p className="text-sm text-gray-600">DAO-approved since Jan 2023</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Reputation Score</span>
                        <span className="text-sm font-medium text-gray-700">4.8/5</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '96%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Trust Badge</span>
                        <span className="text-sm font-medium text-gray-700">Gold Tier</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center text-sm text-gray-600">
                    <BadgeCheck size={16} className="mr-2 text-green-500" />
                    <span>Eligible for featured placement</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">My Products</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.price}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.status === 'Active' ? 'bg-green-100 text-green-800' :
                            product.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3 flex items-center">
                            <Edit3 size={16} className="mr-1" />
                            Edit
                          </button>
                          <button className="text-gray-600 hover:text-gray-900 flex items-center">
                            <Eye size={16} className="mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Overview</h3>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
                <h4 className="text-xl font-medium text-gray-800 mb-2">Sales Analytics</h4>
                <p className="text-gray-600 mb-4">Detailed sales reports and analytics will be available here</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
                  View Full Report
                </button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Analytics</h3>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
                <h4 className="text-xl font-medium text-gray-800 mb-2">Performance Insights</h4>
                <p className="text-gray-600 mb-4">Comprehensive analytics on your store performance will be available here</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
                  View Analytics
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;