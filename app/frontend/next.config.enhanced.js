const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    legacyBrowsers: false,
    browsersListForSwc: true,
  },

  // Optimize images
  images: {
    domains: ['localhost', 'ipfs.io', 'gateway.pinata.cloud'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Compress responses
  compress: true,

  // Custom webpack configuration for optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer for production builds
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
        })
      );
    }

    // Optimize chunks
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunk for stable dependencies
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Web3 libraries chunk
            web3: {
              test: /[\\/]node_modules[\\/](@rainbow-me|wagmi|viem|ethers)[\\/]/,
              name: 'web3',
              chunks: 'all',
              priority: 20,
            },
            // UI libraries chunk
            ui: {
              test: /[\\/]node_modules[\\/](@headlessui|framer-motion|lucide-react)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 15,
            },
            // Chart libraries chunk
            charts: {
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|recharts)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 15,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              enforce: true,
            },
          },
        },
      };
    }

    // Tree shaking optimizations
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;

    // Resolve aliases for better tree shaking
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

    // Optimize imports
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel'],
            plugins: [
              // Import optimization for lodash
              ['babel-plugin-lodash'],
              // Import optimization for date-fns
              ['babel-plugin-date-fns'],
              // Remove console.log in production
              ...(dev ? [] : [['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]]),
            ],
          },
        },
      ],
      exclude: /node_modules/,
    });

    return config;
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects for better SEO
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Output configuration
  output: 'standalone',
  
  // Disable x-powered-by header
  poweredByHeader: false,
};

module.exports = nextConfig;