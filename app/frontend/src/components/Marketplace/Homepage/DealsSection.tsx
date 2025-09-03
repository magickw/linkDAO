import React, { useState, useEffect } from 'react';
import ProductCard from '../ProductDisplay/ProductCard';

// Sample deal data
const deals = [
  {
    id: '5',
    title: 'Wireless Bluetooth Headphones',
    description: 'Noise-cancelling headphones with 30hr battery',
    images: ['/images/sample-deal-1.jpg'],
    price: {
      crypto: '89.99',
      cryptoSymbol: 'USDC',
      fiat: '89.99',
      fiatSymbol: '$'
    },
    seller: {
      id: 'seller-1',
      name: 'TechGadgets',
      avatar: '/images/sample-avatar-1.jpg',
      verified: true,
      reputation: 4.5,
      daoApproved: false
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: false
    },
    category: 'Electronics',
    originalPrice: '129.99',
    discount: '31% off',
    dealEnds: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  },
  {
    id: '6',
    title: 'Smart Home Security Camera',
    description: '1080p HD indoor security camera with night vision',
    images: ['/images/sample-deal-2.jpg'],
    price: {
      crypto: '39.99',
      cryptoSymbol: 'USDC',
      fiat: '39.99',
      fiatSymbol: '$'
    },
    seller: {
      id: 'seller-2',
      name: 'HomeSecurity',
      avatar: '/images/sample-avatar-2.jpg',
      verified: false,
      reputation: 4.3,
      daoApproved: false
    },
    trust: {
      verified: false,
      escrowProtected: true,
      onChainCertified: false
    },
    category: 'Home Security',
    originalPrice: '59.99',
    discount: '33% off',
    dealEnds: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours from now
  }
];

const DealsSection = () => {
  const [timeLeft, setTimeLeft] = useState<{[key: string]: {hours: number, minutes: number, seconds: number}}>({});

  useEffect(() => {
    const calculateTimeLeft = () => {
      const newTimeLeft: {[key: string]: {hours: number, minutes: number, seconds: number}} = {};
      
      deals.forEach(deal => {
        const difference = deal.dealEnds.getTime() - new Date().getTime();
        
        if (difference > 0) {
          newTimeLeft[deal.id] = {
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60)
          };
        }
      });
      
      setTimeLeft(newTimeLeft);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {deals.map((deal) => (
        <div key={deal.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {deal.discount}
              </span>
              {timeLeft[deal.id] && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-1">Ends in:</span>
                  <span className="font-mono">
                    {timeLeft[deal.id].hours.toString().padStart(2, '0')}:
                    {timeLeft[deal.id].minutes.toString().padStart(2, '0')}:
                    {timeLeft[deal.id].seconds.toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
            
            <ProductCard product={deal} />
            
            <div className="mt-2 text-sm text-gray-500 line-through">
              Original price: ${deal.originalPrice}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DealsSection;