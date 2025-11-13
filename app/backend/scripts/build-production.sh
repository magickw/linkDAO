#!/bin/bash

# Production build script for Render Standard (2GB RAM)
# Uses ts-node for runtime compilation to avoid build memory issues

echo "🚀 Preparing LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Create production launcher that uses ts-node
echo "📝 Creating production launcher with ts-node..."
cat > dist/index.js << 'EOF'
#!/usr/bin/env node

// Set memory limits
process.env.NODE_OPTIONS = '--max-old-space-size=1536';

console.log('🚀 Starting LinkDAO Backend - Production Mode');
console.log('📊 Node.js version:', process.version);
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

// Configure ts-node for production
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    target: 'ES2020',
    module: 'commonjs',
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false
  }
});

// Start the application
require('../src/index.ts');
EOF

chmod +x dist/index.js

# Install ts-node if not present
echo "📦 Ensuring ts-node is available..."
npm install --no-save ts-node || true

# Ensure production dependencies
echo "📦 Installing production dependencies..."
NODE_OPTIONS="--max-old-space-size=512" npm ci --only=production

echo "✅ Production launcher created!"
echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
echo "🎯 Ready to run with: node dist/index.js"
exit 0
