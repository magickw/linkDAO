import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart2, Trash2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/router';
import { comparisonService, ComparisonState } from '../../../services/comparisonService';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { OptimizedImage } from '../../Performance/OptimizedImageLoader';

export const ComparisonDrawer: React.FC = () => {
  const [state, setState] = useState<ComparisonState>({ items: [] });
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = comparisonService.subscribe((newState) => {
      setState(newState);
      if (newState.items.length > 0) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    });

    return unsubscribe;
  }, []);

  if (state.items.length === 0) return null;

  return (
    <div className="sticky bottom-0 left-0 right-0 z-50 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="pointer-events-auto max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-6 pb-6"
          >
            <GlassPanel variant="primary" className="shadow-2xl overflow-hidden border-blue-500/30">
              <div className="p-4 flex items-center justify-between border-b border-white/10 bg-blue-600/10">
                <div className="flex items-center gap-2">
                  <BarChart2 size={20} className="text-blue-400" />
                  <span className="font-semibold text-white">Compare Products ({state.items.length}/5)</span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => comparisonService.clearComparison()}
                    className="text-xs text-white/60 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={14} />
                    Clear All
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {state.items.map((item) => (
                    <div key={item.id} className="relative group flex-shrink-0">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/20 bg-white/5">
                        <OptimizedImage
                          src={item.images?.[0] || ''}
                          alt={item.title}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => comparisonService.removeItem(item.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {state.items.length < 2 && (
                    <div className="flex items-center text-xs text-white/40 italic px-2">
                      Add at least one more to compare
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    disabled={state.items.length < 2}
                    onClick={() => router.push('/marketplace/compare')}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    Compare Now
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isOpen && state.items.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 z-50 flex items-center justify-center border-2 border-white/20"
          title="Open Comparison"
        >
          <BarChart2 size={24} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {state.items.length}
          </span>
        </motion.button>
      )}
    </div>
  );
};
