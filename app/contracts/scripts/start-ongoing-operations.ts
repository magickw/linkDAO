#!/usr/bin/env ts-node

import { OngoingOperationsOrchestrator, DEFAULT_OPERATIONS_CONFIG } from '../maintenance/OngoingOperationsOrchestrator';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function startOngoingOperations() {
  console.log('🚀 Starting LinkDAO Ongoing Operations System...\n');

  // Configure operations based on environment
  const config = {
    ...DEFAULT_OPERATIONS_CONFIG,
    rpcUrl: process.env.MAINNET_RPC_URL || process.env.RPC_URL || 'http://localhost:8545',
    enableContinuousMonitoring: process.env.ENABLE_MONITORING !== 'false',
    enableSecurityCompliance: process.env.ENABLE_SECURITY !== 'false',
    enableGrowthScaling: process.env.ENABLE_SCALING !== 'false',
    enableCommunityEngagement: process.env.ENABLE_COMMUNITY !== 'false',
    reportingInterval: parseInt(process.env.REPORTING_INTERVAL || '3600000'), // 1 hour default
    alertingEnabled: process.env.ENABLE_ALERTS !== 'false'
  };

  console.log('Configuration:');
  console.log(`- RPC URL: ${config.rpcUrl}`);
  console.log(`- Continuous Monitoring: ${config.enableContinuousMonitoring ? '✅' : '❌'}`);
  console.log(`- Security Compliance: ${config.enableSecurityCompliance ? '✅' : '❌'}`);
  console.log(`- Growth Scaling: ${config.enableGrowthScaling ? '✅' : '❌'}`);
  console.log(`- Community Engagement: ${config.enableCommunityEngagement ? '✅' : '❌'}`);
  console.log(`- Reporting Interval: ${config.reportingInterval / 1000 / 60} minutes`);
  console.log(`- Alerting: ${config.alertingEnabled ? '✅' : '❌'}\n`);

  try {
    // Initialize the orchestrator
    const orchestrator = new OngoingOperationsOrchestrator(config);

    // Set up event listeners
    setupEventListeners(orchestrator);

    // Initialize and start the system
    await orchestrator.initialize();
    await orchestrator.start();

    console.log('✅ Ongoing Operations System started successfully!\n');

    // Schedule some example maintenance tasks
    scheduleExampleMaintenanceTasks(orchestrator);

    // Display initial status
    displaySystemStatus(orchestrator);

    // Set up periodic status updates
    setInterval(() => {
      displaySystemStatus(orchestrator);
    }, 5 * 60 * 1000); // Every 5 minutes

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await orchestrator.stop();
      console.log('✅ Ongoing Operations System stopped successfully');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await orchestrator.stop();
      console.log('✅ Ongoing Operations System stopped successfully');
      process.exit(0);
    });

    // Keep the process running
    console.log('🔄 System is running. Press Ctrl+C to stop.\n');

  } catch (error) {
    console.error('❌ Failed to start Ongoing Operations System:', error);
    process.exit(1);
  }
}

function setupEventListeners(orchestrator: OngoingOperationsOrchestrator) {
  console.log('Setting up event listeners...');

  orchestrator.on('operationsStarted', () => {
    console.log('🟢 Operations started');
  });

  orchestrator.on('operationsStopped', () => {
    console.log('🔴 Operations stopped');
  });

  orchestrator.on('operationsReport', (report) => {
    console.log(`📊 Operations Report Generated - Health: ${report.systemHealth}, Alerts: ${report.activeAlerts}`);
    
    if (report.recommendations && report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach((rec: string, index: number) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
  });

  orchestrator.on('systemHealthChanged', (newHealth, oldHealth) => {
    const emoji = newHealth === 'healthy' ? '🟢' : newHealth === 'warning' ? '🟡' : '🔴';
    console.log(`${emoji} System health changed from ${oldHealth} to ${newHealth}`);
  });

  orchestrator.on('maintenanceTaskStarted', (task) => {
    console.log(`🔧 Maintenance task started: ${task.name}`);
  });

  orchestrator.on('maintenanceTaskCompleted', (task) => {
    console.log(`✅ Maintenance task completed: ${task.name}`);
  });

  orchestrator.on('maintenanceTaskFailed', (task, error) => {
    console.log(`❌ Maintenance task failed: ${task.name} - ${error.message}`);
  });

  orchestrator.on('communityActivity', (activity) => {
    console.log(`👥 Community activity: ${activity.type} by ${activity.member}`);
  });

  console.log('✅ Event listeners configured\n');
}

function scheduleExampleMaintenanceTasks(orchestrator: OngoingOperationsOrchestrator) {
  console.log('Scheduling example maintenance tasks...');

  // Schedule a security audit for next week
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  orchestrator.scheduleMaintenanceTask(
    'Weekly Security Audit',
    'Comprehensive security audit of all platform components',
    'security',
    'high',
    120,
    false,
    nextWeek
  );

  // Schedule performance optimization
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  orchestrator.scheduleMaintenanceTask(
    'Performance Optimization Review',
    'Review and optimize platform performance metrics',
    'performance',
    'medium',
    60,
    false,
    tomorrow
  );

  // Schedule database cleanup
  orchestrator.scheduleMaintenanceTask(
    'Database Maintenance',
    'Clean up old logs and optimize database performance',
    'cleanup',
    'low',
    30,
    false
  );

  console.log('✅ Example maintenance tasks scheduled\n');
}

function displaySystemStatus(orchestrator: OngoingOperationsOrchestrator) {
  const status = orchestrator.getOperationsStatus();
  const maintenanceTasks = orchestrator.getMaintenanceTasks();
  
  console.log('📊 System Status Update:');
  console.log(`   Status: ${status.isRunning ? '🟢 Running' : '🔴 Stopped'}`);
  console.log(`   Uptime: ${status.uptime.toFixed(2)} hours`);
  console.log(`   Health: ${getHealthEmoji(status.systemHealth)} ${status.systemHealth}`);
  console.log(`   Active Alerts: ${status.activeAlerts}`);
  console.log(`   Next Maintenance: ${status.nextMaintenanceWindow.toLocaleString()}`);
  
  console.log('   Components:');
  console.log(`     Monitoring: ${status.components.monitoring ? '✅' : '❌'}`);
  console.log(`     Security: ${status.components.security ? '✅' : '❌'}`);
  console.log(`     Scaling: ${status.components.scaling ? '✅' : '❌'}`);
  console.log(`     Community: ${status.components.community ? '✅' : '❌'}`);
  
  const pendingTasks = maintenanceTasks.filter(task => task.status === 'pending');
  const inProgressTasks = maintenanceTasks.filter(task => task.status === 'in_progress');
  
  if (pendingTasks.length > 0 || inProgressTasks.length > 0) {
    console.log('   Maintenance Tasks:');
    console.log(`     Pending: ${pendingTasks.length}`);
    console.log(`     In Progress: ${inProgressTasks.length}`);
  }
  
  console.log('');
}

function getHealthEmoji(health: string): string {
  switch (health) {
    case 'healthy': return '🟢';
    case 'warning': return '🟡';
    case 'critical': return '🔴';
    default: return '⚪';
  }
}

// Add command line argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  const options: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        displayHelp();
        process.exit(0);
        break;
      case '--no-monitoring':
        process.env.ENABLE_MONITORING = 'false';
        break;
      case '--no-security':
        process.env.ENABLE_SECURITY = 'false';
        break;
      case '--no-scaling':
        process.env.ENABLE_SCALING = 'false';
        break;
      case '--no-community':
        process.env.ENABLE_COMMUNITY = 'false';
        break;
      case '--no-alerts':
        process.env.ENABLE_ALERTS = 'false';
        break;
      case '--rpc-url':
        if (i + 1 < args.length) {
          process.env.MAINNET_RPC_URL = args[++i];
        }
        break;
      case '--reporting-interval':
        if (i + 1 < args.length) {
          process.env.REPORTING_INTERVAL = args[++i];
        }
        break;
    }
  }

  return options;
}

function displayHelp() {
  console.log(`
LinkDAO Ongoing Operations System

Usage: npm run start:operations [options]

Options:
  --help, -h              Show this help message
  --no-monitoring         Disable continuous monitoring
  --no-security          Disable security compliance monitoring
  --no-scaling           Disable growth and scaling management
  --no-community         Disable community engagement management
  --no-alerts            Disable alerting system
  --rpc-url <url>        Set RPC URL for blockchain connection
  --reporting-interval <ms>  Set reporting interval in milliseconds

Environment Variables:
  MAINNET_RPC_URL        Ethereum mainnet RPC URL
  ENABLE_MONITORING      Enable/disable monitoring (default: true)
  ENABLE_SECURITY        Enable/disable security (default: true)
  ENABLE_SCALING         Enable/disable scaling (default: true)
  ENABLE_COMMUNITY       Enable/disable community (default: true)
  ENABLE_ALERTS          Enable/disable alerts (default: true)
  REPORTING_INTERVAL     Reporting interval in ms (default: 3600000)

Examples:
  npm run start:operations
  npm run start:operations --no-monitoring --no-alerts
  npm run start:operations --rpc-url https://mainnet.infura.io/v3/YOUR-PROJECT-ID
  npm run start:operations --reporting-interval 1800000  # 30 minutes
`);
}

// Parse command line arguments
parseArguments();

// Start the system
if (require.main === module) {
  startOngoingOperations().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { startOngoingOperations };