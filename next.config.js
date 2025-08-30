/** @type {import('next').NextConfig} */
const { deployConfig, generateEnvVars } = require('./app/frontend/deploy.config.js');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: false,
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
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
      
      // Web3 and crypto fallbacks
      config.resolve.fallback = { 
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
        path: false
      };
      
      return config;
    }
  }),
  
  // Standard webpack config
  webpack: (config, { isServer }) => {
    // Web3 and crypto fallbacks
    config.resolve.fallback = { 
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
      path: false
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
  
  // Redirects for legacy routes
  async redirects() {
    return [
      {
        source: '/social',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/web3-social',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  
  // API rewrites
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
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