/**
 * Homepage Component - Main Web3 Marketplace homepage
 * Combines all homepage sections with glassmorphic design
 */

import React from 'react';
import { motion } from 'framer-motion';
import { GlassmorphicNavbar } from '../Marketplace/Homepage/GlassmorphicNavbar';
import { HeroSection } from '../Marketplace/Homepage/HeroSection';
import { CategoryGrid } from '../Marketplace/Homepage/CategoryGrid';
import { designTokens } from '@/design-system/tokens';

interface HomepageProps {
  onStartSelling?: () => void;
  onBrowseMarketplace?: () => void;
  onCategoryClick?: (category: any) => void;
}

export const Homepage: React.FC<HomepageProps> = ({
  onStartSelling,
  onBrowseMarketplace,
  onCategoryClick,
}) => {
  const handleStartSelling = () => {
    if (onStartSelling) {
      onStartSelling();
    } else {
      // Default navigation to selling page
      window.location.href = '/sell';
    }
  };

  const handleBrowseMarketplace = () => {
    if (onBrowseMarketplace) {
      onBrowseMarketplace();
    } else {
      // Default navigation to marketplace
      window.location.href = '/marketplace';
    }
  };

  const handleCategoryClick = (category: any) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    } else {
      // Default navigation to category page
      window.location.href = category.href;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: designTokens.gradients.heroMain,
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating orbs */}
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-3/4 right-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, 60, 0],
              y: [0, -80, 0],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-1/2 left-3/4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"
          />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <GlassmorphicNavbar />

        {/* Main Content */}
        <main>
          {/* Hero Section */}
          <HeroSection
            onStartSelling={handleStartSelling}
            onBrowseMarketplace={handleBrowseMarketplace}
          />

          {/* Category Grid */}
          <CategoryGrid
            onCategoryClick={handleCategoryClick}
          />

          {/* Trust and Transparency Section */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Why Web3 Marketplace?
                </h2>
                <p className="text-xl text-white/80 max-w-4xl mx-auto mb-12">
                  Experience the future of commerce with blockchain-powered transparency,
                  security, and fairness that traditional platforms can't match.
                </p>

                {/* Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {/* Web3 Advantages */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="bg-green-500/10 border border-green-400/30 rounded-2xl p-8"
                  >
                    <h3 className="text-2xl font-bold text-green-400 mb-6">Web3 Marketplace</h3>
                    <ul className="space-y-4 text-left">
                      <li className="flex items-center space-x-3">
                        <span className="text-green-400">✅</span>
                        <span className="text-white">0%-2% platform fees</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="text-green-400">✅</span>
                        <span className="text-white">Instant crypto settlements</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="text-green-400">✅</span>
                        <span className="text-white">Global accessibility</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="text-green-400">✅</span>
                        <span className="text-white">Blockchain-verified authenticity</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="text-green-400">✅</span>
                        <span className="text-white">Community governance</span>
                      </li>
                    </ul>
                  </motion.div>

                  {/* Traditional Platform Limitations */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="bg-red-500/10 border border-red-400/30 rounded-2xl p-8"
                  >
                    <h3 className="text-2xl font-bold text-red-400 mb-6">Traditional Platforms</h3>
                    <ul className="space-y-4 text-left">
                      <li className="flex items-center space-x-3">
                        <span className="text-red-400">❌</span>
                        <span className="text-white/70 line-through">10%-30% platform fees</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="text-red-400">❌</span>
                        <span className="text-white/70 line-through">Slow payment processing</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="text-red-400">❌</span>
                        <span className="text-white/70 line-through">Geographic restrictions</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="text-red-400">❌</span>
                        <span className="text-white/70 line-through">Centralized control</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <span className="text-red-400">❌</span>
                        <span className="text-white/70 line-through">Limited transparency</span>
                      </li>
                    </ul>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
              >
                {[
                  { label: 'Total Volume', value: '$2.4M', icon: '💰' },
                  { label: 'Active Users', value: '15.2K', icon: '👥' },
                  { label: 'Products Listed', value: '45.8K', icon: '📦' },
                  { label: 'Transactions', value: '128K', icon: '⚡' },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                  >
                    <div className="text-4xl mb-2">{stat.icon}</div>
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-white/60">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="py-12 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-white/60 mb-4">
                © 2024 Web3 Marketplace. Powered by blockchain technology.
              </p>
              <div className="flex justify-center space-x-6 text-sm text-white/40">
                <a href="/terms" className="hover:text-white/60 transition-colors">Terms</a>
                <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy</a>
                <a href="/docs" className="hover:text-white/60 transition-colors">Docs</a>
                <a href="/support" className="hover:text-white/60 transition-colors">Support</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};