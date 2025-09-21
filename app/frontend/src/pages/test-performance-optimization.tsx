import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PerformanceProvider,
  VirtualScrollManager,
  ProgressiveLoader,
  IntelligentLazyImage,
  useOfflineCache,
  useOfflineSync,
  usePerformanceOptimization,
  usePreloadedContent
} from '../components/Performance';

// Mock data for testing
const generateMockPosts = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `post-${index}`,
    title: `Post ${index + 1}`,
    content: `This is the content for post ${index + 1}. It contains some sample text to demonstrate the virtual scrolling and performance optimization features.`,
    author: `User ${Math.floor(Math.random() * 100)}`,
    timestamp: Date.now() - Math.random() * 86400000,
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100),
    image: `https://picsum.photos/400/300?random=${index}`
  }));
};

const mockPosts = generateMockPosts(1000);

export default function TestPerformanceOptimization() {
  const [selectedTab, setSelectedTab] = useState('virtual-scroll');
  const [posts] = useState(mockPosts);

  return (
    <PerformanceProvider
      config={{
        virtualScrolling: {
          enabled: true,
          itemHeight: 200,
          bufferSize: 10,
          targetFPS: 60
        },
        performanceOptimization: {
          enabled: true,
          targetFPS: 60,
          memoryThreshold: 100,
          adaptiveOptimization: true
        }
      }}
      enableDevTools={true}
    >
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Performance Optimization Test Suite
            </h1>
            <p className="text-gray-600">
              This page demonstrates all the performance optimization features including
              virtual scrolling, progressive loading, offline caching, and intelligent lazy loading.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'virtual-scroll', label: 'Virtual Scrolling' },
                  { id: 'progressive-loading', label: 'Progressive Loading' },
                  { id: 'lazy-loading', label: 'Lazy Loading' },
                  { id: 'offline-features', label: 'Offline Features' },
                  { id: 'performance-metrics', label: 'Performance Metrics' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      selectedTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm">
            {selectedTab === 'virtual-scroll' && <VirtualScrollDemo posts={posts} />}
            {selectedTab === 'progressive-loading' && <ProgressiveLoadingDemo />}
            {selectedTab === 'lazy-loading' && <LazyLoadingDemo />}
            {selectedTab === 'offline-features' && <OfflineFeaturesDemo />}
            {selectedTab === 'performance-metrics' && <PerformanceMetricsDemo />}
          </div>
        </div>
      </div>
    </PerformanceProvider>
  );
}

// Virtual Scrolling Demo
function VirtualScrollDemo({ posts }: { posts: any[] }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Virtual Scrolling Demo</h2>
      <p className="text-gray-600 mb-6">
        Scrolling through {posts.length} posts with virtual scrolling for optimal performance.
      </p>
      
      <div className="border rounded-lg overflow-hidden">
        <VirtualScrollManager
          items={posts}
          containerHeight={600}
          renderItem={(post, index, isVisible) => (
            <PostCard post={post} isVisible={isVisible} />
          )}
          config={{
            itemHeight: 200,
            bufferSize: 5,
            enableSmoothing: true,
            targetFPS: 60
          }}
          onLoadMore={() => console.log('Load more posts')}
          hasNextPage={true}
          className="w-full"
        />
      </div>
    </div>
  );
}

// Progressive Loading Demo
function ProgressiveLoadingDemo() {
  const [loadingItems, setLoadingItems] = useState<number[]>([]);

  const triggerLoad = (index: number) => {
    setLoadingItems(prev => [...prev, index]);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Progressive Loading Demo</h2>
      <p className="text-gray-600 mb-6">
        Click the buttons to trigger progressive loading with different priorities and configurations.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <div key={index} className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Content Block {index}</h3>
            
            {loadingItems.includes(index) ? (
              <ProgressiveLoader
                priority={index <= 2 ? 'high' : index <= 4 ? 'normal' : 'low'}
                delay={index * 500}
                onLoad={() => console.log(`Content ${index} loaded`)}
                skeleton={
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                  </div>
                }
              >
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    This content was loaded progressively with {
                      index <= 2 ? 'high' : index <= 4 ? 'normal' : 'low'
                    } priority.
                  </p>
                  <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded flex items-center justify-center text-white font-medium">
                    Content {index}
                  </div>
                </div>
              </ProgressiveLoader>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Click to load content progressively</p>
                <button
                  onClick={() => triggerLoad(index)}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Load Content {index}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Lazy Loading Demo
function LazyLoadingDemo() {
  const images = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    src: `https://picsum.photos/400/300?random=${index + 100}`,
    lowQualitySrc: `https://picsum.photos/40/30?random=${index + 100}`,
    alt: `Demo image ${index + 1}`
  }));

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Intelligent Lazy Loading Demo</h2>
      <p className="text-gray-600 mb-6">
        Scroll down to see images load with blur-to-sharp transitions and intelligent preloading.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <div key={image.id} className="border rounded-lg overflow-hidden">
            <IntelligentLazyImage
              src={image.src}
              lowQualitySrc={image.lowQualitySrc}
              alt={image.alt}
              width={400}
              height={300}
              priority={image.id < 3 ? 'high' : 'normal'}
              className="w-full h-48 object-cover"
              onLoad={() => console.log(`Image ${image.id} loaded`)}
            />
            <div className="p-3">
              <h3 className="font-medium">Image {image.id + 1}</h3>
              <p className="text-sm text-gray-500">
                Priority: {image.id < 3 ? 'High' : 'Normal'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Offline Features Demo
function OfflineFeaturesDemo() {
  const { cacheData, getCachedData, isOnline } = useOfflineCache();
  const { addAction, syncStats } = useOfflineSync();
  const [cachedItems, setCachedItems] = useState<string[]>([]);
  const [offlineActions, setOfflineActions] = useState<number>(0);

  const handleCacheData = async () => {
    const data = {
      message: 'This is cached data',
      timestamp: Date.now(),
      random: Math.random()
    };
    
    const key = `test-data-${Date.now()}`;
    await cacheData(key, data, { ttl: 60000, priority: 'normal' });
    setCachedItems(prev => [...prev, key]);
  };

  const handleAddOfflineAction = async () => {
    await addAction({
      type: 'post',
      data: {
        title: 'Offline Post',
        content: 'This post was created while offline',
        timestamp: Date.now()
      },
      priority: 'normal',
      maxRetries: 3,
      estimatedSize: 100
    });
    
    setOfflineActions(prev => prev + 1);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Offline Features Demo</h2>
      <p className="text-gray-600 mb-6">
        Test offline caching and sync capabilities. Try going offline to see how actions are queued.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cache Demo */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">Offline Cache</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Network Status:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <button
              onClick={handleCacheData}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Cache Test Data
            </button>
            
            <div className="text-sm text-gray-600">
              Cached Items: {cachedItems.length}
            </div>
            
            {cachedItems.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {cachedItems.slice(-5).map((key) => (
                  <div key={key} className="text-xs bg-gray-100 p-2 rounded">
                    {key}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sync Demo */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">Offline Sync</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Pending: {syncStats.pendingActions}</div>
              <div>Completed: {syncStats.completedActions}</div>
              <div>Failed: {syncStats.failedActions}</div>
              <div>Total: {syncStats.totalActions}</div>
            </div>
            
            <button
              onClick={handleAddOfflineAction}
              className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Add Offline Action
            </button>
            
            <div className="text-sm text-gray-600">
              Actions Added: {offlineActions}
            </div>
            
            {syncStats.syncInProgress && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Syncing...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Performance Metrics Demo
function PerformanceMetricsDemo() {
  const { optimizeNow, isOptimizing } = usePerformanceOptimization();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    // Simulate metrics collection
    const interval = setInterval(() => {
      setMetrics({
        fps: Math.floor(Math.random() * 20) + 45,
        memoryUsage: Math.floor(Math.random() * 50) + 50,
        bundleSize: Math.floor(Math.random() * 100) + 500,
        loadTime: Math.floor(Math.random() * 1000) + 1000,
        cacheHitRate: Math.floor(Math.random() * 30) + 70,
        networkRequests: Math.floor(Math.random() * 20) + 10
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Performance Metrics Demo</h2>
      <p className="text-gray-600 mb-6">
        Real-time performance monitoring and optimization controls.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Metrics Display */}
        {metrics && Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="border rounded-lg p-4">
            <h3 className="font-medium capitalize mb-2">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h3>
            <div className="text-2xl font-bold text-blue-600">
              {typeof value === 'number' ? (
                key === 'cacheHitRate' ? `${value}%` :
                key === 'memoryUsage' ? `${value}MB` :
                key === 'bundleSize' ? `${value}KB` :
                key === 'loadTime' ? `${value}ms` :
                value
              ) : String(value)}
            </div>
            <div className={`text-sm mt-1 ${
              (key === 'fps' && typeof value === 'number' && value >= 55) ||
              (key === 'cacheHitRate' && typeof value === 'number' && value >= 80) ||
              (key === 'memoryUsage' && typeof value === 'number' && value <= 100) ||
              (key === 'loadTime' && typeof value === 'number' && value <= 2000)
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {(key === 'fps' && typeof value === 'number' && value >= 55) ||
               (key === 'cacheHitRate' && typeof value === 'number' && value >= 80) ||
               (key === 'memoryUsage' && typeof value === 'number' && value <= 100) ||
               (key === 'loadTime' && typeof value === 'number' && value <= 2000)
                ? 'Good' : 'Needs Optimization'}
            </div>
          </div>
        ))}

        {/* Optimization Controls */}
        <div className="border rounded-lg p-4 md:col-span-2 lg:col-span-3">
          <h3 className="font-medium mb-3">Optimization Controls</h3>
          <div className="flex space-x-4">
            <button
              onClick={optimizeNow}
              disabled={isOptimizing}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize Now'}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reset Metrics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Post Card Component
function PostCard({ post, isVisible }: { post: any; isVisible: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0.7, y: 0 }}
      className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <div className="flex space-x-3">
        <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900">{post.author}</span>
            <span className="text-sm text-gray-500">
              {new Date(post.timestamp).toLocaleDateString()}
            </span>
          </div>
          
          <h3 className="font-medium text-gray-900 mb-2">{post.title}</h3>
          <p className="text-gray-600 text-sm mb-3">{post.content}</p>
          
          {isVisible && (
            <IntelligentLazyImage
              src={post.image}
              alt={post.title}
              width={400}
              height={200}
              className="w-full h-32 object-cover rounded mb-3"
            />
          )}
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{post.likes} likes</span>
            <span>{post.comments} comments</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}