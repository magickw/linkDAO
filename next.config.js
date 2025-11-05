/** @type {import('next').NextConfig} */
const { deployConfig, generateEnvVars } = require('./app/frontend/deploy.config.js');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: false,
  
  // Fix output file tracing issues
  outputFileTracingRoot: __dirname,
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    outputFileTracingIncludes: {
      '/': ['./app/frontend/**/*'],
    },
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Bundle analyzer (development only)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: '../bundle-analyzer-report.html'
          })
        );
      }
      
      // Handle React Native dependencies for Web3 packages (same as main config)
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // Core React Native polyfills
        '@react-native-async-storage/async-storage': require.resolve('./app/frontend/src/utils/asyncStorageFallback.js'),
        'react-native': false,
        
        // React Native crypto and security
        'react-native-get-random-values': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
        'react-native-keychain': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
        'react-native-biometrics': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
        
        // React Native file system and device
        'react-native-fs': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
        'react-native-device-info': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
        
        // React Native UI and interaction
        'react-native-haptic-feedback': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
        '@react-native-clipboard/clipboard': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
        'react-native-clipboard': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
        
        // React Native networking and permissions
        'react-native-permissions': false,
        'react-native-network-info': false,
        '@react-native-community/netinfo': false,
        
        // React Native navigation and linking
        'react-native-url-polyfill': false,
        '@react-native-community/async-storage': require.resolve('./app/frontend/src/utils/asyncStorageFallback.js'),
        
        // Additional Web3-specific React Native dependencies
        'react-native-randombytes': false,
        'react-native-tcp': false,
        'react-native-udp': false,
      };
      
      // Web3 and Node.js fallbacks (same as main config)
      config.resolve.fallback = { 
        // Core Node.js modules
        fs: false, 
        net: false, 
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: false,
        util: false,
        
        // Additional Node.js modules used by Web3 packages
        child_process: false,
        cluster: false,
        dgram: false,
        dns: false,
        events: false,
        module: false,
        perf_hooks: false,
        querystring: false,
        readline: false,
        repl: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        v8: false,
        vm: false,
        worker_threads: false,
        
        // React Native specific fallbacks
        'react-native-fs': false,
        'react-native-keychain': false,
        'react-native-get-random-values': false,
        'react-native-randombytes': false,
        'react-native-tcp': false,
        'react-native-udp': false,
      };
      
      return config;
    }
  }),
  
  // Standard webpack config
  webpack: (config, { isServer }) => {
    // Handle React Native dependencies for Web3 packages
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Core React Native polyfills
      '@react-native-async-storage/async-storage': require.resolve('./app/frontend/src/utils/asyncStorageFallback.js'),
      'react-native': false,
      
      // React Native crypto and security
      'react-native-get-random-values': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
      'react-native-keychain': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
      'react-native-biometrics': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
      
      // React Native file system and device
      'react-native-fs': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
      'react-native-device-info': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
      
      // React Native UI and interaction
      'react-native-haptic-feedback': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
      '@react-native-clipboard/clipboard': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
      'react-native-clipboard': require.resolve('./app/frontend/src/utils/reactNativePolyfills.js'),
      
      // React Native networking and permissions
      'react-native-permissions': false,
      'react-native-network-info': false,
      '@react-native-community/netinfo': false,
      
      // React Native navigation and linking
      'react-native-url-polyfill': false,
      '@react-native-community/async-storage': require.resolve('./app/frontend/src/utils/asyncStorageFallback.js'),
      
      // Additional Web3-specific React Native dependencies
      'react-native-randombytes': false,
      'react-native-tcp': false,
      'react-native-udp': false,
    };
    
    // Web3 and Node.js fallbacks
    config.resolve.fallback = { 
      // Core Node.js modules
      fs: false, 
      net: false, 
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
      buffer: false,
      util: false,
      
      // Additional Node.js modules used by Web3 packages
      child_process: false,
      cluster: false,
      dgram: false,
      dns: false,
      events: false,
      module: false,
      perf_hooks: false,
      querystring: false,
      readline: false,
      repl: false,
      string_decoder: false,
      sys: false,
      timers: false,
      tty: false,
      v8: false,
      vm: false,
      worker_threads: false,
      
      // React Native specific fallbacks
      'react-native-fs': false,
      'react-native-keychain': false,
      'react-native-get-random-values': false,
      'react-native-randombytes': false,
      'react-native-tcp': false,
      'react-native-udp': false,
    };
    
    // Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          web3: {
            test: /[\\/]node_modules[\\/](@rainbow-me|wagmi|viem|@tanstack)[\\/]/,
            name: 'web3',
            priority: 20,
            reuseExistingChunk: true,
          },
          ui: {
            test: /[\\/]src[\\/]components[\\/](ui|animations)[\\/]/,
            name: 'ui',
            priority: 15,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },
  
    // Security headers
  async headers() {
    // Disable CSP in development for easier debugging
    if (process.env.NODE_ENV === 'development') {
      return [];
    }
    
    const csp = deployConfig.security.contentSecurityPolicy;
    const cspString = Object.entries(csp)
      .map(([key, values]) => `${key} ${Array.isArray(values) ? values.join(' ') : values}`)
      .join('; ');
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspString,
          },
          ...Object.entries(deployConfig.security.headers).map(([key, value]) => ({
            key,
            value,
          })),
        ],
      },
    ];
  },
          ...Object.entries(deployConfig.security.headers).map(([key, value]) => ({
            key,
            value,
          })),
        ],
      },
    ];
  },
  
  // Redirects for legacy routes
  async redirects() {
    return [
      {
        source: '/social',
        destination: '/',
        permanent: true,
      },
      {
        source: '/web3-social',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // API rewrites
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  
  // Environment variables
  env: generateEnvVars(),
  
  // Output configuration for deployment
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  
  // Performance budgets
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig