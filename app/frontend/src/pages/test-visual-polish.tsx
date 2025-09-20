import React, { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  GlassmorphismCard,
  EnhancedPostCardGlass,
  GlassSidebarLink,
  AnimatedButton,
  AnimatedCard,
  StaggeredList,
  FloatingActionButton,
  PageTransition,
  AnimatedToast,
  RippleEffect,
  EnhancedThemeProvider,
  EnhancedThemeToggle,
  ThemeAware,
  PostCardSkeleton,
  UserProfileCardSkeleton,
  WalletDashboardSkeleton,
  FeedSkeleton,
  PulseLoader,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack,
  MobileFirstCard,
  VisualPolishUtils,
  VisualPolishClasses
} from '@/components/VisualPolish';

export default function TestVisualPolish() {
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);

  const handleLoadingTest = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  const handleSkeletonTest = () => {
    setShowSkeletons(true);
    setTimeout(() => setShowSkeletons(false), 5000);
  };

  return (
    <EnhancedThemeProvider>
      <Head>
        <title>Visual Polish Test - Social Dashboard</title>
        <meta name="description" content="Testing visual polish components with glassmorphism, animations, and theme system" />
      </Head>

      <PageTransition className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
        {/* Header */}
        <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-white/20 dark:border-gray-700/20">
          <ResponsiveContainer className="py-4">
            <ResponsiveStack direction={{ xs: 'row' }} justify="between" align="center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Visual Polish Test
              </h1>
              <EnhancedThemeToggle showSettings />
            </ResponsiveStack>
          </ResponsiveContainer>
        </div>

        <ResponsiveContainer className="py-8">
          <ResponsiveStack direction={{ xs: 'col', lg: 'row' }} spacing="xl">
            {/* Left Sidebar */}
            <div className="w-full lg:w-64 flex-shrink-0">
              <GlassmorphismCard className="p-4 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Navigation
                </h2>
                <div className="space-y-2">
                  <GlassSidebarLink active icon={<span>🏠</span>}>
                    Home
                  </GlassSidebarLink>
                  <GlassSidebarLink icon={<span>📊</span>} badge={5}>
                    Dashboard
                  </GlassSidebarLink>
                  <GlassSidebarLink icon={<span>👥</span>} badge={12}>
                    Communities
                  </GlassSidebarLink>
                  <GlassSidebarLink icon={<span>💰</span>}>
                    Wallet
                  </GlassSidebarLink>
                  <GlassSidebarLink icon={<span>⚙️</span>}>
                    Settings
                  </GlassSidebarLink>
                </div>
              </GlassmorphismCard>

              <UserProfileCardSkeleton className="mb-6" />
              <WalletDashboardSkeleton />
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Test Controls */}
              <GlassmorphismCard className="p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Test Controls
                </h2>
                <ResponsiveGrid cols={{ xs: 2, md: 4 }} gap="md">
                  <AnimatedButton
                    variant="primary"
                    onClick={() => setShowToast(true)}
                    animation="lift"
                  >
                    Show Toast
                  </AnimatedButton>
                  <AnimatedButton
                    variant="secondary"
                    onClick={handleLoadingTest}
                    loading={loading}
                    animation="scale"
                  >
                    Test Loading
                  </AnimatedButton>
                  <AnimatedButton
                    variant="gradient"
                    onClick={handleSkeletonTest}
                    animation="glow"
                  >
                    Show Skeletons
                  </AnimatedButton>
                  <RippleEffect className="rounded-xl">
                    <AnimatedButton
                      variant="ghost"
                      animation="subtle"
                      className="w-full"
                    >
                      Ripple Effect
                    </AnimatedButton>
                  </RippleEffect>
                </ResponsiveGrid>
              </GlassmorphismCard>

              {/* Glassmorphism Examples */}
              <GlassmorphismCard className="p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Glassmorphism Effects
                </h2>
                <ResponsiveGrid cols={{ xs: 1, md: 2, lg: 3 }} gap="lg">
                  <GlassmorphismCard variant="primary" padding="lg" hover>
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Primary Glass</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Standard glassmorphism effect with hover animation
                    </p>
                  </GlassmorphismCard>
                  
                  <GlassmorphismCard variant="secondary" padding="lg" hover>
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Secondary Glass</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Subtle glassmorphism for supporting content
                    </p>
                  </GlassmorphismCard>
                  
                  <GlassmorphismCard variant="modal" padding="lg" hover>
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Modal Glass</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Enhanced glass effect for modals and overlays
                    </p>
                  </GlassmorphismCard>
                </ResponsiveGrid>
              </GlassmorphismCard>

              {/* Enhanced Post Cards */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Enhanced Post Cards
                </h2>
                <StaggeredList className="space-y-6">
                  <EnhancedPostCardGlass trending>
                    <div className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          JD
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">John Doe</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">2 hours ago</p>
                        </div>
                        <div className="ml-auto">
                          <span className="px-3 py-1 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full text-sm font-medium">
                            🔥 Trending
                          </span>
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                        Amazing Web3 Discovery!
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Just discovered this incredible DeFi protocol that's revolutionizing how we think about decentralized finance. The glassmorphism UI is absolutely stunning! 🚀
                      </p>
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-sm">
                          #DeFi
                        </span>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-sm">
                          #Web3
                        </span>
                        <span className="px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full text-sm">
                          #UI/UX
                        </span>
                      </div>
                    </div>
                  </EnhancedPostCardGlass>

                  <EnhancedPostCardGlass pinned>
                    <div className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          SA
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Sarah Admin</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Pinned post</p>
                        </div>
                        <div className="ml-auto">
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-medium">
                            📌 Pinned
                          </span>
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                        Welcome to the Enhanced Social Dashboard!
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300">
                        Experience the future of Web3 social interaction with our new glassmorphism design system, smooth animations, and enhanced theme support.
                      </p>
                    </div>
                  </EnhancedPostCardGlass>

                  <EnhancedPostCardGlass>
                    <div className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                          MK
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Mike Kim</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">5 hours ago</p>
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                        Smooth Animations in Action
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        The micro-animations and hover effects make the interface feel so responsive and modern. Love the attention to detail!
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <button className="hover:text-blue-500 transition-colors">👍 24</button>
                        <button className="hover:text-green-500 transition-colors">💬 8</button>
                        <button className="hover:text-purple-500 transition-colors">🔄 3</button>
                      </div>
                    </div>
                  </EnhancedPostCardGlass>
                </StaggeredList>
              </div>

              {/* Loading States */}
              {showSkeletons && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                    Loading Skeletons
                  </h2>
                  <FeedSkeleton count={3} />
                </div>
              )}

              {/* Responsive Design Examples */}
              <GlassmorphismCard className="p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Responsive Design
                </h2>
                <ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 4 }} gap="md">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                    <MobileFirstCard key={item} className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold">
                        {item}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Card {item}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Responsive card example
                      </p>
                    </MobileFirstCard>
                  ))}
                </ResponsiveGrid>
              </GlassmorphismCard>

              {/* Theme Awareness */}
              <GlassmorphismCard className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Theme Awareness
                </h2>
                <ResponsiveGrid cols={{ xs: 1, md: 2 }} gap="lg">
                  <ThemeAware
                    lightClass="bg-blue-100 border-blue-300"
                    darkClass="bg-blue-900/30 border-blue-700"
                    className="p-4 rounded-xl border-2"
                  >
                    <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
                      Light Theme Content
                    </h3>
                    <p className="text-blue-600 dark:text-blue-300">
                      This content adapts to the current theme automatically.
                    </p>
                  </ThemeAware>
                  
                  <ThemeAware
                    lightClass="bg-purple-100 border-purple-300"
                    darkClass="bg-purple-900/30 border-purple-700"
                    className="p-4 rounded-xl border-2"
                  >
                    <h3 className="font-semibold mb-2 text-purple-800 dark:text-purple-200">
                      Dark Theme Content
                    </h3>
                    <p className="text-purple-600 dark:text-purple-300">
                      Colors and styles change based on the selected theme.
                    </p>
                  </ThemeAware>
                </ResponsiveGrid>
              </GlassmorphismCard>
            </div>
          </ResponsiveStack>
        </ResponsiveContainer>

        {/* Floating Action Button */}
        <FloatingActionButton
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          icon={<span className="text-xl">↑</span>}
          position="bottom-right"
        />

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-50">
            <AnimatedToast
              type="success"
              onClose={() => setShowToast(false)}
            >
              <div className="flex items-center space-x-2">
                <span>✅</span>
                <span>Visual polish is working perfectly!</span>
              </div>
            </AnimatedToast>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <GlassmorphismCard className="p-8 text-center">
              <PulseLoader size="lg" className="mb-4 justify-center" />
              <p className="text-gray-900 dark:text-white font-medium">
                Testing loading state...
              </p>
            </GlassmorphismCard>
          </div>
        )}
      </PageTransition>
    </EnhancedThemeProvider>
  );
}