import fs from 'fs/promises';
import { safeLogger } from '../utils/safeLogger';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';
import { Transform } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  stack?: string;
}

interface LogAggregationConfig {
  logDir: string;
  maxFileSize: number; // bytes
  maxFiles: number;
  rotationInterval: number; // milliseconds
  compressionEnabled: boolean;
  remoteLogging: {
    enabled: boolean;
    endpoint?: string;
    apiKey?: string;
    batchSize: number;
    flushInterval: number;
  };
}

class LogAggregationService {
  private config: LogAggregationConfig;
  private logStreams: Map<string, WriteStream> = new Map();
  private logBuffer: LogEntry[] = [];
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.config = this.loadConfiguration();
    this.initializeLogDirectory();
    this.startRemoteLoggingBatch();
  }

  private loadConfiguration(): LogAggregationConfig {
    return {
      logDir: process.env.LOG_DIR || '/var/log/marketplace-api',
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '104857600'), // 100MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
      rotationInterval: parseInt(process.env.LOG_ROTATION_INTERVAL || '86400000'), // 24 hours
      compressionEnabled: process.env.LOG_COMPRESSION_ENABLED !== 'false',
      remoteLogging: {
        enabled: process.env.REMOTE_LOGGING_ENABLED === 'true',
        endpoint: process.env.REMOTE_LOGGING_ENDPOINT,
        apiKey: process.env.REMOTE_LOGGING_API_KEY,
        batchSize: parseInt(process.env.REMOTE_LOGGING_BATCH_SIZE || '100'),
        flushInterval: parseInt(process.env.REMOTE_LOGGING_FLUSH_INTERVAL || '30000') // 30 seconds
      }
    };
  }

  private async initializeLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.logDir, { recursive: true });
      safeLogger.info(`📁 Log directory initialized: ${this.config.logDir}`);
    } catch (error) {
      safeLogger.error('Failed to initialize log directory:', error);
      throw error;
    }
  }

  private startRemoteLoggingBatch(): void {
    if (!this.config.remoteLogging.enabled) {
      return;
    }

    setInterval(async () => {
      await this.flushRemoteLogs();
    }, this.config.remoteLogging.flushInterval);

    safeLogger.info('📡 Remote logging batch processing started');
  }

  async log(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    // Write to local file
    await this.writeToFile(logEntry);

    // Add to remote logging buffer
    if (this.config.remoteLogging.enabled) {
      this.logBuffer.push(logEntry);
      
      if (this.logBuffer.length >= this.config.remoteLogging.batchSize) {
        await this.flushRemoteLogs();
      }
    }

    // Console output for development
    if (process.env.NODE_ENV !== 'production') {
      this.logToConsole(logEntry);
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    const logFileName = this.getLogFileName(entry.level, entry.service);
    const logFilePath = path.join(this.config.logDir, logFileName);

    try {
      // Get or create write stream
      let stream = this.logStreams.get(logFileName);
      if (!stream) {
        stream = createWriteStream(logFilePath, { flags: 'a' });
        this.logStreams.set(logFileName, stream);
        
        // Set up rotation timer
        this.setupLogRotation(logFileName);
      }

      // Write log entry
      const logLine = JSON.stringify(entry) + '\n';
      stream.write(logLine);

      // Check file size for rotation
      await this.checkFileRotation(logFileName, logFilePath);

    } catch (error) {
      safeLogger.error('Failed to write log entry:', error);
    }
  }

  private getLogFileName(level: string, service: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `${service}-${level}-${date}.log`;
  }

  private setupLogRotation(logFileName: string): void {
    if (this.rotationTimers.has(logFileName)) {
      return;
    }

    const timer = setInterval(async () => {
      await this.rotateLogFile(logFileName);
    }, this.config.rotationInterval);

    this.rotationTimers.set(logFileName, timer);
  }

  private async checkFileRotation(logFileName: string, logFilePath: string): Promise<void> {
    try {
      const stats = await fs.stat(logFilePath);
      if (stats.size > this.config.maxFileSize) {
        await this.rotateLogFile(logFileName);
      }
    } catch (error) {
      // File doesn't exist yet, ignore
    }
  }

  private async rotateLogFile(logFileName: string): Promise<void> {
    try {
      const logFilePath = path.join(this.config.logDir, logFileName);
      
      // Close current stream
      const stream = this.logStreams.get(logFileName);
      if (stream) {
        stream.end();
        this.logStreams.delete(logFileName);
      }

      // Check if file exists
      try {
        await fs.access(logFilePath);
      } catch {
        return; // File doesn't exist, nothing to rotate
      }

      // Create rotated filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFileName = `${logFileName}.${timestamp}`;
      const rotatedFilePath = path.join(this.config.logDir, rotatedFileName);

      // Move current log to rotated name
      await fs.rename(logFilePath, rotatedFilePath);

      // Compress if enabled
      if (this.config.compressionEnabled) {
        await this.compressLogFile(rotatedFilePath);
      }

      // Clean up old log files
      await this.cleanupOldLogs(logFileName);

      safeLogger.info(`🔄 Log file rotated: ${logFileName}`);

    } catch (error) {
      safeLogger.error('Failed to rotate log file:', error);
    }
  }

  private async compressLogFile(filePath: string): Promise<void> {
    try {
      const { createGzip } = await import('zlib');
      const { createReadStream } = await import('fs');
      const { pipeline } = await import('stream/promises');

      const gzipPath = `${filePath}.gz`;
      const readStream = createReadStream(filePath);
      const gzipStream = createGzip();
      const writeStream = createWriteStream(gzipPath);

      await pipeline(readStream, gzipStream, writeStream);
      
      // Remove original file
      await fs.unlink(filePath);
      
      safeLogger.info(`🗜️ Log file compressed: ${path.basename(gzipPath)}`);

    } catch (error) {
      safeLogger.error('Failed to compress log file:', error);
    }
  }

  private async cleanupOldLogs(baseFileName: string): Promise<void> {
    try {
      const files = await fs.readdir(this.config.logDir);
      const logFiles = files
        .filter(file => file.startsWith(baseFileName))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDir, file),
          stat: null as any
        }));

      // Get file stats
      for (const file of logFiles) {
        try {
          file.stat = await fs.stat(file.path);
        } catch {
          // Ignore files that can't be accessed
        }
      }

      // Sort by modification time (newest first)
      const validFiles = logFiles
        .filter(file => file.stat)
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      // Remove excess files
      if (validFiles.length > this.config.maxFiles) {
        const filesToDelete = validFiles.slice(this.config.maxFiles);
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          safeLogger.info(`🗑️ Deleted old log file: ${file.name}`);
        }
      }

    } catch (error) {
      safeLogger.error('Failed to cleanup old logs:', error);
    }
  }

  private async flushRemoteLogs(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToSend = this.logBuffer.splice(0, this.config.remoteLogging.batchSize);

    try {
      await this.sendLogsToRemote(logsToSend);
    } catch (error) {
      safeLogger.error('Failed to send logs to remote service:', error);
      // Put logs back in buffer for retry
      this.logBuffer.unshift(...logsToSend);
    }
  }

  private async sendLogsToRemote(logs: LogEntry[]): Promise<void> {
    if (!this.config.remoteLogging.endpoint) {
      return;
    }

    const payload = {
      logs,
      source: 'marketplace-api',
      timestamp: new Date().toISOString()
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.remoteLogging.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.remoteLogging.apiKey}`;
    }

    const response = await fetch(this.config.remoteLogging.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Remote logging failed: ${response.status} ${response.statusText}`);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const colors = {
      debug: '\x1b[36m',   // Cyan
      info: '\x1b[32m',    // Green
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      fatal: '\x1b[35m'    // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[entry.level] || '';
    
    const prefix = `${color}[${entry.level.toUpperCase()}]${reset}`;
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const service = entry.service ? `[${entry.service}]` : '';
    const requestId = entry.requestId ? `[${entry.requestId}]` : '';
    
    safeLogger.info(`${prefix} ${timestamp} ${service}${requestId} ${entry.message}`);
    
    if (entry.metadata) {
      safeLogger.info('  Metadata:', entry.metadata);
    }
    
    if (entry.stack) {
      safeLogger.info('  Stack:', entry.stack);
    }
  }

  // Convenience methods
  async debug(message: string, service: string, metadata?: Record<string, any>, requestId?: string): Promise<void> {
    await this.log({ level: 'debug', message, service, metadata, requestId });
  }

  async info(message: string, service: string, metadata?: Record<string, any>, requestId?: string): Promise<void> {
    await this.log({ level: 'info', message, service, metadata, requestId });
  }

  async warn(message: string, service: string, metadata?: Record<string, any>, requestId?: string): Promise<void> {
    await this.log({ level: 'warn', message, service, metadata, requestId });
  }

  async error(message: string, service: string, error?: Error, metadata?: Record<string, any>, requestId?: string): Promise<void> {
    await this.log({
      level: 'error',
      message,
      service,
      metadata: { ...metadata, error: error?.message },
      stack: error?.stack,
      requestId
    });
  }

  async fatal(message: string, service: string, error?: Error, metadata?: Record<string, any>, requestId?: string): Promise<void> {
    await this.log({
      level: 'fatal',
      message,
      service,
      metadata: { ...metadata, error: error?.message },
      stack: error?.stack,
      requestId
    });
  }

  // Query methods for log analysis
  async queryLogs(options: {
    service?: string;
    level?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<LogEntry[]> {
    const results: LogEntry[] = [];
    const files = await fs.readdir(this.config.logDir);
    
    for (const file of files) {
      if (file.endsWith('.log')) {
        const filePath = path.join(this.config.logDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const entry: LogEntry = JSON.parse(line);
            
            // Apply filters
            if (options.service && entry.service !== options.service) continue;
            if (options.level && entry.level !== options.level) continue;
            if (options.startTime && new Date(entry.timestamp) < options.startTime) continue;
            if (options.endTime && new Date(entry.timestamp) > options.endTime) continue;
            
            results.push(entry);
            
            if (options.limit && results.length >= options.limit) {
              return results;
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }
    
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Express middleware for request logging
  requestLoggingMiddleware() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Log request
      this.info(
        `${req.method} ${req.path}`,
        'api-request',
        {
          method: req.method,
          path: req.path,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          query: req.query
        },
        requestId
      );

      // Log response
      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'error' : 'info';
        
        this.log({
          level,
          message: `${req.method} ${req.path} - ${res.statusCode}`,
          service: 'api-response',
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            contentLength: res.get('content-length')
          },
          requestId
        });
      });

      next();
    };
  }

  async shutdown(): Promise<void> {
    safeLogger.info('🛑 Shutting down log aggregation service...');
    
    // Flush remaining remote logs
    if (this.config.remoteLogging.enabled) {
      await this.flushRemoteLogs();
    }
    
    // Close all log streams
    for (const [fileName, stream] of this.logStreams) {
      stream.end();
    }
    this.logStreams.clear();
    
    // Clear rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearInterval(timer);
    }
    this.rotationTimers.clear();
    
    safeLogger.info('✅ Log aggregation service shutdown complete');
  }
}

// Singleton instance
let logAggregationService: LogAggregationService | null = null;

export function getLogAggregationService(): LogAggregationService {
  if (!logAggregationService) {
    logAggregationService = new LogAggregationService();
  }
  return logAggregationService;
}

export { LogAggregationService, LogEntry, LogAggregationConfig };
