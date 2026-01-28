import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { safeLogger } from '../utils/safeLogger';
import Redis from 'ioredis';

export interface ContentModerationJob {
  contentId: string;
  contentType: 'post' | 'comment' | 'listing' | 'dm' | 'username';
  userId: string;
  priority: 'fast' | 'slow';
  content: {
    text?: string;
    mediaUrls?: string[];
    links?: string[];
    metadata?: Record<string, any>;
  };
  userReputation: number;
  walletAddress: string;
  submittedAt: Date;
}

export interface ModerationResult {
  contentId: string;
  decision: 'allow' | 'quarantine' | 'block';
  confidence: number;
  categories: string[];
  reasoning: string;
  vendorResults: Array<{
    vendor: string;
    confidence: number;
    categories: string[];
    cost: number;
    latency: number;
  }>;
  processedAt: Date;
}

class ContentModerationQueueService {
  private redis: Redis;
  private fastQueue: Queue<ContentModerationJob>;
  private slowQueue: Queue<ContentModerationJob>;
  private fastWorker!: Worker<ContentModerationJob>;
  private slowWorker!: Worker<ContentModerationJob>;
  private queueEvents: QueueEvents;

  constructor() {
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Initialize queues
    this.fastQueue = new Queue<ContentModerationJob>('content-moderation-fast', {
      connection: this.redis as any,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.slowQueue = new Queue<ContentModerationJob>('content-moderation-slow', {
      connection: this.redis as any,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents('content-moderation', {
      connection: this.redis as any,
    });

    // Initialize workers
    this.initializeWorkers();
    this.setupEventListeners();
  }

  private initializeWorkers(): void {
    // Fast lane worker - for text content (1-3 second processing)
    this.fastWorker = new Worker<ContentModerationJob>(
      'content-moderation-fast',
      async (job: Job<ContentModerationJob>) => {
        return this.processFastLaneJob(job);
      },
      {
        connection: this.redis as any,
        concurrency: 10, // Higher concurrency for fast processing
        limiter: {
          max: 100, // Max 100 jobs per duration
          duration: 60000, // 1 minute
        },
      }
    );

    // Slow lane worker - for media content (10-30 second processing)
    this.slowWorker = new Worker<ContentModerationJob>(
      'content-moderation-slow',
      async (job: Job<ContentModerationJob>) => {
        return this.processSlowLaneJob(job);
      },
      {
        connection: this.redis as any,
        concurrency: 3, // Lower concurrency for resource-intensive processing
        limiter: {
          max: 20, // Max 20 jobs per duration
          duration: 60000, // 1 minute
        },
      }
    );
  }

  private setupEventListeners(): void {
    // Fast queue events
    this.fastWorker.on('completed', (job: Job<ContentModerationJob>) => {
      safeLogger.info(`Fast lane job ${job.id} completed for content ${job.data.contentId}`);
    });

    this.fastWorker.on('failed', (job: Job<ContentModerationJob> | undefined, err: Error) => {
      safeLogger.error(`Fast lane job ${job?.id} failed:`, err);
    });

    // Slow queue events
    this.slowWorker.on('completed', (job: Job<ContentModerationJob>) => {
      safeLogger.info(`Slow lane job ${job.id} completed for content ${job.data.contentId}`);
    });

    this.slowWorker.on('failed', (job: Job<ContentModerationJob> | undefined, err: Error) => {
      safeLogger.error(`Slow lane job ${job?.id} failed:`, err);
    });

    // Queue events for monitoring
    this.queueEvents.on('waiting', ({ jobId }) => {
      safeLogger.info(`Job ${jobId} is waiting`);
    });

    this.queueEvents.on('active', ({ jobId }) => {
      safeLogger.info(`Job ${jobId} is now active`);
    });

    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      safeLogger.info(`Job ${jobId} completed with result:`, returnvalue);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      safeLogger.error(`Job ${jobId} failed:`, failedReason);
    });
  }

  /**
   * Add content to moderation queue
   */
  async addToQueue(jobData: ContentModerationJob): Promise<string> {
    const queue = jobData.priority === 'fast' ? this.fastQueue : this.slowQueue;
    
    // Calculate job priority based on user reputation and content type
    let priority = this.calculateJobPriority(jobData);
    
    // Add delay for low reputation users
    let delay = 0;
    if (jobData.userReputation < 50) {
      delay = 5000; // 5 second delay for low reputation users
    }

    const job = await queue.add(
      `moderate-${jobData.contentType}`,
      jobData,
      {
        priority,
        delay,
        jobId: `${jobData.contentId}-${Date.now()}`, // Unique job ID
      }
    );

    return job.id!;
  }

  /**
   * Calculate job priority based on various factors
   */
  private calculateJobPriority(jobData: ContentModerationJob): number {
    let priority = 0;

    // Base priority by content type
    switch (jobData.contentType) {
      case 'dm':
        priority += 100; // Highest priority for DMs
        break;
      case 'post':
        priority += 80;
        break;
      case 'comment':
        priority += 60;
        break;
      case 'listing':
        priority += 70;
        break;
      case 'username':
        priority += 50;
        break;
    }

    // Adjust by user reputation (higher reputation = higher priority)
    priority += Math.min(jobData.userReputation / 10, 20);

    // Boost priority for content with links (potential phishing)
    if (jobData.content.links && jobData.content.links.length > 0) {
      priority += 30;
    }

    // Boost priority for media content in fast lane (shouldn't happen often)
    if (jobData.priority === 'fast' && jobData.content.mediaUrls?.length) {
      priority += 50;
    }

    return Math.floor(priority);
  }

  /**
   * Process fast lane job (text content)
   */
  private async processFastLaneJob(job: Job<ContentModerationJob>): Promise<ModerationResult> {
    const startTime = Date.now();
    const { contentId, content, userReputation } = job.data;

    try {
      // Update job progress
      await job.updateProgress(10);

      // Import AI service dynamically to avoid circular dependencies
      const aiServiceModule = await import('./aiService');
      const aiService = (aiServiceModule as any).aiService;
      
      const vendorResults = [];
      let overallConfidence = 0;
      let categories: string[] = [];
      let decision: 'allow' | 'quarantine' | 'block' = 'allow';

      // Text moderation
      if (content.text) {
        await job.updateProgress(30);
        
        // OpenAI Moderation
        const openaiStart = Date.now();
        const openaiResult = await aiService.moderateContent(content.text);
        const openaiLatency = Date.now() - openaiStart;
        
        vendorResults.push({
          vendor: 'openai',
          confidence: openaiResult.flagged ? 0.95 : 0.1,
          categories: openaiResult.categories ? Object.keys(openaiResult.categories).filter(k => openaiResult.categories[k]) : [],
          cost: 0.0001, // Estimated cost
          latency: openaiLatency
        });

        await job.updateProgress(60);
      }

      // Link safety check
      if (content.links && content.links.length > 0) {
        await job.updateProgress(80);
        
        for (const link of content.links) {
          // Basic URL validation and safety check
          try {
            const url = new URL(link);
            
            // Check for suspicious patterns
            const suspiciousPatterns = [
              /bit\.ly|tinyurl|t\.co/i, // URL shorteners
              /\.tk$|\.ml$|\.ga$/i, // Suspicious TLDs
              /discord\.gg|telegram\.me/i, // Social platforms (could be scams)
            ];

            const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(link));
            
            if (isSuspicious) {
              vendorResults.push({
                vendor: 'url-analysis',
                confidence: 0.7,
                categories: ['suspicious-link'],
                cost: 0,
                latency: 10
              });
            }
          } catch (error) {
            // Invalid URL
            vendorResults.push({
              vendor: 'url-analysis',
              confidence: 0.8,
              categories: ['invalid-url'],
              cost: 0,
              latency: 5
            });
          }
        }
      }

      // Calculate overall decision
      const highConfidenceResults = vendorResults.filter(r => r.confidence > 0.7);
      
      if (highConfidenceResults.length > 0) {
        overallConfidence = Math.max(...highConfidenceResults.map(r => r.confidence));
        categories = [...new Set(highConfidenceResults.flatMap(r => r.categories))];
        
        // Apply reputation-based thresholds
        const blockThreshold = userReputation > 80 ? 0.95 : 0.85;
        const quarantineThreshold = userReputation > 80 ? 0.8 : 0.7;
        
        if (overallConfidence >= blockThreshold) {
          decision = 'block';
        } else if (overallConfidence >= quarantineThreshold) {
          decision = 'quarantine';
        }
      }

      await job.updateProgress(100);

      const result: ModerationResult = {
        contentId,
        decision,
        confidence: overallConfidence,
        categories,
        reasoning: `Processed ${vendorResults.length} vendor results. Highest confidence: ${overallConfidence}`,
        vendorResults,
        processedAt: new Date()
      };

      safeLogger.info(`Fast lane processing completed for ${contentId} in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      safeLogger.error(`Fast lane processing failed for ${contentId}:`, error);
      throw error;
    }
  }

  /**
   * Process slow lane job (media content)
   */
  private async processSlowLaneJob(job: Job<ContentModerationJob>): Promise<ModerationResult> {
    const startTime = Date.now();
    const { contentId, content, userReputation } = job.data;

    try {
      await job.updateProgress(10);

      const vendorResults = [];
      let overallConfidence = 0;
      let categories: string[] = [];
      let decision: 'allow' | 'quarantine' | 'block' = 'allow';

      // Process text content first (if any)
      if (content.text) {
        await job.updateProgress(20);
        
        const aiServiceModule = await import('./aiService');
        const aiService = (aiServiceModule as any).aiService;
        const textResult = await aiService.moderateContent(content.text);
        
        vendorResults.push({
          vendor: 'openai-text',
          confidence: textResult.flagged ? 0.9 : 0.1,
          categories: textResult.categories ? Object.keys(textResult.categories).filter(k => textResult.categories[k]) : [],
          cost: 0.0001,
          latency: 1000
        });
      }

      // Process media content
      if (content.mediaUrls && content.mediaUrls.length > 0) {
        await job.updateProgress(40);
        
        for (let i = 0; i < content.mediaUrls.length; i++) {
          const mediaUrl = content.mediaUrls[i];
          
          // Simulate media analysis (in real implementation, this would call actual AI services)
          await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
          
          // Mock media analysis result
          const isNSFW = Math.random() > 0.9; // 10% chance of NSFW detection
          const hasViolence = Math.random() > 0.95; // 5% chance of violence detection
          
          if (isNSFW || hasViolence) {
            vendorResults.push({
              vendor: 'media-analysis',
              confidence: isNSFW ? 0.85 : 0.8,
              categories: isNSFW ? ['nsfw'] : ['violence'],
              cost: 0.01, // Higher cost for media analysis
              latency: 2000
            });
          }
          
          await job.updateProgress(40 + (i + 1) * 40 / content.mediaUrls.length);
        }
      }

      // Link analysis (same as fast lane but with more thorough checking)
      if (content.links && content.links.length > 0) {
        await job.updateProgress(90);
        
        // More thorough link analysis for slow lane
        for (const link of content.links) {
          try {
            const url = new URL(link);
            
            // Simulate more comprehensive URL analysis
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const suspiciousPatterns = [
              /bit\.ly|tinyurl|t\.co/i,
              /\.tk$|\.ml$|\.ga$/i,
              /discord\.gg|telegram\.me/i,
              /metamask|wallet|seed|private.*key/i,
            ];

            const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(link));
            
            if (isSuspicious) {
              vendorResults.push({
                vendor: 'comprehensive-url-analysis',
                confidence: 0.8,
                categories: ['suspicious-link', 'potential-scam'],
                cost: 0.001,
                latency: 500
              });
            }
          } catch (error) {
            vendorResults.push({
              vendor: 'comprehensive-url-analysis',
              confidence: 0.9,
              categories: ['invalid-url', 'malformed-content'],
              cost: 0.001,
              latency: 100
            });
          }
        }
      }

      // Calculate overall decision with more sophisticated logic for slow lane
      const criticalResults = vendorResults.filter(r => r.confidence > 0.8);
      const moderateResults = vendorResults.filter(r => r.confidence > 0.6 && r.confidence <= 0.8);
      
      if (criticalResults.length > 0) {
        overallConfidence = Math.max(...criticalResults.map(r => r.confidence));
        categories = [...new Set(criticalResults.flatMap(r => r.categories))];
        
        const blockThreshold = userReputation > 80 ? 0.9 : 0.8;
        const quarantineThreshold = userReputation > 80 ? 0.75 : 0.65;
        
        if (overallConfidence >= blockThreshold) {
          decision = 'block';
        } else if (overallConfidence >= quarantineThreshold || moderateResults.length >= 2) {
          decision = 'quarantine';
        }
      } else if (moderateResults.length >= 2) {
        // Multiple moderate-confidence results should trigger quarantine
        overallConfidence = Math.max(...moderateResults.map(r => r.confidence));
        categories = [...new Set(moderateResults.flatMap(r => r.categories))];
        decision = 'quarantine';
      }

      await job.updateProgress(100);

      const result: ModerationResult = {
        contentId,
        decision,
        confidence: overallConfidence,
        categories,
        reasoning: `Slow lane processing: ${criticalResults.length} critical, ${moderateResults.length} moderate results`,
        vendorResults,
        processedAt: new Date()
      };

      safeLogger.info(`Slow lane processing completed for ${contentId} in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      safeLogger.error(`Slow lane processing failed for ${contentId}:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    fastQueue: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
    slowQueue: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  }> {
    const [fastWaiting, fastActive, fastCompleted, fastFailed] = await Promise.all([
      this.fastQueue.getWaiting(),
      this.fastQueue.getActive(),
      this.fastQueue.getCompleted(),
      this.fastQueue.getFailed(),
    ]);

    const [slowWaiting, slowActive, slowCompleted, slowFailed] = await Promise.all([
      this.slowQueue.getWaiting(),
      this.slowQueue.getActive(),
      this.slowQueue.getCompleted(),
      this.slowQueue.getFailed(),
    ]);

    return {
      fastQueue: {
        waiting: fastWaiting.length,
        active: fastActive.length,
        completed: fastCompleted.length,
        failed: fastFailed.length,
      },
      slowQueue: {
        waiting: slowWaiting.length,
        active: slowActive.length,
        completed: slowCompleted.length,
        failed: slowFailed.length,
      },
    };
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    result?: ModerationResult;
    error?: string;
  } | null> {
    // Check both queues
    const fastJob = await this.fastQueue.getJob(jobId);
    const slowJob = await this.slowQueue.getJob(jobId);
    
    const job = fastJob || slowJob;
    if (!job) return null;

    return {
      status: await job.getState(),
      progress: job.progress as number || 0,
      result: job.returnvalue,
      error: job.failedReason,
    };
  }

  /**
   * Cleanup completed jobs
   */
  async cleanupJobs(): Promise<void> {
    await Promise.all([
      this.fastQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'), // Keep completed jobs for 24 hours
      this.fastQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'), // Keep failed jobs for 7 days
      this.slowQueue.clean(24 * 60 * 60 * 1000, 50, 'completed'),
      this.slowQueue.clean(7 * 24 * 60 * 60 * 1000, 25, 'failed'),
    ]);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    safeLogger.info('Shutting down content moderation queue service...');
    
    await Promise.all([
      this.fastWorker.close(),
      this.slowWorker.close(),
      this.queueEvents.close(),
    ]);
    
    await this.redis.quit();
    safeLogger.info('Content moderation queue service shut down complete');
  }
}

export const contentModerationQueue = new ContentModerationQueueService();
