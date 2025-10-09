/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  // output: 'standalone', // Temporarily disable standalone output to fix build issue

  // Performance optimizations
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  
  // Image optimization
  images: {
    domains: ['placehold.co', 'placeholder.com', 'ipfs.io', 'gateway.pinata.cloud', 'images.unsplash.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    loader: 'default',
    path: '/_next/image/',
  },
  
  // Compression
  compress: true,
  
  // PWA and Performance optimizations
  poweredByHeader: false,
  
  // PWA configuration
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
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
    ];
  },
  
  webpack: (config, { dev, isServer }) => {
    // Fix for Watchpack ERR_INVALID_ARG_TYPE error
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/coverage/**',
        // Ignore deleted files that may be cached
        '**/marketplace-demo.tsx',
        '**/marketplace-redesigned.tsx',
      ],
    };

    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
    };

    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@react-native-async-storage/async-storage': false,
    };

    // Add SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // Add support for importing .graphql files
    config.module.rules.push({
      test: /\.(graphql|gql)$/,
      exclude: /node_modules/,
      loader: 'graphql-tag/loader',
    });

    // Add support for CSS modules
    config.module.rules.push({
      test: /\.module\.(sa|sc|c)ss$/,
      use: [
        'style-loader',
        {
          loader: 'css-loader',
          options: {
            modules: {
              localIdentName: '[local]--[hash:base64:5]',
            },
            importLoaders: 1,
            sourceMap: true,
          },
        },
        'postcss-loader',
        'sass-loader',
      ],
    });

    // Bundle analyzer in development
    // Temporarily disabled due to Watchpack error
    // if (dev && !isServer) {
    //   const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
    //   config.plugins.push(
    //     new BundleAnalyzerPlugin({
    //       analyzerMode: 'disabled',
    //       generateStatsFile: true,
    //       statsOptions: { source: false },
    //     })
    //   );
    // }
    
    // Optimize chunks
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          web3: {
            test: /[\\/]node_modules[\\/](@rainbow-me|wagmi|viem|@tanstack)[\\/]/,
            name: 'web3',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    
    return config;
  },
  
  async redirects() {
    return [];
  },
  
  async rewrites() {
    return [
      // Frontend routes for marketplace flows
      {
        source: '/marketplace/cart',
        destination: '/cart',
      },
      {
        source: '/marketplace/checkout',
        destination: '/checkout',
      },
      {
        source: '/marketplace/orders',
        destination: '/orders',
      },
      {
        source: '/marketplace/disputes',
        destination: '/support/disputes',
      },
      // Proxy marketplace requests to the backend service, but exclude Next.js API routes
      {
        source: '/marketplace/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/marketplace/:path*`,
        has: [
          {
            type: 'header',
            key: 'accept',
            value: 'application/json',
          },
        ],
      },
      // Add proxy for API marketplace requests
      {
        source: '/api/marketplace/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/marketplace/:path*`,
      },
    ];
  },
}

module.exports = nextConfig