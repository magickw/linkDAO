/**
 * CategoryGrid Component - Icon-based category grid with DAO highlighting
 * Displays marketplace categories with special highlighting for DAO-approved vendors
 */

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard, DAOApprovedCard } from '@/design-system/components/GlassPanel';
import { designTokens } from '@/design-system/tokens';

interface Category {
  id: string;
  name: string;
  icon: string;
  href: string;
  description: string;
  productCount: number;
  daoApproved: boolean;
  trending?: boolean;
}

interface CategoryGridProps {
  onCategoryClick?: (category: Category) => void;
  className?: string;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  onCategoryClick,
  className = "",
}) => {
  const categories: Category[] = [
    {
      id: 'nfts',
      name: 'NFTs & Digital Art',
      icon: '🎨',
      href: '/category/nfts',
      description: 'Unique digital collectibles and art',
      productCount: 12847,
      daoApproved: true,
      trending: true,
    },
    {
      id: 'defi',
      name: 'DeFi Tools',
      icon: '💰',
      href: '/category/defi',
      description: 'Decentralized finance applications',
      productCount: 3421,
      daoApproved: true,
    },
    {
      id: 'gaming',
      name: 'Gaming Assets',
      icon: '🎮',
      href: '/category/gaming',
      description: 'In-game items and collectibles',
      productCount: 8932,
      daoApproved: true,
      trending: true,
    },
    {
      id: 'hardware',
      name: 'Crypto Hardware',
      icon: '🔧',
      href: '/category/hardware',
      description: 'Wallets, miners, and devices',
      productCount: 1567,
      daoApproved: false,
    },
    {
      id: 'services',
      name: 'Web3 Services',
      icon: '⚡',
      href: '/category/services',
      description: 'Development and consulting',
      productCount: 2341,
      daoApproved: true,
    },
    {
      id: 'domains',
      name: 'Domain Names',
      icon: '🌐',
      href: '/category/domains',
      description: 'ENS and Web3 domains',
      productCount: 5678,
      daoApproved: false,
    },
    {
      id: 'metaverse',
      name: 'Metaverse Assets',
      icon: '🏗️',
      href: '/category/metaverse',
      description: 'Virtual land and assets',
      productCount: 4523,
      daoApproved: true,
      trending: true,
    },
    {
      id: 'education',
      name: 'Education',
      icon: '📚',
      href: '/category/education',
      description: 'Courses and learning materials',
      productCount: 987,
      daoApproved: false,
    },
    {
      id: 'music',
      name: 'Music & Audio',
      icon: '🎵',
      href: '/category/music',
      description: 'Music NFTs and audio content',
      productCount: 3456,
      daoApproved: true,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const handleCategoryClick = (category: Category) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    }
  };

  return (
    <section className={`py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Explore Categories
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Discover verified products and services across the Web3 ecosystem
          </p>
          
          {/* DAO Legend */}
          <div className="flex justify-center items-center space-x-6 mt-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-blue-400" />
              <span className="text-sm text-white/70">DAO Approved</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-sm text-white/70">Trending</span>
            </div>
          </div>
        </motion.div>

        {/* Category Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
        >
          {categories.map((category) => {
            const CardComponent = category.daoApproved ? DAOApprovedCard : GlassCard;
            
            return (
              <motion.div key={category.id} variants={itemVariants}>
                <Link href={category.href}>
                  <CardComponent
                    className={`relative p-6 cursor-pointer group transition-all duration-300 ${
                      category.daoApproved ? 'dao-glow-border' : ''
                    }`}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCategoryClick(category)}
                  >
                    {/* Trending Badge */}
                    {category.trending && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-xs">🔥</span>
                      </div>
                    )}

                    {/* DAO Approved Badge */}
                    {category.daoApproved && (
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">✓</span>
                      </div>
                    )}

                    {/* Category Icon */}
                    <div className="text-center mb-4">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                        className="text-5xl mb-3 inline-block"
                      >
                        {category.icon}
                      </motion.div>
                    </div>

                    {/* Category Info */}
                    <div className="text-center">
                      <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-indigo-200 transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-white/60 text-sm mb-3 line-clamp-2">
                        {category.description}
                      </p>
                      
                      {/* Product Count */}
                      <div className="flex items-center justify-center space-x-1 text-xs">
                        <span className="text-white/50">{formatCount(category.productCount)}</span>
                        <span className="text-white/40">items</span>
                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                  </CardComponent>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* View All Categories Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link href="/categories">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-medium hover:bg-white/20 transition-all backdrop-blur-sm"
            >
              View All Categories
              <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};