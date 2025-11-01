import { CustomScamDetectionService, ContentInput } from '../services/customScamDetectionService';
import { safeLogger } from '../utils/safeLogger';
import { logger } from '../utils/logger';

/**
 * Validation script for Custom Scam Detection Service
 * Tests various scam patterns and edge cases
 */
async function validateCustomScamDetection() {
  safeLogger.info('🔍 Starting Custom Scam Detection Validation...\n');

  const service = new CustomScamDetectionService();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Test cases with expected results
  const testCases = [
    // Seed Phrase Detection Tests
    {
      name: 'Seed Phrase - BIP39 Words',
      content: {
        text: 'abandon ability able about above absent absorb abstract absurd abuse access accident',
        metadata: { contentId: 'test-seed-1' }
      },
      expectedScam: true,
      expectedCategory: 'seed_phrase_exposure',
      expectedPatterns: ['seed_phrase']
    },
    {
      name: 'Private Key - Hex Format',
      content: {
        text: 'My private key: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        metadata: { contentId: 'test-key-1' }
      },
      expectedScam: true,
      expectedCategory: 'seed_phrase_exposure',
      expectedPatterns: ['private_key']
    },
    {
      name: 'Recovery Phrase Indicator',
      content: {
        text: 'Help me recover my wallet with this recovery phrase',
        metadata: { contentId: 'test-recovery-1' }
      },
      expectedScam: true,
      expectedCategory: 'seed_phrase_exposure',
      expectedPatterns: ['recovery_phrase']
    },

    // Crypto Scam Detection Tests
    {
      name: 'Fake Giveaway - Elon Musk',
      content: {
        text: 'Elon Musk Bitcoin giveaway! Send 1 BTC to get 10 BTC back!',
        metadata: { contentId: 'test-giveaway-1' }
      },
      expectedScam: true,
      expectedCategory: 'crypto_scam',
      expectedPatterns: ['giveaway']
    },
    {
      name: 'Crypto Doubling Scam',
      content: {
        text: 'Double your Bitcoin instantly! 100% guaranteed!',
        metadata: { contentId: 'test-double-1' }
      },
      expectedScam: true,
      expectedCategory: 'crypto_scam',
      expectedPatterns: ['giveaway']
    },
    {
      name: 'Fake Airdrop',
      content: {
        text: 'Free airdrop! Claim your tokens now!',
        metadata: { contentId: 'test-airdrop-1' }
      },
      expectedScam: true,
      expectedCategory: 'crypto_scam',
      expectedPatterns: ['airdrop']
    },

    // Impersonation Detection Tests
    {
      name: 'Profile Impersonation',
      content: {
        text: 'Official announcement from my verified account',
        userProfile: {
          handle: 'elonmusk_official',
          bio: 'CEO of Tesla',
          reputation: 0,
          accountAge: 1
        },
        metadata: { contentId: 'test-imperson-1' }
      },
      expectedScam: true,
      expectedCategory: 'impersonation',
      expectedPatterns: ['profile_impersonation']
    },
    {
      name: 'Verification Claims',
      content: {
        text: 'I am the verified account of Vitalik Buterin',
        metadata: { contentId: 'test-verify-1' }
      },
      expectedScam: true,
      expectedCategory: 'impersonation',
      expectedPatterns: ['content_impersonation']
    },

    // Market Manipulation Tests
    {
      name: 'Pump and Dump',
      content: {
        text: 'Pump and dump this coin! Everyone buy now!',
        metadata: { contentId: 'test-pump-1' }
      },
      expectedScam: true,
      expectedCategory: 'market_manipulation',
      expectedPatterns: ['pump_dump']
    },
    {
      name: 'Coordinated Trading',
      content: {
        text: 'Everyone buy at the same time! Mass purchase!',
        metadata: { contentId: 'test-coord-1' }
      },
      expectedScam: true,
      expectedCategory: 'market_manipulation',
      expectedPatterns: ['coordination']
    },

    // Phishing Detection Tests
    {
      name: 'Wallet Verification Phishing',
      content: {
        text: 'Verify your wallet immediately or it will be suspended!',
        metadata: { contentId: 'test-phish-1' }
      },
      expectedScam: true,
      expectedCategory: 'phishing',
      expectedPatterns: ['phishing']
    },
    {
      name: 'Fake Security Alert',
      content: {
        text: 'Security breach detected! Immediate action required!',
        metadata: { contentId: 'test-security-1' }
      },
      expectedScam: true,
      expectedCategory: 'phishing',
      expectedPatterns: ['fake_security']
    },

    // Clean Content Tests
    {
      name: 'Normal Crypto Discussion',
      content: {
        text: 'I think Bitcoin has great potential as a store of value',
        metadata: { contentId: 'test-clean-1' }
      },
      expectedScam: false,
      expectedCategory: 'clean',
      expectedPatterns: []
    },
    {
      name: 'Technical Analysis',
      content: {
        text: 'Based on the charts, BTC might reach new highs. Not financial advice.',
        metadata: { contentId: 'test-clean-2' }
      },
      expectedScam: false,
      expectedCategory: 'clean',
      expectedPatterns: []
    },
    {
      name: 'Educational Content',
      content: {
        text: 'Blockchain technology enables decentralized applications and smart contracts. DeFi protocols are revolutionizing finance.',
        metadata: { contentId: 'test-clean-3' }
      },
      expectedScam: false,
      expectedCategory: 'clean',
      expectedPatterns: []
    }
  ];

  // Run test cases
  for (const testCase of testCases) {
    totalTests++;
    safeLogger.info(`Testing: ${testCase.name}`);

    try {
      const result = await service.analyzeContent(testCase.content);

      // Validate results
      const isScamMatch = result.isScam === testCase.expectedScam;
      const categoryMatch = result.category === testCase.expectedCategory;
      const patternsMatch = testCase.expectedPatterns.every(pattern => 
        result.patterns.includes(pattern)
      );

      if (isScamMatch && categoryMatch && (testCase.expectedScam ? patternsMatch : true)) {
        safeLogger.info(`✅ PASS - ${testCase.name}`);
        safeLogger.info(`   Result: ${result.isScam ? 'SCAM' : 'CLEAN'} (${result.confidence.toFixed(2)} confidence)`);
        safeLogger.info(`   Category: ${result.category}`);
        safeLogger.info(`   Patterns: ${result.patterns.join(', ')}\n`);
        passedTests++;
      } else {
        safeLogger.info(`❌ FAIL - ${testCase.name}`);
        safeLogger.info(`   Expected: ${testCase.expectedScam ? 'SCAM' : 'CLEAN'} (${testCase.expectedCategory})`);
        safeLogger.info(`   Got: ${result.isScam ? 'SCAM' : 'CLEAN'} (${result.category})`);
        safeLogger.info(`   Expected patterns: ${testCase.expectedPatterns.join(', ')}`);
        safeLogger.info(`   Got patterns: ${result.patterns.join(', ')}`);
        safeLogger.info(`   Confidence: ${result.confidence.toFixed(2)}\n`);
        failedTests++;
      }
    } catch (error) {
      safeLogger.info(`❌ ERROR - ${testCase.name}: ${error}\n`);
      failedTests++;
    }
  }

  // Performance test
  safeLogger.info('🚀 Running Performance Test...');
  const performanceContent: ContentInput = {
    text: 'This is a performance test message with some crypto content. '.repeat(50),
    metadata: { contentId: 'performance-test' }
  };

  const startTime = Date.now();
  await service.analyzeContent(performanceContent);
  const endTime = Date.now();
  const duration = endTime - startTime;

  safeLogger.info(`⏱️  Performance: ${duration}ms (should be < 1000ms)`);
  if (duration < 1000) {
    safeLogger.info('✅ Performance test passed\n');
    passedTests++;
  } else {
    safeLogger.info('❌ Performance test failed\n');
    failedTests++;
  }
  totalTests++;

  // Concurrent test
  safeLogger.info('🔄 Running Concurrent Test...');
  const concurrentContents = Array.from({ length: 5 }, (_, i) => ({
    text: `Concurrent test message ${i}`,
    metadata: { contentId: `concurrent-${i}` }
  }));

  const concurrentStart = Date.now();
  const concurrentResults = await Promise.all(
    concurrentContents.map(content => service.analyzeContent(content))
  );
  const concurrentEnd = Date.now();
  const concurrentDuration = concurrentEnd - concurrentStart;

  safeLogger.info(`⏱️  Concurrent: ${concurrentDuration}ms for 5 requests`);
  if (concurrentResults.length === 5 && concurrentDuration < 2000) {
    safeLogger.info('✅ Concurrent test passed\n');
    passedTests++;
  } else {
    safeLogger.info('❌ Concurrent test failed\n');
    failedTests++;
  }
  totalTests++;

  // Summary
  safeLogger.info('📊 Validation Summary:');
  safeLogger.info(`Total Tests: ${totalTests}`);
  safeLogger.info(`Passed: ${passedTests}`);
  safeLogger.info(`Failed: ${failedTests}`);
  safeLogger.info(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    safeLogger.info('\n🎉 All tests passed! Custom Scam Detection is working correctly.');
  } else {
    safeLogger.info(`\n⚠️  ${failedTests} test(s) failed. Please review the implementation.`);
  }

  return {
    totalTests,
    passedTests,
    failedTests,
    successRate: (passedTests / totalTests) * 100
  };
}

// Run validation if called directly
if (require.main === module) {
  validateCustomScamDetection()
    .then(results => {
      process.exit(results.failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      safeLogger.error('Validation failed:', error);
      process.exit(1);
    });
}

export { validateCustomScamDetection };
