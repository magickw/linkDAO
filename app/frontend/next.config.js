/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Set the correct output file tracing root
  outputFileTracingRoot: require('path').join(__dirname),

  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Only look for pages in src/pages directory, not in node_modules
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Image optimization
  images: {
    domains: ['ipfs.io', 'gateway.pinata.cloud', 'cloudflare-ipfs.com', 'linkdao.io', 'localhost', '127.0.0.1'],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self'; connect-src 'self' https:; frame-src 'self' https:; worker-src 'self' blob:;",
  },

  // Webpack configuration with Workbox integration
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Add alias for @react-native-async-storage/async-storage to use our fallback
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage':
        require('path').resolve(__dirname, 'src/utils/asyncStorageFallback.js')
    };

    // Exclude playwright from client-side bundling
    if (!isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'playwright': 'commonjs playwright',
          '@playwright/test': 'commonjs @playwright/test',
          'playwright-core': 'commonjs playwright-core',
        });
      }

      // Add ignore plugin for playwright files
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^playwright/,
          contextRegExp: /node_modules/,
        })
      );
    }

    // Add Workbox webpack plugin for service worker generation
    if (!isServer) {
      const WorkboxPlugin = require('workbox-webpack-plugin');

      config.plugins.push(
        new WorkboxPlugin.InjectManifest({
          swSrc: './public/sw-simple.js',
          swDest: '../public/sw-precache.js',
          exclude: [/\.map$/, /manifest$/, /\.htaccess$/],
          maximumFileSizeToCacheInBytes: 5000000, // 5MB
        })
      );
    }

    return config;
  },

  // Headers for security and SEO
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // HSTS - Enforce HTTPS (only enable in production with valid SSL)
          // Uncomment in production after SSL is configured:
          // {
          //   key: 'Strict-Transport-Security',
          //   value: 'max-age=31536000; includeSubDomains'
          // },
          // Content Security Policy - allow localhost in development
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://js.stripe.com https://storage.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              process.env.NODE_ENV === 'development'
                ? "connect-src 'self' https: wss: ws: http://localhost:* ws://localhost:* https://api.stripe.com"
                : "connect-src 'self' https: wss: ws: https://api.stripe.com",
              "frame-src 'self' https: https://js.stripe.com https://hooks.stripe.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          // Performance and SEO headers
          {
            key: 'X-Content-Duration',
            value: '0'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/xml',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      // Add headers for API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
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
        source: '/marketplace/:path*',
        destination: '/marketplace',
        permanent: true,
      },
      {
        source: '/governance/:path*',
        destination: '/governance',
        permanent: true,
      }
    ];
  },

  // Add trailing slash for SEO consistency
  trailingSlash: false,

  // Optimize for faster builds
  // swcMinify is now enabled by default in Next.js 13+

  // Enable experimental features that improve SEO and performance
  experimental: {
    // Optimize server-side rendering
    optimizeServerReact: true,
  },
};

// const withBundleAnalyzer = require('@next/bundle-analyzer')({
//   enabled: process.env.ANALYZE === 'true',
// });

// module.exports = withBundleAnalyzer(nextConfig);
module.exports = nextConfig;