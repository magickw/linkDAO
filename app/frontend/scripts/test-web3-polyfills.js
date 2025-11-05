#!/usr/bin/env node

/**
 * Test script to verify Web3 React Native polyfills are working correctly
 * Run with: node scripts/test-web3-polyfills.js
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Web3 React Native Polyfills...\n');

// Test 1: Check if polyfill files exist
console.log('📁 Checking polyfill files...');
const polyfillFiles = [
  'src/utils/asyncStorageFallback.js',
  'src/utils/reactNativePolyfills.js',
  'src/utils/cryptoPolyfills.js',
  'src/utils/web3Polyfills.js'
];

let allFilesExist = true;
polyfillFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some polyfill files are missing. Please run the setup again.');
  process.exit(1);
}

// Test 2: Check AsyncStorage polyfill
console.log('\n🔧 Testing AsyncStorage polyfill...');
try {
  const AsyncStorage = require('../src/utils/asyncStorageFallback.js');
  
  if (typeof AsyncStorage.getItem === 'function' &&
      typeof AsyncStorage.setItem === 'function' &&
      typeof AsyncStorage.removeItem === 'function') {
    console.log('✅ AsyncStorage polyfill has required methods');
  } else {
    console.log('❌ AsyncStorage polyfill missing required methods');
  }
} catch (error) {
  console.log(`❌ AsyncStorage polyfill error: ${error.message}`);
}

// Test 3: Check React Native polyfills
console.log('\n🔧 Testing React Native polyfills...');
try {
  const polyfills = require('../src/utils/reactNativePolyfills.js');
  
  const requiredPolyfills = [
    'ReactNativeKeychain',
    'getRandomValues',
    'ReactNativeFS',
    'DeviceInfo',
    'Clipboard'
  ];
  
  let allPolyfillsPresent = true;
  requiredPolyfills.forEach(polyfill => {
    if (polyfills[polyfill]) {
      console.log(`✅ ${polyfill} polyfill available`);
    } else {
      console.log(`❌ ${polyfill} polyfill missing`);
      allPolyfillsPresent = false;
    }
  });
  
  if (allPolyfillsPresent) {
    console.log('✅ All React Native polyfills available');
  }
} catch (error) {
  console.log(`❌ React Native polyfills error: ${error.message}`);
}

// Test 4: Check Next.js config
console.log('\n⚙️  Checking Next.js configuration...');
try {
  const nextConfigPath = path.join(__dirname, '..', '..', '..', 'next.config.js');
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  
  const requiredAliases = [
    '@react-native-async-storage/async-storage',
    'react-native-keychain',
    'react-native-get-random-values',
    'react-native-fs'
  ];
  
  let allAliasesPresent = true;
  requiredAliases.forEach(alias => {
    if (nextConfig.includes(alias)) {
      console.log(`✅ ${alias} alias configured`);
    } else {
      console.log(`❌ ${alias} alias missing`);
      allAliasesPresent = false;
    }
  });
  
  if (allAliasesPresent) {
    console.log('✅ All required webpack aliases configured');
  }
} catch (error) {
  console.log(`❌ Next.js config check error: ${error.message}`);
}

// Test 5: Check package.json for Web3 dependencies
console.log('\n📦 Checking Web3 dependencies...');
try {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const web3Packages = [
    '@rainbow-me/rainbowkit',
    'wagmi',
    'viem'
  ];
  
  web3Packages.forEach(pkg => {
    if (packageJson.dependencies[pkg]) {
      console.log(`✅ ${pkg} v${packageJson.dependencies[pkg]} installed`);
    } else {
      console.log(`⚠️  ${pkg} not found in dependencies`);
    }
  });
} catch (error) {
  console.log(`❌ Package.json check error: ${error.message}`);
}

// Test 6: Simulate common React Native imports
console.log('\n🎭 Simulating React Native imports...');

// Mock global environment for testing
global.window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0
  },
  crypto: {
    getRandomValues: (array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  }
};

try {
  // Test AsyncStorage
  const AsyncStorage = require('../src/utils/asyncStorageFallback.js');
  AsyncStorage.setItem('test', 'value').then(() => {
    console.log('✅ AsyncStorage setItem works');
  });
  
  // Test crypto polyfill
  const { getRandomValues } = require('../src/utils/reactNativePolyfills.js');
  const array = new Uint8Array(10);
  getRandomValues(array);
  console.log('✅ getRandomValues works');
  
} catch (error) {
  console.log(`❌ Simulation error: ${error.message}`);
}

console.log('\n🎉 Web3 React Native polyfill test completed!');
console.log('\n📋 Next steps:');
console.log('1. Run `npm run build` to test the build process');
console.log('2. Check for any remaining "Module not found" errors');
console.log('3. Test Web3 functionality in your application');
console.log('4. Verify wallet connections work properly');

console.log('\n💡 If you encounter issues:');
console.log('1. Check the browser console for polyfill warnings');
console.log('2. Review the WEB3_REACT_NATIVE_COMPATIBILITY_GUIDE.md');
console.log('3. Add missing React Native packages to webpack aliases');