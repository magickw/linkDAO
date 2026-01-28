import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, Trash2 } from 'lucide-react';
import { recentlyViewedService, RecentlyViewedState } from '../../../services/recentlyViewedService';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { OptimizedImage } from '../../Performance/OptimizedImageLoader';
import { DualPricing } from '../../../design-system/components/DualPricing';

interface RecentlyViewedCarouselProps {
  title?: string;
  className?: string;
}

export const RecentlyViewedCarousel: React.FC<RecentlyViewedCarouselProps> = ({
  title = 'Recently Viewed',
  className = '',
}) => {
  const [state, setState] = useState<RecentlyViewedState>({ items: [] });
  
  useEffect(() => {
    const unsubscribe = recentlyViewedService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  if (state.items.length === 0) return null;

  return (
    <section className={`py-8 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-white">
          <Clock size={20} className="text-blue-400" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <button
          onClick={() => recentlyViewedService.clearHistory()}
          className="text-sm text-white/40 hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          <Trash2 size={14} />
          Clear History
        </button>
      </div>

      <div className="relative group">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {state.items.map((item) => (
            <Link key={item.id} href={`/marketplace/listing/${item.id}`}>
              <motion.div
                whileHover={{ y: -5 }}
                className="min-w-[200px] w-48 flex-shrink-0 snap-start cursor-pointer"
              >
                <GlassPanel variant="secondary" className="h-full overflow-hidden border-white/5 hover:border-white/20 transition-all">
                  <div className="aspect-square relative overflow-hidden bg-white/5">
                    <OptimizedImage
                      src={item.images?.[0] || ''}
                      alt={item.title}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover transition-transform hover:scale-110"
                    />
                  </div>
                  <div className="p-3 space-y-2">
                    <h3 className="text-sm font-medium text-white line-clamp-1">{item.title}</h3>
                    <DualPricing
                      cryptoPrice={item.priceAmount?.toString() || '0'}
                      cryptoSymbol={item.priceCurrency || 'ETH'}
                      fiatPrice={item.priceAmount?.toString() || '0'}
                      fiatSymbol="USD"
                      size="xs"
                    />
                  </div>
                </GlassPanel>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
