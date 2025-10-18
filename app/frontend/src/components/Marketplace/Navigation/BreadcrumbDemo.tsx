import React from 'react';
import { MarketplaceBreadcrumbs } from './MarketplaceBreadcrumbs';
import { Home, Store, Package, User, Search } from 'lucide-react';

export const BreadcrumbDemo: React.FC = () => {
  const demoScenarios = [
    {
      title: 'Marketplace Home',
      items: [
        { label: 'Home', href: '/', icon: <Home className="w-4 h-4" />, isActive: false },
        { label: 'Marketplace', icon: <Store className="w-4 h-4" />, isActive: true },
      ]
    },
    {
      title: 'Product Detail Page',
      items: [
        { label: 'Home', href: '/', icon: <Home className="w-4 h-4" />, isActive: false },
        { label: 'Marketplace', href: '/marketplace', icon: <Store className="w-4 h-4" />, isActive: false },
        { label: 'Electronics', href: '/marketplace?category=electronics', icon: <Package className="w-4 h-4" />, isActive: false },
        { label: 'Premium Wireless Headphones', icon: <Package className="w-4 h-4" />, isActive: true },
      ]
    },
    {
      title: 'Seller Store Page',
      items: [
        { label: 'Home', href: '/', icon: <Home className="w-4 h-4" />, isActive: false },
        { label: 'Marketplace', href: '/marketplace', icon: <Store className="w-4 h-4" />, isActive: false },
        { label: 'Sellers', href: '/marketplace?view=sellers', icon: <User className="w-4 h-4" />, isActive: false },
        { label: 'TechGear Store', icon: <User className="w-4 h-4" />, isActive: true },
      ]
    },
    {
      title: 'Search Results',
      items: [
        { label: 'Home', href: '/', icon: <Home className="w-4 h-4" />, isActive: false },
        { label: 'Marketplace', href: '/marketplace', icon: <Store className="w-4 h-4" />, isActive: false },
        { label: 'Search: "laptop"', icon: <Search className="w-4 h-4" />, isActive: true },
      ]
    }
  ];

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Marketplace Breadcrumb Navigation Demo</h1>
        
        <div className="space-y-6">
          {demoScenarios.map((scenario, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{scenario.title}</h2>
              
              {/* Default styling */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Default Styling:</h3>
                <div className="bg-gray-50 p-3 rounded">
                  <MarketplaceBreadcrumbs items={scenario.items} />
                </div>
              </div>
              
              {/* Dark theme styling */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Dark Theme Styling:</h3>
                <div className="bg-gray-800 p-3 rounded">
                  <MarketplaceBreadcrumbs 
                    items={scenario.items} 
                    className="text-white/80"
                  />
                </div>
              </div>
              
              {/* Compact styling */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Compact Styling:</h3>
                <div className="bg-blue-50 p-2 rounded">
                  <MarketplaceBreadcrumbs 
                    items={scenario.items} 
                    className="text-xs text-blue-700"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Features Demonstrated</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>✅ Hierarchical navigation structure</li>
            <li>✅ Clickable links with hover states</li>
            <li>✅ Active page indication (no link, different styling)</li>
            <li>✅ Icon support for visual context</li>
            <li>✅ Responsive text truncation</li>
            <li>✅ Accessibility features (ARIA labels, focus management)</li>
            <li>✅ Filter preservation in navigation links</li>
            <li>✅ Customizable styling via className prop</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbDemo;