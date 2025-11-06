#!/usr/bin/env ts-node

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { EmergencyProductionFixes } from '../src/services/emergencyProductionFixes';
import { optimizedDb } from '../src/services/optimizedDatabaseManager';
import { memoryManager } from '../src/services/memoryManager';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function applyEmergencyFixes() {
  console.log('🚨 STARTING EMERGENCY PRODUCTION FIXES...');
  console.log('=====================================');

  let redis: Redis | null = null;
  let dbPool: Pool | null = null;

  try {
    // Initialize Redis connection
    console.log('1. Connecting to Redis...');
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.ping();
    console.log('✅ Redis connected');

    // Initialize database pool
    console.log('2. Connecting to database...');
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Temporary reduced pool size
      min: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000
    });
    await dbPool.query('SELECT 1');
    console.log('✅ Database connected');

    // Apply emergency fixes
    console.log('3. Applying emergency fixes...');
    const emergencyFixes = new EmergencyProductionFixes(dbPool, redis);
    const result = await emergencyFixes.applyAllEmergencyFixes();
    
    if (result.success) {
      console.log('✅ Emergency fixes applied successfully');
    } else {
      console.error('❌ Emergency fixes failed:', result.error);
      process.exit(1);
    }

    // Check memory status
    console.log('4. Checking memory status...');
    const memoryStats = memoryManager.getMemoryStats();
    console.log(`Memory usage: ${memoryStats.memoryPercent}% (${memoryStats.status})`);
    
    if (memoryStats.status === 'critical' || memoryStats.status === 'high') {
      console.log('🧹 Performing memory cleanup...');
      memoryManager.forceCleanup();
    }

    // Check database health
    console.log('5. Checking database health...');
    const dbHealth = await optimizedDb.healthCheck();
    console.log(`Database health: ${dbHealth.healthy ? 'Healthy' : 'Unhealthy'}`);
    console.log(`DB connections: ${dbHealth.stats.totalCount}/${dbHealth.stats.maxConnections}`);

    // Set emergency monitoring
    console.log('6. Setting up emergency monitoring...');
    await redis.set('emergency:monitoring', 'enabled');
    await redis.set('emergency:applied_at', Date.now().toString());
    
    console.log('=====================================');
    console.log('✅ ALL EMERGENCY FIXES APPLIED SUCCESSFULLY');
    console.log('=====================================');
    
    // Print summary
    console.log('\n📊 SYSTEM STATUS SUMMARY:');
    console.log(`Memory: ${memoryStats.memoryPercent}% (${memoryStats.status})`);
    console.log(`Database: ${dbHealth.healthy ? 'Healthy' : 'Needs attention'}`);
    console.log(`DB Connections: ${dbHealth.stats.totalCount}/${dbHealth.stats.maxConnections}`);
    console.log(`Response Time: ${dbHealth.stats.responseTime}ms`);

  } catch (error) {
    console.error('❌ EMERGENCY FIXES FAILED:', error);
    process.exit(1);
  } finally {
    // Cleanup connections
    if (redis) {
      await redis.quit();
    }
    if (dbPool) {
      await dbPool.end();
    }
  }
}

// Run the emergency fixes
if (require.main === module) {
  applyEmergencyFixes()
    .then(() => {
      console.log('Emergency fixes completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Emergency fixes failed:', error);
      process.exit(1);
    });
}

export { applyEmergencyFixes };