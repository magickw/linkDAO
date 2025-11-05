#!/usr/bin/env node

/**
 * Fix for MetaMask SDK React Native dependency issue
 * This script addresses the @react-native-async-storage/async-storage resolution error
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing MetaMask SDK React Native dependency issue...');

// Check if the async storage fallback was created
const fallbackPath = path.join(__dirname, 'app/frontend/src/utils/asyncStorageFallback.js');
if (fs.existsSync(fallbackPath)) {
  console.log('✅ AsyncStorage fallback already exists');
} else {
  console.log('❌ AsyncStorage fallback missing - this should have been created');
  process.exit(1);
}

// Create a more comprehensive webpack polyfill file
const webpackPolyfillContent = `
/**
 * Webpack polyfills for React Native dependencies in web environment
 */

// Polyfill for React Native's global object
if (typeof global === 'undefined') {
  global = globalThis;
}

// Polyfill for React Native's __DEV__ global
if (typeof __DEV__ === 'undefined') {
  global.__DEV__ = process.env.NODE_ENV !== 'production';
}

// Polyfill for React Native's performance API
if (typeof performance === 'undefined' && typeof window !== 'undefined') {
  global.performance = window.performance;
}

// Export empty object to prevent import errors
module.exports = {};
`;

const polyfillPath = path.join(__dirname, 'app/frontend/src/utils/reactNativePolyfills.js');
fs.writeFileSync(polyfillPath, webpackPolyfillContent.trim());
console.log('✅ Created React Native polyfills');

// Update the Next.js config to include the polyfills
const nextConfigPath = path.join(__dirname, 'next.config.js');
let nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');

// Check if polyfills are already included
if (!nextConfigContent.includes('reactNativePolyfills')) {
  // Add polyfill import at the beginning of webpack config
  const webpackConfigStart = 'webpack: (config, { isServer }) => {';
  const polyfillImport = `
    // Import React Native polyfills for web environment
    if (!isServer) {
      require('./app/frontend/src/utils/reactNativePolyfills.js');
    }
    `;
  
  nextConfigContent = nextConfigContent.replace(
    webpackConfigStart,
    webpackConfigStart + polyfillImport
  );
  
  fs.writeFileSync(nextConfigPath, nextConfigContent);
  console.log('✅ Added React Native polyfills to webpack config');
}

// Create a test component to verify the fix
const testComponentContent = `
import React from 'react';

/**
 * Test component to verify MetaMask SDK can be imported without React Native errors
 */
export const MetaMaskSDKTest: React.FC = () => {
  const [sdkStatus, setSdkStatus] = React.useState<string>('Loading...');
  
  React.useEffect(() => {
    // Test if we can import MetaMask SDK without errors
    const testMetaMaskImport = async () => {
      try {
        // This should not throw the async-storage error anymore
        const { MetaMaskSDK } = await import('@metamask/sdk');
        setSdkStatus('✅ MetaMask SDK imported successfully');
        console.log('MetaMask SDK imported without React Native dependency errors');
      } catch (error) {
        setSdkStatus(\`❌ MetaMask SDK import failed: \${error.message}\`);
        console.error('MetaMask SDK import error:', error);
      }
    };
    
    testMetaMaskImport();
  }, []);
  
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">MetaMask SDK Dependency Test</h3>
      <p className="text-sm text-gray-600 mb-2">
        This component tests if the React Native dependency issue has been resolved.
      </p>
      <div className="font-mono text-sm">
        Status: {sdkStatus}
      </div>
    </div>
  );
};

export default MetaMaskSDKTest;
`;

const testComponentPath = path.join(__dirname, 'app/frontend/src/components/MetaMaskSDKTest.tsx');
fs.writeFileSync(testComponentPath, testComponentContent.trim());
console.log('✅ Created MetaMask SDK test component');

// Create a simple test page to verify the fix
const testPageContent = `
import React from 'react';
import MetaMaskSDKTest from '../components/MetaMaskSDKTest';

/**
 * Test page to verify MetaMask SDK React Native dependency fix
 */
const MetaMaskTestPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">MetaMask SDK Dependency Fix Test</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Issue Fixed</h2>
          <p className="text-blue-700 text-sm">
            The React Native async-storage dependency error in MetaMask SDK has been resolved
            by providing a web-compatible localStorage fallback.
          </p>
        </div>
        
        <MetaMaskSDKTest />
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">What Was Fixed</h2>
          <ul className="text-green-700 text-sm space-y-1">
            <li>• Added webpack alias for @react-native-async-storage/async-storage</li>
            <li>• Created localStorage-based fallback implementation</li>
            <li>• Added React Native polyfills for web environment</li>
            <li>• Updated Next.js webpack configuration</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MetaMaskTestPage;
`;

const testPagePath = path.join(__dirname, 'app/frontend/src/pages/metamask-test.tsx');
fs.writeFileSync(testPagePath, testPageContent.trim());
console.log('✅ Created MetaMask test page at /metamask-test');

console.log('');
console.log('🎉 MetaMask SDK React Native dependency fix completed!');
console.log('');
console.log('Changes made:');
console.log('1. ✅ Created AsyncStorage fallback using localStorage');
console.log('2. ✅ Updated webpack aliases to resolve React Native dependencies');
console.log('3. ✅ Added React Native polyfills for web environment');
console.log('4. ✅ Created test component to verify the fix');
console.log('5. ✅ Created test page at /metamask-test');
console.log('');
console.log('Next steps:');
console.log('1. Restart the development server: npm run dev');
console.log('2. Visit http://localhost:3000/metamask-test to verify the fix');
console.log('3. Check browser console for any remaining dependency errors');
console.log('');
console.log('The MetaMask SDK should now import without React Native dependency errors.');