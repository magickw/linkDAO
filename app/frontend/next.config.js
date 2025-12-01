/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  reactStrictMode: true,
  
  // Configure path aliases
  experimental: {
    esmExternals: false,
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

  webpack: (config, { isServer }) => {
    // Configure path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

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
      // Redirect sub-paths to main pages if they don't exist (using :path+ instead of :path* to avoid loops)
      // Exclude seller store paths to allow public access
      {
        source: '/marketplace/:path((?!seller/store/).*)+',
        destination: '/marketplace',
        permanent: false, // Changed to false to allow recovery if this was a mistake
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
};

module.exports = nextConfig;