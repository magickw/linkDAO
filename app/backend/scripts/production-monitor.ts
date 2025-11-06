#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

interface HealthStatus {
  status: string;
  memory: { usage: number; status: string };
  database: { connections: number; status: string };
  emergency: { mode: boolean };
  responseTime: number;
}

class ProductionMonitor {
  private healthEndpoint: string;
  private alertThresholds = {
    memory: 85, // 85%
    connections: 80, // 80 connections
    responseTime: 5000, // 5 seconds
    errorRate: 50 // 50%
  };

  constructor() {
    this.healthEndpoint = process.env.BACKEND_URL 
      ? `${process.env.BACKEND_URL}/emergency-health`
      : 'http://localhost:10000/emergency-health';
  }

  async checkSystemHealth(): Promise<HealthStatus | null> {
    try {
      const response = await fetch(this.healthEndpoint, {
        timeout: 10000 // 10 second timeout
      });
      
      if (!response.ok) {
        console.error(`Health check failed: ${response.status}`);
        return null;
      }

      return await response.json() as HealthStatus;
    } catch (error) {
      console.error('Health check request failed:', error.message);
      return null;
    }
  }

  async checkProcessStatus() {
    try {
      // Check if backend process is running
      const { stdout } = await execAsync('pgrep -f "node.*src/index"');
      const processes = stdout.trim().split('\n').filter(Boolean);
      
      return {
        running: processes.length > 0,
        processCount: processes.length,
        pids: processes
      };
    } catch (error) {
      return {
        running: false,
        processCount: 0,
        pids: []
      };
    }
  }

  async applyEmergencyFixes() {
    console.log('🚨 Applying emergency fixes...');
    
    try {
      // Run emergency fixes script
      const { stdout, stderr } = await execAsync('cd /app/backend && npm run emergency-fixes');
      console.log('Emergency fixes output:', stdout);
      
      if (stderr) {
        console.error('Emergency fixes stderr:', stderr);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to apply emergency fixes:', error);
      return false;
    }
  }

  async restartService() {
    console.log('🔄 Restarting service...');
    
    try {
      // Kill existing processes
      await execAsync('pkill -f "node.*src/index"');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start new process
      const { stdout } = await execAsync('cd /app/backend && npm start > /dev/null 2>&1 &');
      console.log('Service restart initiated');
      
      return true;
    } catch (error) {
      console.error('Failed to restart service:', error);
      return false;
    }
  }

  async monitor() {
    console.log('🔍 Starting production monitoring...');
    console.log(`Health endpoint: ${this.healthEndpoint}`);
    console.log('=====================================');

    while (true) {
      const timestamp = new Date().toISOString();
      console.log(`\n[${timestamp}] Checking system health...`);

      // Check if process is running
      const processStatus = await this.checkProcessStatus();
      
      if (!processStatus.running) {
        console.error('❌ Backend process not running!');
        console.log('🔄 Attempting to restart...');
        await this.restartService();
        
        // Wait for restart
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }

      // Check system health
      const health = await this.checkSystemHealth();
      
      if (!health) {
        console.error('❌ Health check failed - service may be down');
        console.log('🚨 Applying emergency fixes...');
        await this.applyEmergencyFixes();
        
        // Wait and check again
        await new Promise(resolve => setTimeout(resolve, 30000));
        continue;
      }

      // Analyze health status
      this.analyzeHealth(health);

      // Take action if needed
      await this.takeActionIfNeeded(health);

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    }
  } 
 private analyzeHealth(health: HealthStatus) {
    console.log(`Status: ${health.status}`);
    console.log(`Memory: ${health.memory.usage}% (${health.memory.status})`);
    console.log(`Database: ${health.database.connections} connections (${health.database.status})`);
    console.log(`Response Time: ${health.responseTime}ms`);
    console.log(`Emergency Mode: ${health.emergency.mode ? 'ENABLED' : 'DISABLED'}`);

    // Check thresholds
    const alerts = [];
    
    if (health.memory.usage > this.alertThresholds.memory) {
      alerts.push(`HIGH MEMORY: ${health.memory.usage}%`);
    }
    
    if (health.database.connections > this.alertThresholds.connections) {
      alerts.push(`HIGH DB CONNECTIONS: ${health.database.connections}`);
    }
    
    if (health.responseTime > this.alertThresholds.responseTime) {
      alerts.push(`SLOW RESPONSE: ${health.responseTime}ms`);
    }

    if (alerts.length > 0) {
      console.warn('⚠️  ALERTS:');
      alerts.forEach(alert => console.warn(`   - ${alert}`));
    } else {
      console.log('✅ All metrics within normal ranges');
    }
  }

  private async takeActionIfNeeded(health: HealthStatus) {
    let actionTaken = false;

    // Critical memory usage
    if (health.memory.usage > 95) {
      console.log('🚨 CRITICAL MEMORY - Applying emergency memory cleanup');
      await this.triggerMemoryCleanup();
      actionTaken = true;
    }

    // High database connections
    if (health.database.connections > 90) {
      console.log('🚨 CRITICAL DB CONNECTIONS - Applying database cleanup');
      await this.triggerDatabaseCleanup();
      actionTaken = true;
    }

    // Service degraded for too long
    if (health.status === 'critical') {
      console.log('🚨 CRITICAL STATUS - Applying all emergency fixes');
      await this.applyEmergencyFixes();
      actionTaken = true;
    }

    // Very slow response times
    if (health.responseTime > 10000) {
      console.log('🚨 VERY SLOW RESPONSE - Service may need restart');
      // Consider restart if this persists
      actionTaken = true;
    }

    if (actionTaken) {
      console.log('⏳ Waiting 60 seconds for changes to take effect...');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  private async triggerMemoryCleanup() {
    try {
      const response = await fetch(`${this.healthEndpoint.replace('/emergency-health', '')}/emergency-memory-cleanup`, {
        method: 'POST',
        timeout: 30000
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Memory cleanup: freed ${result.freed}MB`);
      }
    } catch (error) {
      console.error('Memory cleanup failed:', error.message);
    }
  }

  private async triggerDatabaseCleanup() {
    try {
      const response = await fetch(`${this.healthEndpoint.replace('/emergency-health', '')}/emergency-db-cleanup`, {
        method: 'POST',
        timeout: 30000
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`DB cleanup: freed ${result.freed_connections} connections`);
      }
    } catch (error) {
      console.error('Database cleanup failed:', error.message);
    }
  }
}

// Run the monitor
if (require.main === module) {
  const monitor = new ProductionMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Monitoring stopped');
    process.exit(0);
  });

  monitor.monitor().catch(error => {
    console.error('Monitor failed:', error);
    process.exit(1);
  });
}

export { ProductionMonitor };