import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { createCipher, createDecipher } from 'crypto';
import { pipeline } from 'stream';
import { Redis } from 'ioredis';

const execAsync = promisify(exec);
const pipelineAsync = promisify(pipeline);

interface BackupConfig {
  rto: number; // Recovery Time Objective in seconds
  rpo: number; // Recovery Point Objective in seconds
  strategies: {
    [key: string]: {
      type: 'continuous' | 'incremental' | 'snapshot' | 'versioned';
      frequency: string;
      retention: string;
      encryption: boolean;
      compression: boolean;
      destinations: string[];
    };
  };
}

interface FailoverScenario {
  name: string;
  trigger: string;
  action: string;
  estimatedDowntime: string;
  priority: number;
}

interface BackupMetadata {
  id: string;
  type: string;
  timestamp: number;
  size: number;
  checksum: string;
  encrypted: boolean;
  compressed: boolean;
  destination: string;
  status: 'pending' | 'completed' | 'failed' | 'verified';
}

interface RecoveryPlan {
  scenario: string;
  steps: RecoveryStep[];
  estimatedTime: number;
  dependencies: string[];
}

interface RecoveryStep {
  id: string;
  description: string;
  command: string;
  timeout: number;
  retries: number;
  rollback?: string;
}

@Injectable()
export class DisasterRecoveryService extends EventEmitter {
  private readonly logger = new Logger(DisasterRecoveryService.name);
  private readonly s3Client: S3Client;
  private readonly redis: Redis;
  private readonly config: BackupConfig;
  private readonly failoverScenarios: Map<string, FailoverScenario> = new Map();
  private readonly recoveryPlans: Map<string, RecoveryPlan> = new Map();
  private readonly activeBackups: Map<string, BackupMetadata> = new Map();
  private readonly encryptionKey: string;

  constructor() {
    super();
    this.initializeS3Client();
    this.initializeRedis();
    this.loadConfiguration();
    this.initializeFailoverScenarios();
    this.initializeRecoveryPlans();
    this.startHealthMonitoring();
    this.startBackupScheduler();
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'default-key';
  }

  private initializeS3Client(): void {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  private initializeRedis(): void {
    this.redis = new Redis(process.env.REDIS_URL);
    
    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`, error.stack);
      this.handleFailoverScenario('network_partition');
    });
  }

  private loadConfiguration(): void {
    this.config = {
      rto: 300, // 5 minutes
      rpo: 60,  // 1 minute
      strategies: {
        database: {
          type: 'continuous',
          frequency: '30s',
          retention: '30d',
          encryption: true,
          compression: true,
          destinations: ['aws_s3', 'azure_blob', 'gcp_storage'],
        },
        blockchain_data: {
          type: 'incremental',
          frequency: '5m',
          retention: '90d',
          encryption: false,
          compression: true,
          destinations: ['ipfs_cluster', 'aws_s3'],
        },
        application_state: {
          type: 'snapshot',
          frequency: '1h',
          retention: '7d',
          encryption: true,
          compression: true,
          destinations: ['kubernetes_volumes', 'aws_ebs'],
        },
        configuration: {
          type: 'versioned',
          frequency: 'on_change',
          retention: '1y',
          encryption: true,
          compression: false,
          destinations: ['git_repository', 'vault_storage'],
        },
      },
    };
  }

  private initializeFailoverScenarios(): void {
    const scenarios: FailoverScenario[] = [
      {
        name: 'primary_datacenter_failure',
        trigger: 'health_check_failure',
        action: 'switch_to_secondary',
        estimatedDowntime: '2m',
        priority: 1,
      },
      {
        name: 'database_corruption',
        trigger: 'data_integrity_check_failure',
        action: 'restore_from_backup',
        estimatedDowntime: '5m',
        priority: 2,
      },
      {
        name: 'application_crash',
        trigger: 'pod_crash_loop',
        action: 'restart_with_rollback',
        estimatedDowntime: '30s',
        priority: 3,
      },
      {
        name: 'network_partition',
        trigger: 'network_connectivity_loss',
        action: 'activate_local_cache',
        estimatedDowntime: '0s',
        priority: 4,
      },
    ];

    scenarios.forEach(scenario => {
      this.failoverScenarios.set(scenario.name, scenario);
    });
  }

  private initializeRecoveryPlans(): void {
    // Database recovery plan
    this.recoveryPlans.set('database_corruption', {
      scenario: 'database_corruption',
      steps: [
        {
          id: 'stop_application',
          description: 'Stop application services',
          command: 'kubectl scale deployment backend-deployment --replicas=0',
          timeout: 60000,
          retries: 3,
          rollback: 'kubectl scale deployment backend-deployment --replicas=3',
        },
        {
          id: 'backup_corrupted_data',
          description: 'Backup corrupted data for analysis',
          command: 'pg_dump $DATABASE_URL > /backup/corrupted_$(date +%Y%m%d_%H%M%S).sql',
          timeout: 300000,
          retries: 1,
        },
        {
          id: 'restore_database',
          description: 'Restore database from latest backup',
          command: 'psql $DATABASE_URL < /backup/latest_verified.sql',
          timeout: 600000,
          retries: 2,
        },
        {
          id: 'verify_restoration',
          description: 'Verify database integrity',
          command: 'python3 /scripts/verify_database_integrity.py',
          timeout: 120000,
          retries: 1,
        },
        {
          id: 'restart_application',
          description: 'Restart application services',
          command: 'kubectl scale deployment backend-deployment --replicas=3',
          timeout: 180000,
          retries: 3,
        },
      ],
      estimatedTime: 900000, // 15 minutes
      dependencies: ['database_backup_available', 'storage_accessible'],
    });

    // Application crash recovery plan
    this.recoveryPlans.set('application_crash', {
      scenario: 'application_crash',
      steps: [
        {
          id: 'collect_crash_logs',
          description: 'Collect crash logs and diagnostics',
          command: 'kubectl logs -l app=backend --tail=1000 > /logs/crash_$(date +%Y%m%d_%H%M%S).log',
          timeout: 30000,
          retries: 1,
        },
        {
          id: 'rollback_deployment',
          description: 'Rollback to previous stable version',
          command: 'kubectl rollout undo deployment/backend-deployment',
          timeout: 120000,
          retries: 2,
        },
        {
          id: 'verify_rollback',
          description: 'Verify application health after rollback',
          command: 'curl -f http://backend-service/health',
          timeout: 60000,
          retries: 5,
        },
      ],
      estimatedTime: 180000, // 3 minutes
      dependencies: ['kubernetes_accessible', 'previous_version_available'],
    });
  }

  async createBackup(
    type: string,
    source: string,
    options: {
      encrypt?: boolean;
      compress?: boolean;
      destination?: string;
      metadata?: any;
    } = {}
  ): Promise<BackupMetadata> {
    const backupId = `backup_${type}_${Date.now()}`;
    const timestamp = Date.now();
    
    try {
      this.logger.log(`Starting backup: ${backupId} for ${type}`);

      const metadata: BackupMetadata = {
        id: backupId,
        type,
        timestamp,
        size: 0,
        checksum: '',
        encrypted: options.encrypt || false,
        compressed: options.compress || false,
        destination: options.destination || 'aws_s3',
        status: 'pending',
      };

      this.activeBackups.set(backupId, metadata);
      this.emit('backup:started', metadata);

      // Create backup based on type
      let backupPath: string;
      switch (type) {
        case 'database':
          backupPath = await this.createDatabaseBackup(source, options);
          break;
        case 'blockchain_data':
          backupPath = await this.createBlockchainBackup(source, options);
          break;
        case 'application_state':
          backupPath = await this.createApplicationStateBackup(source, options);
          break;
        case 'configuration':
          backupPath = await this.createConfigurationBackup(source, options);
          break;
        default:
          throw new Error(`Unknown backup type: ${type}`);
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(backupPath);
      metadata.checksum = checksum;

      // Get file size
      const { size } = await import('fs').then(fs => fs.promises.stat(backupPath));
      metadata.size = size;

      // Upload to destination
      await this.uploadBackup(backupPath, metadata);

      // Verify backup
      await this.verifyBackup(metadata);

      metadata.status = 'completed';
      this.activeBackups.set(backupId, metadata);

      // Store metadata in Redis
      await this.redis.hset(`backup:${backupId}`, {
        ...metadata,
        metadata: JSON.stringify(options.metadata || {}),
      });

      this.emit('backup:completed', metadata);
      this.logger.log(`Backup completed: ${backupId} (${size} bytes)`);

      return metadata;
    } catch (error) {
      this.logger.error(`Backup failed: ${backupId} - ${error.message}`, error.stack);
      
      const metadata = this.activeBackups.get(backupId);
      if (metadata) {
        metadata.status = 'failed';
        this.activeBackups.set(backupId, metadata);
      }

      this.emit('backup:failed', { backupId, error: error.message });
      throw error;
    }
  }

  private async createDatabaseBackup(source: string, options: any): Promise<string> {
    const backupPath = `/tmp/db_backup_${Date.now()}.sql`;
    
    // Create database dump
    const { stdout, stderr } = await execAsync(`pg_dump ${source} > ${backupPath}`);
    
    if (stderr) {
      this.logger.warn(`Database backup warnings: ${stderr}`);
    }

    // Apply compression if requested
    if (options.compress) {
      const compressedPath = `${backupPath}.gz`;
      await pipelineAsync(
        createReadStream(backupPath),
        createGzip(),
        createWriteStream(compressedPath)
      );
      
      // Remove uncompressed file
      await import('fs').then(fs => fs.promises.unlink(backupPath));
      return compressedPath;
    }

    return backupPath;
  }

  private async createBlockchainBackup(source: string, options: any): Promise<string> {
    const backupPath = `/tmp/blockchain_backup_${Date.now()}.tar`;
    
    // Create tar archive of blockchain data
    await execAsync(`tar -cf ${backupPath} -C ${source} .`);

    // Apply compression if requested
    if (options.compress) {
      const compressedPath = `${backupPath}.gz`;
      await execAsync(`gzip ${backupPath}`);
      return `${backupPath}.gz`;
    }

    return backupPath;
  }

  private async createApplicationStateBackup(source: string, options: any): Promise<string> {
    const backupPath = `/tmp/app_state_backup_${Date.now()}.tar.gz`;
    
    // Create snapshot of application state
    await execAsync(`kubectl create snapshot ${source} --output=${backupPath}`);

    return backupPath;
  }

  private async createConfigurationBackup(source: string, options: any): Promise<string> {
    const backupPath = `/tmp/config_backup_${Date.now()}.tar.gz`;
    
    // Backup configuration files
    await execAsync(`tar -czf ${backupPath} -C ${source} .`);

    return backupPath;
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const { createHash } = await import('crypto');
    const hash = createHash('sha256');
    
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath);
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async uploadBackup(backupPath: string, metadata: BackupMetadata): Promise<void> {
    const key = `backups/${metadata.type}/${metadata.id}`;
    
    let stream = createReadStream(backupPath);

    // Apply encryption if requested
    if (metadata.encrypted) {
      const cipher = createCipher('aes-256-cbc', this.encryptionKey);
      stream = stream.pipe(cipher);
    }

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BACKUP_BUCKET,
      Key: key,
      Body: stream,
      Metadata: {
        type: metadata.type,
        timestamp: metadata.timestamp.toString(),
        checksum: metadata.checksum,
        encrypted: metadata.encrypted.toString(),
        compressed: metadata.compressed.toString(),
      },
    });

    await this.s3Client.send(command);
  }

  private async verifyBackup(metadata: BackupMetadata): Promise<void> {
    // Download and verify backup integrity
    const key = `backups/${metadata.type}/${metadata.id}`;
    
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BACKUP_BUCKET,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    
    // Verify metadata matches
    if (response.Metadata?.checksum !== metadata.checksum) {
      throw new Error('Backup verification failed: checksum mismatch');
    }

    this.logger.log(`Backup verified: ${metadata.id}`);
  }

  async restoreFromBackup(
    backupId: string,
    options: {
      target?: string;
      verify?: boolean;
      rollback?: boolean;
    } = {}
  ): Promise<void> {
    try {
      this.logger.log(`Starting restore from backup: ${backupId}`);

      // Get backup metadata
      const metadataHash = await this.redis.hgetall(`backup:${backupId}`);
      if (!metadataHash.id) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      const metadata: BackupMetadata = {
        id: metadataHash.id,
        type: metadataHash.type,
        timestamp: parseInt(metadataHash.timestamp),
        size: parseInt(metadataHash.size),
        checksum: metadataHash.checksum,
        encrypted: metadataHash.encrypted === 'true',
        compressed: metadataHash.compressed === 'true',
        destination: metadataHash.destination,
        status: metadataHash.status as any,
      };

      this.emit('restore:started', { backupId, metadata });

      // Download backup
      const backupPath = await this.downloadBackup(metadata);

      // Verify backup before restore
      if (options.verify !== false) {
        await this.verifyDownloadedBackup(backupPath, metadata);
      }

      // Perform restore based on type
      switch (metadata.type) {
        case 'database':
          await this.restoreDatabase(backupPath, metadata, options);
          break;
        case 'blockchain_data':
          await this.restoreBlockchainData(backupPath, metadata, options);
          break;
        case 'application_state':
          await this.restoreApplicationState(backupPath, metadata, options);
          break;
        case 'configuration':
          await this.restoreConfiguration(backupPath, metadata, options);
          break;
        default:
          throw new Error(`Unknown backup type: ${metadata.type}`);
      }

      this.emit('restore:completed', { backupId, metadata });
      this.logger.log(`Restore completed: ${backupId}`);
    } catch (error) {
      this.logger.error(`Restore failed: ${backupId} - ${error.message}`, error.stack);
      this.emit('restore:failed', { backupId, error: error.message });
      throw error;
    }
  }

  private async downloadBackup(metadata: BackupMetadata): Promise<string> {
    const key = `backups/${metadata.type}/${metadata.id}`;
    const downloadPath = `/tmp/restore_${metadata.id}`;

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BACKUP_BUCKET,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    let stream = response.Body as any;

    // Apply decryption if needed
    if (metadata.encrypted) {
      const decipher = createDecipher('aes-256-cbc', this.encryptionKey);
      stream = stream.pipe(decipher);
    }

    // Apply decompression if needed
    if (metadata.compressed) {
      stream = stream.pipe(createGunzip());
    }

    await pipelineAsync(stream, createWriteStream(downloadPath));
    return downloadPath;
  }

  private async verifyDownloadedBackup(backupPath: string, metadata: BackupMetadata): Promise<void> {
    const checksum = await this.calculateChecksum(backupPath);
    
    if (checksum !== metadata.checksum) {
      throw new Error('Downloaded backup verification failed: checksum mismatch');
    }
  }

  private async restoreDatabase(backupPath: string, metadata: BackupMetadata, options: any): Promise<void> {
    // Create backup of current database before restore
    if (options.rollback !== false) {
      await this.createBackup('database', process.env.DATABASE_URL, {
        metadata: { restore_rollback: true },
      });
    }

    // Restore database
    await execAsync(`psql ${options.target || process.env.DATABASE_URL} < ${backupPath}`);
  }

  private async restoreBlockchainData(backupPath: string, metadata: BackupMetadata, options: any): Promise<void> {
    const targetPath = options.target || '/data/blockchain';
    
    // Extract backup
    await execAsync(`tar -xf ${backupPath} -C ${targetPath}`);
  }

  private async restoreApplicationState(backupPath: string, metadata: BackupMetadata, options: any): Promise<void> {
    // Restore Kubernetes state
    await execAsync(`kubectl restore snapshot ${backupPath}`);
  }

  private async restoreConfiguration(backupPath: string, metadata: BackupMetadata, options: any): Promise<void> {
    const targetPath = options.target || '/config';
    
    // Extract configuration
    await execAsync(`tar -xzf ${backupPath} -C ${targetPath}`);
  }

  async handleFailoverScenario(scenarioName: string): Promise<void> {
    const scenario = this.failoverScenarios.get(scenarioName);
    if (!scenario) {
      this.logger.error(`Unknown failover scenario: ${scenarioName}`);
      return;
    }

    const plan = this.recoveryPlans.get(scenarioName);
    if (!plan) {
      this.logger.error(`No recovery plan for scenario: ${scenarioName}`);
      return;
    }

    try {
      this.logger.warn(`Executing failover scenario: ${scenarioName}`);
      this.emit('failover:started', { scenario: scenarioName, plan });

      const startTime = Date.now();

      // Execute recovery steps
      for (const step of plan.steps) {
        await this.executeRecoveryStep(step);
      }

      const executionTime = Date.now() - startTime;
      
      this.emit('failover:completed', { 
        scenario: scenarioName, 
        executionTime,
        estimatedTime: plan.estimatedTime 
      });

      this.logger.log(`Failover completed: ${scenarioName} in ${executionTime}ms`);
    } catch (error) {
      this.logger.error(`Failover failed: ${scenarioName} - ${error.message}`, error.stack);
      this.emit('failover:failed', { scenario: scenarioName, error: error.message });
      
      // Attempt rollback if available
      await this.attemptRollback(plan);
    }
  }

  private async executeRecoveryStep(step: RecoveryStep): Promise<void> {
    let attempts = 0;
    const maxAttempts = step.retries + 1;

    while (attempts < maxAttempts) {
      try {
        this.logger.log(`Executing recovery step: ${step.id} - ${step.description}`);
        
        const { stdout, stderr } = await execAsync(step.command, {
          timeout: step.timeout,
        });

        if (stderr) {
          this.logger.warn(`Step ${step.id} warnings: ${stderr}`);
        }

        this.logger.log(`Step ${step.id} completed successfully`);
        return;
      } catch (error) {
        attempts++;
        this.logger.error(`Step ${step.id} failed (attempt ${attempts}/${maxAttempts}): ${error.message}`);
        
        if (attempts >= maxAttempts) {
          throw new Error(`Recovery step ${step.id} failed after ${maxAttempts} attempts: ${error.message}`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async attemptRollback(plan: RecoveryPlan): Promise<void> {
    this.logger.log(`Attempting rollback for plan: ${plan.scenario}`);

    for (const step of plan.steps.reverse()) {
      if (step.rollback) {
        try {
          await execAsync(step.rollback, { timeout: step.timeout });
          this.logger.log(`Rollback step completed: ${step.id}`);
        } catch (error) {
          this.logger.error(`Rollback step failed: ${step.id} - ${error.message}`);
        }
      }
    }
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logger.error(`Health monitoring failed: ${error.message}`, error.stack);
      }
    }, 30000); // Every 30 seconds
  }

  private async performHealthChecks(): Promise<void> {
    const checks = [
      this.checkDatabaseConnectivity(),
      this.checkApplicationResponsiveness(),
      this.checkBlockchainSyncStatus(),
      this.checkBackupCompletion(),
      this.checkCrossRegionReplication(),
    ];

    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const checkNames = [
          'database_connectivity',
          'application_responsiveness',
          'blockchain_sync_status',
          'backup_completion',
          'cross_region_replication',
        ];
        
        this.logger.error(`Health check failed: ${checkNames[index]} - ${result.reason}`);
        this.emit('health:check_failed', { check: checkNames[index], error: result.reason });
      }
    });
  }

  private async checkDatabaseConnectivity(): Promise<void> {
    await this.redis.ping();
    // Add PostgreSQL connectivity check
  }

  private async checkApplicationResponsiveness(): Promise<void> {
    // Check application health endpoints
    const response = await fetch('http://backend-service/health');
    if (!response.ok) {
      throw new Error(`Application health check failed: ${response.status}`);
    }
  }

  private async checkBlockchainSyncStatus(): Promise<void> {
    // Check blockchain synchronization status
    // This would integrate with blockchain node
  }

  private async checkBackupCompletion(): Promise<void> {
    // Check if recent backups completed successfully
    const recentBackups = await this.getRecentBackups(3600000); // Last hour
    const failedBackups = recentBackups.filter(backup => backup.status === 'failed');
    
    if (failedBackups.length > 0) {
      throw new Error(`${failedBackups.length} backups failed in the last hour`);
    }
  }

  private async checkCrossRegionReplication(): Promise<void> {
    // Check cross-region replication status
    // This would integrate with multi-region setup
  }

  private startBackupScheduler(): void {
    // Schedule continuous backups based on configuration
    Object.entries(this.config.strategies).forEach(([type, strategy]) => {
      if (strategy.frequency !== 'on_change') {
        const intervalMs = this.parseFrequency(strategy.frequency);
        
        setInterval(async () => {
          try {
            await this.createBackup(type, this.getSourceForType(type), {
              encrypt: strategy.encryption,
              compress: strategy.compression,
            });
          } catch (error) {
            this.logger.error(`Scheduled backup failed for ${type}: ${error.message}`, error.stack);
          }
        }, intervalMs);
      }
    });
  }

  private parseFrequency(frequency: string): number {
    const match = frequency.match(/^(\d+)([smhd])$/);
    if (!match) return 60000; // Default to 1 minute

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60000;
    }
  }

  private getSourceForType(type: string): string {
    switch (type) {
      case 'database': return process.env.DATABASE_URL;
      case 'blockchain_data': return '/data/blockchain';
      case 'application_state': return 'web3-marketplace-prod';
      case 'configuration': return '/config';
      default: return '';
    }
  }

  private async getRecentBackups(timeWindowMs: number): Promise<BackupMetadata[]> {
    const cutoff = Date.now() - timeWindowMs;
    const backups: BackupMetadata[] = [];

    for (const [, backup] of this.activeBackups) {
      if (backup.timestamp >= cutoff) {
        backups.push(backup);
      }
    }

    return backups;
  }

  async getDisasterRecoveryStatus(): Promise<{
    rto: number;
    rpo: number;
    lastBackup: number;
    backupHealth: string;
    failoverReadiness: string;
    recentTests: any[];
  }> {
    const recentBackups = await this.getRecentBackups(86400000); // Last 24 hours
    const lastBackup = Math.max(...recentBackups.map(b => b.timestamp));
    const failedBackups = recentBackups.filter(b => b.status === 'failed').length;
    
    return {
      rto: this.config.rto,
      rpo: this.config.rpo,
      lastBackup,
      backupHealth: failedBackups === 0 ? 'healthy' : 'degraded',
      failoverReadiness: 'ready', // This would be calculated based on various factors
      recentTests: [], // This would include recent DR test results
    };
  }
}