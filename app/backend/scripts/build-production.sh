#!/bin/bash

# Production build script for Render Standard (2GB RAM)
# Uses ts-node for runtime TypeScript compilation instead of pre-compilation
# This avoids the TypeScript compiler crash issue

echo "🚀 Preparing LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Create a simple launcher script that uses ts-node
echo "📝 Creating production launcher..."
cat > dist/index.js << 'EOF'
#!/usr/bin/env node

/**
 * Production launcher using ts-node
 * This runs the TypeScript source directly without pre-compilation
 */

console.log('🚀 Starting LinkDAO Backend via ts-node');
console.log('📊 Node.js version:', process.version);
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

// Set up ts-node with optimized settings
require('ts-node').register({
  transpileOnly: true, // Skip type checking for faster startup
  compilerOptions: {
    module: 'commonjs',
    target: 'ES2020',
    esModuleInterop: true,
    skipLibCheck: true,
  }
});

// Load and run the main application
require('../src/index.ts');
EOF

chmod +x dist/index.js

echo "✅ Production launcher created!"
echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
echo "🎯 Ready to run with: node dist/index.js"
exit 0
