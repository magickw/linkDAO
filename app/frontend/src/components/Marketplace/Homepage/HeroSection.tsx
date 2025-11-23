/**
 * HeroSection Component - Bold hero with tagline and CTAs
 * Features gradient backgrounds and call-to-action buttons
 */

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Button, GradientButton } from '@/design-system/components/Button';
import { designTokens } from '@/design-system/tokens';
import { FeaturedProductCarousel } from './FeaturedProductCarousel';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { useSeller } from '@/hooks/useSeller';

interface HeroSectionProps {
  onStartSelling?: () => void;
  onBrowseMarketplace?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartSelling,
  onBrowseMarketplace,
}) => {
  const { isConnected } = useAccount();
  const { profile, loading, error } = useSeller();
  
  const router = useRouter();
  
  const handleSellerDashboard = () => {
    if (!isConnected) {
      // In a real implementation, this would trigger wallet connection
      return;
    }
    
    if (!profile) {
      // Redirect to seller onboarding API endpoint
      router.push('/marketplace/seller/onboarding');
    } else {
      // Redirect to seller dashboard
      router.push('/marketplace/seller/dashboard');
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut" as any, // Type assertion to bypass strict typing
      },
    },
  };

  const floatingVariants: Variants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut" as any, // Type assertion to bypass strict typing
      },
    },
  };

  return (
    <section 
      className="relative min-h-[80vh] flex items-center overflow-hidden"
      style={{
        background: designTokens.gradients.heroMain,
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: designTokens.gradients.heroOverlay,
          }}
        />
        
        {/* Floating Geometric Shapes */}
        <motion.div
          variants={floatingVariants}
          animate="animate"
          className="absolute top-20 left-10 w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm"
        />
        <motion.div
          variants={floatingVariants}
          animate="animate"
          style={{ animationDelay: '2s' }}
          className="absolute top-40 right-20 w-16 h-16 rounded-lg bg-purple-400/20 backdrop-blur-sm rotate-45"
        />
        <motion.div
          variants={floatingVariants}
          animate="animate"
          style={{ animationDelay: '4s' }}
          className="absolute bottom-40 left-20 w-12 h-12 rounded-full bg-indigo-400/20 backdrop-blur-sm"
        />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-12 gap-4 h-full">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="border-r border-white/20 last:border-r-0" />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          {/* Main Tagline */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight"
          >
            <span className="block">Buy. Sell. Bid.</span>
            <span className="block bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Own
            </span>
            <span className="block text-3xl md:text-4xl lg:text-5xl font-medium mt-4 text-white/90">
              — Powered by Web3
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-white/80 mb-8 max-w-4xl mx-auto leading-relaxed"
          >
            The first truly decentralized marketplace where{' '}
            <span className="text-yellow-400 font-semibold">0%-2% fees</span> replace{' '}
            <span className="line-through text-red-400">10%-30% platform cuts</span>.
            <br />
            Trade with blockchain security, instant settlements, and global access.
          </motion.p>

          {/* Value Propositions */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-6 mb-12"
          >
            {[
              { icon: '🔒', text: 'Escrow Protected' },
              { icon: '⚡', text: 'Instant Settlements' },
              { icon: '🌍', text: 'Global Access' },
              { icon: '⛓️', text: 'On-Chain Verified' },
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm border border-white/20"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-white font-medium">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Call-to-Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center gap-6 mb-16"
          >
            <div className="flex flex-col sm:flex-row gap-6">
              <GradientButton
                size="lg"
                gradient="primary"
                onClick={onBrowseMarketplace}
                className="text-lg px-8 py-4 font-semibold shadow-2xl"
              >
                <span className="mr-2">🛍️</span> Browse Marketplace
              </GradientButton>

              {profile ? (
                <>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => router.push('/marketplace/seller/dashboard')}
                    className="text-lg px-8 py-4 font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                  >
                    <span className="mr-2">📊</span> Seller Dashboard
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.push('/marketplace/seller/listings/create')}
                    className="text-lg px-8 py-4 font-semibold border-2 border-white/30 text-white hover:bg-white/10"
                  >
                    <span className="mr-2">➕</span> Create Listing
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onStartSelling}
                  className="text-lg px-8 py-4 font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                >
                  <span className="mr-2">🏪</span> Become a Seller
                </Button>
              )}
            </div>
          </motion.div>

          {/* Featured Products Carousel */}
          <motion.div
            variants={itemVariants}
            className="mt-16"
          >
            <FeaturedProductCarousel />
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            variants={itemVariants}
            className="mt-16 flex flex-wrap justify-center items-center gap-8 text-white/60"
          >
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Live on Ethereum</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Polygon Ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Arbitrum Support</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" as any }}
          className="flex flex-col items-center text-white/60"
        >
          <span className="text-sm font-medium mb-2">Scroll to explore</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
};