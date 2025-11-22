/**
 * LDAO Token Acquisition System - Performance Tests
 * 
 * This test suite validates system performance under various load conditions:
 * - High concurrent user scenarios
 * - Database performance under load
 * - Smart contract gas optimization
 * - API response times
 * - Memory and resource usage
 */

import { describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';
import { TestEnvironment } from '../comprehensive/testEnvironment';
import { safeLogger } from '../utils/safeLogger';
import { LDAOAcquisitionService } from '../../services/ldaoAcquisitionService';
import { safeLogger } from '../utils/safeLogger';
import request from 'supertest';
import { safeLogger } from '../utils/safeLogger';
import { ethers } from 'hardhat';
import { safeLogger } from '../utils/safeLogger';

describe('LDAO Acquisition System - Performance Tests', () => {
  let testEnv: TestEnvironment;
  let acquisitionService: LDAOAcquisitionService;
  let app: any;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    acquisitionService = testEnv.getLDAOAcquisitionService();
    app = testEnv.getApp();
  }, 300000);

  afterAll(async () => {
    if (testEnv) {
      await testEnv.teardown();
    }
  }, 120000);

  beforeEach(async () => {
    await testEnv.resetPerformanceCounters();
  });

  describe('1. High Load Purchase Scenarios', () => {
    test('should handle 1000 concurrent fiat purchases within acceptable time', async () => {
      const concurrentUsers = 1000;
      const purchaseAmount = 100;
      const maxResponseTime = 5000; // 5 seconds
      const maxErrorRate = 0.05; // 5%

      const startTime = performance.now();
      const purchasePromises = [];

      // Generate concurrent purchase requests
      for (let i = 0; i < concurrentUsers; i++) {
        const userAddress = `0x${i.toString(16).padStart(40, '0')}`;
        const promise = request(app)
          .post('/api/ldao/purchase')
          .send({
            amount: purchaseAmount,
            paymentMethod: 'fiat',
            userAddress: userAddress
          })
          .timeout(maxResponseTime);
        
        purchasePromises.push(promise);
      }

      const results = await Promise.allSettled(purchasePromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;
      const failed = results.length - successful;
      const errorRate = failed / results.length;

      // Performance assertions
      expect(totalTime).toBeLessThan(30000); // Complete within 30 seconds
      expect(errorRate).toBeLessThan(maxErrorRate);
      expect(successful).toBeGreaterThanOrEqual(concurrentUsers * 0.95); // 95% success rate

      safeLogger.info(`Performance Results:
        - Total time: ${totalTime.toFixed(2)}ms
        - Successful requests: ${successful}/${concurrentUsers}
        - Error rate: ${(errorRate * 100).toFixed(2)}%
        - Average response time: ${(totalTime / concurrentUsers).toFixed(2)}ms
      `);
    });

    test('should handle mixed payment method load efficiently', async () => {
      const totalRequests = 500;
      const paymentMethods = ['fiat', 'crypto'];
      const cryptoTokens = ['ETH', 'USDC', 'USDT'];

      const requests = [];
      for (let i = 0; i < totalRequests; i++) {
        const paymentMethod = paymentMethods[i % paymentMethods.length];
        const userAddress = `0x${i.toString(16).padStart(40, '0')}`;
        
        const requestData: any = {
          amount: 100 + (i % 900), // Vary amounts
          paymentMethod,
          userAddress
        };

        if (paymentMethod === 'crypto') {
          requestData.paymentToken = cryptoTokens[i % cryptoTokens.length];
        }

        requests.push(
          request(app)
            .post('/api/ldao/purchase')
            .send(requestData)
        );
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(requests);
      const endTime = performance.now();

      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      expect(successful).toBeGreaterThanOrEqual(totalRequests * 0.9);
      expect(endTime - startTime).toBeLessThan(20000); // 20 seconds
    });

    test('should maintain performance with volume discount calculations', async () => {
      const largeAmounts = [50000, 100000, 500000, 1000000]; // Different discount tiers
      const requestsPerAmount = 50;

      const allRequests = [];
      for (const amount of largeAmounts) {
        for (let i = 0; i < requestsPerAmount; i++) {
          const userAddress = `0x${amount}_${i}`.padEnd(42, '0');
          allRequests.push(
            request(app)
              .post('/api/ldao/purchase')
              .send({
                amount,
                paymentMethod: 'fiat',
                userAddress
              })
          );
        }
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(allRequests);
      const endTime = performance.now();

      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      // Should handle discount calculations efficiently
      expect(successful).toBeGreaterThanOrEqual(allRequests.length * 0.9);
      expect(endTime - startTime).toBeLessThan(15000); // 15 seconds
    });
  });

  describe('2. Database Performance Under Load', () => {
    test('should handle high-frequency transaction logging', async () => {
      const transactionCount = 1000;
      const maxInsertTime = 10000; // 10 seconds

      const transactions = [];
      for (let i = 0; i < transactionCount; i++) {
        transactions.push({
          transaction_id: `tx_${i}_${Date.now()}`,
          user_address: `0x${i.toString(16).padStart(40, '0')}`,
          amount: (100 + i).toString(),
          payment_method: i % 2 === 0 ? 'fiat' : 'crypto',
          payment_token: i % 2 === 0 ? 'USD' : 'ETH',
          price_per_token: '0.01',
          discount_applied: (i % 10).toString(),
          status: 'completed',
          created_at: new Date(),
          completed_at: new Date()
        });
      }

      const startTime = performance.now();
      
      // Batch insert for better performance
      const batchSize = 100;
      const insertPromises = [];
      
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        insertPromises.push(
          testEnv.getDatabase()
            .insert(batch)
            .into('purchase_transactions')
        );
      }

      await Promise.all(insertPromises);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(maxInsertTime);

      // Verify all transactions were inserted
      const count = await testEnv.getDatabase()
        .count('* as total')
        .from('purchase_transactions')
        .first();

      expect(parseInt(count.total)).toBeGreaterThanOrEqual(transactionCount);
    });

    test('should maintain query performance with large datasets', async () => {
      // First, populate database with test data
      await populateTestData(10000); // 10k records

      const queryTests = [
        {
          name: 'User transaction history',
          query: () => testEnv.getDatabase()
            .select('*')
            .from('purchase_transactions')
            .where('user_address', '0x1234567890123456789012345678901234567890')
            .orderBy('created_at', 'desc')
            .limit(100)
        },
        {
          name: 'Daily transaction volume',
          query: () => testEnv.getDatabase()
            .select(testEnv.getDatabase().raw('DATE(created_at) as date, SUM(CAST(amount as DECIMAL)) as volume'))
            .from('purchase_transactions')
            .where('created_at', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .groupBy(testEnv.getDatabase().raw('DATE(created_at)'))
        },
        {
          name: 'Payment method statistics',
          query: () => testEnv.getDatabase()
            .select('payment_method')
            .count('* as count')
            .sum('amount as total_amount')
            .from('purchase_transactions')
            .groupBy('payment_method')
        }
      ];

      for (const queryTest of queryTests) {
        const startTime = performance.now();
        const result = await queryTest.query();
        const endTime = performance.now();
        const queryTime = endTime - startTime;

        expect(queryTime).toBeLessThan(1000); // Less than 1 second
        expect(result).toBeDefined();
        
        safeLogger.info(`${queryTest.name}: ${queryTime.toFixed(2)}ms`);
      }
    });

    test('should handle concurrent database operations efficiently', async () => {
      const concurrentOperations = 100;
      const operations = [];

      // Mix of read and write operations
      for (let i = 0; i < concurrentOperations; i++) {
        if (i % 3 === 0) {
          // Write operation
          operations.push(
            testEnv.getDatabase()
              .insert({
                transaction_id: `concurrent_tx_${i}`,
                user_address: `0x${i.toString(16).padStart(40, '0')}`,
                amount: '100',
                payment_method: 'fiat',
                payment_token: 'USD',
                price_per_token: '0.01',
                discount_applied: '0',
                status: 'completed',
                created_at: new Date()
              })
              .into('purchase_transactions')
          );
        } else {
          // Read operation
          operations.push(
            testEnv.getDatabase()
              .select('*')
              .from('purchase_transactions')
              .limit(10)
          );
        }
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(operations);
      const endTime = performance.now();

      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThanOrEqual(concurrentOperations * 0.95);
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });

  describe('3. Smart Contract Gas Optimization', () => {
    test('should optimize gas usage for token purchases', async () => {
      const [owner, user1] = await ethers.getSigners();
      const treasury = testEnv.getTreasuryContract();
      const ldaoToken = testEnv.getLDAOToken();

      // Test different purchase amounts for gas efficiency
      const purchaseAmounts = [
        ethers.parseEther('1000'),   // Small
        ethers.parseEther('10000'),  // Medium  
        ethers.parseEther('100000'), // Large with discount
        ethers.parseEther('1000000') // Very large with max discount
      ];

      const gasResults = [];

      for (const amount of purchaseAmounts) {
        const ethValue = ethers.parseEther('10'); // Generous ETH amount
        
        const tx = await treasury.connect(user1).purchaseWithETH(amount, {
          value: ethValue,
          gasLimit: 500000 // Set reasonable gas limit
        });
        
        const receipt = await tx.wait();
        gasResults.push({
          amount: amount.toString(),
          gasUsed: receipt.gasUsed.toNumber(),
          gasPrice: receipt.effectiveGasPrice.toNumber(),
          totalCost: receipt.gasUsed.mul(receipt.effectiveGasPrice)
        });
      }

      // Analyze gas efficiency
      gasResults.forEach((result, index) => {
        safeLogger.info(`Purchase ${index + 1}:
          - Amount: ${ethers.formatEther(result.amount)} LDAO
          - Gas used: ${result.gasUsed}
          - Gas cost: ${ethers.formatEther(result.totalCost)} ETH
        `);

        // Gas should be reasonable (less than 300k for purchases)
        expect(result.gasUsed).toBeLessThan(300000);
      });

      // Larger purchases shouldn't use significantly more gas
      const smallGas = gasResults[0].gasUsed;
      const largeGas = gasResults[gasResults.length - 1].gasUsed;
      const gasIncrease = (largeGas - smallGas) / smallGas;
      
      expect(gasIncrease).toBeLessThan(0.5); // Less than 50% increase
    });

    test('should optimize batch operations for gas efficiency', async () => {
      const [owner] = await ethers.getSigners();
      const treasury = testEnv.getTreasuryContract();

      // Test batch KYC updates
      const users = [];
      for (let i = 0; i < 10; i++) {
        users.push(`0x${i.toString().padStart(40, '0')}`);
      }

      const batchTx = await treasury.batchUpdateKYC(users, true);
      const batchReceipt = await batchTx.wait();

      // Individual updates for comparison
      const individualGas = [];
      for (let i = 0; i < 3; i++) { // Test a few individual updates
        const userAddress = `0x${(i + 100).toString().padStart(40, '0')}`;
        const tx = await treasury.updateKYCStatus(userAddress, true);
        const receipt = await tx.wait();
        individualGas.push(receipt.gasUsed.toNumber());
      }

      const avgIndividualGas = individualGas.reduce((a, b) => a + b, 0) / individualGas.length;
      const batchGasPerUser = batchReceipt.gasUsed.toNumber() / users.length;

      // Batch should be more efficient
      expect(batchGasPerUser).toBeLessThan(avgIndividualGas * 0.8); // 20% more efficient

      safeLogger.info(`Gas Efficiency:
        - Batch gas per user: ${batchGasPerUser}
        - Individual gas average: ${avgIndividualGas}
        - Efficiency gain: ${((1 - batchGasPerUser / avgIndividualGas) * 100).toFixed(1)}%
      `);
    });
  });

  describe('4. API Response Time Performance', () => {
    test('should maintain fast response times for price quotes', async () => {
      const quoteRequests = 100;
      const maxResponseTime = 500; // 500ms
      const amounts = [100, 1000, 10000, 100000];

      const responseTimes = [];

      for (let i = 0; i < quoteRequests; i++) {
        const amount = amounts[i % amounts.length];
        const startTime = performance.now();
        
        const response = await request(app)
          .get('/api/ldao/price')
          .query({ amount, paymentToken: 'USDC' });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        responseTimes.push(responseTime);
        
        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(maxResponseTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);

      safeLogger.info(`Price Quote Performance:
        - Average response time: ${avgResponseTime.toFixed(2)}ms
        - Max response time: ${maxTime.toFixed(2)}ms
        - Min response time: ${minTime.toFixed(2)}ms
      `);

      expect(avgResponseTime).toBeLessThan(200); // Average under 200ms
    });

    test('should handle earning calculations efficiently', async () => {
      const earningRequests = 200;
      const activityTypes = ['post', 'comment', 'referral', 'marketplace'];
      const maxResponseTime = 1000; // 1 second

      const responseTimes = [];

      for (let i = 0; i < earningRequests; i++) {
        const activityType = activityTypes[i % activityTypes.length];
        const startTime = performance.now();
        
        const response = await request(app)
          .post('/api/ldao/earn')
          .send({
            userId: testEnv.generateUUID(),
            activityType,
            activityId: `activity_${i}`,
            metadata: {
              quality: 'high',
              engagement: 100 + (i % 200)
            }
          });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        responseTimes.push(responseTime);
        
        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(maxResponseTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(300); // Average under 300ms
    });

    test('should optimize transaction history queries', async () => {
      // First populate with test data
      await populateTestData(5000);

      const historyRequests = 50;
      const maxResponseTime = 2000; // 2 seconds

      const responseTimes = [];

      for (let i = 0; i < historyRequests; i++) {
        const userAddress = `0x${i.toString(16).padStart(40, '0')}`;
        const startTime = performance.now();
        
        const response = await request(app)
          .get('/api/ldao/history')
          .query({ 
            userAddress,
            limit: 100,
            offset: i * 10
          });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        responseTimes.push(responseTime);
        
        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(maxResponseTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(500); // Average under 500ms
    });
  });

  describe('5. Memory and Resource Usage', () => {
    test('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate sustained load
      const loadDuration = 30000; // 30 seconds
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      
      const memorySnapshots = [];
      
      while (Date.now() - startTime < loadDuration) {
        // Make a request
        await request(app)
          .post('/api/ldao/purchase')
          .send({
            amount: 100,
            paymentMethod: 'fiat',
            userAddress: `0x${Date.now().toString(16).padStart(40, '0')}`
          });
        
        // Take memory snapshot every 5 seconds
        if ((Date.now() - startTime) % 5000 < requestInterval) {
          memorySnapshots.push(process.memoryUsage());
        }
        
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }
      
      const finalMemory = process.memoryUsage();
      
      // Analyze memory usage
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;
      
      safeLogger.info(`Memory Usage Analysis:
        - Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
        - Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
        - Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(1)}%)
      `);
      
      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
      
      // Force garbage collection and check for memory leaks
      if (global.gc) {
        global.gc();
        const afterGCMemory = process.memoryUsage();
        const leakIndicator = (afterGCMemory.heapUsed - initialMemory.heapUsed) / initialMemory.heapUsed;
        expect(leakIndicator).toBeLessThan(0.2); // Less than 20% increase after GC
      }
    });

    test('should handle connection pool efficiently', async () => {
      const connectionPoolSize = 20;
      const concurrentQueries = connectionPoolSize * 2; // Exceed pool size
      
      const queries = [];
      for (let i = 0; i < concurrentQueries; i++) {
        queries.push(
          testEnv.getDatabase()
            .select('*')
            .from('purchase_transactions')
            .limit(1)
        );
      }
      
      const startTime = performance.now();
      const results = await Promise.allSettled(queries);
      const endTime = performance.now();
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const queryTime = endTime - startTime;
      
      // Should handle queries efficiently even when exceeding pool size
      expect(successful).toBe(concurrentQueries);
      expect(queryTime).toBeLessThan(5000); // 5 seconds
      
      // Check connection pool stats
      const poolStats = testEnv.getDatabase().client.pool;
      expect(poolStats.numUsed()).toBeLessThanOrEqual(connectionPoolSize);
    });
  });

  describe('6. Caching Performance', () => {
    test('should improve response times with caching', async () => {
      const cacheKey = 'price_quote_1000_USDC';
      
      // First request (cache miss)
      const startTime1 = performance.now();
      const response1 = await request(app)
        .get('/api/ldao/price')
        .query({ amount: 1000, paymentToken: 'USDC' });
      const endTime1 = performance.now();
      const firstRequestTime = endTime1 - startTime1;
      
      expect(response1.status).toBe(200);
      
      // Second request (cache hit)
      const startTime2 = performance.now();
      const response2 = await request(app)
        .get('/api/ldao/price')
        .query({ amount: 1000, paymentToken: 'USDC' });
      const endTime2 = performance.now();
      const secondRequestTime = endTime2 - startTime2;
      
      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
      
      // Cached request should be significantly faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
      
      safeLogger.info(`Caching Performance:
        - First request (cache miss): ${firstRequestTime.toFixed(2)}ms
        - Second request (cache hit): ${secondRequestTime.toFixed(2)}ms
        - Speed improvement: ${((firstRequestTime - secondRequestTime) / firstRequestTime * 100).toFixed(1)}%
      `);
    });
  });

  // Helper function to populate test data
  async function populateTestData(count: number) {
    const batchSize = 1000;
    const batches = Math.ceil(count / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchData = [];
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      
      for (let i = batchStart; i < batchEnd; i++) {
        batchData.push({
          transaction_id: `perf_test_tx_${i}`,
          user_address: `0x${i.toString(16).padStart(40, '0')}`,
          amount: (100 + (i % 1000)).toString(),
          payment_method: i % 2 === 0 ? 'fiat' : 'crypto',
          payment_token: i % 2 === 0 ? 'USD' : 'ETH',
          price_per_token: '0.01',
          discount_applied: (i % 10).toString(),
          status: 'completed',
          created_at: new Date(Date.now() - (i * 60000)), // Spread over time
          completed_at: new Date(Date.now() - (i * 60000) + 30000)
        });
      }
      
      await testEnv.getDatabase()
        .insert(batchData)
        .into('purchase_transactions');
    }
  }
});