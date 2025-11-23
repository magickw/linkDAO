/**
 * MarketplaceTopBar - Sticky top navigation with search, user actions, and cart
 * Glassmorphic design with smooth scroll behavior
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { ShoppingCart, User, Menu } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { designTokens } from '@/design-system/tokens';
import { Button } from '@/design-system/components/Button';

interface MarketplaceTopBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  cartItemCount?: number;
  onCartClick?: () => void;
  onMenuClick?: () => void;
  className?: string;
}

export const MarketplaceTopBar: React.FC<MarketplaceTopBarProps> = ({
  searchValue,
  onSearchChange,
  cartItemCount = 0,
  onCartClick,
  onMenuClick,
  className = '',
}) => {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll to add shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-30 transition-all duration-200 ${
        isScrolled ? 'shadow-lg' : ''
      } ${className}`}
      style={{
        background: designTokens.glassmorphism.primary.background,
        backdropFilter: designTokens.glassmorphism.primary.backdropFilter,
        borderBottom: designTokens.glassmorphism.primary.border,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <button
            onClick={() => router.push('/marketplace')}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <span className="text-xl font-bold text-white">LinkDAO</span>
          </button>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-2xl">
            <SearchBar
              value={searchValue}
              onChange={onSearchChange}
              placeholder="Search products, categories..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ShoppingCart size={20} className="text-white" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </button>

            {/* User/Connect Button */}
            {isConnected ? (
              <button
                onClick={() => router.push('/profile')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <User size={20} className="text-white" />
              </button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  /* Connect wallet logic */
                }}
              >
                Connect
              </Button>
            )}

            {/* Mobile Menu */}
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Menu size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <div className="md:hidden pb-3">
          <SearchBar
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search..."
          />
        </div>
      </div>
    </div>
  );
};
