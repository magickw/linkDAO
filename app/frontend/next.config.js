/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  
  eslint: { ignoreDuringBuilds: true },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable Fast Refresh completely
  experimental: {
    esmExternals: false,
  },
  
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable file watching to prevent hot reloads
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 0,
      };
      
      // Add Fast Refresh disable flag
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.__NEXT_DISABLE_FAST_REFRESH': JSON.stringify(true),
        })
      );
    }
    return config;
  },
  
  outputFileTracingRoot: require("path").join(__dirname),

  // Exclude playwright from output file tracing
  outputFileTracingExcludes: {
    '*': [
      'node_modules/playwright-core/**/*',
      'node_modules/playwright/**/*',
      'node_modules/@playwright/**/*',
    ],
  },

  eslint: { ignoreDuringBuilds: true },

  typescript: {
    ignoreBuildErrors: true,
  },

  pageExtensions: ["tsx", "ts", "jsx", "js"],

  images: {
    domains: [
      "ipfs.io",
      "gateway.pinata.cloud",
      "cloudflare-ipfs.com",
      "linkdao.io",
      "localhost",
      "127.0.0.1",
    ],
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self'; connect-src 'self' https:; frame-src 'self' https:; worker-src 'self' blob:;",
  },

  webpack: (config, { isServer, dev, webpack }) => {
    // Configure path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };

    // Exclude generated files from babel processing to prevent build errors
    config.module.rules.forEach(rule => {
      if (rule.test && rule.test.toString().includes('tsx?')) {
        if (rule.use && rule.use.loader && rule.use.loader.includes('babel-loader')) {
          rule.exclude = [
            ...(rule.exclude || []),
            /node_modules/,
            /src\/generated/
          ];
        } else if (Array.isArray(rule.use)) {
          rule.use.forEach(useRule => {
            if (useRule.loader && useRule.loader.includes('babel-loader')) {
              useRule.exclude = [
                ...(useRule.exclude || []),
                /node_modules/,
                /src\/generated/
              ];
            }
          });
        }
      }
    });

    // Use IgnorePlugin to completely ignore playwright modules
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^playwright(-core)?$|^@playwright\/test$/,
      })
    );

    // Exclude playwright from the build
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        'playwright-core': 'commonjs playwright-core',
        'playwright': 'commonjs playwright',
        '@playwright/test': 'commonjs @playwright/test',
      });
    }

    // Ignore playwright modules during bundling
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['playwright-core'] = false;
    config.resolve.alias['playwright'] = false;
    config.resolve.alias['@playwright/test'] = false;
    config.resolve.alias['@solana/web3.js'] = false;

    // Optimize Webpack for development
    if (dev) {
      // Reduce logging noise
      config.stats = 'errors-warnings';
      
      // Optimize for faster rebuilds
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            // Split vendor chunks more aggressively for better caching
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            }
          }
        }
      };
      
      // Disable performance hints in development
      config.performance = {
        ...config.performance,
        hints: false,
      };
      
      // Optimize watch options for development
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/generated/**', // Ignore generated files to prevent unnecessary rebuilds
        ],
        aggregateTimeout: 200, // Reduced from 300 for faster updates
        poll: 1000,
      };
    }

    return config;
  },

  // Minimal headers for development
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ],
      }
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/marketplace/:path((?!seller/store/|listing/).*)+',
        destination: '/marketplace',
        permanent: false,
      },
      {
        source: '/governance/:path+',
        destination: '/governance',
        permanent: false,
      }
    ];
  },

  // Add trailing slash for SEO consistency
  trailingSlash: false,
  
  // Additional development optimizations
  experimental: {
    // Migrate from deprecated turbo to turbopack
    // turbo: {
    //   rules: {}
    // }
    // Enable Turbopack for faster builds (Next.js 13.1+)
    // externalResolver: true,  // Removed due to deprecation warning
  },
  
  // Optimize for development
  // swcMinify: false, // Disable SWC minification in development for faster builds (Removed due to deprecation warning)
  poweredByHeader: false // Remove powered by header for security
};

module.exports = nextConfig;

// Add rewrites for API proxying in development
if (process.env.NODE_ENV === 'development') {
  nextConfig.rewrites = async () => {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:10000/api/:path*'
      }
    ];
  };
}