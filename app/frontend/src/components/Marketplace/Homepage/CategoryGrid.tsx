/**
 * CategoryGrid Component - Icon-based category grid with DAO highlighting
 * Displays marketplace categories with special highlighting for DAO-approved vendors
 */

import React from 'react';
import Link from 'next/link';
import { 
  Package, 
  Code, 
  Image, 
  Calendar, 
  Gavel 
} from 'lucide-react';

const categories = [
  {
    id: 'physical',
    name: 'Physical Goods',
    icon: Package,
    description: 'Tangible products shipped to your door',
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'digital',
    name: 'Digital Services',
    icon: Code,
    description: 'Freelance services and digital work',
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'nft',
    name: 'NFTs & Collectibles',
    icon: Image,
    description: 'Digital art, collectibles, and assets',
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: 'subscription',
    name: 'Subscriptions',
    icon: Calendar,
    description: 'Recurring services and memberships',
    color: 'bg-yellow-100 text-yellow-600'
  },
  {
    id: 'auction',
    name: 'Auctions',
    icon: Gavel,
    description: 'Bid on unique items and experiences',
    color: 'bg-red-100 text-red-600'
  }
];

const CategoryGrid = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      {categories.map((category) => {
        const IconComponent = category.icon;
        return (
          <Link 
            key={category.id}
            href={`/marketplace/category/${category.id}`}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center"
          >
            <div className={`p-3 rounded-full ${category.color} mb-4`}>
              <IconComponent size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{category.name}</h3>
            <p className="text-sm text-gray-600">{category.description}</p>
          </Link>
        );
      })}
    </div>
  );
};

export default CategoryGrid;
