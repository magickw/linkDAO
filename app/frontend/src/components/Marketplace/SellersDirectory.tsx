/**
 * SellersDirectory Component - Shows all sellers in the marketplace
 */

import React from 'react';
import { useRouter } from 'next/router';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';

export const SellersDirectory: React.FC = () => {
  const router = useRouter();

  const sellers = [
    {
      id: '0x1234567890123456789012345678901234567890',
      name: 'TechGear Pro',
      description: 'Premium electronics and gadgets for tech enthusiasts',
      rating: 4.8,
      sales: 1247,
      verified: true,
      daoApproved: true,
      category: 'Electronics',
      memberSince: '2022-03-15',
      responseTime: '< 2 hours'
    },
    {
      id: '0x2345678901234567890123456789012345678901',
      name: 'CryptoArtist',
      description: 'Exclusive digital artwork from renowned crypto artist',
      rating: 4.9,
      sales: 892,
      verified: true,
      daoApproved: true,
      category: 'NFTs & Art',
      memberSince: '2021-11-22',
      responseTime: '< 1 hour'
    },
    {
      id: '0x3456789012345678901234567890123456789012',
      name: 'FashionHub',
      description: 'Trendy fashion and accessories for modern lifestyle',
      rating: 4.7,
      sales: 2156,
      verified: true,
      daoApproved: false,
      category: 'Fashion',
      memberSince: '2022-01-10',
      responseTime: '< 4 hours'
    },
    {
      id: '0x4567890123456789012345678901234567890123',
      name: 'BookWorms',
      description: 'Books, audiobooks, and educational materials',
      rating: 4.6,
      sales: 543,
      verified: true,
      daoApproved: true,
      category: 'Books & Media',
      memberSince: '2022-08-05',
      responseTime: '< 6 hours'
    },
    {
      id: '0x5678901234567890123456789012345678901234',
      name: 'GamingGears',
      description: 'Gaming peripherals and accessories',
      rating: 4.5,
      sales: 1834,
      verified: true,
      daoApproved: true,
      category: 'Gaming',
      memberSince: '2021-12-18',
      responseTime: '< 3 hours'
    },
    {
      id: '0x6789012345678901234567890123456789012345',
      name: 'HomeDecorPro',
      description: 'Beautiful home decoration and furniture',
      rating: 4.4,
      sales: 967,
      verified: true,
      daoApproved: false,
      category: 'Home & Garden',
      memberSince: '2022-05-30',
      responseTime: '< 12 hours'
    },
    {
      id: '0x7890123456789012345678901234567890123456',
      name: 'HealthVitals',
      description: 'Health supplements and wellness products',
      rating: 4.7,
      sales: 723,
      verified: true,
      daoApproved: true,
      category: 'Health & Wellness',
      memberSince: '2022-02-14',
      responseTime: '< 8 hours'
    },
    {
      id: '0x8901234567890123456789012345678901234567',
      name: 'SportZone',
      description: 'Sports equipment and athletic gear',
      rating: 4.6,
      sales: 1456,
      verified: true,
      daoApproved: true,
      category: 'Sports & Outdoors',
      memberSince: '2021-09-07',
      responseTime: '< 5 hours'
    }
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-4">Marketplace Sellers</h2>
        <p className="text-xl text-white/80">Browse all verified sellers in our marketplace</p>
      </div>
      
      {/* Sellers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {sellers.map((seller) => (
          <GlassPanel 
            key={seller.id} 
            variant="secondary" 
            hoverable 
            className="p-4 cursor-pointer transform transition-all duration-200 hover:scale-105" 
            onClick={() => router.push(`/seller/${seller.id}`)}
          >
            <div className="text-center">
              {/* Seller Avatar */}
              <div className="relative mx-auto mb-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                  {seller.name.charAt(0)}
                </div>
                {seller.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Seller Info */}
              <h3 className="font-semibold text-white mb-1 truncate" title={seller.name}>{seller.name}</h3>
              <p className="text-xs text-white/60 mb-2 line-clamp-2 h-8" title={seller.description}>{seller.description}</p>
              <p className="text-xs text-blue-300 mb-2">{seller.category}</p>
              
              {/* Stats */}
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400 text-sm">⭐</span>
                    <span className="text-xs text-white">{seller.rating}</span>
                  </div>
                  <span className="text-white/40">•</span>
                  <span className="text-xs text-white/70">{seller.sales.toLocaleString()} sales</span>
                </div>
                <div className="text-xs text-white/60">
                  Responds {seller.responseTime}
                </div>
                <div className="text-xs text-white/60">
                  Since {new Date(seller.memberSince).getFullYear()}
                </div>
              </div>
              
              {/* Badges */}
              <div className="flex justify-center gap-1 mb-3">
                {seller.verified && (
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-400/30 flex items-center gap-1">
                    ✅ Verified
                  </span>
                )}
                {seller.daoApproved && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-400/30 flex items-center gap-1">
                    🏛️ DAO
                  </span>
                )}
              </div>
              
              {/* Visit Store Button */}
              <Button
                variant="primary"
                size="small"
                className="w-full text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/seller/${seller.id}`);
                }}
              >
                🏪 Visit Store
              </Button>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
};

export default SellersDirectory;