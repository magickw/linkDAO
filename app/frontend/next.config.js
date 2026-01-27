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
      "res.cloudinary.com",
      "cloudinary.com",
    ],
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' https://js.stripe.com https://*.stripe.com; style-src 'self' 'unsafe-inline' https://*.stripe.com; img-src 'self' blob: data: https:; font-src 'self' https://*.stripe.com; connect-src 'self' https:; frame-src 'self' https://*.stripe.com https://*.stripes.com; worker-src 'self' blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://*.stripe.com;",
  },

  webpack: (config, { isServer, dev, webpack }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 200,
      };
    }

    // Add parent node_modules to module resolution paths
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../node_modules'),
      'node_modules'
    ];

    // Configure path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      // Dynamic resolution for zod/mini (required by porto)
      'zod/mini': (() => {
        try {
          const { createRequire } = require('module');
          try {
            const portoPath = require.resolve('porto');
            const requireFromPorto = createRequire(portoPath);
            return requireFromPorto.resolve('zod/mini');
          } catch {
            // Fallback if porto resolution fails
            return path.resolve(__dirname, '../node_modules/porto/node_modules/zod/mini/index.js');
          }
        } catch (e) {
          return path.resolve(__dirname, '../node_modules/porto/node_modules/zod/mini/index.js');
        }
      })(),
    };

    // Suppress Solana instruction-plans errors - it's an optional dependency from coinbase SDK
    // that tries to import missing error codes from @solana/errors
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@solana\/instruction-plans$/,
      })
    );

    // Suppress Solana kit errors - optional dependency we don't directly use
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@solana\/kit$/,
      })
    );

    // Handle node: protocol imports - convert to regular node module imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'node:crypto': 'crypto',
      'node:stream': 'stream',
      'node:buffer': 'buffer',
      'node:util': 'util',
      'node:process': 'process',
      'node:http': 'http',
      'node:https': 'https',
      'node:url': 'url',
      'node:fs': 'fs',
    };

    // Handle node: protocol imports
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
    };

    // Add polyfill for crypto
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    );

    // Use NormalModuleReplacementPlugin to replace node: protocol imports
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      })
    );

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
          },
          {
            key: 'X-WebKit-CSP',
            value: "default-src 'self'; script-src 'self' https://js.stripe.com https://*.stripe.com; style-src 'self' 'unsafe-inline' https://*.stripe.com; img-src 'self' blob: data: https:; font-src 'self' https://*.stripe.com; connect-src 'self' https:; frame-src 'self' https://*.stripe.com https://*.stripes.com; worker-src 'self' blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://*.stripe.com;"
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'interest-cohort=()'
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
        source: '/messages',
        destination: '/chat',
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

  // Skip generating auto catch-all for not-found to avoid router context issues
  // We provide a custom not-found.tsx instead
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  // Optimize for development
  // swcMinify: false, // Disable SWC minification in development for faster builds (Removed due to deprecation warning)
  poweredByHeader: false // Remove powered by header for security
};

module.exports = nextConfig;

// Configure rewrites for API proxying
// This is enabled in all environments to ensure frontend can talk to backend
// whether running locally (dev/prod) or in deployment
if (true) {
  nextConfig.rewrites = async () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
    console.log(`[Next.js] Rewriting /api/* to ${backendUrl}/api/*`);
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      }
    ];
  };
}