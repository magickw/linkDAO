/**
 * CurrencyToggle Component - Seamless currency switching
 * Allows users to toggle between fiat and crypto currencies
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '@/design-system/tokens';
import { GlassPanel } from '@/design-system/components/GlassPanel';

interface Currency {
  code: string;
  symbol: string;
  name: string;
  icon: string;
  type: 'fiat' | 'crypto';
}

interface CurrencyToggleProps {
  onCurrencyChange?: (currency: Currency) => void;
  className?: string;
}

export const CurrencyToggle: React.FC<CurrencyToggleProps> = ({
  onCurrencyChange,
  className = "",
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const currencies: Currency[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar', icon: '🇺🇸', type: 'fiat' },
    { code: 'EUR', symbol: '€', name: 'Euro', icon: '🇪🇺', type: 'fiat' },
    { code: 'GBP', symbol: '£', name: 'British Pound', icon: '🇬🇧', type: 'fiat' },
    { code: 'ETH', symbol: 'Ξ', name: 'Ethereum', icon: '⟠', type: 'crypto' },
    { code: 'USDC', symbol: 'USDC', name: 'USD Coin', icon: '💰', type: 'crypto' },
    { code: 'USDT', symbol: 'USDT', name: 'Tether', icon: '💵', type: 'crypto' },
  ];

  // Initialize with USD as default
  useEffect(() => {
    if (!selectedCurrency) {
      const defaultCurrency = currencies.find(c => c.code === 'USD') || currencies[0];
      setSelectedCurrency(defaultCurrency);
    }
  }, []);

  const handleCurrencySelect = (currency: Currency) => {
    setSelectedCurrency(currency);
    setIsOpen(false);
    if (onCurrencyChange) {
      onCurrencyChange(currency);
    }
  };

  const getCurrencyTypeColor = (type: 'fiat' | 'crypto') => {
    return type === 'crypto' ? 'text-purple-400' : 'text-blue-400';
  };

  if (!selectedCurrency) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Currency Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <span className="text-lg">{selectedCurrency.icon}</span>
        <span className="font-medium">{selectedCurrency.code}</span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-white/60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      {/* Currency Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute top-full right-0 mt-2 w-64 z-50"
            >
              <GlassPanel
                variant="modal"
                style={{
                  background: designTokens.glassmorphism.modal.background,
                  backdropFilter: designTokens.glassmorphism.modal.backdropFilter,
                  border: designTokens.glassmorphism.modal.border,
                  borderRadius: designTokens.glassmorphism.modal.borderRadius,
                  boxShadow: designTokens.glassmorphism.modal.boxShadow,
                }}
              >
                <div className="py-2">
                  {/* Fiat Currencies */}
                  <div className="px-3 py-2 border-b border-white/10">
                    <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                      Fiat Currencies
                    </h3>
                  </div>
                  {currencies
                    .filter(currency => currency.type === 'fiat')
                    .map((currency, index) => (
                      <motion.button
                        key={currency.code}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleCurrencySelect(currency)}
                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors ${
                          selectedCurrency.code === currency.code ? 'bg-white/20' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{currency.icon}</span>
                          <div className="text-left">
                            <p className="text-white font-medium">{currency.code}</p>
                            <p className="text-xs text-white/60">{currency.name}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-medium ${getCurrencyTypeColor(currency.type)}`}>
                          {currency.symbol}
                        </span>
                      </motion.button>
                    ))}

                  {/* Crypto Currencies */}
                  <div className="px-3 py-2 border-b border-white/10 mt-2">
                    <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                      Cryptocurrencies
                    </h3>
                  </div>
                  {currencies
                    .filter(currency => currency.type === 'crypto')
                    .map((currency, index) => (
                      <motion.button
                        key={currency.code}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (index + 3) * 0.05 }}
                        onClick={() => handleCurrencySelect(currency)}
                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors ${
                          selectedCurrency.code === currency.code ? 'bg-white/20' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{currency.icon}</span>
                          <div className="text-left">
                            <p className="text-white font-medium">{currency.code}</p>
                            <p className="text-xs text-white/60">{currency.name}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-medium ${getCurrencyTypeColor(currency.type)}`}>
                          {currency.symbol}
                        </span>
                      </motion.button>
                    ))}
                </div>

                {/* Exchange Rate Info */}
                <div className="px-4 py-3 border-t border-white/10 bg-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Live rates updated</span>
                    <span className="text-green-400 font-medium">• Live</span>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};