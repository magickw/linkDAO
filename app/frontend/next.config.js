/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  
  eslint: { ignoreDuringBuilds: true },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Enable Fast Refresh
  experimental: {
    // esmExternals: false, // Removed to enable Fast Refresh
  },
  
  webpack: (config, { dev }) => {
    if (dev) {
      // Enable file watching for proper hot reloads
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 200,
      };
      
      // Enable Fast Refresh by removing disable flag
      // config.plugins.push(
      //   new webpack.DefinePlugin({
      //     'process.env.__NEXT_DISABLE_FAST_REFRESH': JSON.stringify(true),
      //   })
      // );
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

    // Optimize babel processing for generated files
    config.module.rules.forEach(rule => {
      if (rule.test && rule.test.toString().includes('tsx?')) {
        if (rule.use && rule.use.loader && rule.use.loader.includes('babel-loader')) {
          // Remove exclusion for generated files and add optimization
          rule.exclude = [
            ...(rule.exclude || []),
            /node_modules/
          ];
          
          // Add optimization options for babel-loader
          if (rule.use.options) {
            rule.use.options.cacheDirectory = true;
            rule.use.options.compact = true;
          }
        } else if (Array.isArray(rule.use)) {
          rule.use.forEach(useRule => {
            if (useRule.loader && useRule.loader.includes('babel-loader')) {
              // Remove exclusion for generated files and add optimization
              useRule.exclude = [
                ...(useRule.exclude || []),
                /node_modules/
              ];
              
              // Add optimization options for babel-loader
              if (useRule.options) {
                useRule.options.cacheDirectory = true;
                useRule.options.compact = true;
              }
            }
          });
        }
      }
    });
    
    // Add specific rule for generated files with optimized settings
    config.module.rules.push({
      test: /[\/](generated)[\/].*\.tsx?$/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            compact: true,
            // Reduce transforms for generated files
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              ['@babel/preset-react', { runtime: 'automatic' }],
              ['@babel/preset-typescript']
            ]
          }
        }
      ]
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
              test: /[\/]node_modules[\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Code splitting for large generated files
            generated: {
              test: /[\/]src[\/]generated[\/]/,
              name: 'generated',
              chunks: 'all',
              enforce: true,
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
      },
      {
        source: '/cp/:shareId',
        destination: 'http://localhost:10000/cp/:shareId'
      }
    ];
  };
}