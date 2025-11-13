#!/bin/bash

# Production build script for Render Standard (2GB RAM)
# Minimal build to avoid memory issues

echo "🚀 Preparing LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Create minimal production launcher
echo "📝 Creating minimal production launcher..."
cat > dist/index.js << 'EOF'
#!/usr/bin/env node

// Set environment variables for Standard tier
process.env.RENDER_SERVICE_TYPE = 'standard';
process.env.RENDER_SERVICE_PLAN = 'standard';
process.env.RENDER_PRO = 'true';
process.env.MEMORY_LIMIT = '2048';

console.log('🚀 Starting LinkDAO Backend - Production Mode');
console.log('📊 Node.js version:', process.version);
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

// Load ts-node with minimal configuration
try {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      esModuleInterop: true,
      skipLibCheck: true
    }
  });
} catch (e) {
  console.error('❌ Failed to load ts-node:', e.message);
  process.exit(1);
}

// Start the application
require('../src/index.ts');
EOF

chmod +x dist/index.js

echo "✅ Production launcher created!"
echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
echo "🎯 Ready to run with: node dist/index.js"
exit 0
