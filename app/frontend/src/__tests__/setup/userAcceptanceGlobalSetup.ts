/**
 * Global Setup for User Acceptance Tests
 * Initializes the test environment before running user acceptance tests
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  console.log('🚀 Setting up User Acceptance Test Environment...');
  
  // Create test reports directory
  const reportsDir = path.join(__dirname, '../../../test-reports/user-acceptance');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Create coverage directory
  const coverageDir = path.join(__dirname, '../../../coverage/user-acceptance');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }
  
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.REACT_APP_TEST_MODE = 'user-acceptance';
  process.env.REACT_APP_WEB3_TEST_MODE = 'true';
  
  // Web3 test configuration
  process.env.TEST_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87';
  process.env.TEST_PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env.TEST_RPC_URL = 'http://localhost:8545';
  process.env.TEST_CHAIN_ID = '31337';
  process.env.TEST_NETWORK_ID = '31337';
  
  // Performance test thresholds
  process.env.RENDER_TIME_THRESHOLD = '100';
  process.env.WEB3_LOAD_TIME_THRESHOLD = '200';
  process.env.MEMORY_USAGE_THRESHOLD = '50000000';
  process.env.FPS_THRESHOLD = '55';
  
  // Mobile test configuration
  process.env.MOBILE_VIEWPORTS = JSON.stringify({
    iphone12: { width: 390, height: 844 },
    iphone12Mini: { width: 375, height: 812 },
    iphone12Pro: { width: 390, height: 844 },
    iphone12ProMax: { width: 428, height: 926 },
    galaxyS21: { width: 384, height: 854 },
    galaxyS21Ultra: { width: 412, height: 915 },
    pixel5: { width: 393, height: 851 },
    ipadMini: { width: 768, height: 1024 },
    ipadAir: { width: 820, height: 1180 },
    ipadPro: { width: 1024, height: 1366 },
  });
  
  // Browser test configuration
  process.env.BROWSER_CONFIGS = JSON.stringify({
    chrome: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      features: { webgl: true, webrtc: true, serviceWorker: true, webAssembly: true, bigInt: true }
    },
    firefox: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      features: { webgl: true, webrtc: true, serviceWorker: true, webAssembly: true, bigInt: true }
    },
    safari: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      features: { webgl: true, webrtc: true, serviceWorker: true, webAssembly: true, bigInt: true }
    },
    edge: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      features: { webgl: true, webrtc: true, serviceWorker: true, webAssembly: true, bigInt: true }
    }
  });
  
  // Web3 provider configurations
  process.env.WEB3_PROVIDERS = JSON.stringify({
    metamask: {
      isMetaMask: true,
      isConnected: () => true,
      chainId: '0x1',
      networkVersion: '1',
      selectedAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87'
    },
    walletConnect: {
      isWalletConnect: true,
      connector: {
        connected: true,
        chainId: 1,
        accounts: ['0x742d35Cc6634C0532925a3b8D4C9db96590c6C87']
      }
    },
    coinbaseWallet: {
      isCoinbaseWallet: true,
      isConnected: true,
      chainId: 1,
      selectedAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87'
    }
  });
  
  // Test data configuration
  process.env.TEST_DATA_SIZES = JSON.stringify({
    small: 10,
    medium: 100,
    large: 1000,
    xlarge: 5000
  });
  
  // Performance monitoring configuration
  process.env.ENABLE_PERFORMANCE_MONITORING = 'true';
  process.env.PERFORMANCE_SAMPLE_RATE = '1.0';
  
  // Accessibility testing configuration
  process.env.ENABLE_ACCESSIBILITY_TESTING = 'true';
  process.env.ACCESSIBILITY_STANDARDS = 'WCAG21AA';
  
  // Create test configuration file
  const testConfig = {
    timestamp: new Date().toISOString(),
    environment: 'user-acceptance',
    web3: {
      testWalletAddress: process.env.TEST_WALLET_ADDRESS,
      testChainId: process.env.TEST_CHAIN_ID,
      testNetworkId: process.env.TEST_NETWORK_ID,
    },
    performance: {
      renderTimeThreshold: parseInt(process.env.RENDER_TIME_THRESHOLD || '100'),
      web3LoadTimeThreshold: parseInt(process.env.WEB3_LOAD_TIME_THRESHOLD || '200'),
      memoryUsageThreshold: parseInt(process.env.MEMORY_USAGE_THRESHOLD || '50000000'),
      fpsThreshold: parseInt(process.env.FPS_THRESHOLD || '55'),
    },
    mobile: {
      viewports: JSON.parse(process.env.MOBILE_VIEWPORTS || '{}'),
      touchEventsEnabled: true,
      hapticFeedbackEnabled: true,
    },
    browser: {
      configs: JSON.parse(process.env.BROWSER_CONFIGS || '{}'),
      web3Providers: JSON.parse(process.env.WEB3_PROVIDERS || '{}'),
    },
    accessibility: {
      enabled: process.env.ENABLE_ACCESSIBILITY_TESTING === 'true',
      standards: process.env.ACCESSIBILITY_STANDARDS || 'WCAG21AA',
    },
  };
  
  const configPath = path.join(reportsDir, 'test-config.json');
  fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
  
  // Initialize test metrics tracking
  const metricsPath = path.join(reportsDir, 'test-metrics.json');
  const initialMetrics = {
    startTime: new Date().toISOString(),
    testSuites: {
      web3UserJourneys: { status: 'pending', startTime: null, endTime: null, duration: 0 },
      mobileCompatibility: { status: 'pending', startTime: null, endTime: null, duration: 0 },
      crossBrowserCompatibility: { status: 'pending', startTime: null, endTime: null, duration: 0 },
      performanceOptimization: { status: 'pending', startTime: null, endTime: null, duration: 0 },
    },
    performance: {
      totalRenderTime: 0,
      totalWeb3LoadTime: 0,
      peakMemoryUsage: 0,
      averageFPS: 0,
    },
    coverage: {
      web3Features: 0,
      mobileDevices: 0,
      browsers: 0,
      performanceMetrics: 0,
    },
  };
  
  fs.writeFileSync(metricsPath, JSON.stringify(initialMetrics, null, 2));
  
  // Set up test data
  const testDataPath = path.join(reportsDir, 'test-data');
  if (!fs.existsSync(testDataPath)) {
    fs.mkdirSync(testDataPath, { recursive: true });
  }
  
  // Generate mock test data for different scenarios
  const mockCommunities = Array.from({ length: 100 }, (_, i) => ({
    id: `community-${i}`,
    name: `Test Community ${i}`,
    description: `Description for test community ${i}`,
    memberCount: Math.floor(Math.random() * 10000) + 100,
    tokenRequirement: i % 3 === 0 ? {
      token: 'DEFI',
      amount: Math.floor(Math.random() * 1000) + 100,
    } : null,
    governanceActive: i % 4 === 0,
    treasuryBalance: Math.floor(Math.random() * 1000000),
  }));
  
  fs.writeFileSync(
    path.join(testDataPath, 'mock-communities.json'),
    JSON.stringify(mockCommunities, null, 2)
  );
  
  const mockPosts = Array.from({ length: 500 }, (_, i) => ({
    id: `post-${i}`,
    title: `Test Post ${i}`,
    content: `Content for test post ${i}`,
    author: `user${i % 50}.eth`,
    communityId: `community-${i % 100}`,
    type: ['governance', 'discussion', 'showcase'][i % 3],
    stakingInfo: {
      totalStaked: Math.floor(Math.random() * 10000),
      stakerCount: Math.floor(Math.random() * 100),
      userStake: Math.floor(Math.random() * 1000),
    },
    engagementScore: Math.floor(Math.random() * 100),
    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
  
  fs.writeFileSync(
    path.join(testDataPath, 'mock-posts.json'),
    JSON.stringify(mockPosts, null, 2)
  );
  
  console.log('✅ User Acceptance Test Environment Setup Complete');
  console.log(`📊 Test configuration saved to: ${configPath}`);
  console.log(`📈 Test metrics initialized at: ${metricsPath}`);
  console.log(`📁 Test data generated in: ${testDataPath}`);
}